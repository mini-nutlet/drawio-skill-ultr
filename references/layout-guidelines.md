# Layout Guidelines

## Overview

The skill ships with **two layout engines**, auto-selected at render time:

| Engine | Implementation | Activation |
|---|---|---|
| **ELK.js** (primary) | `scripts/layout-elk.js` | Auto-detected if `npm install elkjs` was run |
| **Sugiyama** (fallback) | `scripts/layout.js` | Zero-dependency, always available |

`cli.js` tries ELK first; if ELK is unavailable or fails, falls back to Sugiyama.

## ELK.js Layout Engine (Eclipse Layout Kernel)

ELK is the **most comprehensive graph layout library in JavaScript**. Its `layered` algorithm represents decades of academic research into Sugiyama-style layout, far surpassing simple implementations.

### Availability of algorithms

| Algorithm | ELK ID | Best For |
|---|---|---|
| **Layered** (Sugiyama) | `layered` | Architecture diagrams, flowcharts, DAGs, pipelines |
| **Force-Directed** | `force` | General relationship graphs, ecosystem maps |
| **Tree** | `mrtree` | Org charts, class hierarchies, file trees |
| **Radial** | `radial` | Hub-and-spoke, platform overviews |
| **Box/Packing** | `box` | Grid-like entity arrangements, comparison matrices |
| **Stress Minimization** | `stress` | Distance-preserving layouts (MDS-like quality) |

### Edge-crossing minimization

ELK's `layered` uses **4-phase crossing reduction**:
1. Layer assignment (longest-path / network-simplex)
2. Crossing minimization (barycenter + sweep)
3. Node positioning (linear programming)
4. Edge routing (orthogonal, with dummy nodes for long edges)

This consistently produces **fewer edge crossings** than the hand-rolled Sugiyama fallback.

### Fallback engine

The hand-rolled Sugiyama (`scripts/layout.js`) uses:
1. Manual layer grouping from YAML `layer` property
2. Single-pass barycenter crossing reduction
3. Center-aligned coordinate assignment
4. Simple waypoint insertion for cross-zone edges

Available when ELK.js is not installed — zero npm dependencies.

## Layout Modes

### RADIAL (推荐默认 ★)
中心节点 + 同心环卫星布局。架构图和流程图的智能默认。

**Algorithm:**
1. Hub 节点居中画布
2. 其余节点按 `layer` 分组到同心环
3. 每层环半径递增 RING_GAP=160px
4. 节点在环上均分角度

**Spacing:**
- 基础环半径: 200px
- 环间距: 160px
- 节点均匀分布，角度偏移 -π/2（12点方向起始）

**When to use:** 架构图、流程图、生态图 — 大多数场景的推荐首选
**Anti-overlap:** 径向布局天然无边线穿越 zone 问题

### LAYERED
Top-down layered architecture layout. Best for strict layer hierarchies, stack diagrams.

**Algorithm:**
1. Nodes are grouped by their `layer` property
2. Layer order follows the order layers first appear in the spec
3. Barycenter heuristic reduces edge crossings between adjacent layers
4. All layers are center-aligned on the canvas

**Spacing:**
- Node size: 140×60px (default)
- Horizontal gap: 48px between same-layer nodes
- Vertical gap: **100px** minimum between layers (widened for edge clearance)
- Edge clearance: 20px minimum from zone borders
- Zone padding: 30px horizontal, 54px top, 45px bottom

**When to use:** Architecture diagrams, microservice maps, network topology, deployment diagrams

### TREE
Hierarchical tree layout. Best for org charts, class hierarchies, inheritance trees.

**Characteristics:**
- Root node centered at top
- Children spread evenly below parent
- Branching factor determines width

**When to use:** Org charts, class inheritance, file system trees, decision trees

### FLOW
Left-to-right or top-to-bottom process flow. Best for flowcharts, sequence diagrams, pipelines.

**Characteristics:**
- Nodes placed in reading order (L→R for horizontal, T→B for vertical)
- Decision diamonds create branches
- Merge points consolidate paths

**When to use:** Flowcharts, CI/CD pipelines, sequence diagrams, user flows

### RADIAL
Central node with radiating connections. Best for hub-and-spoke architectures, ecosystem maps.

**Characteristics:**
- Central node at canvas center
- Connected nodes arranged in a circle
- Equal angular spacing

**When to use:** API gateway ecosystems, platform overviews, stakeholder maps

### GRID
Uniform grid alignment. Best for entity-relationship diagrams, comparison matrices.

**Characteristics:**
- Nodes placed in row×column grid
- Equal spacing in both dimensions
- Labels left-aligned within cells

**When to use:** ER diagrams, comparison tables, SWOT matrices, feature grids

---

## Spacing Scale

All layout constants in `layout.js`:

| Constant | Value | Purpose |
|---|---|---|
| `NODE_W` | 140px | Default node width (PPT-optimized) |
| `NODE_H` | 60px | Default node height |
| `H_GAP` | 48px | Horizontal gap between same-layer peers |
| `V_GAP` | 100px | Minimum vertical gap between layers/zones (adaptive: shrinks with many layers) |
| `BASE_RADIUS` | 200px | ★ Radial: inner ring radius |
| `RING_GAP` | 160px | ★ Radial: gap between concentric rings |
| `ZONE_PAD_X` | 30px | Zone container horizontal padding |
| `ZONE_PAD_TOP` | 54px | Zone top padding (28px title bar + 26px) |
| `ZONE_PAD_BOTTOM` | 45px | Zone bottom padding |

From the design system spacing scale:
```
xs=4    sm=8    md=16    lg=24    xl=32    2xl=48    3xl=64    4xl=80
```

---

## Manual Position Override

When nodes have explicit `x`/`y` in the YAML spec, the layout engine preserves them:

```yaml
nodes:
  - id: "manual-node"
    label: "Manual Position"
    x: 400       # ← honored as-is
    y: 200       # ← honored as-is
```

Nodes **without** explicit coordinates receive auto-layout positions.
Mixed specs (some manual, some auto) are supported — auto nodes are placed around manual ones.

---

## Canvas Sizing

| Preset | Width | Height | Use Case |
|---|---|---|---|
| `ppt-16:9` | 1920 | 1080 | Default — PPT widescreen |
| `ppt-4:3` | 1440 | 1080 | Legacy slides |
| `a4-landscape` | 1920 | 1358 | Print landscape |
| `a4-portrait` | 1358 | 1920 | Print portrait |
| `wide` | 2560 | 1440 | Complex diagrams |
| `poster` | 3840 | 2160 | Conference posters |
| `square` | 1080 | 1080 | Social media |

Set in YAML meta:
```yaml
meta:
  canvas: ppt-16:9
```

Or override dimensions:
```yaml
meta:
  width: 2400
  height: 1600
```

---

## Zone Rendering Modes

Three rendering modes for zone/layer visual separators. Set in YAML meta:

```yaml
meta:
  zoneMode: divider   # divider | filled | none
```

### `divider` (recommended for multi-layer)
- **How**: Thin horizontal line + floating label between layers
- **No background fill** — edges cross freely without visual overlap
- **Best for**: Any diagram with 3+ layers where edges cross zone boundaries
- **Edge safety**: No visual overlap possible — divider is a 1px line above the layer

### `filled` (legacy)
- **How**: Colored background rectangle + SAP-style title bar per zone
- **Use with caution**: Zone backgrounds can visually obscure edge lines
- **Edge routing**: `layout.js` computes waypoints to route edges through gaps, but zone borders still cause visual noise
- **When acceptable**: 2-layer diagrams where edges only go top→bottom

### `none`
- **How**: No zone separators at all — just nodes positioned by layer
- **Best for**: Compact diagrams, or when layer membership is obvious from node labels

### Anti-Overlap Rules

**Critical — zone backgrounds MUST NOT overlap edges:**

1. **Never use `container=1` on zone rectangles** — causes draw.io to reparent nodes, break coordinate systems, and disrupt edge routing
2. **Zone backgrounds render first** (bottom layer), edges render on top
3. **V_GAP ≥ 100px** ensures edges have at least 60px clear channel between zones
4. **For 3+ layer diagrams, prefer `divider` mode** — eliminates edge-zone visual conflict entirely
5. **Edge waypoints**: `computeEdgeRouting()` inserts midpoint waypoints in the inter-zone gap so edges don't hug zone borders
6. **If using `filled` mode**: keep zone border color muted (`#CBD5E1` or lighter) and strokeWidth=1 so borders don't compete with edge lines

### When to Use Each Mode

| Diagram Layers | Edge Direction | Recommended Mode |
|---|---|---|
| 1-2 | Top→Bottom only | `filled` or `divider` |
| 3+ | Cross-layer (top→middle→bottom) | `divider` |
| 3+ | Complex (feedback loops, side calls) | `divider` or `none` |
| Any | Horizontal flow (FLOW layout) | `none` |

## Zone/Layer Placement

Zones are auto-sized to fit their contained nodes plus padding.
Zone width = widest layer content + ZONE_PAD_X × 2.
Zone height = contained nodes' bounding box height + ZONE_PAD_TOP + ZONE_PAD_BOTTOM.

### Divider mode zones
In `divider` mode, "zones" become thin separator lines — no bounding box dimensions needed.

### Filled mode zones
Each zone gets a colored title bar (28px, SAP-style) with the zone label. Background is a subtle fill (light: `#F8FAFC`, dark: `#1E293B`).

```yaml
zones:
  - id: "zone-web"
    label: "Presentation Layer"
    layer: "l1"
  - id: "zone-app"
    label: "Application Layer"
    layer: "l2"
  - id: "zone-data"
    label: "Data Layer"
    layer: "l3"
```

---

## Layout CLI

```bash
# The layout engine is embedded in cli.js — it runs automatically:
node scripts/cli.js spec.yaml -o output/diagram

# Layout mode is read from spec meta or overridden:
node scripts/cli.js spec.yaml --layout FLOW -o output/diagram
```
