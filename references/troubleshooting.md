# Troubleshooting

## Common Failures & Fixes

### draw.io Desktop CLI

**Problem:** `draw.io Desktop CLI not found`
```
Error: draw.io Desktop CLI not found. All exports require Desktop.
```

**Fix:**
```bash
# macOS
brew install --cask drawio

# Windows
# Download from https://github.com/jgraph/drawio-desktop/releases
# Install to default location: C:\Program Files\draw.io\

# Linux
sudo snap install drawio

# Verify
drawio --version
```

**Problem:** `drawio` is installed but `export.js` can't find it.

**Fix:** The script checks these paths in order:
- `drawio` (PATH)
- `/Applications/draw.io.app/Contents/MacOS/draw.io` (macOS)
- `C:\Program Files\draw.io\draw.io.exe` (Windows)
- `/usr/bin/drawio` (Linux)
- `/snap/bin/drawio` (Linux snap)
- `/mnt/c/Program Files/draw.io/draw.io.exe` (WSL2)

If installed elsewhere, symlink it into PATH: `sudo ln -s /path/to/drawio /usr/local/bin/drawio`

---

### Export Issues

**Problem:** Exported PNG is corrupted or won't open.
- **Cause:** Known draw.io CLI bug — the IEND PNG chunk is truncated in `-e` (embed) mode.
- **Fix:** `export.js` auto-repairs this. If it still fails, export without `-e`:
  ```bash
  node scripts/export.js diagram.drawio -f png -o diagram.png
  ```

**Problem:** SVG text looks wrong / wrong font.
- **Cause:** Missing `fontFamily` declaration on nodes.
- **Fix:** Run autofix to inject fontFamily:
  ```bash
  node scripts/autofix.js --write diagram.drawio
  ```
  Chinese text needs `fontFamily=Microsoft YaHei`; Latin needs `fontFamily=Arial`.

**Problem:** JPEG quality is too low.
- **Fix:** Increase quality (default 92):
  ```bash
  node scripts/export.js diagram.drawio -f jpg --quality 98 -o diagram.jpg
  ```

**Problem:** Export is too large / too small.
- **Fix:** PNG and JPEG accept `--width`:
  ```bash
  node scripts/export.js diagram.drawio -f png --width 4000 -o diagram@4x.png
  ```

---

### Validation Errors

**Problem:** `validate.js` reports `duplicate-id`.
- **Cause:** Two cells have the same `id` attribute.
- **Fix:** Search the `.drawio` file for the duplicate ID and rename one.

**Problem:** `font-too-small` — `Font size 6pt < 8pt minimum`.
- **Cause:** A node has fontSize below the 8pt PPT floor.
- **Fix:** Increase fontSize to ≥ 8pt (12–14pt recommended for nodes).

**Problem:** `label-too-long` — label exceeds 25 characters.
- **Cause:** Node label contains a sentence, not an identifier.
- **Fix:** Shorten to ≤ 25 chars. Move long text to tooltip, caption, or external doc.

**Problem:** `emoji-in-label` — emoji found in node value.
- **Cause:** Emoji characters in node labels.
- **Fix:** Remove emoji. Use shape + color for semantics instead.
  ```bash
  node scripts/autofix.js --write diagram.drawio  # auto-strips emoji
  ```

---

### Edge Issues

**Problem:** `edge-through-node` — edge passes through another node.
- **Cause:** Direct line between source and target crosses an unrelated node.
- **Fix:** Add waypoints to route around the intermediate node:
  ```yaml
  edges:
    - from: "svc-a"
      to: "svc-b"
      waypoints:
        - {x: 400, y: 200}
        - {x: 600, y: 200}
  ```

**Problem:** `left-exit` — edge uses left-side exit.
- **Cause:** `exitX=0` on an edge.
- **Fix:** Route from right (exitX=1) or bottom (exitY=1) instead.

**Problem:** `stacked-edges` — multiple right-side edges too close.
- **Cause:** >2 edges exiting right side with Y-gap < 0.2.
- **Fix:** Space exitY values evenly: 0.25, 0.5, 0.75 for 3 edges.

**Problem:** `node-overlap` — two nodes overlap.
- **Cause:** Manual x/y positioning placed nodes too close.
- **Fix:** Let layout.js auto-position, or increase spacing manually.

---

### Rendering Issues

**Problem:** `cli.js` produces blank output.
- **Cause:** YAML spec is malformed or missing required fields (`meta.title`, `nodes`).
- **Fix:** Validate the YAML structure. Ensure `meta.title` and at least one node exist.

**Problem:** Theme colors don't apply.
- **Cause:** Theme file not found or mode mismatch.
- **Fix:** Check theme exists:
  ```bash
  ls assets/themes/
  ```
  Try explicit theme + mode:
  ```bash
  node scripts/cli.js spec.yaml --theme blueprint --mode light
  ```

**Problem:** Layout produces overlapping nodes.
- **Cause:** Node count exceeds what the layout mode can handle cleanly.
- **Fix:** Try a different layout mode, or manually position crowded nodes.

---

### Scaffold Issues

**Problem:** `scaffold.js` returns "No scaffold found".
- **Cause:** Query doesn't match any template.
- **Fix:** List all available templates:
  ```bash
  node scripts/scaffold.js --list
  ```
  Try broader search terms or browse by type:
  ```bash
  node scripts/scaffold.js --list --type architecture
  ```

---

## Quick Diagnostic Commands

```bash
# Check draw.io installation
drawio --version

# List available themes
ls assets/themes/

# List available scaffolds
node scripts/scaffold.js --list

# Full quality check
node scripts/validate.js output/diagram.drawio
node scripts/lint-edges.js output/diagram.drawio
node scripts/check-contrast.js --all
node scripts/score.js output/diagram.drawio
```
