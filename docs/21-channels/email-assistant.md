# Email Assistant

## Purpose

Specifies email as a first-class capability — reading, drafting, and
sending — addressing the requirement "send this email," which v1 docs
left undefined.

## Scope

Email capability domain: connection, drafting, and the send confirmation
gate. Calendar (often bundled with the same account) is
`calendar-assistant.md`.

## Provider model

Email is a Provider domain (`docs/18-providers/provider-interface.md`)
with adapters for common providers (Gmail/Google Workspace via OAuth,
Microsoft 365/Outlook via OAuth, and generic IMAP/SMTP for others),
following `docs/18-providers/credential-management.md`'s OAuth handling.
Multiple accounts (personal, work) register as distinct provider
instances.

## Reading and triage

With read access granted, incoming mail is available to the Planner as
structured, queryable context — subject, sender, thread, attachments —
feeding both direct queries ("do I have anything from X") and background
behaviors (`docs/23-autonomy/background-life-assistant.md`'s morning
summary). Email content is treated with the same grounding and
confidence-attribution requirements as any memory source
(`docs/04-memory/memory-confidence.md`) — NOVA does not paraphrase an
email in a way that overstates certainty about its content.

## Drafting and sending

"Send this email" always follows a draft-then-confirm flow:

1. NOVA composes a draft from the user's instruction and available
   context.
2. The draft is shown in full — recipient, subject, body — before any
   send action.
3. Sending an email is classified as an irreversible action under
   `docs/10-security/permissions.md` (a sent email cannot be unsent) and
   therefore always requires explicit confirmation, with no
   configuration path to disable that gate — this mirrors the same
   restated commitment in `docs/00-overview/non-goals.md` for any
   irreversible action generally.

A user may pre-authorize a narrow class of sends (e.g., "always send my
weekly status update to this exact recipient without asking") as an
explicit, individually configured automation rule — not a blanket
"stop asking me before sending email" setting.

## Scope of access

OAuth scopes requested follow least privilege
(`docs/18-providers/credential-management.md`): read+send scope only,
never account-management or full-Drive-style broad grants, unless a
specific feature explicitly requires more and discloses why.

## Related documents

- `docs/25-failure-modes/FM-11-internet-and-external-apis.md` — failure modes for this subsystem
- `docs/18-providers/credential-management.md` — OAuth handling
- `docs/10-security/permissions.md` — the confirmation gate on sends
- `calendar-assistant.md` — the frequently-paired scheduling capability
- `docs/23-autonomy/background-life-assistant.md` — proactive email
  triage use
