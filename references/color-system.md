# Color System

## Overview

5 visual systems × 2 modes = 9 theme files (operations is dark-only).
Every theme is a JSON file in `assets/themes/` defining the complete color palette.

## Theme Files

| Theme | Light | Dark | Color Relation |
|---|---|---|---|
| `blueprint` | `blueprint-light.json` | `blueprint-dark.json` | Analogous (blue-cyan) |
| `editorial` | `editorial-light.json` | `editorial-dark.json` | Monochrome + red accent |
| `operations` | — | `operations-dark.json` | Complementary (blue-orange) |
| `analytical` | `analytical-light.json` | `analytical-dark.json` | Triadic (violet-cyan-yellow) |
| `narrative` | `narrative-light.json` | `narrative-dark.json` | Split-complementary (green-pink-orange) |

## Theme JSON Structure

```json
{
  "name": "Blueprint",
  "mode": "light",
  "approach": "A",
  "description": "Clean black-stroke cards on white. Minimal, PPT-perfect.",
  "colors": {
    "pageBackground": "#FFFFFF",
    "card": { "fill": "#FFFFFF" },
    "stroke": {
      "default": "#1E293B",
      "external": "#94A3B8",
      "security": "#DC2626"
    },
    "zone": {
      "l1": { "stroke": "#CBD5E1" }
    },
    "text": {
      "title": "#0F172A",
      "card": "#1E293B",
      "secondary": "#64748B"
    }
  }
}
```

### Rendering Approaches

| Approach | Fill | Stroke | When Used |
|---|---|---|---|
| **A** (default) | White card (`#FFFFFF`) | Dark stroke (`#1E293B`) | Light themes, minimal style |
| **B** | Tonal semantic fill | Dark stroke (2pt) | Dark themes, richer visuals |

---

## Semantic Color Mappings

Semantic colors override theme colors for specific node roles.
These are defined in `assets/semantic-colors/`.

### Edge Colors (`edge-colors.json`)
Colors are semantic — edge color conveys communication meaning, not decoration.

| Type | Color | Style | Width |
|---|---|---|---|
| `sync-call` | `#475569` | solid | 1.5 |
| `async-event` | `#D97706` | dashed (6 4) | 1.0 |
| `data-flow` | `#7C3AED` | solid | 1.5 |
| `auth-trust` | `#CC00DC` | solid | 1.5 |
| `error-fallback` | `#DC2626` | solid | 1.5 |
| `conditional` | `#0891B2` | dashed (4 4) | 1.0 |
| `deployment` | `#059669` | solid | 1.0 |

### Status Colors (`status-colors.json`)
12 status/state colors for flowchart nodes.

| Status | Color | Use |
|---|---|---|
| `start` | `#059669` | Flow start |
| `end` | `#DC2626` | Flow end |
| `processing` | `#3B82F6` | Active processing |
| `decision` | `#F59E0B` | Branch/decision |
| `ok` | `#22C55E` | Success state |
| `degraded` | `#F59E0B` | Degraded/warning |
| `critical` | `#EF4444` | Critical failure |
| `error-state` | `#DC2626` | Error state |
| `pending` | `#94A3B8` | Waiting/pending |
| `disabled` | `#CBD5E1` | Disabled/inactive |
| `info` | `#0891B2` | Informational |
| `highlight` | `#8B5CF6` | Highlighted/selected |

### Data Entity Colors (`data-entity-colors.json`)
6 entity types for ER diagrams.

| Entity | Color | Meaning |
|---|---|---|
| `core-entity` | `#1E40AF` | Primary business entity |
| `lookup` | `#7C3AED` | Reference/lookup table |
| `join-table` | `#D97706` | Many-to-many join |
| `audit-log` | `#64748B` | Audit trail |
| `cache` | `#0891B2` | Cache store |
| `external-ref` | `#94A3B8` | External system reference |

### Zone Colors (`zone-colors.json`)
4-level zone hierarchy.

| Level | Stroke | Fill (Light) | Fill (Dark) |
|---|---|---|---|
| `l0` | `#E2E8F0` | `#FFFFFF` | `#0F172A` |
| `l1` | `#CBD5E1` | `#F8FAFC` | `#1E293B` |
| `l2` | `#94A3B8` | `#F1F5F9` | `#334155` |
| `l3` | `#64748B` | `#E2E8F0` | `#475569` |
| `l4` | `#475569` | `#CBD5E1` | `#64748B` |

---

## WCAG AA Compliance

All themes are verified against WCAG 2.1 AA (4.5:1 contrast ratio for normal text, 3:1 for large text).

Check compliance:
```bash
# Check one theme
node scripts/check-contrast.js assets/themes/blueprint-light.json

# Check all themes
node scripts/check-contrast.js --all
```

### Colorblind Safety

All 5 themes verified against:
- **Protanopia** (red-blind, 1% of males)
- **Deuteranopia** (green-blind, 5% of males)
- **Tritanopia** (blue-blind, <0.01%)

Strategy: **Triple encoding** — color + shape + label. Color is never the sole carrier of meaning.

---

## Selecting a Theme

Auto-select based on user request:
```bash
node scripts/pick-theme.js "画一个微服务架构图"
# → { "theme": "blueprint", "confidence": "high" }
```

Manual override:
```bash
node scripts/cli.js spec.yaml --theme editorial --mode light
```

### Theme Selection Guide

| User Intent | Recommended Theme |
|---|---|
| Architecture / microservices / k8s / cloud | `blueprint` |
| Academic paper / thesis / IEEE / ACM | `editorial` |
| Dashboard / monitoring / alerts / SRE | `operations` |
| Data flow / ETL / analytics / comparison | `analytical` |
| User journey / business process / customer | `narrative` |
| No clear signal | `blueprint` (default) |
