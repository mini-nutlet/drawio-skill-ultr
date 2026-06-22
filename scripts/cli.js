#!/usr/bin/env node
/**
 * cli.js — YAML → .drawio rendering engine
 * Pure Node.js, zero external dependencies.
 * Usage:
 *   node cli.js spec.yaml -o output/diagram
 *   node cli.js spec.yaml --theme blueprint --mode dark -o output/diagram
 */

const fs = require('fs');
const path = require('path');

const THEMES_DIR = path.join(__dirname, '..', 'assets', 'themes');
const DEFAULT_THEME = 'blueprint';
const DEFAULT_MODE = 'light';
const PPT_CANVAS = { width: 1920, height: 1080 };

// Layout engine: prefer ELK.js (full ELK), fall back to hand-rolled Sugiyama
const { computeLayout } = require('./layout.js');
let computeLayoutElk = null;
try { ({ computeLayoutElk } = require('./layout-elk.js')); } catch (e) { /* ELK not installed */ }

// Edge semantic colors (fallback when theme has no colors.edge)
let EDGE_COLORS = null;
try { EDGE_COLORS = require('../assets/semantic-colors/edge-colors.json').edges; } catch (e) { /* no edge colors */ }

function loadTheme(name, mode) {
  let themePath = path.join(THEMES_DIR, `${name}-${mode}.json`);
  if (!fs.existsSync(themePath)) {
    // Fallback: try opposite mode, then any available mode for this theme
    const altMode = mode === 'dark' ? 'light' : 'dark';
    themePath = path.join(THEMES_DIR, `${name}-${altMode}.json`);
    if (!fs.existsSync(themePath)) {
      // Find any file matching this theme name
      const files = fs.readdirSync(THEMES_DIR).filter(f => f.startsWith(`${name}-`));
      if (files.length > 0) {
        themePath = path.join(THEMES_DIR, files[0]);
      } else {
        throw new Error(`Theme not found: ${name}-${mode}.json (or ${name}-${altMode}.json) in ${THEMES_DIR}`);
      }
    }
  }
  return JSON.parse(fs.readFileSync(themePath, 'utf8'));
}

async function renderDrawio(spec, options = {}) {
  const layoutMode = (spec.meta?.layout || 'LAYERED').toUpperCase();

  // ★ Auto-layout: use ELK for force/radial/tree, Sugiyama for layered/flow/grid
  if (spec.nodes?.length > 0) {
    let layoutResult = null;

    // ELK.js is best for force-directed, radial, and tree layouts
    const useElk = ['FORCE', 'RADIAL', 'TREE'].includes(layoutMode);

    if (useElk && computeLayoutElk) {
      try {
        layoutResult = await computeLayoutElk(spec);
        if (layoutResult) spec.meta._engine = 'elkjs';
      } catch (e) { /* ELK failed, fall through */ }
    }

    // Sugiyama: best for LAYERED and FLOW — respects layer property tags
    if (!layoutResult) {
      try {
        layoutResult = computeLayout(spec);
        if (layoutResult && !spec.meta._engine) spec.meta._engine = 'sugiyama';
      } catch (e) { /* Layout failed — fall through with manual positions */ }
    }

    if (layoutResult) {
      spec = { ...spec, nodes: layoutResult.nodes, zones: layoutResult.zones || spec.zones, edges: layoutResult.edges || spec.edges, groups: layoutResult.groups || spec.groups, _canvasW: layoutResult._canvasW, _canvasH: layoutResult._canvasH };
    }
  }

  const theme = loadTheme(options.theme || spec.meta?.theme || DEFAULT_THEME,
                          options.mode  || spec.meta?.mode  || DEFAULT_MODE);
  // ★ 画布自动扩展 — 布局计算的尺寸优先，不限制图元
  const specCanvas = spec.meta?.canvas === 'ppt-16:9' ? PPT_CANVAS
    : { width: spec.meta?.width || 1920, height: spec.meta?.height || 1080 };
  const canvas = {
    width:  Math.max(specCanvas.width,  spec._canvasW || 0),
    height: Math.max(specCanvas.height, spec._canvasH || 0),
  };

  const cells = [];
  let nextId = 2;

  // Root cells
  cells.push(`        <mxCell id="0" />`);
  cells.push(`        <mxCell id="1" parent="0" />`);

  // Parse nodes + edges first
  const nodeList = Array.isArray(spec.nodes) ? spec.nodes : (spec.nodes ? [spec.nodes] : []);
  const edgeList = Array.isArray(spec.edges) ? spec.edges : (spec.edges ? [spec.edges] : []);

  // ★ Group containers (rendered FIRST — bottom layer)
  const groups = Array.isArray(spec.groups) ? spec.groups : (spec.groups ? [spec.groups] : []);
  for (const group of groups) {
    cells.push(renderGroup(nextId++, group, theme));
  }

  // Zones: width already computed by layout.js Sugiyama engine
  // All zones share the same dynamic width = widest layer content + padding
  const zones = Array.isArray(spec.zones) ? spec.zones : (spec.zones ? [spec.zones] : []);
  const zoneMode = spec.meta?.zoneMode || 'filled'; // filled | divider | none

  for (const zone of zones) {
    cells.push(renderZone(nextId++, zone, theme, nodeList, zones, zoneMode));
  }

  // Render edges (before nodes — edges should be behind)
  // Use spec.edges (which may have been augmented with waypoints by layout.js)
  const routedEdges = Array.isArray(spec.edges) ? spec.edges : edgeList;
  for (const edge of routedEdges) {
    cells.push(renderEdge(nextId++, edge, nodeList, theme));
  }

  // Render nodes
  for (const node of nodeList) {
    cells.push(renderNode(nextId++, node, theme));
  }

  // Render labels (text annotations)
  const labelList = Array.isArray(spec.labels) ? spec.labels : (spec.labels ? [spec.labels] : []);
  for (const label of labelList) {
    cells.push(renderText(nextId++, label, theme));
  }

  // Render legend
  if (spec.legend) {
    cells.push(renderLegend(nextId++, spec.legend, theme));
  }

  // Assembly
  const fontFamily = 'Microsoft YaHei,Arial,Helvetica,PingFang SC,sans-serif';
  return `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="drawio-skill-ultr" version="1.0.0">
  <diagram name="${spec.meta?.title || 'Page-1'}" id="diagram-1">
    <mxGraphModel dx="${canvas.width}" dy="${canvas.height}"
      grid="1" gridSize="10" guides="1" tooltips="1" connect="1"
      arrows="1" fold="1" page="1" pageScale="1"
      pageWidth="${canvas.width}" pageHeight="${canvas.height}"
      math="0" shadow="0" fontFamily="${fontFamily}">
      <root>
${cells.join('\n')}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;
}

function renderRect(id, x, y, w, h, style) {
  const s = [
    `rounded=${style.rounded ?? 1}`,
    'whiteSpace=wrap',
    'html=1',
    style.fillColor   ? `fillColor=${style.fillColor}` : '',
    style.strokeColor ? `strokeColor=${style.strokeColor}` : '',
    style.strokeWidth ? `strokeWidth=${style.strokeWidth}` : 'strokeWidth=1',
    style.fontColor   ? `fontColor=${style.fontColor}` : '',
    style.fontSize    ? `fontSize=${style.fontSize}` : '',
    style.fontStyle   ? `fontStyle=${style.fontStyle}` : '',
    style.dashed      ? `dashed=1` : '',
    style.opacity     ? `opacity=${style.opacity}` : '',
  ].filter(Boolean).join(';');

  return `<mxCell id="${id}" value="" style="${s}" vertex="1" parent="1">
  <mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry" />
</mxCell>`;
}

function renderGroup(id, group, theme) {
  const fontFamily = /[一-鿿]/.test(group.label || '') ? 'Microsoft YaHei' : 'Arial';
  const x = group.x, y = group.y, w = group.width, h = group.height;
  const fill = group.fill || '#F8FAFC';
  const stroke = group.stroke || '#94A3B8';
  const isDark = theme.mode === 'dark';

  const cells = [];
  // Subtle filled container — NO container=1 (avoids reparenting)
  cells.push(`<mxCell id="${group.id || id}" value="" style="rounded=1;whiteSpace=wrap;html=1;fillColor=${fill};strokeColor=${stroke};strokeWidth=1.5;dashed=1;dashPattern=8 4;arcSize=6;absoluteArcSize=1;" vertex="1" parent="1">
  <mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry" />
</mxCell>`);

  // Group label (top-left corner, inside container)
  if (group.label) {
    const labelColor = isDark ? '#94A3B8' : '#64748B';
    cells.push(`<mxCell id="${group.id || id}-label" value="${escapeXml(group.label)}" style="text;html=1;strokeColor=none;fillColor=none;align=left;verticalAlign=top;whiteSpace=wrap;fontSize=11;fontStyle=1;fontColor=${labelColor};fontFamily=${fontFamily};spacingLeft=8;spacingTop=4;" vertex="1" parent="1">
  <mxGeometry x="${x}" y="${y}" width="${w}" height="20" as="geometry" />
</mxCell>`);
  }

  return cells.join('\n');
}

function renderZone(id, zone, theme, nodes, allZones, zoneMode = 'filled') {
  const fontFamily = /[一-鿿]/.test(zone.label || '') ? 'Microsoft YaHei' : 'Arial';
  const x = zone.x, y = zone.y, w = zone.width, h = zone.height;
  const isDark = theme.mode === 'dark';
  const cells = [];

  if (zoneMode === 'divider') {
    // ── Divider mode: thin line + floating label, no filled background ──
    // No visual overlap with edges — the cleanest layout choice for multi-layer diagrams
    const lineY = y;
    const lineColor = isDark ? '#475569' : '#94A3B8';
    const labelColor = isDark ? '#CBD5E1' : '#475569';

    // Horizontal divider line (thin, subtle)
    cells.push(`<mxCell id="${zone.id || id}" value="" style="endArrow=none;html=1;strokeColor=${lineColor};strokeWidth=1;" edge="1" parent="1">
  <mxGeometry width="50" height="50" relative="1" as="geometry">
    <mxPoint x="${x}" y="${lineY}" as="sourcePoint" />
    <mxPoint x="${x + w}" y="${lineY}" as="targetPoint" />
  </mxGeometry>
</mxCell>`);

    // Floating zone label (left-aligned, above the divider line)
    if (zone.label) {
      cells.push(`<mxCell id="${zone.id || id}-label" value="${escapeXml(zone.label)}" style="text;html=1;strokeColor=none;fillColor=none;align=left;verticalAlign=bottom;whiteSpace=wrap;fontSize=12;fontStyle=1;fontColor=${labelColor};fontFamily=${fontFamily};spacingLeft=0;" vertex="1" parent="1">
  <mxGeometry x="${x}" y="${lineY - 24}" width="${w}" height="20" as="geometry" />
</mxCell>`);
    }
    return cells.join('\n');
  }

  if (zoneMode === 'none') return '';

  // ── Filled mode (default): SAP-style zone with title bar ──
  // IMPORTANT: NO container=1 — prevents draw.io from reparenting nodes into zone,
  // which would break absolute coordinates and cause edge routing chaos.
  const zoneFill = isDark ? '#1E293B' : '#F8FAFC';
  const zoneStroke = isDark ? '#334155' : '#CBD5E1';

  // Zone background — rendered first = bottom layer
  cells.push(`<mxCell id="${zone.id || id}" value="" style="rounded=1;whiteSpace=wrap;html=1;fillColor=${zoneFill};strokeColor=${zoneStroke};strokeWidth=1;absoluteArcSize=1;" vertex="1" parent="1">
  <mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry" />
</mxCell>`);

  // Zone title bar — colored strip at top
  if (zone.label) {
    const titleBarH = 28;
    const barColor = isDark ? '#334155' : '#1E40AF';
    const textColor = '#FFFFFF';

    cells.push(`<mxCell id="${zone.id || id}-bar" value="" style="rounded=1;whiteSpace=wrap;html=1;fillColor=${barColor};strokeColor=none;arcSize=10;absoluteArcSize=1;" vertex="1" parent="1">
  <mxGeometry x="${x}" y="${y}" width="${w}" height="${titleBarH}" as="geometry" />
</mxCell>`);

    cells.push(`<mxCell id="${zone.id || id}-label" value="${escapeXml(zone.label)}" style="text;html=1;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;whiteSpace=wrap;fontSize=13;fontStyle=1;fontColor=${textColor};fontFamily=${fontFamily};spacingLeft=10;" vertex="1" parent="1">
  <mxGeometry x="${x}" y="${y}" width="${w}" height="${titleBarH}" as="geometry" />
</mxCell>`);
  }

  return cells.join('\n');
}

function renderNode(id, node, theme) {
  const semantic = node.semantic || 'compute';
  const shape = getShapeStyle(node.shape || 'rounded-rectangle');
  const fontSize = node.fontSize || 14; // PPT default
  const fontFamily = /[一-鿿]/.test(node.label)
    ? 'Microsoft YaHei' : 'Arial';

  // Approach A: white card + mostly black stroke (clean, minimal)
  // Approach B: tonal fill from semantic + dark stroke
  const isApproachA = theme.approach !== 'B';
  const semanticColors = theme.colors.semantic?.[semantic] || {};
  const fill   = node.fillColor || (isApproachA ? (theme.colors.card?.fill || '#FFFFFF') : (semanticColors.fill || '#FFFFFF'));
  const stroke = node.strokeColor
    || (semantic === 'security' ? theme.colors.stroke?.security
      : semantic === 'external' ? theme.colors.stroke?.external
      : theme.colors.stroke?.default)
    || '#1E293B';
  const text   = node.fontColor || (isApproachA ? (theme.colors.text?.card || '#1E293B') : (semanticColors.text || '#1E293B'));

  const s = [
    shape,
    'whiteSpace=wrap', 'html=1',
    `fillColor=${fill}`,
    `strokeColor=${stroke}`,
    `strokeWidth=${isApproachA ? 2.5 : 2}`,
    `fontColor=${text}`,
    `fontSize=${fontSize}`,
    `fontStyle=${node.bold !== false ? 1 : 0}`,
    `fontFamily=${fontFamily}`,
    node.dashed ? 'dashed=1' : '',
    'arcSize=10', 'absoluteArcSize=1',
  ].filter(Boolean).join(';');

  const w = node.width  || Math.max(120, node.label.length * 12 + 24);
  const h = node.height || 50;

  return `<mxCell id="${node.id || id}" value="${escapeXml(node.label)}" style="${s}" vertex="1" parent="${node.parent || 1}">
  <mxGeometry x="${node.x}" y="${node.y}" width="${w}" height="${h}" as="geometry" />
</mxCell>`;
}

function renderEdge(id, edge, nodes, theme) {
  const edgeType = edge.type || 'sync-call';
  // Prefer theme edge colors, then semantic edge-colors.json, then fallback
  const themeColor = theme.colors?.edge?.[edgeType];
  const semColor = EDGE_COLORS?.[edgeType]?.color;
  const defaultColor = theme.colors?.edge?.default || '#475569';
  const edgeColor = themeColor || semColor || defaultColor;
  const isAsync = edge.type === 'async-event' || edge.type === 'conditional';

  const style = [
    'edgeStyle=orthogonalEdgeStyle',
    'rounded=1', 'orthogonalLoop=1', 'jettySize=auto',
    'html=1',
    `strokeColor=${edgeColor}`,
    'strokeWidth=1.5',
    'endArrow=classic', 'endFill=1',
    isAsync ? 'dashed=1;dashPattern=6 4' : '',
    edge.animated ? 'flowAnimation=1' : '',
  ].filter(Boolean).join(';');

  let pointsXml = '';
  if (edge.waypoints) {
    const pts = edge.waypoints.map(p => `<mxPoint x="${p.x}" y="${p.y}" />`).join('\n');
    pointsXml = `<Array as="points">${pts}</Array>`;
  }

  const label = edge.label ? ` value="${escapeXml(edge.label)}"` : '';
  // ★ Default exit: right (exitX=1). Default entry: left (entryX=0).
  const exX = edge.exitX != null ? edge.exitX : 1;
  const exY = edge.exitY != null ? edge.exitY : 0.5;
  const enX = edge.entryX != null ? edge.entryX : 0;
  const enY = edge.entryY != null ? edge.entryY : 0.5;
  const exitStr = `exitX=${exX};exitY=${exY};exitDx=0;exitDy=0;`;
  const entryStr = `entryX=${enX};entryY=${enY};entryDx=0;entryDy=0;`;

  return `<mxCell id="${edge.id || id}"${label} style="${style};${exitStr}${entryStr}" edge="1" parent="1" source="${edge.from}" target="${edge.to}">
  <mxGeometry relative="1" as="geometry">${pointsXml}</mxGeometry>
</mxCell>`;
}

function renderText(id, label, theme) {
  const c = theme.colors.text;
  return `<mxCell id="${id}" value="${escapeXml(label.text)}" style="text;html=1;strokeColor=none;fillColor=none;align=${label.align || 'left'};fontSize=${label.fontSize || 10};fontColor=${c?.secondary || '#64748B'};fontFamily=Microsoft YaHei,Arial;" vertex="1" parent="1">
  <mxGeometry x="${label.x}" y="${label.y}" width="${label.width || 200}" height="${label.height || 20}" as="geometry" />
</mxCell>`;
}

function renderLegend(id, legend, theme) {
  // Simple single-line legend box
  const items = legend.items || [];
  const y = legend.y || 700;
  return renderRect(id, 40, y, 1840, 40, {
    fillColor: '#FAFAFA', strokeColor: '#E0E0E0', rounded: 1
  });
}

function getShapeStyle(shape) {
  const map = {
    'rounded-rectangle': 'rounded=1',
    'rectangle': 'rounded=0',
    'ellipse': 'ellipse',
    'rhombus': 'rhombus',
    'cylinder3': 'shape=cylinder3;boundedLbl=1;size=8',
    'hexagon': 'shape=hexagon;perimeter=hexagonPerimeter',
    'step': 'shape=step;perimeter=stepPerimeter',
  };
  return map[shape] || 'rounded=1';
}

function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  const inputIdx = args.findIndex(a => !a.startsWith('-'));
  if (inputIdx < 0) {
    console.log('Usage: node cli.js <spec.yaml> [--theme name] [--mode light|dark] [-o output]');
    process.exit(1);
  }

  const input = args[inputIdx];
  const themeIdx = args.indexOf('--theme');
  const theme = themeIdx > -1 ? args[themeIdx + 1] : null;
  const modeIdx = args.indexOf('--mode');
  const mode = modeIdx > -1 ? args[modeIdx + 1] : null;
  const outIdx = args.indexOf('-o');
  const output = outIdx > -1 ? args[outIdx + 1] : 'output/diagram';

  if (!fs.existsSync(input)) {
    console.error(`File not found: ${input}`);
    process.exit(1);
  }

  // Parse YAML — simple parser for our constrained schema
  // (In production, use `js-yaml`; here we keep it zero-dependency)
  const spec = parseSimpleYaml(fs.readFileSync(input, 'utf8'));

  const drawio = await renderDrawio(spec, { theme, mode });

  // Ensure output directory exists
  const outDir = path.dirname(output);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const drawioPath = output.endsWith('.drawio') ? output : `${output}.drawio`;
  fs.writeFileSync(drawioPath, drawio, 'utf8');
  console.log(`Generated: ${drawioPath}`);
}

function parseSimpleYaml(content) {
  // Minimal YAML parser — handles nested objects, arrays, strings, numbers
  // For production use, replace with `const yaml = require('js-yaml'); yaml.load(content);`
  try {
    // Try to parse as JSON first (JSON is valid YAML)
    return JSON.parse(content);
  } catch {
    // Minimal YAML parsing for our constrained schema
    return parseYamlContent(content);
  }
}

function parseYamlContent(content) {
  const result = {};
  const lines = content.split('\n');
  const stack = [{ obj: result, indent: -1 }];

  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith('#')) continue;

    const indent = line.search(/\S/);
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }

    const trimmed = line.trim();
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx < 0) continue;

    const key = trimmed.substring(0, colonIdx).trim();
    const value = trimmed.substring(colonIdx + 1).trim();

    const current = stack[stack.length - 1].obj;

    if (value === '' || value === '|') {
      // Object or block scalar
      if (!current[key]) current[key] = {};
      if (typeof current[key] === 'object') {
        stack.push({ obj: current[key], indent });
      }
    } else if (value.startsWith('[') && value.endsWith(']')) {
      current[key] = value.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
    } else if (value.startsWith('- ')) {
      if (!Array.isArray(current[key])) current[key] = [];
      current[key].push(value.slice(2).replace(/^["']|["']$/g, ''));
    } else if (value === 'true' || value === 'false') {
      current[key] = value === 'true';
    } else if (/^-?\d+(\.\d+)?$/.test(value)) {
      current[key] = parseFloat(value);
    } else {
      current[key] = value.replace(/^["']|["']$/g, '');
    }
  }

  return result;
}

if (require.main === module) { main().catch(console.error); }
