import { err, ok, type Result } from "@nova/shared";

export type BrowserMetadataEvent = {
  readonly type: "tab_opened" | "tab_closed" | "tab_updated" | "tab_activated";
  readonly browser: string;
  readonly tab_id: number;
  readonly window_id: number;
  readonly url?: string;
  readonly title?: string;
  readonly active: boolean;
  readonly correlation_id?: string;
};

const browserEventTypes = new Set<BrowserMetadataEvent["type"]>([
  "tab_opened",
  "tab_closed",
  "tab_updated",
  "tab_activated",
]);
const MAX_BROWSER_LENGTH = 64;
const MAX_TITLE_LENGTH = 512;
const MAX_URL_LENGTH = 4096;
const allowedFields = new Set([
  "type",
  "browser",
  "tab_id",
  "window_id",
  "url",
  "title",
  "active",
  "correlation_id",
]);

export function parseBrowserMetadataEvent(value: unknown): Result<BrowserMetadataEvent> {
  if (!isRecord(value)) return invalidEvent();
  if (Object.keys(value).some((key) => !allowedFields.has(key))) return invalidEvent();
  const type = value.type;
  const browser = value.browser;
  const tabId = value.tab_id;
  const windowId = value.window_id;
  const url = value.url;
  const title = value.title;
  const active = value.active;
  const correlationId = value.correlation_id;
  if (
    typeof type !== "string" ||
    !browserEventTypes.has(type as BrowserMetadataEvent["type"]) ||
    typeof browser !== "string" ||
    browser.length === 0 ||
    browser.length > MAX_BROWSER_LENGTH ||
    typeof tabId !== "number" ||
    !Number.isInteger(tabId) ||
    tabId < 0 ||
    typeof windowId !== "number" ||
    !Number.isInteger(windowId) ||
    windowId < 0 ||
    (url !== undefined &&
      (typeof url !== "string" || url.length > MAX_URL_LENGTH || !isHttpUrl(url))) ||
    (title !== undefined && (typeof title !== "string" || title.length > MAX_TITLE_LENGTH)) ||
    typeof active !== "boolean" ||
    (correlationId !== undefined &&
      (typeof correlationId !== "string" || correlationId.length > 128))
  ) {
    return invalidEvent();
  }
  return ok({
    type: type as BrowserMetadataEvent["type"],
    browser,
    tab_id: tabId,
    window_id: windowId,
    ...(url === undefined ? {} : { url }),
    ...(title === undefined ? {} : { title }),
    active,
    ...(correlationId === undefined ? {} : { correlation_id: correlationId }),
  });
}

function isHttpUrl(value: string): boolean {
  try {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalidEvent(): Result<never> {
  return err({
    code: "NOVA-TL002",
    message: "Browser metadata gateway payload is malformed or outside the metadata boundary.",
    retryable: false,
  });
}
