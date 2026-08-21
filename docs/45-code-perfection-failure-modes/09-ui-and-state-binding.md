# Landmines: UI & State Binding


## Where this breaks

1. **UI state not reconciled with backend state after a reconnect** —
   after the desktop app reconnects following a network drop, it must
   refetch/resync authoritative state, not assume its last-known local
   state is still correct.
2. **Optimistic UI updates with no rollback path on failure** — showing
   an action as succeeded before the backend confirms, then not reverting
   the UI if the backend call actually failed, leaves the user with a
   UI lying about system state.
3. **Long-running task progress UI with no handling for a task that
   finished before the UI subscribed to its updates** — a race between
   "user opens the task monitor" and "task completes" must not leave the
   UI stuck showing "in progress" forever.
4. **Command palette / chat input not debounced or rate-limited against
   the Planner**, allowing rapid duplicate submissions to queue multiple
   redundant plans for the same request.
5. **Not every required state from a `40-screens/` spec's "Required
   states" list actually implemented** — a screen spec defines several
   required states (loading, empty, populated, error, offline/degraded,
   permission denied if applicable, partial data if applicable) but the
   component only handles "loaded" and "loading," shipping silent blank
   screens for the rest.
6. **Accessibility state (screen reader, reduced motion, high contrast)
   read once at mount instead of subscribed to live** — a user who
   changes OS accessibility settings while NOVA is open must not have
   to restart the app for it to take effect.
