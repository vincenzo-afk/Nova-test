import { describe, expect, it, vi } from "vitest";
import { VoicePipeline, type VoiceDependencies } from "../src/voice-pipeline.js";

const deps = (): VoiceDependencies => ({
  wakeWordDetector: { start: vi.fn(async () => undefined), stop: vi.fn(async () => undefined) },
  transcribe: vi.fn(async function* () {
    yield { text: "hello", final: false };
    yield { text: "hello nova", final: true };
  }),
  plan: vi.fn(async (text) => `response to ${text}`),
  speak: vi.fn(async () => undefined),
  cancelSpeech: vi.fn(),
});

describe("VoicePipeline", () => {
  it("keeps wake-word detection local and activates the utterance pipeline only after wake", async () => {
    const dependencies = deps();
    const pipeline = new VoicePipeline(dependencies);

    expect(await pipeline.start()).toMatchObject({ ok: true, value: { state: "Listening" } });
    expect(dependencies.wakeWordDetector.start).toHaveBeenCalledOnce();
    expect(await pipeline.processUtterance("audio")).toMatchObject({
      ok: true,
      value: { transcript: "hello nova", response: "response to hello nova" },
    });
    expect(dependencies.transcribe).toHaveBeenCalledOnce();
    expect(dependencies.plan).toHaveBeenCalledWith("hello nova");
  });

  it("resolves competing wake claims by timestamp, confidence, then deterministic device id", () => {
    const pipeline = new VoicePipeline(deps(), { primaryDeviceId: "desktop" });

    expect(
      pipeline.resolveWakeClaims([
        { deviceId: "phone", detectedAt: 100, confidence: 0.9 },
        { deviceId: "desktop", detectedAt: 100, confidence: 0.9 },
        { deviceId: "tablet", detectedAt: 99, confidence: 0.1 },
      ]),
    ).toEqual({ winnerDeviceId: "tablet", suppressedDeviceIds: ["phone", "desktop"] });

    expect(
      pipeline.resolveWakeClaims([
        { deviceId: "phone", detectedAt: 100, confidence: 0.9 },
        { deviceId: "desktop", detectedAt: 100, confidence: 0.9 },
      ]),
    ).toEqual({ winnerDeviceId: "desktop", suppressedDeviceIds: ["phone"] });
  });

  it("supports barge-in by cancelling speech and returning to listening", async () => {
    const dependencies = deps();
    const pipeline = new VoicePipeline(dependencies);
    await pipeline.start();

    expect(pipeline.bargeIn()).toMatchObject({ ok: true, value: { state: "Listening" } });
    expect(dependencies.cancelSpeech).toHaveBeenCalledOnce();
  });

  it("rejects processing before the local wake detector is started", async () => {
    const pipeline = new VoicePipeline(deps());

    expect(await pipeline.processUtterance("audio")).toMatchObject({
      ok: false,
      error: { code: "NOVA-AI002" },
    });
  });
});
