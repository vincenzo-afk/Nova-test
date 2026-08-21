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

Tab open/close/switch, URL (domain and path; query parameters containing
likely-sensitive data are stripped by default), and page title.

## Explicit exclusions

Form field contents, entered text, passwords, payment information, and
the rendered content of the page itself are not captured by this
observer under any permission level — a use case requiring page content
(e.g., "summarize this article") is served by an explicit, in-the-moment
user action that reads the current page content for that specific
request, not by continuous background capture of everything browsed.

## Per-domain scoping

Beyond the general browser-observation permission, the user can exclude
specific domains entirely (e.g., banking sites) from even the
metadata-level capture described above — this exclusion list is checked
before any event from that domain is normalized, so excluded-domain
activity never reaches Memory in any form, not even as a
tab-open/tab-close event.

## Correlation with project context

URL and title are cross-referenced against Knowledge Graph project
entities (`docs/04-memory/entity-resolution.md`) to associate browsing
activity with the project the user appears to be actively working on,
feeding the "what was I researching for project X" use case
(`docs/01-product/use-cases.md`) without requiring the user to manually
tag browser activity.

## Related documents

- `docs/25-failure-modes/FM-09-browser-and-vision.md` — failure modes for this subsystem
- `docs/03-runtime/observer.md` — the shared framework this source
  implements
- `docs/10-security/permissions.md` — the domain-exclusion and content
  exclusion model
- `docs/04-memory/entity-resolution.md` — project-context correlation
