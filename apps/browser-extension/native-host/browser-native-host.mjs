/* global Buffer, clearTimeout, setTimeout */

import { createHash, randomUUID } from "node:crypto";
import { createConnection } from "node:net";
import { join } from "node:path";
import process from "node:process";

const READY_FRAME = "__nova_bus_ready__";
const MAX_NATIVE_MESSAGE_BYTES = 64 * 1024;
const MAX_TITLE_LENGTH = 512;
const MAX_BROWSER_LENGTH = 64;
const MAX_URL_LENGTH = 4096;
const allowedEventFields = new Set([
  "type",
  "browser",
  "tab_id",
  "window_id",
  "url",
  "title",
  "active",
]);
const logicalPipePath =
  process.env.NOVA_API_PIPE_PATH ??
  join(process.env.APPDATA ?? process.env.LOCALAPPDATA ?? process.cwd(), "Nova", "nova-api.sock");

const nativeInput = { buffer: Buffer.alloc(0), queue: Promise.resolve() };

process.stdin.on("data", (chunk) => {
  nativeInput.buffer = Buffer.concat([nativeInput.buffer, chunk]);
  while (nativeInput.buffer.length >= 4) {
    const length = nativeInput.buffer.readUInt32LE(0);
    if (length > MAX_NATIVE_MESSAGE_BYTES) {
      nativeInput.buffer = Buffer.alloc(0);
      writeNativeMessage({ ok: false, error: "Native message exceeds the bounded input size." });
      process.exitCode = 1;
      return;
    }
    if (nativeInput.buffer.length < length + 4) return;
    const frame = nativeInput.buffer.subarray(4, length + 4);
    nativeInput.buffer = nativeInput.buffer.subarray(length + 4);
    nativeInput.queue = nativeInput.queue.then(() => handleNativeMessage(frame));
  }
});

process.stdin.on("end", () => {
  nativeInput.queue.finally(() => process.exit(0));
});

async function handleNativeMessage(frame) {
  let event;
  try {
    event = JSON.parse(frame.toString("utf8"));
  } catch {
    writeNativeMessage({ ok: false, error: "Native message is not valid JSON." });
    return;
  }
  if (!isValidEvent(event)) {
    writeNativeMessage({ ok: false, error: "Browser metadata event failed validation." });
    return;
  }
  try {
    const response = await publishToNova(event);
    writeNativeMessage(response);
  } catch (error) {
    writeNativeMessage({
      ok: false,
      error: error instanceof Error ? error.message : "Nova local runtime is unavailable.",
    });
  }
}

function isValidEvent(event) {
  return (
    event &&
    typeof event === "object" &&
    !Array.isArray(event) &&
    Object.keys(event).every((key) => allowedEventFields.has(key)) &&
    ["tab_opened", "tab_closed", "tab_updated", "tab_activated"].includes(event.type) &&
    event.browser === "chromium" &&
    event.browser.length <= MAX_BROWSER_LENGTH &&
    Number.isInteger(event.tab_id) &&
    event.tab_id >= 0 &&
    Number.isInteger(event.window_id) &&
    event.window_id >= 0 &&
    typeof event.active === "boolean" &&
    (event.url === undefined ||
      (typeof event.url === "string" && event.url.length <= MAX_URL_LENGTH)) &&
    (event.title === undefined ||
      (typeof event.title === "string" && event.title.length <= MAX_TITLE_LENGTH))
  );
}

function publishToNova(event) {
  const requestId = randomUUID();
  const replyTo = `api.internal.response.${requestId}`;
  const message = {
    message_id: randomUUID(),
    topic: "api.internal.request",
    schema_version: "1.0.0",
    timestamp: new Date().toISOString(),
    correlation_id: randomUUID(),
    source_service: "browser.extension.native-host",
    payload: {
      operation: "browser.activity.capture",
      request_id: requestId,
      reply_to: replyTo,
      data: event,
    },
  };
  const encoded = Buffer.from(`${JSON.stringify(message)}\n`, "utf8");
  if (encoded.byteLength > MAX_NATIVE_MESSAGE_BYTES) {
    return Promise.reject(new Error("Browser metadata request exceeds the bounded size."));
  }

  return new Promise((resolve, reject) => {
    const socket = createConnection(namedPipeTransportPath(logicalPipePath));
    let incoming = "";
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      callback(value);
    };
    const timeout = setTimeout(
      () => finish(reject, new Error("Nova local runtime response timed out.")),
      5_000,
    );
    socket.on("error", (error) => {
      clearTimeout(timeout);
      finish(reject, new Error(`Nova local runtime connection failed: ${error.message}`));
    });
    socket.on("data", (chunk) => {
      incoming += chunk.toString("utf8");
      let separator = incoming.indexOf("\n");
      while (separator >= 0) {
        const line = incoming.slice(0, separator);
        incoming = incoming.slice(separator + 1);
        separator = incoming.indexOf("\n");
        if (line === READY_FRAME) {
          socket.write(encoded);
          continue;
        }
        try {
          const response = JSON.parse(line);
          if (response.topic !== replyTo) continue;
          clearTimeout(timeout);
          const payload = response.payload;
          if (payload?.ok === true) finish(resolve, { ok: true });
          else finish(resolve, { ok: false, error: "Nova rejected the browser metadata event." });
        } catch {
          clearTimeout(timeout);
          finish(reject, new Error("Nova local runtime returned an invalid response."));
        }
      }
    });
  });
}

function namedPipeTransportPath(path) {
  if (process.platform !== "win32") return path;
  const suffix = createHash("sha256").update(path).digest("hex").slice(0, 24);
  return `\\\\.\\pipe\\nova-${suffix}`;
}

function writeNativeMessage(value) {
  const encoded = Buffer.from(JSON.stringify(value), "utf8");
  if (encoded.byteLength > MAX_NATIVE_MESSAGE_BYTES) return;
  const header = Buffer.alloc(4);
  header.writeUInt32LE(encoded.byteLength, 0);
  process.stdout.write(Buffer.concat([header, encoded]));
}
