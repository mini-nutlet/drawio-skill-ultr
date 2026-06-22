# Export Workflow

## Overview
Export a `.drawio` file to SVG, PNG, JPEG, or PDF using the draw.io Desktop CLI.
All exports go through `scripts/export.js` — a thin wrapper around the draw.io binary.

## Prerequisites

draw.io Desktop must be installed:

```bash
# macOS
brew install --cask drawio

# Windows
# Download from: https://github.com/jgraph/drawio-desktop/releases

# Linux
sudo snap install drawio
# Or: https://github.com/jgraph/drawio-desktop/releases
```

Verify installation:
```bash
node scripts/export.js --check
```

## Quick Export

```bash
# Single format (SVG is default)
node scripts/export.js output/diagram.drawio -f svg -o output/diagram.svg

# Embed images (for PNG/PDF with embedded fonts)
node scripts/export.js output/diagram.drawio -f png -e -o output/diagram.png
node scripts/export.js output/diagram.drawio -f pdf -e -o output/diagram.pdf

# JPEG with quality control
node scripts/export.js output/diagram.drawio -f jpg --quality 95 -o output/diagram.jpg

# PNG with custom width
node scripts/export.js output/diagram.drawio -f png --width 4000 -o output/diagram@4x.png
```

## Export All Formats

```bash
# One diagram → all 4 formats (SVG + PNG + JPG thumb + PDF)
node scripts/export.js output/diagram.drawio --all -o output/

# Produces:
#   output/diagram.svg
#   output/diagram.drawio.png      (2000px, embedded)
#   output/diagram_thumb.jpg       (1920px, quality 92)
#   output/diagram.pdf             (embedded)
```

## Batch Export

```bash
# All .drawio files in a directory → SVG
node scripts/export.js --batch ./diagrams/ -o ./exported/

# All .drawio files → all 4 formats
node scripts/export.js --batch ./diagrams/ --all -o ./exported/
```

## Format Reference

| Format | Flag | Default Size | Options | Best For |
|---|---|---|---|---|
| **SVG** | `-f svg` | Native | `-e` (embed) | PPT, web, default deliverable |
| **PNG** | `-f png` | 2000px wide | `-e` (embed fonts), `--width N` | Preview, slides, docs |
| **JPEG** | `-f jpg` | 1920px wide | `--width N`, `--quality N` (1-100) | Thumbnails, email |
| **PDF** | `-f pdf` | Native | `-e` (embed fonts) | Print, papers, archives |

## Border Control

```bash
# Default border: 10px
node scripts/export.js diagram.drawio -f svg -b 20 -o diagram.svg

# Zero border (tight crop)
node scripts/export.js diagram.drawio -f png -b 0 -o diagram.png
```

## Full Workflow

```bash
# 1. Scaffold + render
node scripts/scaffold.js microservice --name "My System" -o spec.yaml
node scripts/cli.js spec.yaml -o output/diagram

# 2. Quality pipeline
node scripts/validate.js output/diagram.drawio
node scripts/lint-edges.js output/diagram.drawio
node scripts/autofix.js --write output/diagram.drawio

# 3. Export
node scripts/export.js output/diagram.drawio -f svg -o output/diagram.svg
node scripts/export.js output/diagram.drawio --all -o output/

# 4. Visual review
# Open output/diagram.svg and check for defects
```

## Troubleshooting

### "draw.io Desktop CLI not found"
- Verify installation: `drawio --version`
- On macOS, ensure `/Applications/draw.io.app` exists
- On Windows, check `C:\Program Files\draw.io\draw.io.exe`
- On WSL2, path is `/mnt/c/Program Files/draw.io/draw.io.exe`

### Exported PNG is corrupted / won't open
- This is a known draw.io CLI bug where the IEND PNG chunk is truncated
- `export.js` automatically repairs this for `-e` (embed) PNGs
- If repair fails, try without `-e` flag

### Chinese text missing in SVG
- Ensure `fontFamily=Microsoft YaHei` is set on all nodes
- Run `node scripts/validate.js` to check for missing `fontFamily`
- The draw.io CLI needs the font installed on the system

### PDF text selectable but garbled
- Use `-e` (embed) flag to embed fonts in the PDF
- Without `-e`, font substitution depends on the viewer's system fonts

### SVG too large for PPT
- PPT prefers ~1920×1080 canvas
- Use `node scripts/cli.js --canvas ppt-16:9` to generate PPT-optimized output
- Or manually set `canvas: ppt-16:9` in your YAML meta
