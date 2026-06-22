# Generic Custom Stencils (MIT)

Place custom SVG icons for generic infrastructure concepts here.
Each `.svg` file is embedded as a data URI in draw.io via `style=shape=image;image=data:image/svg+xml,...`

## Planned stencils
- microservice.svg — generic microservice icon
- message-queue.svg — message/event queue
- api-gateway.svg — API gateway
- load-balancer.svg — load balancer
- event-bus.svg — event bus
- circuit-breaker.svg — circuit breaker pattern
- service-mesh.svg — service mesh sidecar

## Usage
```xml
<mxCell id="icon-1" value="" style="shape=image;html=1;image=data:image/svg+xml,<base64>;" vertex="1" parent="1">
  <mxGeometry x="100" y="100" width="32" height="32" as="geometry" />
</mxCell>
```

## Design Rules
- 32×32px viewBox
- Monochrome (#475569 default)
- 1.5px stroke, rounded caps
- No external font dependencies
