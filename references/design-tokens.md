# Design Tokens

## Overview

Design tokens are the atomic values that define the visual language.
They bridge the FIGMA design system to draw.io XML attributes.

## Spacing Scale (4px base)

```
Token   Value   Use
──────  ─────   ──────────────────────────────
xs       4px    Micro-spacing, tight icon gaps
sm       8px    Node internal padding, badge offset
md      16px    Peer node gap (minimum), legend spacing
lg      24px    Zone internal padding, section gap
xl      32px    Inter-group spacing
2xl     48px    Same-layer node horizontal gap (H_GAP)
3xl     64px    Canvas margin, footer offset
4xl     80px    Inter-layer vertical gap (V_GAP)
```

Aligns to layout.js constants:
```javascript
const SPACING = {
  H_GAP: 48,         // 2xl — horizontal gap between same-layer nodes
  V_GAP: 80,         // 4xl — vertical gap between layers/zones
  ZONE_PAD_X: 30,    // ~xl — zone horizontal padding
  ZONE_PAD_TOP: 54,  // 28px title bar + 26px
  ZONE_PAD_BOTTOM: 45,
};
```

---

## Typography Scale

| Role | Font | Size | Weight | Line Height | Token |
|---|---|---|---|---|---|
| Diagram title | Microsoft YaHei | 22pt | Bold 700 | 1.3 | `title-lg` |
| Diagram title (compact) | Microsoft YaHei | 18pt | Bold 700 | 1.3 | `title-md` |
| Zone label | Microsoft YaHei | 16pt | Bold 700 | 1.2 | `zone-lg` |
| Zone label (compact) | Microsoft YaHei | 14pt | Bold 700 | 1.2 | `zone-md` |
| **Node label** ★ | Arial / 微软雅黑 | **14pt** | Bold 700 | 1.2 | `node-default` |
| Node label (compact) | Arial | 12pt | Bold 700 | 1.2 | `node-compact` |
| Node subtitle | Arial | 10-12pt | Regular 400 | 1.1 | `subtitle` |
| Edge label | Arial | 10-12pt | Regular 400 | 1.0 | `edge-label` |
| Legend text | Arial | 10pt | Regular 400 | 1.1 | `legend` |
| Caption | Arial | 9-10pt | Regular 400 | 1.1 | `caption` |
| Footnote / Scope | Arial | **8pt** | Regular 400 | 1.0 | `footnote` |
| Code snippet | Courier New | 8-10pt | Regular 400 | 1.0 | `code` |

**Hard constraints:**
- 8pt is the absolute floor — anything below is a validation error
- 14pt is the recommended node label default for PPT slides
- Academic/Editorial theme overrides body to Times New Roman, 11pt

---

## Border Radius

| Token | Value | Use |
|---|---|---|
| `radius-none` | 0px | Sharp rectangles, external systems |
| `radius-sm` | 4px | Subtle rounding |
| `radius-default` | 10px | Standard rounded rectangles (`arcSize=10`) |
| `radius-full` | 50% | Ellipse (via shape, not arcSize) |

Draw.io XML:
```
arcSize=10;absoluteArcSize=1   → 10px corner radius
```

---

## Stroke Widths

| Token | Value | Use |
|---|---|---|
| `stroke-none` | 0 | Invisible borders |
| `stroke-thin` | 1.0 | Zone borders, light separators |
| `stroke-default` | 1.5 | Edge lines (normalized by autofix) |
| `stroke-emphasis` | 2.0 | Approach B semantic fill nodes |
| `stroke-heavy` | 2.5 | Approach A white card nodes (default) |
| `stroke-accent` | 3.0 | Security boundary, critical zone |

---

## Node Size Presets

| Role | Width | Height | Font | Token |
|---|---|---|---|---|
| Service (PPT) | 140px | 60px | 14pt | `size-service-ppt` |
| Service (compact) | 120px | 50px | 12pt | `size-service-compact` |
| Database | 120px | 70px | 12pt | `size-database` |
| Queue / Gateway | 130px | 56px | 12pt | `size-hexagon` |
| Decision | 110px | 90px | 12pt | `size-rhombus` |
| Start/End | 80px | 40px | 11pt | `size-ellipse` |
| Step | 140px | 50px | 12pt | `size-step` |

---

## Color Tokens

Reference the active theme for exact values:
```bash
node scripts/cli.js spec.yaml --theme blueprint --mode light
```

Theme-agnostic semantic tokens (from `assets/semantic-colors/`):

| Token | Source | Meaning |
|---|---|---|
| `edge-sync-call` | `edge-colors.json` | Synchronous call edge |
| `edge-async-event` | `edge-colors.json` | Async event edge |
| `edge-data-flow` | `edge-colors.json` | Data flow edge |
| `edge-error` | `edge-colors.json` | Error path edge |
| `status-ok` | `status-colors.json` | Success state fill |
| `status-error` | `status-colors.json` | Error state fill |
| `status-pending` | `status-colors.json` | Pending state fill |
| `entity-core` | `data-entity-colors.json` | Core entity fill |
| `zone-l1` | `zone-colors.json` | Top-level zone stroke |

---

## Opacity

| Token | Value | Use |
|---|---|---|
| `opacity-solid` | 100% | All nodes and edges (default) |
| `opacity-muted` | 60% | Deprecated/disabled elements |
| `opacity-subtle` | 30% | Background grids, watermarks |
| `opacity-ghost` | 10% | Invisible guides |

---

## Grid System

- **Grid unit:** 10px
- **All coordinates must be multiples of 10** (enforced by lint-edges.js, auto-fixed by autofix.js)
- Canvas dimensions are multiples of 10
- Node sizes (width × height) are multiples of 10

---

## Font Stack

```
Microsoft YaHei, Arial, Helvetica, PingFang SC, sans-serif
     ↑              ↑        ↑           ↑            ↑
  Windows中文    全平台     macOS       macOS      终极回退
   首选         西文首选    备选      中文备选
```

**Rule:** Chinese text → Microsoft YaHei; Latin text → Arial; Mixed → Microsoft YaHei.
