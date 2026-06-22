#!/usr/bin/env node
/**
 * layout-elk.js — ELK.js-powered layout engine (Eclipse Layout Kernel)
 *
 * Wraps the full ELK.js library with all layout algorithms:
 *   layered | force | mrtree | radial | stress | box | sporeNodes
 *
 * Maps skill layout modes → ELK algorithms:
 *   LAYERED → layered       (Sugiyama, 4-phase crossing minimization)
 *   TREE    → mrtree         (tree layout)
 *   FLOW    → layered DIR=R  (horizontal layered)
 *   RADIAL  → radial         (radial layout)
 *   GRID    → box            (box/packing layout)
 *   FORCE   → force          (force-directed — new mode)
 *
 * Usage:
 *   node layout-elk.js <spec.json> [--mode LAYERED]
 *
 * Falls back gracefully: if elkjs is not installed, returns null.
 */

const SPACING = {
  NODE_W: 140, NODE_H: 60,
  H_GAP: 48,
  V_GAP: 100,
  EDGE_CLEARANCE: 20,
  ZONE_PAD_X: 30,
  ZONE_PAD_TOP: 54,
  ZONE_PAD_BOTTOM: 45,
};

let elk;
try {
  elk = require('elkjs');
} catch (e) {
  elk = null;
}

/**
 * Map skill layout mode → ELK algorithm + options
 */
function modeToElk(mode, spec) {
  const base = {
    'elk.direction': 'DOWN',
    'elk.spacing.nodeNode': String(SPACING.H_GAP),
    'elk.spacing.edgeNode': String(SPACING.EDGE_CLEARANCE),
    'elk.spacing.layerLayer': String(SPACING.V_GAP),
    'elk.layered.spacing.nodeNodeBetweenLayers': String(SPACING.V_GAP),
    'elk.layered.mergeEdges': 'true',
  };

  switch ((mode || 'LAYERED').toUpperCase()) {
    case 'LAYERED':
      return {
        algorithm: 'layered',
        options: { ...base, 'elk.direction': 'DOWN' },
      };
    case 'FLOW':
      return {
        algorithm: 'layered',
        options: { ...base, 'elk.direction': (spec.meta?.direction || 'LR') === 'LR' ? 'RIGHT' : 'DOWN' },
      };
    case 'TREE':
      return {
        algorithm: 'mrtree',
        options: {
          'elk.spacing.nodeNode': String(SPACING.H_GAP),
          'elk.spacing.edgeNode': String(SPACING.EDGE_CLEARANCE),
        },
      };
    case 'RADIAL':
      return {
        algorithm: 'radial',
        options: {
          'elk.spacing.nodeNode': String(SPACING.H_GAP * 2),
        },
      };
    case 'GRID':
      return {
        algorithm: 'box',
        options: {
          'elk.spacing.nodeNode': String(SPACING.H_GAP),
          'elk.box.packingMode': 'SIMPLE',
        },
      };
    case 'FORCE':
      return {
        algorithm: 'force',
        options: {
          'elk.spacing.nodeNode': String(SPACING.H_GAP * 2),
          'elk.force.iterations': '300',
          'elk.force.temperature': '0.001',
        },
      };
    default:
      return { algorithm: 'layered', options: base };
  }
}

function specToElkGraph(spec) {
  const nodes = spec.nodes || [];
  const edges = spec.edges || [];
  const canvasW = spec.meta?.canvas === 'ppt-16:9' ? 1920 : 1200;
  const canvasH = spec.meta?.canvas === 'ppt-16:9' ? 1080 : 800;

  // Convert to ELK graph model
  const children = nodes.map(n => ({
    id: n.id || n.label,
    width: n.width || SPACING.NODE_W,
    height: n.height || SPACING.NODE_H,
    labels: n.label ? [{ text: n.label }] : [],
    // Preserve original node data for coordinate mapping later
  }));

  const elkEdges = edges.map((e, i) => ({
    id: e.id || `e${i}`,
    sources: [typeof e === 'string' ? e : e.from],
    targets: [typeof e === 'string' ? e.split('->')[1] : e.to],
  }));

  return {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'DOWN',
    },
    children,
    edges: elkEdges,
    _canvasW: canvasW,
    _canvasH: canvasH,
  };
}

/**
 * Run ELK layout on the spec. Returns { nodes, zones } with x/y positions.
 * If ELK is unavailable, returns null (caller should fall back to layout.js).
 */
async function computeLayoutElk(spec) {
  if (!elk) return null;

  const mode = spec.meta?.layout || 'LAYERED';
  const { algorithm, options } = modeToElk(mode, spec);
  const graph = specToElkGraph(spec);
  graph.layoutOptions = options;

  try {
    const layouted = await new elk({ algorithms: [algorithm] }).layout(graph);

    if (!layouted.children) return null;

    // Map ELK positions back to spec nodes (add top margin for PPT canvas)
    const Y_OFFSET = 80; // top margin for canvas
    const nodeMap = new Map();
    for (const child of layouted.children) {
      nodeMap.set(child.id, { x: (child.x || 0) + 40, y: (child.y || 0) + Y_OFFSET, width: child.width, height: child.height });
    }

    const nodes = (spec.nodes || []).map(n => {
      const pos = nodeMap.get(n.id || n.label);
      if (pos) {
        return { ...n, x: Math.round(pos.x / 10) * 10, y: Math.round(pos.y / 10) * 10, width: pos.width, height: pos.height };
      }
      return n;
    });

    // Compute zones from spec's layer grouping (not Y-coordinate clustering)
    // Group ELK-positioned nodes by their original layer property
    const layerMap = new Map();
    for (const child of layouted.children) {
      // Find the original node to get its layer
      const origNode = (spec.nodes || []).find(n => (n.id || n.label) === child.id);
      const layer = origNode?.layer || 'default';
      if (!layerMap.has(layer)) layerMap.set(layer, []);
      layerMap.get(layer).push(child);
    }

    // Preserve original zone labels and layer order from spec
    const specZones = spec.zones || [];
    const zoneLookup = new Map();
    for (const z of specZones) zoneLookup.set(z.layer, z);

    const zones = [];
    let zi = 0;
    // Output zones in the same order they appear in the spec
    for (const sz of specZones) {
      const layerChildren = layerMap.get(sz.layer);
      if (!layerChildren || layerChildren.length === 0) continue;
      const minX = Math.min(...layerChildren.map(c => c.x || 0));
      const maxX = Math.max(...layerChildren.map(c => (c.x || 0) + (c.width || SPACING.NODE_W)));
      const minY = Math.min(...layerChildren.map(c => c.y || 0));
      const maxY = Math.max(...layerChildren.map(c => (c.y || 0) + (c.height || SPACING.NODE_H)));
      const layerW = maxX - minX + SPACING.ZONE_PAD_X * 2;
      zones.push({
        id: sz.id || `zone-${sz.layer}`,
        label: sz.label || sz.layer,
        layer: sz.layer,
        x: Math.round((minX - SPACING.ZONE_PAD_X) / 10) * 10,
        y: Math.round((minY - SPACING.ZONE_PAD_TOP) / 10) * 10,
        width: Math.round(layerW / 10) * 10,
        height: Math.round((maxY - minY + SPACING.ZONE_PAD_TOP + SPACING.ZONE_PAD_BOTTOM) / 10) * 10,
      });
      zi++;
    }

    return { nodes, zones, edges: spec.edges };
  } catch (e) {
    console.error('ELK layout failed:', e.message);
    return null;
  }
}

function isElkAvailable() {
  return elk !== null;
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.log('Usage: node layout-elk.js <spec.json> [--mode LAYERED|TREE|FLOW|RADIAL|GRID|FORCE]');
    process.exit(1);
  }

  if (!isElkAvailable()) {
    console.error('ELK.js not installed. Run: npm install elkjs');
    process.exit(1);
  }

  const fs = require('fs');
  const input = args[0];
  if (!fs.existsSync(input)) { console.error(`File not found: ${input}`); process.exit(1); }

  let spec;
  try { spec = JSON.parse(fs.readFileSync(input, 'utf8')); }
  catch { console.error('Failed to parse spec (use JSON format)'); process.exit(1); }

  const modeIdx = args.indexOf('--mode');
  if (modeIdx > -1) { spec.meta = spec.meta || {}; spec.meta.layout = args[modeIdx + 1]; }

  const result = await computeLayoutElk(spec);
  if (!result) {
    console.error('ELK layout returned null — graph may be empty or invalid');
    process.exit(1);
  }

  spec.nodes = result.nodes;
  if (result.zones?.length) spec.zones = result.zones;
  if (result.edges) spec.edges = result.edges;

  console.log(JSON.stringify(spec, null, 2));
}

if (require.main === module) { main().catch(console.error); }

module.exports = { computeLayoutElk, isElkAvailable, modeToElk };
