# Quality Gates — 5-Stage Pipeline

## Overview

Every diagram passes through 5 quality gates before being declared "done."
Each stage catches a specific class of defects and either auto-fixes or flags them for manual review.

```
autofix.js  →  validate.js  →  lint-edges.js  →  score.js  →  visual review
(mechanical)   (structural)    (edge+layout)     (scoring)     (human check)
```

---

## Stage 1: Autofix (mechanical)

**Tool:** `scripts/autofix.js`
**Exit criteria:** All auto-fixable issues resolved

| Fix | Description | Auto? |
|---|---|---|
| `absoluteArcSize=1` | Adds missing arcSize anchor next to every `arcSize` | ✅ Auto |
| Hex case normalization | All hex colors to uppercase (`#1e293b` → `#1E293B`) | ✅ Auto |
| `fontFamily` injection | Adds `fontFamily=Microsoft YaHei` (Chinese) or `Arial` (Latin) on vertices without it | ✅ Auto |
| Grid snap | Rounds x, y, width, height to nearest multiple of 10 | ✅ Auto |
| Edge strokeWidth | Normalizes edge strokeWidth to 1.5pt | ✅ Auto |
| Emoji strip | Removes emoji from `value` attributes | ✅ Auto |

Run:
```bash
# Dry run (report only)
node scripts/autofix.js output/diagram.drawio

# Apply fixes
node scripts/autofix.js --write output/diagram.drawio
```

---

## Stage 2: Validate (structural)

**Tool:** `scripts/validate.js`
**Exit criteria:** 0 errors (warnings are acceptable)

| Check | Severity | Threshold |
|---|---|---|
| XML well-formedness | error | Must parse as valid XML |
| Duplicate cell IDs | error | Each `id` must be unique |
| Emoji in labels | error | No emoji in any `value` |
| Font size floor | error | ≥ 8pt on all vertices |
| Node label length | error | ≤ 25 characters |
| Node label lines | error | ≤ 2 lines |
| Font outside PPT range | warning | 12–16pt recommended (14pt ideal) |
| Missing `fontFamily` | warning | Every vertex with text must declare it |

Run:
```bash
node scripts/validate.js output/diagram.drawio
# Exit code 1 if any errors found
```

---

## Stage 3: Lint Edges (edge + layout quality)

**Tool:** `scripts/lint-edges.js`
**Exit criteria:** 0 errors (warnings are acceptable)

| Check | Severity | Description |
|---|---|---|
| Node overlap | error | Two vertices' bounding boxes overlap |
| Edge through node | error | Edge line passes through a non-endpoint vertex body |
| Left-side exit (exitX=0) | warning | Prefer right (exitX=1) or bottom (exitY=1) |
| Stacked edges | warning | Multiple right-side exits too close (< 0.2 Y-gap) |
| Off-grid | warning | x, y, width, or height not a multiple of 10 |

Run:
```bash
node scripts/lint-edges.js output/diagram.drawio
# Exit code 1 if any errors found
```

---

## Stage 4: Score (quality scoring)

**Tool:** `scripts/score.js`
**Exit criteria:** Score ≥ 60 (Grade C or better)

Scoring dimensions (0–100 weighted):

| Dimension | Weight | What It Measures |
|---|---|---|
| Theme Compliance | 25% | Are colors from the active theme? Ad-hoc hex penalty. |
| Alignment | 20% | Grid snap, shared-Y alignment, near-miss detection |
| Typography | 20% | fontFamily coverage, font size compliance |
| Edge Quality | 20% | Exit direction, crossings, routing quality |
| Label Quality | 15% | Length compliance, no emoji, line count |

Grades:
| Score | Grade | Meaning |
|---|---|---|
| 90–100 | A | Excellent — PPT-ready |
| 75–89 | B | Good — minor fixes recommended |
| 60–74 | C | Acceptable — several issues to address |
| 40–59 | D | Poor — significant rework needed |
| 0–39 | F | Failing — do not use as-is |

Run:
```bash
node scripts/score.js output/diagram.drawio
node scripts/score.js output/diagram.drawio --json  # machine-readable
```

---

## Stage 5: Visual Review (human check)

**Method:** Export PNG → inspect with vision
**Exit criteria:** No obvious visual defects (max 2 review rounds)

Checklist:
1. **Overlap** — Do any nodes or labels overlap?
2. **Clipping** — Is any text cut off at node boundaries?
3. **Edge routing** — Do edges route cleanly around nodes?
4. **Font sizing** — Are all labels readable at PPT scale (14pt)?
5. **Color consistency** — Do all nodes of the same semantic role share the same color?
6. **Zone alignment** — Are zone labels visible and correctly positioned?
7. **Legend presence** — If there are edge types, is there a legend?
8. **Scope/footnote** — Is the scope declared if the diagram is partial?

```bash
# Export for review
node scripts/export.js output/diagram.drawio -f png -o output/diagram-review.png

# If issues found, fix YAML or .drawio, then:
node scripts/cli.js spec.yaml -o output/diagram
node scripts/autofix.js --write output/diagram.drawio
node scripts/export.js output/diagram.drawio -f png -o output/diagram-review.png
# Re-check
```

---

## Pipeline in One Command

```bash
# Full quality pass
node scripts/autofix.js --write output/diagram.drawio && \
node scripts/validate.js output/diagram.drawio && \
node scripts/lint-edges.js output/diagram.drawio && \
node scripts/score.js output/diagram.drawio && \
node scripts/export.js output/diagram.drawio -f png -o output/diagram-review.png && \
echo "✅ Quality pipeline passed — ready for visual review"
```
