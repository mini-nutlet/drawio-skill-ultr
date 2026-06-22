# Network Topology Preset

## Layout: LAYERED (zones: Region → VPC → Subnet)
## Default Theme: blueprint
## Node Budget: ≤25 nodes, ≤35 edges

## Zone Hierarchy
```
Region (l1) → VPC (l2) → Public Subnet (l3a) / Private Subnet (l3b)
                           ├── ALB, NAT GW, Bastion
                           └── App Servers, DB, Cache
```

## Protocol Label Convention
- Edge labels MUST include protocol: "HTTPS", "SQL", "gRPC", "SSH", "TLS"
- Label position: edge center, small font (10pt)

## Shape Convention
- Firewall: thick stroke (3pt), grey
- Router: hexagon
- Switch: rounded-rectangle
- Server: rounded-rectangle
- Cloud boundary: large rounded rectangle, dashed

## Scaffolds Available
- `vpc-subnet` — AWS VPC with Public + Private subnets
- `hybrid-cloud` — On-prem + Cloud with VPN/Direct Connect
- `zero-trust` — Zero Trust security perimeter
