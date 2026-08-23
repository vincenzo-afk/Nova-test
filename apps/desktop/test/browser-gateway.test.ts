import { describe, expect, it } from "vitest";
import { parseBrowserMetadataEvent } from "../src/main/browser-gateway.js";

const valid = {
  type: "tab_updated",
  browser: "chromium",
  tab_id: 42,
  window_id: 7,
  url: "https://example.test/docs/page?token=secret#fragment",
  title: "Documentation",
  active: true,
};

describe("browser metadata gateway parser", () => {
  it("accepts the bounded tab metadata shape", () => {
    expect(parseBrowserMetadataEvent(valid)).toMatchObject({
      ok: true,
      value: {
        type: "tab_updated",
        browser: "chromium",
        tab_id: 42,
        window_id: 7,
        url: valid.url,
        title: "Documentation",
        active: true,
      },
    });
  });

  it("rejects unsafe URLs and page-content fields before runtime dispatch", () => {
    expect(parseBrowserMetadataEvent({ ...valid, url: "javascript:alert(1)" })).toMatchObject({
      ok: false,
      error: { code: "NOVA-TL002" },
    });
    expect(
      parseBrowserMetadataEvent({ ...valid, body: "PAGE BODY MUST NOT ENTER THE GATEWAY" }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
  });

  it("rejects unbounded identifiers and titles", () => {
    expect(parseBrowserMetadataEvent({ ...valid, browser: "x".repeat(65) })).toMatchObject({
      ok: false,
      error: { code: "NOVA-TL002" },
    });
    expect(parseBrowserMetadataEvent({ ...valid, title: "x".repeat(513) })).toMatchObject({
      ok: false,
      error: { code: "NOVA-TL002" },
    });
  });
});
