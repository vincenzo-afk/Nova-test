import { err, ok, type Result, type ServiceState } from "./contracts.js";

const transitions: Readonly<Record<ServiceState, readonly ServiceState[]>> = {
  Created: ["Initializing"],
  Initializing: ["Healthy", "Failed"],
  Healthy: ["Degraded", "Stopping"],
  Degraded: ["Healthy", "Stopping", "Restarting"],
  Restarting: ["Initializing", "Failed"],
  Stopping: ["Stopped"],
  Stopped: [],
  Failed: ["Restarting"],
};

export class LifecycleStateMachine {
  private currentState: ServiceState;

  constructor(initialState: ServiceState = "Created") {
    this.currentState = initialState;
  }

  state(): ServiceState {
    return this.currentState;
  }

  transition(nextState: ServiceState): Result<ServiceState> {
    const allowed = transitions[this.currentState].includes(nextState);
    if (!allowed) {
      return err({
        code: "NOVA-EVT001",
        message: `Illegal lifecycle transition: ${this.currentState} -> ${nextState}.`,
        retryable: false,
        details: { from: this.currentState, to: nextState },
      });
    }

    this.currentState = nextState;
    return ok(nextState);
  }
}

export const lifecycleTransitions = transitions;
