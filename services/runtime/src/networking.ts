import { err, ok, type ErrorInfo, type Result } from "@nova/shared";

export type NetworkPath = "lan" | "direct" | "wan" | "relay";
export type ConnectionState =
  "Disconnected" | "Discovering" | "Authenticating" | "Healthy" | "Degraded" | "Reconnecting";

export interface NetworkTransport {
  readonly path: NetworkPath;
  readonly connect: () => Promise<{ readonly peer_public_key: string }>;
}

export interface NetworkOptions {
  readonly expectedPeerKey: string;
  readonly transports: readonly NetworkTransport[];
  readonly degradationLatencyMs?: number;
}

export interface Connection {
  readonly path: NetworkPath;
  readonly state: "Healthy" | "Degraded";
}

const pathPriority: Record<NetworkPath, number> = { lan: 0, direct: 1, wan: 2, relay: 3 };

export class NetworkDiscoveryManager {
  private currentState: ConnectionState = "Disconnected";
  private connection: Connection | undefined;
  private readonly options: Required<Pick<NetworkOptions, "expectedPeerKey" | "transports">> &
    NetworkOptions;

  public constructor(options: NetworkOptions) {
    this.options = options;
  }

  public async connect(): Promise<Result<Connection>> {
    this.currentState = "Discovering";
    const transports = [...this.options.transports].sort(
      (left, right) => pathPriority[left.path] - pathPriority[right.path],
    );
    for (const transport of transports) {
      this.currentState = "Authenticating";
      try {
        const result = await transport.connect();
        if (result.peer_public_key !== this.options.expectedPeerKey) continue;
        this.connection = { path: transport.path, state: "Healthy" };
        this.currentState = "Healthy";
        return ok(this.connection);
      } catch {
        continue;
      }
    }
    this.currentState = "Disconnected";
    return err(this.error("No authenticated network path is available."));
  }

  public heartbeat(input: {
    readonly latencyMs: number;
    readonly packetLoss: number;
  }): Result<{ readonly state: "Healthy" | "Degraded" }> {
    if (!this.connection) return err(this.error("Network connection is not established."));
    const degraded =
      input.latencyMs > (this.options.degradationLatencyMs ?? 250) || input.packetLoss > 0.05;
    this.currentState = degraded ? "Degraded" : "Healthy";
    this.connection = { ...this.connection, state: this.currentState };
    return ok({ state: this.currentState });
  }

  public state(): ConnectionState {
    return this.currentState;
  }

  private error(message: string): ErrorInfo {
    return { code: "NOVA-NET001", message, retryable: true };
  }
}
