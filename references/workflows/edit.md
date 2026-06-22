# Edit Workflow

## Overview
Modify an existing `.drawio` file or YAML spec.

## Steps

1. **Identify source**: Is it a YAML spec or `.drawio` only?
   - If YAML spec exists → edit YAML, regenerate `.drawio`
   - If only `.drawio` → edit XML directly (use Edit tool, not full rewrite)

2. **Preserve existing**:
   - Page order, diagram IDs, existing `mxCell` IDs
   - Only change what the user asked to change
   - Preserve `fontFamily` on unchanged elements

3. **After edit**:
   - `node scripts/validate.js <file>.drawio`
   - `node scripts/lint-edges.js <file>.drawio`
   - `node scripts/autofix.js --write <file>.drawio`

4. **If structural change**: Re-export SVG and visually check

## Never
- Rewrite entire file for small changes
- Change canvas size / zone hierarchy / footer unless explicitly asked
- Guess cell IDs — always inspect the file first
