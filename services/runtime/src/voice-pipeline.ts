import { err, ok, type ErrorInfo, type Result } from "@nova/shared";

export type VoiceState = "Idle" | "Listening" | "Transcribing" | "Thinking" | "Speaking";

export interface VoiceDependencies {
  readonly wakeWordDetector: {
    start: () => Promise<void>;
    stop: () => Promise<void>;
  };
  readonly transcribe: (
    audio: unknown,
  ) => AsyncIterable<{ readonly text: string; readonly final: boolean }>;
  readonly plan: (transcript: string) => Promise<string>;
  readonly speak: (response: string) => Promise<void>;
  readonly cancelSpeech: () => void;
  readonly onPartialTranscript?: (text: string) => void;
}

export interface WakeClaim {
  readonly deviceId: string;
  readonly detectedAt: number;
  readonly confidence: number;
}

export interface VoicePipelineOptions {
  readonly primaryDeviceId?: string;
}

export interface VoiceTurn {
  readonly transcript: string;
  readonly response: string;
}

export class VoicePipeline {
  private state: VoiceState = "Idle";
  private readonly primaryDeviceId: string | undefined;

  public constructor(
    private readonly dependencies: VoiceDependencies,
    options: VoicePipelineOptions = {},
  ) {
    this.primaryDeviceId = options.primaryDeviceId;
  }

  public async start(): Promise<Result<{ state: VoiceState }>> {
    try {
      await this.dependencies.wakeWordDetector.start();
      this.state = "Listening";
      return ok({ state: this.state });
    } catch {
      return err(this.error("Wake-word detector could not start."));
    }
  }

  public async stop(): Promise<Result<{ state: VoiceState }>> {
    try {
      await this.dependencies.wakeWordDetector.stop();
      this.state = "Idle";
      return ok({ state: this.state });
    } catch {
      return err(this.error("Wake-word detector could not stop."));
    }
  }

  public async processUtterance(audio: unknown): Promise<Result<VoiceTurn>> {
    if (this.state !== "Listening")
      return err(this.error("Voice utterance requires an active local wake-word detector."));
    this.state = "Transcribing";
    let transcript = "";
    try {
      for await (const chunk of this.dependencies.transcribe(audio)) {
        transcript = chunk.text;
        this.dependencies.onPartialTranscript?.(chunk.text);
        if (chunk.final) break;
      }
      if (!transcript) return err(this.error("Streaming speech-to-text returned no transcript."));
      this.state = "Thinking";
      const response = await this.dependencies.plan(transcript);
      this.state = "Speaking";
      await this.dependencies.speak(response);
      this.state = "Listening";
      return ok({ transcript, response });
    } catch {
      this.state = "Listening";
      return err(
        this.error("Voice pipeline failed during transcription, planning, or speech output."),
      );
    }
  }

  public bargeIn(): Result<{ state: VoiceState }> {
    this.dependencies.cancelSpeech();
    this.state = "Listening";
    return ok({ state: this.state });
  }

  public resolveWakeClaims(claims: readonly WakeClaim[]): {
    winnerDeviceId: string | null;
    suppressedDeviceIds: readonly string[];
  } {
    const ordered = [...claims].sort((left, right) => {
      if (left.detectedAt !== right.detectedAt) return left.detectedAt - right.detectedAt;
      if (left.confidence !== right.confidence) return right.confidence - left.confidence;
      if (left.deviceId === this.primaryDeviceId) return -1;
      if (right.deviceId === this.primaryDeviceId) return 1;
      return left.deviceId.localeCompare(right.deviceId);
    });
    const winnerDeviceId = ordered[0]?.deviceId ?? null;
    return {
      winnerDeviceId,
      suppressedDeviceIds: claims
        .filter((claim) => claim.deviceId !== winnerDeviceId)
        .map((claim) => claim.deviceId),
    };
  }

  public currentState(): VoiceState {
    return this.state;
  }

  private error(message: string): ErrorInfo {
    return { code: "NOVA-AI002", message, retryable: false };
  }
}
