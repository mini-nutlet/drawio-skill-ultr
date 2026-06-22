# Architecture Diagram Preset

## Layout: LAYERED (top-down)
## Default Theme: blueprint
## Node Budget: ≤20 nodes, ≤30 edges

## Semantic Roles
- `compute`: rounded-rectangle, blue — services, containers, apps
- `storage`: cylinder3, red/pink — databases, caches, object stores
- `network`: rounded-rectangle, indigo — load balancers, API gateways, CDN
- `external`: rounded-rectangle + dashed, yellow — third-party services
- `security`: rounded-rectangle, purple — auth, WAF, vault
- `async`: hexagon, orange — message queues, event buses

## Zone Convention
```
zone-edge     → "接入层" / "Edge Layer"
zone-services → "服务层" / "Services"
zone-data     → "数据层" / "Data Layer"
zone-infra    → "基础设施层" / "Infrastructure" (optional L3)
```

## Scaffolds Available
- `microservice` — 5 services + API GW + MQ + 3 DB types
- `three-tier-web` — LB + 3 App Servers + Cache + DB + Replica
- `event-driven` — Kafka + CQRS (2 producers, 3 consumers)
