# Navigation

> **Corrected undercounted destination list.** This file previously
> named only 5 sidebar destinations, but `docs/40-screens/` defines 12
> screen specs that each cite this document for "persistent sidebar
> nav" placement — leaving 7 screens (Home, Device, Diagnostics, Logs,
> Provider, Updates, Voice) with no documented navigation path at all.
> Corrected below using each screen spec's own stated purpose,
> `docs/31-user-flows/settings-flow.md`'s note that Settings is grouped
> to match `docs/29-product/settings.md`'s taxonomy, and
> `docs/40-screens/voice-screen.md`'s own description of itself as a
> "full-screen voice interaction mode" (which is why it is not a sidebar
> row at all — same pattern as `docs/09-ui/ui-overview.md`'s Overlay,
> reached by trigger rather than sidebar).

Primary nav is a persistent sidebar with six top-level destinations:
**Home**, **Chat**, **Memory**, **Workflows**, **Plugins**, **Settings**
— no destination is more than one click from any other, per
`31-user-flows/`.

**Settings** expands to five sub-destinations, matching the
architecture-doc taxonomy `docs/29-product/settings.md` requires a 1:1
mapping to: **Provider** (`docs/18-providers/`), **Device**
(`docs/28-multi-device-protocol/`), **Plugins management**
(`docs/16-extensibility/`, cross-linked from the top-level Plugins
destination), **Diagnostics** (`docs/07-observers/`,
`docs/11-performance/`), **Logs** (`docs/26-system-reference/`'s event
catalog), and **Updates** (`docs/13-devops/`). Each is still one click
from Settings and therefore two clicks from any other top-level
destination — the "no more than one click" rule applies to the six
top-level destinations, not to every leaf screen in the tree.

**Voice** is not a sidebar destination. It is a full-screen overlay mode
(`docs/40-screens/voice-screen.md`) entered via a persistent
mute/cancel-adjacent trigger from Chat or a system-level wake-word/
push-to-talk activation (`docs/31-user-flows/voice-flow.md`), and exited
back to whichever surface invoked it — the same reachable-by-trigger
pattern `docs/09-ui/ui-overview.md` already establishes for Overlay,
rather than a seventh sidebar row.
