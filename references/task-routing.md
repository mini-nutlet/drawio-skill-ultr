# Task Routing

## Overview

The skill routes user requests to one of 5 workflows based on intent.
Pick the route first, then load only the references that route needs.

## Routing Table

| Route | Trigger Keywords | Workflow Doc | Required References |
|---|---|---|---|
| `create` | draw, create, generate, make, build, 画, 生成, 创建, diagram, chart, figure | `references/workflows/create.md` | `layout-guidelines.md` + 1 diagram type preset |
| `edit` | modify, change, update, fix, adjust, add node, remove, 修改, 改 | `references/workflows/edit.md` | — |
| `replicate` | redraw, replicate, from image, from screenshot, copy this, 重绘, 复刻 | `references/workflows/replicate.md` | `design-system.md` |
| `review` | review, audit, check, quality, lint, validate, 审查, 检查 | `references/workflows/review.md` | `quality-gates.md` |
| `export` | export, save as, SVG, PNG, JPG, PDF, 导出 | `references/workflows/export.md` | — |

## Trigger Recognition

### `create` — Match any of:
- User describes a system/architecture/process to visualize
- Keywords: draw, create, make, generate, diagram, chart, figure, 画图, 生成, 创建
- User provides a YAML spec file
- User asks to scaffold from template: `scaffold microservice`

### `edit` — Match any of:
- User points to an existing `.drawio` or `.yaml` file
- Keywords: modify, change, update, fix, add, remove, rename, 修改, 改
- User asks to change a specific element in an existing diagram

### `replicate` — Match any of:
- User uploads or references an image/screenshot
- Keywords: redraw, replicate, from image, from screenshot, copy this, 重绘, 复刻
- User says "make a diagram like this" with an image attachment

### `review` — Match any of:
- User asks to check/audit an existing diagram
- Keywords: review, audit, check, quality, lint, validate, score, 审查, 检查
- User asks "is this diagram good?" or "what's wrong with this?"

### `export` — Match any of:
- User asks to export/save a diagram
- Keywords: export, save as, SVG, PNG, JPG, JPEG, PDF, 导出, 保存
- User asks "give me the SVG" or "export as PNG"

---

## Route-Specific Instructions

### Route: `create`
1. Auto-select theme: `node scripts/pick-theme.js "<user request>"`
2. Find scaffold: `node scripts/scaffold.js <query> -o spec.yaml`
3. Apply layout
4. Validate spec
5. Render: `node scripts/cli.js spec.yaml -o output/diagram`
6. Quality pipeline (autofix → validate → lint-edges → score)
7. Export SVG
8. Visual review

### Route: `edit`
1. Identify source (YAML or .drawio)
2. Preserve existing structure — only change what's requested
3. After edit: validate + lint-edges + autofix
4. Re-export if structural change
5. Visual check

### Route: `replicate`
1. Read the image/screenshot
2. Identify: diagram type, nodes, edges, layers, labels
3. Find closest scaffold template
4. Create YAML spec from visual analysis
5. Render + quality pipeline
6. Side-by-side comparison with original

### Route: `review`
1. Run validate.js
2. Run lint-edges.js
3. Run check-contrast.js
4. Export PNG for visual inspection
5. Report: errors/warnings by severity, fix suggestions
6. Optional: run score.js for quantitative assessment

### Route: `export`
1. Verify draw.io Desktop CLI is available
2. Export requested format(s)
3. For PNG: auto-repair IEND chunk if needed
4. Report deliverable paths and file sizes
5. Suggest additional formats if only one was requested

---

## Unknown Routes

If the user's intent doesn't clearly match any route:
1. Ask: "Are you creating a new diagram, editing an existing one, or reviewing?"
2. Default assumption: `create` (most common)
3. Never guess — a one-sentence clarification avoids rework

## Anti-Routing

Do NOT:
- Use `create` workflow when user explicitly said "edit" or pointed to an existing file
- Use `replicate` when a scaffold template already matches
- Skip the quality pipeline for any route (validate + lint-edges minimum)
- Export without running the quality pipeline first
