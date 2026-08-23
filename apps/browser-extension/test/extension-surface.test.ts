import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const extensionRoot = resolve(process.cwd(), "apps/browser-extension");
const read = (relativePath: string): string =>
  readFileSync(resolve(extensionRoot, relativePath), "utf8");

describe("Nova browser extension surface", () => {
  it("declares a Manifest V3 extension with only tab metadata permissions", () => {
    const manifest = JSON.parse(read("manifest.json")) as {
      readonly manifest_version?: number;
      readonly permissions?: readonly string[];
      readonly host_permissions?: readonly string[];
      readonly background?: { readonly service_worker?: string };
    };

    expect(manifest.manifest_version).toBe(3);
    expect(manifest.permissions).toEqual(["tabs"]);
    expect(manifest.host_permissions).toBeUndefined();
    expect(manifest.background?.service_worker).toBe("service-worker.js");
  });

  it("tracks tab updates and activation through Native Messaging without reading page content", () => {
    const source = read("service-worker.js");
    expect(source).toContain("connectNative");
    expect(source).toContain("tabs.onUpdated");
    expect(source).toContain("tabs.onActivated");
    expect(source).toContain("sendMetadata");
    expect(source).toContain("tab.id");
    expect(source).toContain("tab.url");
    expect(source).toContain("tab.title");
    expect(source).not.toContain("document.body");
    expect(source).not.toContain("innerText");
    expect(source).not.toContain("executeScript");
  });

  it("ships a Native Messaging host manifest and bounded local bridge", () => {
    const manifest = JSON.parse(read("native-host/com.nova.browser.json")) as {
      readonly name?: string;
      readonly type?: string;
      readonly allowed_origins?: readonly string[];
      readonly path?: string;
    };
    const host = read("native-host/browser-native-host.mjs");

    expect(manifest.name).toBe("com.nova.browser");
    expect(manifest.type).toBe("stdio");
    expect(manifest.allowed_origins).toEqual(["chrome-extension://__NOVA_EXTENSION_ID__/"]);
    expect(manifest.path).toBe("__NOVA_NATIVE_HOST_PATH__");
    expect(host).toContain("readUInt32LE");
    expect(host).toContain("writeUInt32LE");
    expect(host).toContain("api.internal.request");
    expect(host).toContain("browser.activity.capture");
    expect(host).toContain("namedPipeTransportPath");
    expect(host).not.toContain("http://");
    expect(host).not.toContain("https://");
  });
});
