# FM-09: Browser Automation & Vision

## Purpose

Failures in NOVA's ability to perceive and act on visual/web interfaces — the layer most exposed to a constantly-changing external world it doesn't control (third-party websites, screen layouts).

## Scope & Related Documents

This file is part of `docs/25-failure-modes/`, the project-wide failure-mode catalog. It must be read alongside:

- `docs/07-observers/browser.md` - `docs/24-collaboration/browser-agent.md` - `docs/06-tools/vision.md` - `docs/06-tools/vision-everywhere.md`

## Failure Catalog

Each failure is assigned a stable ID (`FM-09-0XX`) for cross-referencing from code comments, incident reports, and other failure-mode files.

| ID | Failure | Trigger Condition | Detection | Severity | Mitigation (prevent) | Recovery (respond) |
|---|---|---|---|---|---|---|
| **FM-09-001** | Button moved / DOM changed | Target site redesigned or A/B-tests its layout, breaking a previously-working selector. | Selector-based action fails to find the expected element. | Medium | Prefer semantic/accessible selectors (role, label) over brittle CSS paths; fall back to vision-based element detection when selectors fail. | Fall back to vision-based click-by-description; if that also fails, surface to the user rather than guessing blindly. |
| **FM-09-002** | CAPTCHA | Site presents a CAPTCHA challenge NOVA cannot solve autonomously. | Page content matches known CAPTCHA patterns. | Medium | Detect CAPTCHA presence early and stop automated attempts rather than retrying into a lockout. | Hand off to the user for manual completion; never attempt to defeat CAPTCHA automatically (policy, not just technical, boundary). |
| **FM-09-003** | Login expired | Session cookie/token expired mid-task. | Page redirects to a login screen unexpectedly. | Medium | Proactively check session validity before starting a multi-step browser task, not just react to failure mid-task. | Prompt the user to re-authenticate; resume the task from the last completed step once re-authenticated. |
| **FM-09-004** | Popup appeared | Unexpected modal/overlay (cookie consent, promo) blocks the intended interaction. | Expected element is present in the DOM but not interactable (obscured/z-index blocked). | Low | Common popup-dismissal patterns attempted automatically before proceeding with the main action. | If auto-dismiss fails, fall back to vision-based detection of the blocking overlay and dismiss it explicitly. |
| **FM-09-005** | Slow loading | Page/resource takes longer than expected to become interactive. | Element-wait times out before the page reaches ready state. | Low | Explicit wait-for-ready-state logic rather than a fixed sleep, with a generous but bounded timeout. | Retry the wait once with a longer bound before failing; never infinite-wait. |
| **FM-09-006** | Infinite redirect | Site's redirect logic loops (broken auth flow, tracking redirect chain). | Redirect count for a single navigation exceeds a sane ceiling. | Medium | Hard redirect-count ceiling per navigation. | Abort navigation, surface the specific URL/redirect chain to the user rather than hanging silently. |
| **FM-09-007** | Dynamic elements | Element IDs/classes regenerated on every page load (common in some SPA frameworks), breaking cached selectors. | Previously-successful selector suddenly fails on a structurally-similar page. | Medium | Prefer stable attributes (text content, aria-label) over generated IDs/classes when available. | Fall back to vision/text-based matching rather than relying on the volatile selector going forward. |
| **FM-09-008** | Wrong tab | Automation acts on a background/inactive tab instead of the intended one. | Action's observed effect doesn't match the expected active-tab context. | Medium | Explicitly track and verify the active tab/context before every action, not just at task start. | Re-focus the correct tab and retry the action; log the tab-tracking bug for review. |
| **FM-09-009** | Misread text (OCR/vision) | Low-quality rendering, unusual font, or small text causes an OCR misread. | Confidence score from the vision model is low, or the read text fails a sanity check (e.g. expected a number, got letters). | Medium | Confidence-gate OCR results; re-capture at higher resolution or zoom when confidence is low. | Retry with a higher-resolution capture or a targeted crop of just the relevant region. |
| **FM-09-010** | Wrong icon/button detection | Vision model misidentifies a UI element's function from its icon. | Post-click state doesn't match the expected effect of the intended button. | Medium | Cross-validate icon-based detection against accessible-label metadata when available, not vision alone. | Detect the mismatch via unexpected post-action state and undo/retry with the corrected target. |
| **FM-09-011** | Wrong coordinates | Click/tap coordinates computed from a stale screenshot don't match the current, possibly-scrolled or resized, viewport. | Click lands on the wrong element or empty space. | Medium | Re-capture immediately before acting rather than acting on a screenshot from several steps earlier. | Re-capture and recompute coordinates fresh before retrying the click. |
| **FM-09-012** | Low resolution / dark images | Capture quality insufficient for reliable text/element detection. | Vision model confidence uniformly low across the whole capture. | Low | Request the highest available capture resolution/quality for automation purposes specifically. | Retry capture at higher settings; if hardware-limited, fall back to selector-based automation instead of vision. |
| **FM-09-013** | Hidden elements | Target element exists in the DOM/screen but is not currently visible (behind a tab, scrolled out of view, collapsed section). | Element found by selector but interaction fails silently or targets a hidden duplicate. | Medium | Visibility check (not just existence check) before interacting with any target element. | Scroll/expand/switch-tab to reveal the element, then retry the interaction. |
| **FM-09-014** | Missed wake-word / false positive (voice-adjacent, cross-ref FM-13) | Included here as a perception-layer failure class parallel to vision misreads. | See FM-13 for detail. | — | See FM-13. | See FM-13. |

## Compounding Failures

Notes on how failures in this file interact with failures elsewhere in this catalog — read these before assuming a bug is isolated to one subsystem.

- Vision misreads compound directly into browser automation failures — a wrong OCR read of a button label leads directly to 'click wrong button' one layer up; fix detection confidence thresholds at the vision layer rather than only handling symptoms in the browser layer.

## Severity Legend

- **Critical** — data loss, security compromise, or user-visible harm; requires an incident-response runbook, not just a bug ticket.
- **High** — silent incorrectness, significant user-visible breakage, or a failure that blocks task completion with no graceful degradation.
- **Medium** — degraded quality/UX or a failure with a working but imperfect fallback.
- **Low** — cosmetic, rare, or fully recoverable with negligible user impact.
