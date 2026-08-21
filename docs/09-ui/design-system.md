# Design System

## Purpose

Defines the shared visual language — color, typography, spacing, and the
specific treatment for risk-tier confirmation prompts — applied
consistently across every UI surface listed in `ui-overview.md`.

## Scope

Visual tokens and the confirmation-prompt treatment referenced throughout
`docs/09-ui/`. Does not cover surface-specific layout, which belongs to
each surface's own document.

## Design tokens

- **Color** — a neutral base palette with a small set of semantic
  accents reserved specifically for risk-tier signaling: a distinct,
  consistent color for read-only/informational states, reversible-write
  confirmations, and destructive/irreversible confirmations, used
  nowhere else in the interface so that risk-tier color coding remains an
  unambiguous, learned signal rather than diluted by decorative reuse.
- **Typography** — a single primary typeface for interface chrome and a
  monospaced typeface reserved for structured/technical content (file
  paths, tool identifiers, exit codes), consistent with the technical
  audience described in `docs/01-product/user-personas.md`.
- **Spacing and density** — a denser default layout than a
  consumer-oriented product would use, reflecting the power-user personas
  this v1 targets (`docs/01-product/user-personas.md`), with information
  density prioritized over generous whitespace.

## Confirmation prompt treatment

Every risk-tier confirmation (`docs/10-security/permissions.md`),
regardless of which UI surface it appears in, follows the same fixed
visual structure: the specific action being confirmed stated in plain
language first, the risk tier indicated via the semantic color above,
and the confirm/deny controls never pre-focused in a way that risks an
accidental confirmation via an errant keypress. This consistency is a
requirement, not a style preference — a confirmation prompt that looked
or behaved differently across surfaces would undermine the user's
learned trust in what a destructive-tier prompt looks like.

## Accessibility baseline

Color is never the sole signal for risk tier — every confirmation prompt
also carries an explicit text label ("Destructive action," "Reversible
action") so that risk-tier meaning does not depend on color perception
alone.

## Dark-mode-first default

Consistent with established preference among the primary personas for
dark-themed interfaces, the default theme is dark, with a light theme
available as an explicit user preference rather than the reverse.

## Related documents

- `ui-overview.md` — the surfaces this system applies to
- `docs/30-design/design-system.md` — the mechanical token system (how
  color/spacing/typography tokens are structured and referenced) this
  document's semantic layer is built on top of; that document covers
  the token mechanics, this one covers what they mean for NOVA
  specifically
- `docs/10-security/permissions.md` — the confirmation model this design
  system renders
- `docs/01-product/user-personas.md` — the audience this system is
  calibrated for
