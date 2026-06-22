#!/usr/bin/env node
/**
 * lint-edges.js — Edge quality + layout validation
 * Checks: crossing, through-node, overlap, exit direction, stacked edges, off-grid
 * Usage: node lint-edges.js <file.drawio>
 */

const fs = require('fs');

function parseGeometries(drawioContent) {
  const cells = [];
  const fullCellPattern = /<mxCell\s([^>]*?)(\/>|>[\s\S]*?<\/mxCell>)/g;
  let match;
  while ((match = fullCellPattern.exec(drawioContent)) !== null) {
    const attrs = match[0];
    const id = (attrs.match(/id="([^"]+)"/) || [])[1];
    const edge = attrs.includes('edge="1"');
    const vertex = attrs.includes('vertex="1"');
    const value = (attrs.match(/value="([^"]*)"/) || [])[1] || '';
    const style = (attrs.match(/style="([^"]*)"/) || [])[1] || '';
    const source = (attrs.match(/source="([^"]+)"/) || [])[1];
    const target = (attrs.match(/target="([^"]+)"/) || [])[1];

    let geom = null;
    const geomMatch = attrs.match(/<mxGeometry\s[^>]*?(\/>|>[\s\S]*?<\/mxGeometry>)/);
    if (geomMatch) {
      const g = geomMatch[0];
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
  const m = style?.match(new RegExp(`${key}=([^;]+)`));
  return m ? m[1] : null;
}

function rectsOverlap(a, b, margin = 0) {
  if (!a || !b || !a.width || !b.width) return false;
  return (
    a.x - margin < b.x + b.width + margin &&
    a.x + a.width + margin > b.x - margin &&
    a.y - margin < b.y + b.height + margin &&
    a.y + a.height + margin > b.y - margin
  );
}

function lineIntersectsRect(x1, y1, x2, y2, rect, margin = 8) {
  if (!rect || !rect.width) return false;
  const rx = rect.x - margin, ry = rect.y - margin;
  const rw = rect.width + 2 * margin, rh = rect.height + 2 * margin;
  // Simple bounding-box intersection for the line segment
  const minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2), maxY = Math.max(y1, y2);
  return !(maxX < rx || minX > rx + rw || maxY < ry || minY > ry + rh);
}

function lint(drawioContent) {
  const issues = [];
  const cells = parseGeometries(drawioContent);
  const vertices = cells.filter(c => c.vertex && c.geom);
  const edges = cells.filter(c => c.edge);

  // 1. Node overlap (skip group containers and zone labels — id starts with grp- or zone-)
  function isDecorator(cell) {
    return (cell.id || '').startsWith('grp-') || (cell.id || '').startsWith('zone-');
  }
  for (let i = 0; i < vertices.length; i++) {
    if (isDecorator(vertices[i])) continue;
    for (let j = i + 1; j < vertices.length; j++) {
      if (isDecorator(vertices[j])) continue;
      if (rectsOverlap(vertices[i].geom, vertices[j].geom, 2)) {
        issues.push({ severity: 'error', type: 'node-overlap',
          message: `"${vertices[i].value}" overlaps "${vertices[j].value}"`,
          fix: 'reposition' });
      }
    }
  }

  // 2. Edge through node
  for (const edge of edges) {
    const srcV = vertices.find(v => v.id === edge.source);
    const tgtV = vertices.find(v => v.id === edge.target);
    if (!srcV?.geom || !tgtV?.geom) continue;

    const x1 = srcV.geom.x + srcV.geom.width / 2;
    const y1 = srcV.geom.y + srcV.geom.height / 2;
    const x2 = tgtV.geom.x + tgtV.geom.width / 2;
    const y2 = tgtV.geom.y + tgtV.geom.height / 2;

    for (const v of vertices) {
      if (v.id === edge.source || v.id === edge.target) continue;
      if (isDecorator(v)) continue; // skip groups and zones
      if (lineIntersectsRect(x1, y1, x2, y2, v.geom)) {
        issues.push({ severity: 'error', type: 'edge-through-node',
          message: `Edge "${edge.value || edge.id}" passes through "${v.value}"`,
          fix: 'reroute-with-waypoints' });
      }
    }
  }

  // 3. Forbidden exit directions — must go right(→) or down(↓)
  for (const edge of edges) {
    const exitX = extractStyleVal(edge.style, 'exitX');
    const exitY = extractStyleVal(edge.style, 'exitY');
    if (exitX === '0') {
      issues.push({ severity: 'error', type: 'left-exit-forbidden',
        message: `Edge "${edge.value || edge.id}" exits left (exitX=0, arrow ←). Forbidden. Use right (exitX=1 →) or bottom (exitY=1 ↓).`,
        fix: 'reroute-to-right-or-bottom' });
    }
    if (exitY === '0') {
      issues.push({ severity: 'error', type: 'top-exit-forbidden',
        message: `Edge "${edge.value || edge.id}" exits top (exitY=0, arrow ↑). Forbidden. Use right (exitX=1 →) or bottom (exitY=1 ↓).`,
        fix: 'reroute-to-right-or-bottom' });
    }
  }

  // 4. Forbidden entry directions — must enter from left(→) or top(↓)
  for (const edge of edges) {
    const entryX = extractStyleVal(edge.style, 'entryX');
    const entryY = extractStyleVal(edge.style, 'entryY');
    if (entryY === '1') {
      issues.push({ severity: 'error', type: 'bottom-entry-forbidden',
        message: `Edge "${edge.value || edge.id}" enters from bottom (entryY=1, arrow ↑). Forbidden. Use left (entryX=0 →) or top (entryY=0 ↓).`,
        fix: 'reroute-to-left-or-top' });
    }
    if (entryX === '1') {
      issues.push({ severity: 'error', type: 'right-entry-forbidden',
        message: `Edge "${edge.value || edge.id}" enters from right (entryX=1, arrow ←). Forbidden. Use left (entryX=0 →) or top (entryY=0 ↓).`,
        fix: 'reroute-to-left-or-top' });
    }
  }

  // 5. Stacked exits (multiple right-side edges without spacing)
  const nodeEdges = {};
  for (const edge of edges) {
    (nodeEdges[edge.source] ||= []).push(edge);
  }
  for (const [nodeId, nodeEdgeList] of Object.entries(nodeEdges)) {
    const rightExits = nodeEdgeList.filter(e => extractStyleVal(e.style, 'exitX') === '1');
    if (rightExits.length > 2) {
      const yVals = rightExits.map(e => parseFloat(extractStyleVal(e.style, 'exitY')) || 0.5);
      yVals.sort((a, b) => a - b);
      const minGap = Math.min(...yVals.slice(1).map((y, i) => y - yVals[i]));
      if (minGap < 0.2) {
        issues.push({ severity: 'warning', type: 'stacked-edges',
          message: `Node "${nodeId}" has ${rightExits.length} right-side edges too close. Space evenly (0.25, 0.5, 0.75).` });
      }
    }
  }

  // 6. Off-grid check (only for vertices, skip decorators)
  for (const v of vertices) {
    if (!v.geom || isDecorator(v)) continue;
    const { x, y, width, height } = v.geom;
    if (x % 10 !== 0 || y % 10 !== 0 || width % 10 !== 0 || height % 10 !== 0) {
      issues.push({ severity: 'warning', type: 'off-grid',
        message: `"${v.value}" at (${x},${y}) ${width}×${height} is off the 10px grid.`,
        fix: 'snap-to-grid' });
    }
  }

  return issues;
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.log('Usage: node lint-edges.js <file.drawio>');
    process.exit(1);
  }
  const input = args[0];
  if (!fs.existsSync(input)) { console.error(`File not found: ${input}`); process.exit(1); }

  const content = fs.readFileSync(input, 'utf8');
  const issues = lint(content);
  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');

  console.log(`\nLint: ${input}\n`);
  if (issues.length === 0) { console.log('  ✅ All edge checks passed.\n'); return; }
  for (const i of issues) {
    console.log(`  ${i.severity === 'error' ? '❌' : '⚠️'} [${i.type}] ${i.message}`);
  }
  console.log(`\n  ${errors.length} error(s), ${warnings.length} warning(s)\n`);
  if (errors.length > 0) process.exit(1);
}

if (require.main === module) { main().catch(console.error); }
module.exports = { lint, parseGeometries };
