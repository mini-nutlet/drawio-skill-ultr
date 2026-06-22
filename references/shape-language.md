# Shape Language

## Overview

Shape communicates **structural role**. Color communicates **semantic role**.
Together they form a visual language that readers decode instantly.

## Shape Catalog

### `rounded-rectangle` (default)
- **draw.io style:** `rounded=1`
- **Semantic:** Service, component, application, microservice
- **Default size:** 140×60px (PPT), 120×50px (compact)
- **When to use:** Any compute/service node. The default choice.

### `rectangle`
- **draw.io style:** `rounded=0`
- **Semantic:** External system, legacy system, third-party component
- **When to use:** Systems outside your control, COTS products, external APIs

### `ellipse`
- **draw.io style:** `ellipse`
- **Semantic:** Start/end state in flowcharts
- **Default size:** 80×40px
- **When to use:** Flowchart start (green) or end (red) nodes only

### `rhombus`
- **draw.io style:** `rhombus`
- **Semantic:** Decision/branch point
- **Default size:** 110×90px
- **When to use:** Flowchart decision nodes, conditional branches

### `cylinder3`
- **draw.io style:** `shape=cylinder3;boundedLbl=1;size=8`
- **Semantic:** Database, persistent storage, data store
- **Default size:** 120×70px
- **When to use:** SQL databases, NoSQL stores, data warehouses, file systems

### `hexagon`
- **draw.io style:** `shape=hexagon;perimeter=hexagonPerimeter`
- **Semantic:** Gateway, message queue, event bus, router
- **Default size:** 130×56px
- **When to use:** API gateways, Kafka/RabbitMQ, load balancers, service mesh ingress

### `step`
- **draw.io style:** `shape=step;perimeter=stepPerimeter`
- **Semantic:** Process step, pipeline stage, sequential action
- **When to use:** CI/CD stages, ETL pipeline steps, sequential workflow steps

---

## Shape → Semantic Pairing Matrix

| Shape | compute | data | gateway | queue | external | security |
|---|---|---|---|---|---|---|
| **rounded-rect** | ✅ Default | — | — | — | ✅ | ✅ |
| **rectangle** | — | — | — | — | ✅ | — |
| **ellipse** | — | — | — | — | — | — |
| **rhombus** | — | — | — | — | — | — |
| **cylinder3** | — | ✅ | — | — | — | — |
| **hexagon** | — | — | ✅ | ✅ | — | — |
| **step** | — | — | — | — | — | — |

✅ = Recommended pairing. Use the combination; it's what readers expect.

---

## Decision Matrix

```
What is the node's structural role?
├── Service / component / app
│   └── rounded-rectangle (default)
├── Database / storage / file system
│   └── cylinder3
├── Message queue / event bus / gateway
│   └── hexagon
├── Decision / branch point
│   └── rhombus
├── Flow start or end
│   └── ellipse
├── Process step / pipeline stage
│   └── step
├── External / third-party system
│   └── rectangle or rounded-rectangle (with lighter stroke)
└── Unknown / uncertain
    └── rounded-rectangle (safe default)
```

---

## Triple Encoding Rule

Every node must convey its role through **three channels simultaneously**:

1. **Shape** — What it is structurally (service, database, gateway)
2. **Color** — What it does semantically (compute, data, security)
3. **Label** — What it is named (identifier text)

Example:
```
┌─────────────────┐
│  User Service   │  ← Label: "User Service"
│  [rounded-rect] │  ← Shape: rounded-rectangle = service
│  [blue fill]    │  ← Color: compute semantic fill
└─────────────────┘
```

Never rely on a single channel alone — a colorblind reader should still understand the diagram from shape + label.

---

## Shape Rendering in XML

The shape mapping in `cli.js`:

```javascript
function getShapeStyle(shape) {
  return {
    'rounded-rectangle': 'rounded=1',
    'rectangle':         'rounded=0',
    'ellipse':           'ellipse',
    'rhombus':           'rhombus',
    'cylinder3':         'shape=cylinder3;boundedLbl=1;size=8',
    'hexagon':           'shape=hexagon;perimeter=hexagonPerimeter',
    'step':              'shape=step;perimeter=stepPerimeter',
  }[shape] || 'rounded=1';
}
```

In YAML:
```yaml
nodes:
  - id: "db-orders"
    label: "Orders DB"
    shape: "cylinder3"
    semantic: "data"
```

---

## Size Presets

| Shape | Width | Height | Font Size | PPT Fit |
|---|---|---|---|---|
| rounded-rectangle (PPT) | 140px | 60px | 14pt | ✅ |
| rounded-rectangle (compact) | 120px | 50px | 12pt | ✅ |
| cylinder3 | 120px | 70px | 12pt | ✅ |
| hexagon | 130px | 56px | 12pt | ✅ |
| rhombus | 110px | 90px | 12pt | ✅ |
| ellipse | 80px | 40px | 11pt | ✅ |
| step | 140px | 50px | 12pt | ✅ |

All sizes are multiples of 10 (10px grid snap).
