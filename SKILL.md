---
name: drawio-skill-ultr
description: "The definitive YAML-first draw.io diagram skill. Use for architecture diagrams, flowcharts, UML/ER, network topologies, ML model figures, academic figures, or any technical diagram. PPT-optimized output via draw.io Desktop CLI — SVG with perfect orthogonal edges, 14pt labels, 8pt floor, WCAG AA colors. Always start from a scaffold template; never draw from scratch unless the user explicitly asks for full custom control."
version: "1.0.0"
license: MIT
compatibility: "Node.js 20+ for YAML CLI workflow. draw.io Desktop required for SVG/PNG/JPEG/PDF export (brew install --cask drawio). No MCP server needed."
platforms: [macos, linux, windows]
argument-hint: "[diagram-description-or-instruction]"
allowed-tools: Read, Write, Bash, Edit, AskUserQuestion
---

# Draw.io Skill Ultr

YAML-first, PPT-optimized, Desktop CLI powered. The synthesis of best practices from 18 evaluated draw.io skills.

## STOP — read before generating any XML

This skill has two non-negotiable rules:

1. **Never draw from scratch unless explicitly asked.** Always scaffold from the closest template first: `node scripts/scaffold.js <query> -o <output>.yaml`. Templates come with correct layout, theme, and validated edge routing. From there, edit the YAML — it's faster and higher quality than hand-authoring XML.

2. **Never put long text in nodes.** Node labels are identifiers (≤25 chars). Long descriptions belong in captions, tooltips, or external Markdown. No emoji in labels — use shape + color for semantics.

## Task Routing

Choose the route first, then load only the references needed.

| Route | Trigger | Load |
|---|---|---|
| `create` | New diagram from text, spec, or scaffold | `references/workflows/create.md` + `references/layout-guidelines.md` + 1 preset |
| `edit` | Modify an existing `.drawio` or YAML spec | `references/workflows/edit.md` |
| `replicate` | Redraw an uploaded image or screenshot | `references/workflows/replicate.md` + `references/design-system.md` |
| `review` | Audit a diagram for quality issues | `references/quality-gates.md` |
| `export` | Export to SVG/PNG/JPEG/PDF | `references/workflows/export.md` |

## Runtime Stack

```
YAML Spec → FLOW/LR-TB first → Group Layout → Edge Routing → cli.js → .drawio → export.js
  垂直流/水平流优先   分组其次      连线辅助
```

- **cli.js**: Pure Node.js — renders YAML → `.drawio` XML (zero external dependencies)
- **export.js**: Wraps draw.io Desktop CLI — all formats go through one binary
- **No MCP. No diagrams.net upload.** Fully offline, deterministic, auditable.

## Quick Commands

```bash
# Scaffold from template
node scripts/scaffold.js microservice --name "My System" -o spec.yaml
node scripts/scaffold.js --list --type architecture

# Render .drawio from YAML (auto RADIAL for architecture/flowchart)
node scripts/cli.js spec.yaml -o output/diagram

# Export (requires draw.io Desktop)
node scripts/export.js output/diagram.drawio -f svg -o diagram.svg
node scripts/export.js output/diagram.drawio --all -o output/

# Quality pipeline
node scripts/validate.js output/diagram.drawio
node scripts/lint-edges.js output/diagram.drawio
node scripts/autofix.js --write output/diagram.drawio
node scripts/score.js output/diagram.drawio

# Utilities
node scripts/pick-theme.js "微服务架构图"
node scripts/check-contrast.js blueprint-light.json
node scripts/find-stencil.js "kubernetes pod" --limit 5
```

## Group Layout (分组布局)

Define visual groups in YAML spec — layout engine computes bounding containers:

```yaml
groups:
  - id: "grp-frontend"
    label: "Frontend"
    nodes: ["n-web", "n-mobile"]  # member node IDs
    fill: "#F0FDF4"               # optional — group background
    stroke: "#86EFAC"             # optional — group border
```

Groups are rendered as dashed rounded-rect containers behind their member nodes.
**分组间最小间隔 40px**，布局引擎自动检测重叠并推开。
Works with all layout modes (RADIAL, LAYERED, FLOW).

## Non-Negotiable Rules

1. **Scaffold first, customize second.** 21 templates cover 80% of requests.
2. **Node labels ≤ 25 chars, no emoji.** Use tooltip/caption for details.
3. **垂直流/水平流优先，分组其次，布局再次，连线辅助，禁止堆叠，画布自适应。** FLOW(LR/TB) > Groups > RADIAL > LAYERED. 流程图优先流向，架构图优先分层流。
4. **连线: 折线+弧形拐角+语义色，非固定绿色。** orthogonalEdgeStyle + curved=1 + rounded=1. 颜色来自edge-colors.json(sync-call=#475569, data-flow=#7C3AED, auth=#CC00DC...)，默认sync-call灰色，严禁固定绿色。出右(→)下(↓), 入左(→)上(↓)。
5. **Font ≥ 8pt, labels 12-16pt.** PPT slide readability is the hard constraint.
6. **Microsoft YaHei for Chinese, Arial for Latin.** Explicit `fontFamily` on every new element.
7. **10px grid snap.** All x/y/w/h integers, multiples of 10.
8. **Theme colors only.** No ad-hoc hex values — use the active theme's semantic colors.
9. **Validate before declaring done.** `validate.js` + `lint-edges.js` must pass.
10. **SVG is the default deliverable.** Export SVG always; PNG/JPEG/PDF only when requested.
11. **Colors are never the sole carrier of meaning.** Shape + label + color triple encoding.
12. **图元优先级: 系统 > 用户SVG > 默认.** builtin(50) > cloud(40) > k8s(35) > custom(30) > 回退圆角矩形。`find-stencil.js` 得分含来源优先级加权。

## Quality Pipeline

```
autofix.js  →  validate.js  →  lint-edges.js  →  score.js  →  visual review
(机械修复)      (结构校验)       (连线+布局质量)   (主题评分)    (导出PNG自检)
```

- **autofix**: grid snap, hex case, arcSize, strokeWidth, fontFamily normalization
- **validate**: XML well-formedness, duplicate IDs, schema compliance, font size floor (≥8pt), no emoji in labels
- **lint-edges**: edge crossing, edge through node, node overlap, exit direction priority, stacked edges, text overflow, off-grid
- **score**: theme color compliance, corpus similarity, alignment consistency
- **visual review**: export PNG, read with vision, check for obvious defects (max 2 rounds)

## 5 Visual Systems

| Theme | Color Relation | Best For | Mode |
|---|---|---|---|
| `blueprint` (default) | Analogous (blue-cyan) | Architecture, network topology | light + dark |
| `editorial` | Monochrome + red accent | Papers, IEEE/ACM, thesis | light + dark |
| `operations` | Complementary (blue-orange) | Dashboards, CI/CD, alerts | dark only |
| `analytical` | Triadic (violet-cyan-yellow) | Data flow, ETL, comparisons | light + dark |
| `narrative` | Split-complementary (green-pink-orange) | User journeys, business flow | light + dark |

Load a theme: `node scripts/cli.js spec.yaml --theme blueprint --mode light`

## Diagram Type Presets

| Preset | Layout Mode | Scaffolds | Reference |
|---|---|---|---|
| `architecture` | **FLOW** | 5 templates | `references/diagram-type-presets/architecture.md` |
| `flowchart` | **FLOW** | 4 templates | `references/diagram-type-presets/flowchart.md` |
| `uml-class` | TREE/GRID | — | `references/diagram-type-presets/uml-class.md` |
| `er-diagram` | GRID | 2 templates | `references/diagram-type-presets/er-diagram.md` |
| `sequence` | FLOW | — | `references/diagram-type-presets/sequence.md` |
| `network-topology` | LAYERED | 3 templates | `references/diagram-type-presets/network-topology.md` |
| `ml-model` | LAYERED/FLOW | 3 templates | `references/diagram-type-presets/ml-model.md` |
| `academic-figure` | LAYERED | — | `references/diagram-type-presets/academic-figure.md` |

## Anti-Patterns — do NOT

- Draw from scratch when a scaffold template exists
- Put > 25 characters or emoji in node labels
- Use left/top exits (exitX=0, exitY=0) or right/bottom entries (entryX=1, entryY=1) — arrows must always go → or ↓
- Use font sizes below 8pt
- Use ad-hoc hex colors instead of theme tokens
- Rely on color alone to convey meaning
- Upload to diagrams.net — all exports go through Desktop CLI
- Use MCP server — this skill uses Desktop CLI exclusively
- Skip validation before declaring completion

## Resource Navigation

- Design system: `references/design-system.md` (CRAP + FIGMA + color theory + accessibility)
- Design tokens: `references/design-tokens.md` (spacing scale + typography scale + border radius)
- Color system: `references/color-system.md` (5 themes × 2 modes complete color tables)
- Edge semantics: `references/edge-semantics.md` (7 edge types + color/line-style mapping)
- Edge priority: `references/edge-priority.md` (right > bottom > top >> left)
- Shape language: `references/shape-language.md` (shape + color pairing rules)
- Typography: `references/typography.md` (font stack + PPT-optimized scale)
- Text roles: `references/text-roles.md` (identifier / protocol / legend / narration — 4-layer classification)
- Layout guidelines: `references/layout-guidelines.md` (5 layout modes + spacing scale)
- Quality gates: `references/quality-gates.md` (5-stage pipeline detail)
- YAML specification: `references/yaml-specification.md` (schema + validation rules)
- Task routing: `references/task-routing.md` (full routing table)
- Troubleshooting: `references/troubleshooting.md` (common failures + fixes)

## Completion Report

After every diagram, report:
- Deliverable paths (.drawio + .svg at minimum)
- Theme + mode used
- Scaffold template used (or "custom")
- Validation result (validate.js + lint-edges.js)
- Export formats generated
- Visual check result
- Any remaining manual review items
