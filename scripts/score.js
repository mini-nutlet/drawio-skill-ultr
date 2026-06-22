#!/usr/bin/env node
/**
 * score.js — Quality scoring engine for .drawio files
 * Scores diagrams across 5 dimensions on a 0-100 scale.
 * Usage: node score.js <file.drawio> [--json]
 */

const fs = require('fs');
const path = require('path');

// Scoring weights
const WEIGHTS = {
  themeCompliance: 25,   // Theme color compliance
  alignment: 20,         // Alignment consistency
  typography: 20,        // Font standards
  edgeQuality: 20,       // Edge routing quality
  labelQuality: 15,      // Label standards
};

const GRADE_THRESHOLDS = [
  { grade: 'A', min: 90, label: 'Excellent — PPT-ready' },
  { grade: 'B', min: 75, label: 'Good — minor fixes recommended' },
  { grade: 'C', min: 60, label: 'Acceptable — several issues to address' },
  { grade: 'D', min: 40, label: 'Poor — significant rework needed' },
  { grade: 'F', min: 0,  label: 'Failing — do not use as-is' },
];

const EMOJI_REGEX = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{23F0}-\u{23FF}\u{2B50}\u{2B55}\u{231A}\u{231B}\u{2328}\u{23CF}\u{24C2}\u{25AA}\u{25AB}\u{25B6}\u{25C0}\u{25FB}-\u{25FE}]/u;
const MIN_FONT = 8;
const PPT_MIN = 12;
const PPT_MAX = 16;
const MAX_LABEL = 25;
const THEMES_DIR = path.join(__dirname, '..', 'assets', 'themes');

function parseCells(content) {
  const cells = [];
  const pattern = /<mxCell\s([^>]*?)(\/>|>[\s\S]*?<\/mxCell>)/g;
  let match;
  while ((match = pattern.exec(content)) !== null) {
    const attrs = match[0];
    const id = (attrs.match(/id="([^"]+)"/) || [])[1];
    const edge = attrs.includes('edge="1"');
    const vertex = attrs.includes('vertex="1"');
    const value = (attrs.match(/value="([^"]*)"/) || [])[1] || '';
    const style = (attrs.match(/style="([^"]*)"/) || [])[1] || '';
    const source = (attrs.match(/source="([^"]+)"/) || [])[1];
    const target = (attrs.match(/target="([^"]+)"/) || [])[1];
    let geom = null;
    const gm = attrs.match(/<mxGeometry\s[^>]*?(\/>|>[\s\S]*?<\/mxGeometry>)/);
    if (gm) {
      const g = gm[0];
      geom = {
        x: parseFloat((g.match(/x="([^"]+)"/) || [])[1]) || 0,
        y: parseFloat((g.match(/y="([^"]+)"/) || [])[1]) || 0,
        width: parseFloat((g.match(/width="([^"]+)"/) || [])[1]) || 0,
        height: parseFloat((g.match(/height="([^"]+)"/) || [])[1]) || 0,
      };
    }
    cells.push({ id, edge, vertex, value, style, source, target, geom });
  }
  return cells;
}

function extractStyleVal(style, key) {
  const m = style.match(new RegExp(`${key}=([^;]+)`));
  return m ? m[1] : null;
}

function loadThemeColors() {
  // Collect all known theme hex colors as a reference set
  const hexSet = new Set();
  try {
    const files = fs.readdirSync(THEMES_DIR).filter(f => f.endsWith('.json'));
    for (const f of files) {
      const theme = JSON.parse(fs.readFileSync(path.join(THEMES_DIR, f), 'utf8'));
      collectHex(theme, hexSet);
    }
  } catch (e) { /* themes dir not found — skip */ }
  // Also add common draw.io defaults
  ['#FFFFFF', '#000000', '#1E293B', '#64748B', '#94A3B8', '#CBD5E1',
   '#F1F5F9', '#0F172A', '#DC2626', '#D97706', '#7C3AED', '#0891B2',
   '#059669', '#475569', '#334155', '#E0E0E0', '#FAFAFA', '#1E40AF',
   '#CC00DC', '#none'].forEach(h => hexSet.add(h));
  return hexSet;
}

function collectHex(obj, set) {
  if (typeof obj === 'string' && /^#[0-9A-Fa-f]{6}$/.test(obj)) set.add(obj.toUpperCase());
  else if (Array.isArray(obj)) obj.forEach(v => collectHex(v, set));
  else if (obj && typeof obj === 'object') Object.values(obj).forEach(v => collectHex(v, set));
}

// ── Dimension scorers ──

function scoreThemeCompliance(cells, knownHex) {
  const vertexCells = cells.filter(c => c.vertex && !c.edge);
  if (vertexCells.length === 0) return { score: 100, details: [], penalty: 0 };

  let violations = 0;
  const details = [];
  for (const cell of vertexCells) {
    const fills = [extractStyleVal(cell.style, 'fillColor'),
                   extractStyleVal(cell.style, 'strokeColor'),
                   extractStyleVal(cell.style, 'fontColor')].filter(Boolean);
    for (const hex of fills) {
      if (!knownHex.has(hex.toUpperCase()) && hex !== 'none' && hex !== 'default') {
        violations++;
        if (details.length < 5) {
          details.push(`Ad-hoc color ${hex} in "${cell.value.slice(0, 20)}"`);
        }
      }
    }
  }
  if (violations > 5 && details.length === 5) details.push(`... and ${violations - 5} more`);

  const penalty = Math.min(1, violations / Math.max(vertexCells.length * 3, 1));
  return { score: Math.round((1 - penalty) * 100), details, penalty };
}

function scoreAlignment(cells) {
  const vertices = cells.filter(c => c.vertex && !c.edge && c.geom);
  if (vertices.length < 2) return { score: 100, details: [], penalty: 0 };

  // Check: nodes with same approximate Y (±2px) are "same layer" — their Y should be exact multiple of 10
  let offGrid = 0;
  let misaligned = 0;
  const details = [];

  for (const v of vertices) {
    const { x, y, width, height } = v.geom;
    if (x % 10 !== 0 || y % 10 !== 0 || width % 10 !== 0 || height % 10 !== 0) {
      offGrid++;
    }
  }

  // Check shared Y among nodes in same visual row (within 20px)
  const sortedByY = [...vertices].sort((a, b) => a.geom.y - b.geom.y);
  for (let i = 0; i < sortedByY.length - 1; i++) {
    for (let j = i + 1; j < sortedByY.length; j++) {
      const dy = Math.abs(sortedByY[i].geom.y - sortedByY[j].geom.y);
      if (dy < 20 && dy > 0 && dy !== 10) {
        misaligned++;
      }
      if (dy >= 20) break;
    }
  }

  if (offGrid > 0) details.push(`${offGrid} node(s) off 10px grid`);
  if (misaligned > 0) details.push(`${misaligned} near-miss alignment(s)`);

  const penalty = Math.min(1, (offGrid * 0.05 + misaligned * 0.1) / vertices.length);
  return { score: Math.round((1 - penalty) * 100), details, penalty };
}

function scoreTypography(cells) {
  const vertexCells = cells.filter(c => c.vertex && !c.edge);
  if (vertexCells.length === 0) return { score: 100, details: [], penalty: 0 };

  let missingFont = 0;
  let belowMin = 0;
  let outsidePpt = 0;
  const details = [];

  for (const cell of vertexCells) {
    if (!cell.value) continue;
    const hasFont = cell.style.includes('fontFamily=');
    if (!hasFont) missingFont++;

    const fontSize = parseFloat(extractStyleVal(cell.style, 'fontSize'));
    if (fontSize && fontSize < MIN_FONT) belowMin++;
    if (fontSize && (fontSize < PPT_MIN || fontSize > PPT_MAX) && fontSize >= MIN_FONT) outsidePpt++;
  }

  if (missingFont > 0) details.push(`${missingFont} node(s) missing fontFamily`);
  if (belowMin > 0) details.push(`${belowMin} node(s) below 8pt floor`);
  if (outsidePpt > 0) details.push(`${outsidePpt} node(s) outside 12-16pt PPT range`);

  const penalty = Math.min(1,
    (missingFont * 0.15 + belowMin * 0.3 + outsidePpt * 0.05) / vertexCells.length);
  return { score: Math.round((1 - penalty) * 100), details, penalty };
}

function scoreEdgeQuality(cells) {
  const edges = cells.filter(c => c.edge);
  const vertices = cells.filter(c => c.vertex && c.geom);
  if (edges.length === 0) return { score: 100, details: [], penalty: 0 };

  let leftExits = 0;
  let crossings = 0;
  const details = [];
  const vertexMap = {};
  for (const v of vertices) vertexMap[v.id] = v;

  for (const edge of edges) {
    const exitX = extractStyleVal(edge.style, 'exitX');
    if (exitX === '0') leftExits++;

    // Simple crossing check: edge line intersects non-endpoint node bboxes
    const sv = vertexMap[edge.source];
    const tv = vertexMap[edge.target];
    if (sv?.geom && tv?.geom) {
      const x1 = sv.geom.x + sv.geom.width / 2;
      const y1 = sv.geom.y + sv.geom.height / 2;
      const x2 = tv.geom.x + tv.geom.width / 2;
      const y2 = tv.geom.y + tv.geom.height / 2;
      for (const v of vertices) {
        if (v.id === edge.source || v.id === edge.target) continue;
        const rx = v.geom.x - 4, ry = v.geom.y - 4;
        const rw = v.geom.width + 8, rh = v.geom.height + 8;
        const minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
        const minY = Math.min(y1, y2), maxY = Math.max(y1, y2);
        if (!(maxX < rx || minX > rx + rw || maxY < ry || minY > ry + rh)) {
          crossings++;
          break;
        }
      }
    }
  }

  if (leftExits > 0) details.push(`${leftExits} left-side exit(s) — prefer right/bottom`);
  if (crossings > 0) details.push(`${crossings} edge(s) pass through nodes`);

  const penalty = Math.min(1, (leftExits * 0.1 + crossings * 0.25) / Math.max(edges.length, 1));
  return { score: Math.round((1 - penalty) * 100), details, penalty };
}

function scoreLabelQuality(cells) {
  const vertexCells = cells.filter(c => c.vertex && !c.edge);
  if (vertexCells.length === 0) return { score: 100, details: [], penalty: 0 };

  let tooLong = 0;
  let hasEmoji = 0;
  let tooManyLines = 0;
  const details = [];

  for (const cell of vertexCells) {
    if (!cell.value) continue;
    if (cell.value.length > MAX_LABEL) tooLong++;
    if (EMOJI_REGEX.test(cell.value) || /[🚀🔐🔍📊💬💰🤖📌✅⏳🔴🟢🟡]/u.test(cell.value)) hasEmoji++;
    if (cell.value.split('\n').length > 2) tooManyLines++;
  }

  if (tooLong > 0) details.push(`${tooLong} label(s) exceed ${MAX_LABEL} chars`);
  if (hasEmoji > 0) details.push(`${hasEmoji} label(s) contain emoji`);
  if (tooManyLines > 0) details.push(`${tooManyLines} label(s) span >2 lines`);

  const penalty = Math.min(1,
    (tooLong * 0.15 + hasEmoji * 0.2 + tooManyLines * 0.1) / vertexCells.length);
  return { score: Math.round((1 - penalty) * 100), details, penalty };
}

// ── Main scoring ──

function score(content) {
  const cells = parseCells(content);
  const knownHex = loadThemeColors();

  const dims = {
    themeCompliance: scoreThemeCompliance(cells, knownHex),
    alignment: scoreAlignment(cells),
    typography: scoreTypography(cells),
    edgeQuality: scoreEdgeQuality(cells),
    labelQuality: scoreLabelQuality(cells),
  };

  let total = 0;
  for (const [key, dim] of Object.entries(dims)) {
    total += (dim.score / 100) * WEIGHTS[key];
  }
  total = Math.round(total);

  const grade = GRADE_THRESHOLDS.find(g => total >= g.min) || GRADE_THRESHOLDS[GRADE_THRESHOLDS.length - 1];

  return { total, grade, dimensions: dims };
}

// ── CLI ──

async function main() {
  const args = process.argv.slice(2);
  const jsonOut = args.includes('--json');
  const input = args.find(a => a.endsWith('.drawio'));

  if (!input) {
    console.log('Usage: node score.js <file.drawio> [--json]');
    console.log('Scores diagram quality across 5 dimensions (0-100).');
    process.exit(1);
  }

  if (!fs.existsSync(input)) {
    console.error(`File not found: ${input}`);
    process.exit(1);
  }

  const content = fs.readFileSync(input, 'utf8');
  const result = score(content);

  if (jsonOut) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`\nQuality Score: ${input}\n`);
  console.log('  ┌──────────────────────────────────────────────┐');
  console.log(`  │  TOTAL: ${String(result.total).padStart(3)}/100  —  Grade ${result.grade.grade}  ${result.grade.label.padEnd(28)}│`);
  console.log('  ├──────────────────────────────────────────────┤');

  const dims = result.dimensions;
  const dimOrder = [
    ['themeCompliance', 'Theme Compliance'],
    ['alignment',       'Alignment      '],
    ['typography',      'Typography     '],
    ['edgeQuality',     'Edge Quality   '],
    ['labelQuality',    'Label Quality  '],
  ];

  for (const [key, label] of dimOrder) {
    const dim = dims[key];
    const bar = '█'.repeat(Math.round(dim.score / 10)) + '░'.repeat(10 - Math.round(dim.score / 10));
    console.log(`  │  ${label}  ${bar}  ${String(dim.score).padStart(3)}%  │`);
    for (const d of dim.details) {
      console.log(`  │    ⤷ ${d.padEnd(42)}│`);
    }
  }

  console.log('  └──────────────────────────────────────────────┘\n');
  process.exit(result.total < 60 ? 1 : 0);
}

if (require.main === module) { main().catch(console.error); }

module.exports = { score, WEIGHTS, GRADE_THRESHOLDS };
