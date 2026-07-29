# Accessibility audit

Reviewed: 2026-07-20. Source-level review; no assistive-technology lab certification.

## Implemented

- Root Hebrew language and RTL direction, main/nav landmarks, semantic headings, tables, fieldsets, labels, `aria-current`, `aria-pressed`, named icon controls, and live/alert validation feedback.
- Global high-visibility gold `:focus-visible` outline; interactive controls use at least approximately 44–48px targets in primary workflows.
- Black/gold palette uses white/zinc body copy; gold is not the only state cue on forms and selected controls.
- Horizontal category/table regions scroll within their own container; client shell clips accidental page-level overflow.
- Motion is limited to small transitions and respects the reduced-motion override below.

## Remaining limitations

- PARTIAL: automated axe and manual VoiceOver/NVDA passes are not configured in this repository.
- PARTIAL: chart trends include accessible labels and adjacent numeric/table data, but SVG point-by-point screen-reader exploration is not provided.
- PARTIAL: browser-native `window.confirm` is used for destructive demo actions; it is keyboard accessible but not a branded, fully testable dialog component.
- BLOCKED: contrast certification requires rendered color sampling across supported devices; source review found no critical white/gold-on-black risk.

Before release, run keyboard-only and screen-reader journeys for meal completion, check-in submission, plan building, assignment replacement, search/filtering, and error recovery.
