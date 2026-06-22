# Replicate Workflow

## Overview
Redraw an uploaded image, screenshot, or SVG into a structured draw.io diagram.

## Steps

1. **Analyze the source**: Identify layers, node types, edges, palette, labels
2. **Extract palette**: Record fill/stroke colors from the source image
3. **Choose closest theme**: Match source palette to nearest theme, or build custom
4. **Create YAML spec**:
   - Map visual elements to nodes with semantic roles
   - Preserve text placements, label offsets, formula positions
5. **Render + validate + export**
6. **Self-check**: Compare exported SVG side-by-side with source image

## Key Rules
- Preserve source palette by default (don't force-fit to a theme)
- Record `meta.replication` in spec: source type, date, extracted colors
- Use `bounds` for standalone text/formula boxes
- Use `labelOffset` when connector labels sit off the line
