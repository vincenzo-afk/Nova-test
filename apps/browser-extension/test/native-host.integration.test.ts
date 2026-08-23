import { createServer } from "node:net";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })),
  );
});

describe("Native Messaging host local bridge", () => {
  it("wraps one bounded extension event and receives the correlated gateway response", async () => {
    const directory = await mkdtemp(join(tmpdir(), "nova-browser-host-"));
    temporaryDirectories.push(directory);
    const pipePath = join(directory, "nova-api.sock");
    const requests: Array<Record<string, unknown>> = [];
    const server = createServer((socket) => {
      socket.write("__nova_bus_ready__\n");
      let incoming = "";
      socket.on("data", (chunk: Buffer) => {
        incoming += chunk.toString("utf8");
        const separator = incoming.indexOf("\n");
        if (separator < 0) return;
        const message = JSON.parse(incoming.slice(0, separator)) as Record<string, unknown>;
        incoming = incoming.slice(separator + 1);
        requests.push(message);
        const payload = message.payload as { readonly reply_to?: unknown };
        if (typeof payload.reply_to !== "string") return;
        socket.write(
          `${JSON.stringify({
            topic: payload.reply_to,
            payload: { ok: true },
          })}\n`,
        );
      });
    });
    await new Promise<void>((resolveListen, rejectListen) => {
      server.once("error", rejectListen);
      server.listen(pipePath, resolveListen);
    });

    const child = spawn(
      process.execPath,
      [resolve(process.cwd(), "apps/browser-extension/native-host/browser-native-host.mjs")],
      {
        env: { ...process.env, NOVA_API_PIPE_PATH: pipePath },
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
    try {
      const output = new Promise<Record<string, unknown>>((resolveOutput, rejectOutput) => {
        let buffer = Buffer.alloc(0);
        child.stdout.on("data", (chunk: Buffer) => {
          buffer = Buffer.concat([buffer, chunk]);
          if (buffer.length < 4) return;
          const length = buffer.readUInt32LE(0);
          if (buffer.length < length + 4) return;
          try {
            resolveOutput(
              JSON.parse(buffer.subarray(4, length + 4).toString("utf8")) as Record<
                string,
                unknown
              >,
            );
          } catch (error) {
            rejectOutput(error);
          }
        });
        child.once("error", rejectOutput);
        child.stderr.on("data", (chunk: Buffer) => rejectOutput(new Error(chunk.toString("utf8"))));
      });

      const event = {
        type: "tab_updated",
        browser: "chromium",
        tab_id: 42,
        window_id: 7,
        url: "https://example.test/docs/page?secret=removed#fragment",
        title: "Documentation",
        active: true,
      };
      const encoded = Buffer.from(JSON.stringify(event), "utf8");
      const frame = Buffer.alloc(4 + encoded.byteLength);
      frame.writeUInt32LE(encoded.byteLength, 0);
      encoded.copy(frame, 4);
      child.stdin.write(frame);

      await expect(output).resolves.toEqual({ ok: true });
      expect(requests).toHaveLength(1);
      expect(requests[0]).toMatchObject({
        topic: "api.internal.request",
        payload: {
          operation: "browser.activity.capture",
          data: event,
        },
      });
      expect(JSON.stringify(requests[0])).toContain("secret=removed");
      child.stdin.end();
    } finally {
      child.kill();
      await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
    }
  }, 10_000);
});
