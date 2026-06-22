# Edge Semantics

## Overview

Edges in drawio-skill-ultr are not just connectors — they carry **semantic meaning** through color, line style, and width. The 7 edge types form a visual language that readers learn after seeing 2–3 diagrams.

## Edge Type Reference

### `sync-call` — Synchronous Request-Response
- **Color:** `#475569` (slate gray)
- **Style:** Solid, 1.5pt
- **Arrow:** Classic, filled
- **Meaning:** HTTPS/gRPC/REST synchronous calls. Request goes out, response comes back.
- **Used for:** API gateway → service, service → database, service → external API
- **Typical label:** `"HTTPS/REST"`, `"gRPC"`, `"GraphQL"`

### `async-event` — Asynchronous Events/Messages
- **Color:** `#D97706` (amber)
- **Style:** Dashed (6px dash, 4px gap), 1.0pt
- **Arrow:** Classic, filled
- **Meaning:** Asynchronous messages via Kafka, RabbitMQ, SQS, etc. Fire-and-forget.
- **Used for:** Service → message queue, event producer → topic, topic → consumer
- **Typical label:** `"user.created"`, `"order.placed"`, `"Kafka"`

### `data-flow` — Data Flow Direction
- **Color:** `#7C3AED` (violet)
- **Style:** Solid, 1.5pt
- **Arrow:** Classic, filled
- **Meaning:** Data movement direction — ETL pipelines, read/write paths, replication.
- **Used for:** ETL source → transform → sink, primary → replica, service → cache
- **Typical label:** `"Read/Write"`, `"ETL"`, `"Replication"`

### `auth-trust` — Authentication/Trust
- **Color:** `#CC00DC` (magenta)
- **Style:** Solid, 1.5pt
- **Arrow:** Classic, filled
- **Meaning:** Authentication flows, trust relationships, certificate chains.
- **Used for:** User → IdP, service → auth service, SAML/OIDC flows
- **Typical label:** `"SAML"`, `"OIDC"`, `"JWT"`, `"mTLS"`

### `error-fallback` — Error/Fallback Path
- **Color:** `#DC2626` (red)
- **Style:** Solid, 1.5pt
- **Arrow:** Classic, filled
- **Meaning:** Error handling, circuit breaker fallback, retry exhaustion.
- **Used for:** Service → dead-letter queue, circuit breaker → fallback, error handler
- **Typical label:** `"on failure"`, `"fallback"`, `"DLQ"`

### `conditional` — Conditional Branch
- **Color:** `#0891B2` (cyan)
- **Style:** Dashed (4px dash, 4px gap), 1.0pt
- **Arrow:** Classic, filled
- **Meaning:** Conditional/optional path. Only taken when a condition is met.
- **Used for:** Feature flag routes, A/B test splits, optional enrichment
- **Typical label:** `"if premium"`, `"optional"`, `"A/B variant"`

### `deployment` — Deployment/Release Flow
- **Color:** `#059669` (emerald)
- **Style:** Solid, 1.0pt
- **Arrow:** Classic, filled
- **Meaning:** Deployment pipelines, release promotion, artifact flow.
- **Used for:** CI → CD, build → test → staging → production, artifact registry
- **Typical label:** `"deploy"`, `"promote"`, `"release"`

---

## Decision Tree

```
Is this a synchronous request-response call?
├── Yes → sync-call (#475569, solid)
├── No → Is it an async event/message?
│   ├── Yes → async-event (#D97706, dashed 6-4)
│   ├── No → Is it a data pipeline or ETL?
│   │   ├── Yes → data-flow (#7C3AED, solid)
│   │   ├── No → Is it an auth/trust relationship?
│   │   │   ├── Yes → auth-trust (#CC00DC, solid)
│   │   │   ├── No → Is it an error/fallback path?
│   │   │   │   ├── Yes → error-fallback (#DC2626, solid)
│   │   │   │   ├── No → Is it a conditional branch?
│   │   │   │   │   ├── Yes → conditional (#0891B2, dashed 4-4)
│   │   │   │   │   └── No → Is it deployment/release?
│   │   │   │   │       ├── Yes → deployment (#059669, solid)
│   │   │   │   │       └── No → sync-call (default)
```

---

## Exit Direction Priority

Connected to edge semantics: **Right > Bottom > Top >> Left**

| Priority | Exit | When |
|---|---|---|
| ★★★ | Right (exitX=1) | Peer-to-peer calls, cross-zone communication |
| ★★ | Bottom (exitY=1) | Top-down layered flows (app → data) |
| ★ | Top (exitY=0) | Reverse flows (data → app callback) |
| ❌ | Left (exitX=0) | Last resort — violates reading flow |

See also: [edge-priority.md](edge-priority.md)

---

## Edge Label Format

Edge labels follow the **Protocol Label** text role:
- ≤ 15 characters
- Upper case for protocol names: `"HTTPS/REST"`, `"gRPC"`, `"Kafka"`
- Lower case for events: `"user.created"`, `"order.placed"`
- No emoji, no punctuation

## Multi-Edge Spacing

When N edges exit the same node's right side:
```
N=1 → center (exitY=0.5)
N=2 → 0.33 + 0.67 (spread evenly)
N=3 → 0.25 + 0.5 + 0.75
N=4 → 0.2 + 0.4 + 0.6 + 0.8
N≥5 → suggest splitting the node or adding an intermediate router
```
