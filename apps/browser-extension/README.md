# NOVA Browser Metadata Extension

This package is the visible browser surface for Nova’s initial browser slice. It observes browser tab metadata through Manifest V3 `tabs` events and sends bounded metadata through Chrome Native Messaging to Nova’s local named-pipe API Gateway. It does not read page content and does not provide browser automation.

## Scope and permission boundary

The extension requests only the Chrome `tabs` permission. It has no content scripts, host permissions, scripting permissions, cookies access, web-request interception, screenshot capability, DOM access, or page-body extraction. The service worker emits tab-created, tab-updated, tab-activated, and tab-removed metadata. Nova’s runtime is the enforcement boundary: it requires the explicit `browser_metadata` grant, accepts only HTTP(S) URLs, removes credentials/query strings/fragments, bounds titles, applies `permissions.browser_excluded_domains` before publication, and coalesces pending state per tab.

Form fields, entered text, passwords, payment data, rendered page content, DOM state, browser navigation control, OCR, screenshots, and vision fallback are intentionally deferred to separate future contracts. Their absence is a release requirement for this package, not an implementation gap to work around locally.

## Build and check

Run these commands from the repository root:

```bash
pnpm --filter @nova/browser-extension typecheck
pnpm --filter @nova/browser-extension build
```

`typecheck` validates the manifest JSON and checks the service worker and Native Messaging host syntax with Node. `build` creates a deterministic `apps/browser-extension/dist` directory containing the manifest, service worker, and Native Messaging host files.

## Native Messaging installation

`native-host/com.nova.browser.json` is a deliberate installation template. A user-managed Windows installation step or future packaged installer must replace both placeholders:

| Placeholder                 | Required value                                                                  |
| --------------------------- | ------------------------------------------------------------------------------- |
| `__NOVA_EXTENSION_ID__`     | The actual installed Chrome extension ID, used in `allowed_origins`             |
| `__NOVA_NATIVE_HOST_PATH__` | The absolute path to the installed Native Messaging host executable or launcher |

The host connects only to Nova’s local named-pipe API path. `NOVA_API_PIPE_PATH` may be supplied by the host-local installation environment; it is not a browser-provided message field. The current `pnpm install:windows` source-checkout bootstrap does not register the host, create registry entries, or claim to be a packaged installer. Do not treat the template as installed until the browser reports the Native Messaging host as available.

## Message flow

The service worker sends a bounded object such as:

```json
{
  "type": "tab_updated",
  "browser": "chromium",
  "tab_id": 42,
  "window_id": 7,
  "url": "https://example.test/docs/page?token=not-forwarded",
  "title": "Documentation",
  "active": true
}
```

The Native Messaging host validates the message size and primitive fields, wraps it in Nova’s newline-framed `api.internal.request` envelope, and sends it over the local named-pipe API Gateway as `browser.activity.capture`. The runtime observer performs the authoritative permission, URL, title, and domain-exclusion validation. Any event without an explicit task remains ephemeral to the event bus and is not written to Working Memory; task adoption uses the memory indexer’s browser-specific redaction path.

## Current validation status

The package has sandbox structural tests, JavaScript syntax checks, manifest validation, and build output checks. No Windows host or live browser is connected to this task, so Chrome installation, Native Messaging registration, named-pipe interoperability on Windows, and real tab lifecycle delivery remain deferred and are not represented as passing evidence.
