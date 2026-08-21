# Landmines: Tool Execution & Permissions


## Where this breaks

1. **Permission check happens in the UI layer only, not re-checked in
   the executor.** Any code path that reaches the executor without going
   through the UI (a workflow, an autonomous trigger, a replayed task)
   bypasses the check entirely if it's not enforced at the executor
   boundary itself.
2. **Permission scope checked at the tool level but not the argument
   level.** A "send email" permission might be granted, but the specific
   recipient/content must still be checked against any documented
   allow/deny rules (e.g. no auto-sending to addresses outside the user's
   contact graph) — coarse-grained checks miss argument-level abuse.
3. **Destructive tool calls (delete, overwrite, send) missing a
   dry-run/confirmation path** required by `docs/10-security/permission-escalation.md`
   for actions above a defined risk tier.
4. **Tool timeout not distinguishing "tool is slow" from "tool
   succeeded but response was lost"** — blindly retrying a timed-out
   destructive tool call can duplicate the action (e.g. sending an email
   twice) if it actually succeeded server-side before the timeout fired.
5. **Sandboxed tool given a broader filesystem/network scope than
   documented** because the sandbox boundary was implemented against
   convenience (e.g. "just mount the whole home directory for now") — any
   sandbox scope wider than the tool's documented need is a defect, not a
   simplification.
6. **Tool output not size-bounded before being stored/returned** — a
   tool that lists files or fetches a web page can return unbounded data;
   without a cap, this can blow the context budget of the next model call
   or memory footprint.
7. **Revoked permission not propagated to already-scheduled recurring
   tasks/workflows.** If a user revokes a permission, every future
   scheduled execution using that permission must be checked again at
   execution time, not just at schedule time.
