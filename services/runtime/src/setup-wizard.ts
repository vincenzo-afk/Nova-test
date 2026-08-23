import { err, ok, type ErrorInfo, type Result } from "@nova/shared";
import type {
  ConfigurationSectionName,
  ConfigurationStore,
  NovaConfiguration,
} from "./configuration-store.js";
import type { HardwareDetector, HardwareProfile } from "./hardware-detection.js";
import type { PermissionGrantStore } from "./permission-grant-store.js";
import type { SystemInventory } from "./system-inventory.js";

export type SetupStepId =
  | "core-llm"
  | "perception"
  | "voice"
  | "devices"
  | "channels"
  | "plugins"
  | "routing"
  | "security"
  | "summary";

export interface SetupStepPatch {
  readonly section: ConfigurationSectionName;
  readonly value: NovaConfiguration[ConfigurationSectionName];
}

export interface SetupState {
  readonly current_step: SetupStepId;
  readonly completed_steps: readonly SetupStepId[];
  readonly deferred_steps: readonly SetupStepId[];
  readonly hardware: HardwareProfile;
  readonly inventory?: SystemInventory;
  readonly configuration: NovaConfiguration;
}

export interface SetupInventoryCollector {
  collect(): Promise<SystemInventory>;
}

export interface SetupWizardOptions {
  readonly inventory?: SetupInventoryCollector;
  readonly permissions?: Pick<PermissionGrantStore, "list">;
  readonly grantedFilesystemScopes?: () => readonly string[];
}

const sequence: readonly SetupStepId[] = [
  "core-llm",
  "perception",
  "voice",
  "devices",
  "channels",
  "plugins",
  "routing",
  "security",
  "summary",
];

export class SetupWizard {
  private state: SetupState | undefined;

  public constructor(
    private readonly configurationStore: ConfigurationStore,
    private readonly hardwareDetector: HardwareDetector,
    private readonly options: SetupWizardOptions = {},
  ) {}

  public async start(): Promise<SetupState> {
    const hardware = await this.hardwareDetector.scan();
    const inventory = await this.collectInitialInventory();
    this.state = {
      current_step: "core-llm",
      completed_steps: [],
      deferred_steps: [],
      hardware,
      ...(inventory ? { inventory } : {}),
      configuration: this.configurationStore.snapshot(),
    };
    return this.snapshot();
  }

  public async rerun(): Promise<SetupState> {
    return this.start();
  }

  public complete(step: SetupStepId, patch?: SetupStepPatch): Result<SetupState> {
    const state = this.state;
    if (!state) return err(this.error("Setup wizard has not started."));
    if (state.current_step !== step) return err(this.error("Setup step is not the current step."));
    if (step === "core-llm" && !patch)
      return err(this.error("A core LLM provider must be configured before continuing."));
    if (patch) {
      const result = this.configurationStore.update(patch.section, patch.value);
      if (!result.ok) return result;
    }
    this.advance(step, false);
    return ok(this.snapshot());
  }

  public defer(step: SetupStepId): Result<SetupState> {
    const state = this.state;
    if (!state) return err(this.error("Setup wizard has not started."));
    if (state.current_step !== step) return err(this.error("Setup step is not the current step."));
    if (step === "core-llm" || step === "summary")
      return err(this.error("This setup step cannot be deferred."));
    this.advance(step, true);
    return ok(this.snapshot());
  }

  public summary(): SetupState {
    const state = this.state;
    if (!state) throw new Error("Setup wizard has not started.");
    return this.snapshot();
  }

  private advance(step: SetupStepId, deferred: boolean): void {
    if (!this.state) return;
    const completed = deferred ? this.state.completed_steps : [...this.state.completed_steps, step];
    const deferredSteps = deferred
      ? [...this.state.deferred_steps, step]
      : this.state.deferred_steps;
    const nextStep = sequence[sequence.indexOf(step) + 1] ?? "summary";
    this.state = {
      ...this.state,
      current_step: nextStep,
      completed_steps: completed,
      deferred_steps: deferredSteps,
      configuration: this.configurationStore.snapshot(),
    };
  }

  private snapshot(): SetupState {
    if (!this.state) throw new Error("Setup wizard has not started.");
    return {
      ...this.state,
      completed_steps: [...this.state.completed_steps],
      deferred_steps: [...this.state.deferred_steps],
      configuration: this.configurationStore.snapshot(),
    };
  }

  private async collectInitialInventory(): Promise<SystemInventory | undefined> {
    const collector = this.options.inventory;
    if (!collector) return undefined;

    const permissions = this.options.permissions;
    if (!permissions) throw new Error("Initial inventory requires a permission store.");
    const grants = new Map(permissions.list().map((grant) => [grant.source, grant.granted]));
    for (const source of ["applications", "filesystem"] as const) {
      if (grants.get(source) !== true) {
        throw new Error(`Initial inventory requires the ${source} permission.`);
      }
    }

    const approvedScopes = this.options.grantedFilesystemScopes?.() ?? [];
    const result = await collector.collect();
    for (const observedScope of result.granted_filesystem_scopes) {
      if (!approvedScopes.some((approved) => isContainedPath(observedScope.path, approved))) {
        throw new Error(
          `Initial inventory reported a path outside approved filesystem scopes: ${observedScope.path}`,
        );
      }
    }
    return result;
  }

  private error(message: string): ErrorInfo {
    return { code: "NOVA-CFG001", message, retryable: false };
  }
}

function isContainedPath(candidate: string, scope: string): boolean {
  const normalize = (value: string) =>
    value
      .replaceAll("/", "\\")
      .replace(/[\\]+$/u, "")
      .toLowerCase();
  const normalizedCandidate = normalize(candidate);
  const normalizedScope = normalize(scope);
  return (
    normalizedCandidate === normalizedScope ||
    normalizedCandidate.startsWith(`${normalizedScope}\\`)
  );
}
