# Typography System

## Font Stack

```
Microsoft YaHei, Arial, Helvetica, PingFang SC, sans-serif
     ↑              ↑        ↑           ↑            ↑
  Windows中文    全平台     macOS       macOS      终极回退
   首选         西文首选    备选      中文备选
```

## PPT-Optimized Scale

| Role | Font | Size | Weight | Line Height |
|---|---|---|---|---|
| Diagram title | Microsoft YaHei | 18-22pt | Bold 700 | 1.3 |
| Zone/layer label | Microsoft YaHei | 14-16pt | Bold 700 | 1.2 |
| **Node label ★** | Arial / 微软雅黑 | **14pt** | Bold 700 | 1.2 |
| Node subtitle | Arial | 10-12pt | Regular 400 | 1.1 |
| Edge protocol label | Arial | 10-12pt | Regular 400 | 1.0 |
| Legend text | Arial | 9-10pt | Regular 400 | 1.1 |
| Footnote / Scope | Arial | **8pt** | Regular 400 | 1.0 |
| Code snippet | Courier New | 8-10pt | Regular 400 | 1.0 |

## Hard Constraints

- **8pt is the absolute floor** — any visible text below 8pt is a lint error
- **Node labels must be 12-16pt** — 14pt is the recommended default for PPT slides
- **Academic (Editorial) theme** overrides to Times New Roman, 11pt body

## Font Rules

1. Every newly-generated label must explicitly declare `fontFamily`
2. Chinese text → `fontFamily=Microsoft YaHei`
3. Latin text → `fontFamily=Arial`
4. Mixed text → `fontFamily=Microsoft YaHei` (Chinese takes priority for rendering)
5. Figma principle: consistent font hierarchy across all diagrams in the same project
