# ER Diagram Preset

## Layout: GRID
## Default Theme: blueprint
## Node Budget: ≤15 entities, ≤25 relationships

## Entity Convention
- `core-entity`: blue header (#1565C0) — User, Order, Product
- `lookup`: grey header (#616161) — Status, Type enums
- `join-table`: amber header (#F57F17) — N:N intermediates
- `audit-log`: blue-grey header (#78909C) — AuditLog, EventLog
- `cache`: orange header (#EF6C00) — Session, TempData
- `external-ref`: pink header (#C2185B) — external system references

## PK/FK Convention
- PK: bold, marked 🔑 (text prefix, not emoji in the visual sense)
- FK: colored per referenced entity
- Composite key: both marked

## Relationship Convention
- 1:1 — single crow's foot
- 1:N — crow's foot at N side
- N:N — intermediate entity (join table)
- Self-referencing — loop back edge
