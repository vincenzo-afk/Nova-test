# Browser Observer

## Purpose

Observes tab and navigation state (URL, page title) in the user's browser
to support project-context awareness and the "what was I researching"
class of use case, via a browser extension rather than any lower-level,
less transparent interception mechanism.

## Scope

Browser-specific capture logic and its explicit content exclusions.
Shared framework behavior is `docs/03-runtime/observer.md`.

## Mechanism

Implemented as a browser extension communicating with the local NOVA
runtime — a visible, inspectable integration point, consistent with the
project's preference for structured, sanctioned access mechanisms over
lower-level interception. This is also the highest-priority mechanism per
`docs/06-tools/execution-priority.md`'s general preference for
API-level access over less structured alternatives, applied here to
observation rather than execution.

## Captured signals

The initial implementation uses the explicit `browser_metadata` permission and a visible Manifest V3 extension. The extension observes `tabs.onCreated`, `tabs.onUpdated`, `tabs.onActivated`, and `tabs.onRemoved`, then sends bounded tab metadata through Chrome Native Messaging to the local named-pipe API Gateway. The extension requests only the `tabs` permission: Chrome documents that this permission exposes the sensitive `url`, `title`, `pendingUrl`, and `favIconUrl` tab properties without requiring broad host permissions [1].

Tab open/close/switch, URL (domain and path; query parameters containing
likely-sensitive data are stripped by default), and page title are allowed. Nova accepts only HTTP(S) URLs, removes credentials, query strings, and fragments before publication, bounds titles, coalesces pending state per tab, and keeps events ephemeral unless a task explicitly adopts them into Working Memory.

## Current implementation boundary

This slice is metadata observation only. It does not include content scripts, page-body reads, form-field or entered-text capture, password or payment capture, DOM automation, browser navigation control, screenshots, OCR, or vision fallback. Those capabilities require separate documented contracts, permissions, and tests; they must not be inferred from the presence of the extension.

## Explicit exclusions

Form field contents, entered text, passwords, payment information, and
the rendered content of the page itself are not captured by this
observer under any permission level. A use case requiring page content
(e.g., "summarize this article") belongs to a future explicit, in-the-moment
browser-agent contract and must never be implemented by expanding this
continuous metadata observer.

## Per-domain scoping

Beyond the general browser-observation permission, the user can exclude
specific domains entirely (e.g., banking sites) from even the
metadata-level capture described above. The persisted configuration field is
`permissions.browser_excluded_domains`, containing hostnames or `*.hostname`
wildcards. The list is validated by `ConfigurationStore` and can be edited in
Desktop Settings. The observer checks the exclusion against the normalized
HTTP(S) hostname before queuing or publishing an event, so excluded-domain
activity never reaches the event bus or Memory in any form, not even as a
tab-open/tab-close event. Updating the list also purges pending events that
become excluded.

## Installation surface and limitation

`apps/browser-extension` contains the inspectable extension source, a
Manifest V3 build script, and the Native Messaging host. Its
`native-host/com.nova.browser.json` is intentionally an installation template:
`__NOVA_EXTENSION_ID__` must be replaced with the installed extension ID and
`__NOVA_NATIVE_HOST_PATH__` with the absolute host executable path by a
Windows installer or an explicit user-managed installation step. The current
source-checkout bootstrap does not claim to register that host automatically,
and no live Windows/browser installation validation has been performed in the
sandbox.

## Future correlation with project context

Cross-referencing URL and title against Knowledge Graph project entities
(`docs/04-memory/entity-resolution.md`) is a future consumer-level feature.
This observer slice emits bounded metadata only; it does not infer project
membership or silently attach browser activity to a task.

## Related documents

- [Chrome Tabs API permission reference][1]
- [Chrome extension permission declarations][2]

- `docs/25-failure-modes/FM-09-browser-and-vision.md` — failure modes for this subsystem
- `docs/03-runtime/observer.md` — the shared framework this source
  implements
- `docs/10-security/permissions.md` — the domain-exclusion and content
  exclusion model
- `docs/04-memory/entity-resolution.md` — project-context correlation

[1]: https://developer.chrome.com/docs/extensions/reference/api/tabs "Chrome tabs API"
[2]: https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions "Chrome extension permission declarations"
