# Review Workflow

## Overview
Audit an existing diagram for quality issues without modifying it.

## Steps

1. **Run validate**: `node scripts/validate.js <file>.drawio`
2. **Run lint**: `node scripts/lint-edges.js <file>.drawio`
3. **Check theme compliance**: `node scripts/check-contrast.js --all`
4. **Visual review**:
   - Export PNG: `node scripts/export.js <file>.drawio -f png`
   - Check: overlap, clipping, edge routing, font sizes, color consistency
5. **Report**: List errors/warnings with severity, suggest fixes

## Review Dimensions

| Dimension | Tool | Checks |
|---|---|---|
| Structure | validate.js | XML validity, IDs, schema, font floor, emoji |
| Layout | lint-edges.js | Overlap, edge routing, grid alignment, exit direction |
| Theme | check-contrast.js | Color compliance, contrast ratios |
| Visual | export + vision | Overlap, text overflow, misalignment, color harmony |
