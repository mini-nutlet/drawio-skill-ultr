# YAML Specification Reference

## Overview

All diagrams in drawio-skill-ultr are defined as YAML specification files.
A spec file is the **canonical source of truth** — the `.drawio` XML is a generated artifact.

## Top-Level Structure

```yaml
meta:        # required — diagram metadata
nodes:       # required — node definitions
edges:       # optional — edge/connection definitions
zones:       # optional — container/layer zones
labels:      # optional — floating text annotations
legend:      # optional — legend box
```

## `meta` — Diagram Metadata

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `title` | string | yes | — | Diagram name used in `<diagram>` element |
| `version` | string | no | `"1.0"` | Spec version |
| `diagramType` | enum | no | `architecture` | See [Diagram Types](#diagram-types) |
| `layout` | enum | no | `LAYERED` | See [Layout Modes](#layout-modes) |
| `theme` | enum | no | `blueprint` | See [Themes](#themes) |
| `mode` | enum | no | `light` | `light` or `dark` |
| `canvas` | enum | no | `ppt-16:9` | See [Canvas Sizes](#canvas-sizes) |
| `width` | number | no | 1920 | Canvas width in px (overrides canvas preset) |
| `height` | number | no | 1080 | Canvas height in px |
| `description` | string | no | — | Human-readable description (not rendered) |

### Diagram Types

| Value | Layout Default | Description |
|---|---|---|
| `architecture` | LAYERED | System/service architecture |
| `flowchart` | FLOW | Process/decision flow |
| `uml-class` | TREE/GRID | UML class diagram |
| `er-diagram` | GRID | Entity-relationship diagram |
| `sequence` | FLOW | Sequence diagram |
| `network-topology` | LAYERED | Network/infrastructure topology |
| `ml-model` | LAYERED/FLOW | Neural network / ML pipeline |
| `academic-figure` | LAYERED | Academic paper figure |

### Layout Modes

| Value | Description |
|---|---|
| `LAYERED` | Top-down layered architecture (default) |
| `TREE` | Hierarchical tree |
| `FLOW` | Left-to-right or top-to-bottom flow |
| `RADIAL` | Radial/spoke layout |
| `GRID` | Grid alignment |

### Themes

| Value | Modes | Best For |
|---|---|---|
| `blueprint` | light, dark | Architecture, network |
| `editorial` | light, dark | Academic papers |
| `operations` | dark | Dashboards, alerts |
| `analytical` | light, dark | Data flow, comparisons |
| `narrative` | light, dark | User journeys, business |

### Canvas Sizes

| Value | Width × Height | Best For |
|---|---|---|
| `ppt-16:9` | 1920 × 1080 | PPT slides (default) |
| `ppt-4:3` | 1440 × 1080 | Legacy slides |
| `a4-landscape` | 1920 × 1358 | Print landscape |
| `a4-portrait` | 1358 × 1920 | Print portrait |
| `wide` | 2560 × 1440 | Complex diagrams |
| `poster` | 3840 × 2160 | Conference posters |
| `square` | 1080 × 1080 | Social media |

## `nodes` — Node Definitions

Each node is an object:

```yaml
nodes:
  - id: "svc-user"           # required — unique string ID
    label: "User Service"     # required — display text (≤25 chars)
    layer: "application"      # optional — layer/zone name for auto-layout
    semantic: "compute"       # optional — semantic role
    shape: "rounded-rectangle"# optional — shape type
    x: 320                    # auto-assigned by layout.js if omitted
    y: 160                    # auto-assigned by layout.js if omitted
    width: 140                # optional — defaults to label-based auto-width
    height: 50                # optional — defaults to 50px
    parent: "1"               # optional — parent cell ID
    fontSize: 14              # optional — font size in pt
    fontColor: "#1E293B"      # optional — override text color
    fillColor: "#FFFFFF"      # optional — override fill color
    strokeColor: "#1E293B"    # optional — override stroke color
    bold: true                # optional — bold text (default true)
    dashed: false             # optional — dashed border
    tooltip: "Port 8443"      # optional — hover tooltip
    description: "..."        # optional — long description (not rendered)
```

### Semantic Roles

| Value | Meaning | Default Shape |
|---|---|---|
| `compute` | Application/service/compute | rounded-rectangle |
| `data` | Database/storage | cylinder3 |
| `gateway` | API gateway/router | hexagon |
| `queue` | Message queue/event bus | hexagon |
| `external` | External system/service | rounded-rectangle (lighter stroke) |
| `security` | Security/auth component | rounded-rectangle (red accent stroke) |

### Shapes

| Value | draw.io Shape |
|---|---|
| `rounded-rectangle` | Rounded rectangle (default) |
| `rectangle` | Sharp rectangle |
| `ellipse` | Ellipse/circle |
| `rhombus` | Rhombus (diamond) |
| `cylinder3` | Cylinder (database) |
| `hexagon` | Hexagon |
| `step` | Step/process shape |

## `edges` — Edge Definitions

Each edge is an object:

```yaml
edges:
  - id: "e1"                 # optional — auto-generated if omitted
    from: "svc-user"         # required — source node ID
    to: "db-user"            # required — target node ID
    type: "sync-call"        # optional — edge semantic type
    label: "HTTPS/REST"      # optional — edge label (≤15 chars)
    exitX: 1                 # optional — 0=left, 1=right
    exitY: 0.5               # optional — 0=top, 0.5=center, 1=bottom
    entryX: 0                # optional — entry point
    entryY: 0.5              # optional — entry point
    waypoints:               # optional — manual routing points
      - {x: 400, y: 185}
      - {x: 400, y: 400}
    animated: false          # optional — flow animation
```

### Edge Types

| Value | Color | Style | Width | Meaning |
|---|---|---|---|---|
| `sync-call` | #475569 | solid | 1.5 | Synchronous request-response |
| `async-event` | #D97706 | dashed (6 4) | 1.0 | Asynchronous events/messages |
| `data-flow` | #7C3AED | solid | 1.5 | Data flow direction |
| `auth-trust` | #CC00DC | solid | 1.5 | Authentication/trust |
| `error-fallback` | #DC2626 | solid | 1.5 | Error/fallback path |
| `conditional` | #0891B2 | dashed (4 4) | 1.0 | Conditional branch |
| `deployment` | #059669 | solid | 1.0 | Deployment flow |

## `zones` — Container/Layer Zones

```yaml
zones:
  - id: "zone-web"           # required — unique ID
    label: "Web Layer"        # optional — zone title (shown in title bar)
    layer: "l1"               # optional — hierarchy level
    x: 40                     # auto-assigned by layout.js
    y: 80                     # auto-assigned by layout.js
    width: 1840               # auto-assigned by layout.js
    height: 180               # auto-assigned by layout.js
```

Zone levels (`l0`–`l4`) determine visual hierarchy:
- `l0`: Page background
- `l1`: Top-level lanes (e.g., "Frontend", "Backend", "Data")
- `l2`: Sub-lanes within l1
- `l3`: Sub-sub-lanes
- `l4`: Innermost containers

## `labels` — Text Annotations

```yaml
labels:
  - id: "scope-note"         # required — unique ID
    text: "Scope: Core domain"# required — text content
    x: 40                     # required — position
    y: 1040                   # required — position
    width: 400                # optional — text box width
    height: 20                # optional — text box height
    fontSize: 10              # optional — default 10pt
    align: "left"             # optional — left|center|right
```

## `legend` — Legend Box

```yaml
legend:
  items:
    - label: "Sync Call"
      color: "#475569"
      style: "solid"
    - label: "Async Event"
      color: "#D97706"
      style: "dashed"
  y: 960                      # optional — vertical position
```

## Validation Rules

| Rule | Severity | Check |
|---|---|---|
| All node IDs must be unique | error | Duplicate ID → error |
| Node labels ≤ 25 characters | error | Over limit → truncate or shorten |
| No emoji in labels | error | Strip or reject |
| Font size ≥ 8pt | error | Below floor → increase |
| Font size 12–16pt for nodes | warning | Outside PPT range |
| All vertices must have `fontFamily` | warning | Add Microsoft YaHei or Arial |
| All x/y/width/height multiples of 10 | warning | Snap to 10px grid |
| Edges prefer right/bottom exit | warning | exitX=0 → suggest alternative |
| Edge through node body | error | Add waypoints to route around |

Run validation:
```bash
node scripts/validate.js output/diagram.drawio
node scripts/lint-edges.js output/diagram.drawio
node scripts/score.js output/diagram.drawio
```
