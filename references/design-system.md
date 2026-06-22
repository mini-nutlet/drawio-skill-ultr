# Design System

## Philosophy

Four design theories fused into one system:

1. **CRAP** (Robin Williams) — Contrast, Repetition, Alignment, Proximity
2. **FIGMA Design System** — Auto Layout → spacing scale, Design Tokens → theme JSONs, Component Variants → shape+color pairs
3. **Itten Color Wheel** — 12-hue wheel, 7 color relationships → 5 theme color relations
4. **WCAG 2.1 AA** — 4.5:1 contrast floor, colorblind-safe palettes, triple encoding

## CRAP in Practice

| Principle | Draw.io Rule | Lint Check |
|---|---|---|
| **Contrast** | Semantic fill/stroke ≥ 4.5:1 ratio | `check-contrast.js` |
| **Repetition** | Same semantic role = same color across the whole diagram | `validate.js` hex consistency |
| **Alignment** | 10px grid snap, same-layer nodes share y-coordinate | `lint-edges.js` off-grid + misalignment |
| **Proximity** | Related nodes in same zone, label on the thing it describes | Text role system — edge labels on edges, legends in legend box |

## FIGMA → Draw.io Mapping

| FIGMA Concept | Draw.io Equivalent |
|---|---|
| Auto Layout Direction | LAYERED (vertical) / FLOW (horizontal) |
| Auto Layout Gap | Spacing scale: 4/8/16/24/32/48/64px |
| Auto Layout Padding | Zone container padding: 24px |
| Design Tokens | `assets/themes/*.json` |
| Component Variants | Shape + semantic color pairs |
| Style Library | `assets/semantic-colors/*.json` |

## Spacing Scale (4px base)

```
xs=4    sm=8    md=16    lg=24    xl=32    2xl=48    3xl=64
```

## Node Size Presets

| Role | Width | Height | Font Size |
|---|---|---|
| Service (PPT) | 140px | 60px | 14pt |
| Service (compact) | 120px | 50px | 12pt |
| Database (cylinder) | 120px | 70px | 12pt |
| Queue (hexagon) | 130px | 56px | 12pt |
| Decision (rhombus) | 110px | 90px | 12pt |
| Start/End (ellipse) | 80px | 40px | 11pt |

## Colorblind Safety

All 5 themes verified against Protanopia, Deuteranopia, Tritanopia via Coblis simulation.
Strategy: color + shape + label triple encoding — color is never the sole carrier of meaning.
