# Feature Catalog

Complements `docs/01-product/feature-list.md` — organized by user-facing
surface (Chat, Voice, Memory Explorer, Workflow Builder, Plugin
Marketplace, Provider Settings, Device Pairing, Command Palette,
Notifications, Search) rather than by capability category and phase.
`feature-list.md` remains the canonical scope boundary (per its own
Scope section: a feature not listed there and not on `ROADMAP.md` Phase
5 is out of scope, full stop); every entry here must also appear there.
This document adds no scope of its own — it is a different index over
the same feature set, for readers thinking in terms of "what does the
Chat surface do" rather than "what capabilities exist."

The full user-facing feature list grouped by surface: Chat, Voice, Memory Explorer, Workflow Builder, Plugin Marketplace, Provider Settings, Device Pairing, Command Palette, Notifications, Search. Most entries link to a `40-screens/` spec and a `31-user-flows/` flow; three are overlay/system-level UI rather than a dedicated full screen, and link elsewhere instead: Command Palette (`docs/09-ui/command-palette.md`), Notifications (`docs/29-product/notifications.md`, `docs/07-observers/notifications.md`), and Search (`docs/29-product/search.md`, `docs/04-memory/search.md`) — there is no `command-palette-screen.md`, `notifications-screen.md`, or `search-screen.md`, and none should be added unless one of these becomes a dedicated full-page surface rather than an overlay/inline feature.

## System and utility screens

Five additional `40-screens/` files are not user-facing "features" in
the sense above and so are intentionally not among the 10 surfaces —
`home-screen.md` (status dashboard), `settings-screen.md` (configuration
hub, matching `docs/29-product/settings.md`'s taxonomy),
`diagnostics-screen.md` (service health and self-test results),
`logs-screen.md` (searchable raw event/action log), and
`updates-screen.md` (update availability, changelog, rollback control).
Listed here explicitly because nothing else in the repository linked to
them, which risked them reading as orphaned/undocumented rather than
deliberately-scoped-out-of-the-feature-list.
