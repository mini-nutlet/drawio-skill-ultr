# Create Workflow

## Overview
Create a new diagram from text description, scaffold template, or raw YAML spec.

## Steps

1. **Auto-select theme**: `node scripts/pick-theme.js "<user request>"`
2. **Scaffold from template**: `node scripts/scaffold.js <query> -o spec.yaml`
   - If no template matches, create YAML spec manually based on `references/yaml-specification.md`
3. **Apply layout**: `node scripts/layout.js spec.yaml --mode <LAYERED|TREE|FLOW|RADIAL|GRID>`
4. **Validate spec**: Check node labels ≤25 chars, no emoji, font sizes in range
5. **Render**: `node scripts/cli.js spec.yaml -o output/diagram`
6. **Validate output**: `node scripts/validate.js output/diagram.drawio`
7. **Lint edges**: `node scripts/lint-edges.js output/diagram.drawio`
8. **Autofix**: `node scripts/autofix.js --write output/diagram.drawio`
9. **Export SVG**: `node scripts/export.js output/diagram.drawio -f svg -o output/diagram.svg`
10. **Visual review**: Open SVG, check for obvious defects (overlap, clipping, alignment)

## Never
- Draw from scratch when a scaffold template exists
- Put > 25 chars in node labels
- Use emoji in labels
- Skip validation before declaring done
