# Product Failure Cases


These are behavior-level scenarios, distinct from the technical failure
modes elsewhere, that must have a defined and tested product response —
not just a technical fallback.

- **User abandons onboarding partway through.** State must be resumable,
  not restarted from step one, and no half-configured observer may be
  left silently running with permissions the user never confirmed.
- **User denies a requested permission.** The feature that needed it
  degrades gracefully and explains exactly what's unavailable and why —
  never a generic broken state.
- **User disconnects a device mid-sync.** The sync resumes from
  checkpoint on reconnect; no data loss, no duplicate application of
  already-synced changes.
- **User changes AI provider during an active workflow.** In-flight steps
  finish on the original provider where possible; new steps use the new
  routing; the user sees which provider handled which step.
- **User has multiple workspaces with conflicting settings.** Each
  workspace is isolated by default; conflicts are only possible for
  explicitly shared settings, and those show which workspace's value is
  active.
- **User reaches storage limits.** NOVA warns before hard-blocking,
  suggests what's safe to prune (with garbage-collection candidates
  surfaced first), and never silently drops new data to make room.
- **User revokes API keys.** Every in-flight and scheduled task using
  that provider fails clearly and reroutes if a fallback is configured,
  rather than retrying against invalid credentials indefinitely.
- **User accidentally deletes memories.** A short, clearly-communicated
  undo window exists before permanent deletion (aligned with
  `docs/10-security/permissions.md`'s data-control commitments).
- **User starts voice while another device is already recording.**
  NOVA disambiguates which device must be authoritative for the
  session rather than both processing the same audio into duplicate
  actions.
