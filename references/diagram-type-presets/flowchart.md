# Flowchart Preset

## Layout: FLOW (left-to-right or top-down)
## Default Theme: blueprint or narrative
## Node Budget: ≤25 nodes, ≤30 edges

## Shape Convention
- Start/End: `ellipse`
- Process step: `rounded-rectangle`
- Decision: `rhombus`
- Sub-process: `rounded-rectangle` + nested border
- Error path: `rounded-rectangle` with red stroke (`#DC2626`)

## Edge Convention
- Normal flow: `sync-call` (solid #475569)
- Error/fallback: `error-fallback` (solid #DC2626)
- Retry/loop back: `conditional` (dashed #0891B2, dashPattern=4 4)

## Status Colors (override theme)
- `start`: #E8F5E9 fill / #2E7D32 stroke
- `end`: #FFEBEE fill / #C62828 stroke
- `decision`: #FFF8E1 fill / #F57F17 stroke
- `error-state`: #FFEBEE fill / #C62828 stroke + strokeWidth=3

## Scaffolds Available
- `user-login` — OAuth2.0 + JWT + MFA + retry + account lock
