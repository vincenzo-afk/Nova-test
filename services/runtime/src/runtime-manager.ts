import {
  err,
  ok,
  retryPolicy,
  type Result,
  type ServiceDefinition,
  type ServiceHealth,
  type ServiceLifecycle,
} from "@nova/shared";

interface RuntimeOptions {
  readonly now?: () => number;
  readonly heartbeatIntervalMs?: number;
}

interface Registration {
  readonly definition: ServiceDefinition;
  readonly service: ServiceLifecycle;
  readonly restartTimes: number[];
  lastHeartbeatAt: number;
  healthOverride: ServiceHealth | undefined;
}

export class RuntimeManager {
  private readonly registrations = new Map<string, Registration>();
  private readonly now: () => number;
  private readonly heartbeatIntervalMs: number;

  constructor(options: RuntimeOptions = {}) {
    this.now = options.now ?? (() => Date.now());
    this.heartbeatIntervalMs = options.heartbeatIntervalMs ?? 1_000;
  }

  register(definition: ServiceDefinition, service: ServiceLifecycle): Result<void> {
    if (definition.name.length === 0 || this.registrations.has(definition.name)) {
      return err({
        code: "NOVA-CFG001",
        message: `Invalid or duplicate service registration: ${definition.name}.`,
        retryable: false,
        details: { serviceName: definition.name },
      });
    }

    this.registrations.set(definition.name, {
      definition,
      service,
      restartTimes: [],
      lastHeartbeatAt: this.now(),
      healthOverride: undefined,
    });
    return ok(undefined);
  }

  async startAll(): Promise<Result<{ degradedServices: string[] }>> {
    const order = this.startOrder();
    if (!order.ok) {
      return order;
    }

    const degradedServices: string[] = [];
    for (const serviceName of order.value) {
      const registration = this.registrations.get(serviceName);
      if (!registration) {
        return err({
          code: "NOVA-CFG001",
          message: `Service ${serviceName} was not registered.`,
          retryable: false,
          details: { serviceName },
        });
      }

      const result = await registration.service.start();
      registration.lastHeartbeatAt = this.now();
      if (result.ok) {
        registration.healthOverride = undefined;
        continue;
      }

      const failedHealth = {
        ...registration.service.health(),
        state: "Failed" as const,
        detail: result.error.message,
        checkedAt: new Date(this.now()).toISOString(),
      };
      registration.healthOverride = failedHealth;
      if (registration.definition.critical) {
        return err(result.error);
      }
      degradedServices.push(serviceName);
    }

    return ok({ degradedServices });
  }

  async checkHeartbeats(): Promise<void> {
    for (const registration of this.registrations.values()) {
      const missedThreshold = this.heartbeatIntervalMs * 3;
      if (this.now() - registration.lastHeartbeatAt < missedThreshold) {
        continue;
      }
      await this.restartIfAllowed(registration);
    }
  }

  health(serviceName: string): ServiceHealth {
    const registration = this.registrations.get(serviceName);
    if (!registration) {
      return {
        state: "Failed",
        detail: `Unknown service: ${serviceName}.`,
        checkedAt: new Date(this.now()).toISOString(),
        missedHeartbeats: 0,
      };
    }
    return registration.healthOverride ?? registration.service.health();
  }

  async stopAll(graceful: boolean): Promise<Result<void>> {
    const order = this.startOrder();
    if (!order.ok) {
      return order;
    }

    for (const serviceName of [...order.value].reverse()) {
      const registration = this.registrations.get(serviceName);
      if (!registration) {
        continue;
      }
      const result = await registration.service.stop(graceful);
      if (!result.ok) {
        return result;
      }
    }
    return ok(undefined);
  }

  private async restartIfAllowed(registration: Registration): Promise<void> {
    const now = this.now();
    const windowStart = now - registration.definition.restartWindowMs;
    while (
      registration.restartTimes[0] !== undefined &&
      registration.restartTimes[0] < windowStart
    ) {
      registration.restartTimes.shift();
    }

    const restartCount = registration.restartTimes.length;
    if (restartCount >= registration.definition.maxImmediateRestarts) {
      const backoffMs =
        retryPolicy.baseBackoffMs *
        retryPolicy.multiplier ** (restartCount - registration.definition.maxImmediateRestarts + 1);
      if (backoffMs > registration.definition.backoffCeilingMs) {
        registration.healthOverride = {
          ...registration.service.health(),
          state: "Degraded",
          detail: "Restart budget exhausted; manual intervention required.",
          checkedAt: new Date(now).toISOString(),
          missedHeartbeats: 3,
        };
        return;
      }
    }

    registration.restartTimes.push(now);
    await registration.service.stop(false);
    const result = await registration.service.start();
    registration.lastHeartbeatAt = now;
    if (result.ok) {
      registration.healthOverride = undefined;
      return;
    }

    registration.healthOverride = {
      ...registration.service.health(),
      state: "Degraded" as const,
      detail: result.error.message,
      checkedAt: new Date(now).toISOString(),
      missedHeartbeats: 3,
    };
  }

  private startOrder(): Result<string[]> {
    const visiting = new Set<string>();
    const visited = new Set<string>();
    const order: string[] = [];

    const visit = (serviceName: string): Result<void> => {
      if (visited.has(serviceName)) {
        return ok(undefined);
      }
      if (visiting.has(serviceName)) {
        return err({
          code: "NOVA-EVT001",
          message: `Service dependency cycle detected at ${serviceName}.`,
          retryable: false,
          details: { serviceName },
        });
      }

      const registration = this.registrations.get(serviceName);
      if (!registration) {
        return err({
          code: "NOVA-CFG001",
          message: `Missing service dependency: ${serviceName}.`,
          retryable: false,
          details: { serviceName },
        });
      }

      visiting.add(serviceName);
      for (const dependency of registration.definition.dependencies) {
        const dependencyResult = visit(dependency);
        if (!dependencyResult.ok) {
          return dependencyResult;
        }
      }
      visiting.delete(serviceName);
      visited.add(serviceName);
      order.push(serviceName);
      return ok(undefined);
    };

    for (const serviceName of this.registrations.keys()) {
      const result = visit(serviceName);
      if (!result.ok) {
        return result;
      }
    }
    return ok(order);
  }
}
