import { z } from "zod";

export const stableErrorCodeSchema = z.enum([
  "NOVA-AI001",
  "NOVA-AI002",
  "NOVA-CFG001",
  "NOVA-EVT001",
  "NOVA-EVT002",
  "NOVA-MEM001",
  "NOVA-MEM002",
  "NOVA-MEM003",
  "NOVA-SEC001",
  "NOVA-TL002",
  "NOVA-TL003",
  "NOVA-TL004",
  "NOVA-TL005",
  "NOVA-TSK004",
]);

export type StableErrorCode = z.infer<typeof stableErrorCodeSchema>;

export interface ErrorInfo {
  readonly code: StableErrorCode;
  readonly message: string;
  readonly retryable: boolean;
  readonly details?: Readonly<Record<string, string | number | boolean>>;
}

export type Result<TValue, TError extends ErrorInfo = ErrorInfo> =
  { readonly ok: true; readonly value: TValue } | { readonly ok: false; readonly error: TError };

export const ok = <TValue>(value: TValue): Result<TValue> => ({ ok: true, value });

export const err = <TError extends ErrorInfo>(error: TError): Result<never, TError> => ({
  ok: false,
  error,
});

export const serviceStateSchema = z.enum([
  "Created",
  "Initializing",
  "Healthy",
  "Degraded",
  "Restarting",
  "Stopping",
  "Stopped",
  "Failed",
]);

export type ServiceState = z.infer<typeof serviceStateSchema>;

export interface ServiceHealth {
  readonly state: ServiceState;
  readonly detail: string;
  readonly checkedAt: string;
  readonly missedHeartbeats: number;
}

export interface ServiceLifecycle {
  start(): Promise<Result<void>>;
  stop(graceful: boolean): Promise<Result<void>>;
  heartbeat(): Result<Heartbeat>;
  health(): ServiceHealth;
}

export interface Heartbeat {
  readonly serviceName: string;
  readonly state: ServiceState;
  readonly publishedAt: string;
}

export const messageEnvelopeSchema = z.object({
  message_id: z.string().uuid(),
  topic: z.string().min(1),
  schema_version: z.string().regex(/^\d+\.\d+\.\d+$/),
  timestamp: z.string().datetime({ offset: true }),
  correlation_id: z.string().uuid(),
  source_service: z.string().min(1),
  payload: z.unknown(),
});

export type MessageEnvelope<TPayload = unknown> = z.infer<typeof messageEnvelopeSchema> & {
  readonly payload: TPayload;
};

export interface StateObservation<TValue = unknown> {
  readonly entityRef: string;
  readonly value: TValue;
  readonly observer: string;
  readonly observedAt: string;
  readonly confidence: number;
  readonly corroborated: boolean;
}

export interface StateQuery {
  readonly entityRef: string;
  readonly allowActiveRecheck: boolean;
}

export interface StateResolution<TValue = unknown> {
  readonly value: TValue;
  readonly confidence: number;
  readonly resolvedAt: string;
  readonly contradictionPending: boolean;
}

export const startupSteps = [
  "Load Config",
  "Load Secrets",
  "Initialize Logger",
  "Initialize Telemetry",
  "Start Runtime Manager",
  "Load Persisted State",
  "Start Memory + Knowledge Graph",
  "Start Observers",
  "Plugin Discovery",
  "Start Enabled Plugins",
  "Capability Registration",
  "Start Planner, Executor, Verifier",
  "Start Workflow Engine",
  "Start API Gateway",
  "Resume Unfinished Tasks",
  "UI Layer Connects",
  "Ready",
] as const;

export type StartupStep = (typeof startupSteps)[number];

export const shutdownSteps = [
  "Stop Accepting New Requests",
  "Pause In-Flight Tasks",
  "Cancel/Pause Workflows",
  "Stop Executor and Observers",
  "Unload Plugins",
  "Persist Cache",
  "Save Memory + Knowledge Graph",
  "Flush Logs and Telemetry",
  "Runtime Manager Exits",
] as const;

export type ShutdownStep = (typeof shutdownSteps)[number];

export interface ServiceDefinition {
  readonly name: string;
  readonly dependencies: readonly string[];
  readonly critical: boolean;
  readonly restartWindowMs: number;
  readonly maxImmediateRestarts: number;
  readonly backoffCeilingMs: number;
}

export const retryPolicy = Object.freeze({
  maxRetries: 3,
  baseBackoffMs: 500,
  multiplier: 2,
  jitterRatio: 0.2,
  circuitBreakerFailureThreshold: 5,
  circuitBreakerCooldownMs: 60_000,
});

export const timeoutPolicy = Object.freeze({
  internalApiMs: 5_000,
  planningMs: 30_000,
  nativeToolMs: 15_000,
  externalToolMs: 30_000,
  cliToolMs: 60_000,
  memoryRetrievalMs: 2_000,
  indexingMs: 5_000,
  pluginCapabilityMs: 10_000,
  providerInferenceMs: 60_000,
});

export const windowPolicy = Object.freeze({
  observerDebounceMs: 250,
  observerBatchSize: 50,
  crossObserverConflictMs: 5_000,
});
