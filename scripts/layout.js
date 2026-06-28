#!/usr/bin/env node
/**
 * layout.js — Sugiyama-inspired layered layout engine
 *
 * Algorithm:
 *   1. Layer assignment    — nodes grouped by layer property
 *   2. Crossing reduction  — barycenter heuristic reorders nodes within each layer
 *   3. Coordinate assignment — center-align layers, 80px+ inter-layer gap
 *
 * Modes: LAYERED | TREE | FLOW | RADIAL | GRID
 */

const SPACING = {
  NODE_W: 140, NODE_H: 60,          // PPT-optimized default node size
  H_GAP: 48,                         // Horizontal gap between same-layer nodes
  V_GAP: 100,                        // ★ Inter-layer vertical gap — wide enough for edge clearance
  EDGE_CLEARANCE: 20,                // ★ Min px between edge waypoint and zone border
  ZONE_PAD_X: 30,                    // Zone horizontal padding
  ZONE_PAD_TOP: 54,                  // Zone top padding (28px title + 26px)
  ZONE_PAD_BOTTOM: 45,               // Zone bottom padding
  DIVIDER_THICKNESS: 2,              // Divider line thickness (divider zone mode)
  GROUP_GAP: 48,                     // ★ Minimum px between group containers
  GROUP_PAD: 20,                     // Internal padding inside group containers
};

/**
 * Sugiyama-inspired layered layout with barycenter crossing minimization
 *
 * Phase 1: Layer assignment — nodes already tagged with `layer` in spec
 * Phase 2: Crossing reduction — for each pair of adjacent layers,
 *          reorder the lower layer by the barycenter (average x) of connected upper nodes
 * Phase 3: Coordinate assignment — center-align all layers, compute positions
 */
/**
 * Compute edge waypoints that clear zone boundaries.
 * For each edge crossing zone boundaries, insert a waypoint in the gap
 * between zones so the edge doesn't visually overlap zone borders.
 */
function computeEdgeRouting(nodes, edges, zones, zoneMode = 'filled') {
  if (!edges || edges.length === 0) return edges;

  const nodeMap = new Map();
  for (const n of nodes) nodeMap.set(n.id || n.label, n);

  // Build zone boundary map sorted by Y position
  const zoneBounds = zones.map(z => ({
    id: z.id,
    layer: z.layer,
    top: z.y,
    bottom: z.y + z.height,
    left: z.x,
    right: z.x + z.width,
  })).sort((a, b) => a.top - b.top);

  const snap = (v) => { const r = Math.round(v / 10) * 10; return Object.is(r, -0) ? 0 : r; };

  const routedEdges = edges.map(edge => {
    const srcId = edge.from;
    const tgtId = edge.to;
    const src = nodeMap.get(srcId);
    const tgt = nodeMap.get(tgtId);

    if (!src || !tgt) return { ...edge };

    const srcLayer = src.layer || 'default';
    const tgtLayer = tgt.layer || 'default';
    if (zones.length < 2) return { ...edge };

    const srcX = (src.x || 0) + ((src.width || SPACING.NODE_W) / 2);
    const tgtX = (tgt.x || 0) + ((tgt.width || SPACING.NODE_W) / 2);

    // Find zone indices
    const srcIdx = zoneBounds.findIndex(zb => zb.layer === srcLayer);
    const tgtIdx = zoneBounds.findIndex(zb => zb.layer === tgtLayer);
    if (srcIdx < 0 || tgtIdx < 0) return { ...edge };

    if (srcIdx === tgtIdx) {
      // Same-layer: route through the zone bottom gap
      const gapY = snap(zoneBounds[srcIdx].bottom + SPACING.EDGE_CLEARANCE);
      if (Math.abs(srcX - tgtX) > SPACING.H_GAP) {
        return { ...edge, waypoints: [
          { x: snap(srcX), y: gapY },
          { x: snap(tgtX), y: gapY },
        ], exitX: 1, exitY: 0.5, entryX: 0, entryY: 0.5 };
      }
      return { ...edge };
    }

    // Cross-layer: insert two waypoints per inter-zone gap
    // First at srcX (vertical from source), second at tgtX (horizontal across gap)
    // This creates a clean zigzag path avoiding nodes in between
    const lo = Math.min(srcIdx, tgtIdx);
    const hi = Math.max(srcIdx, tgtIdx);
    const waypoints = [];
    for (let i = lo; i < hi; i++) {
      const gapY = snap((zoneBounds[i].bottom + zoneBounds[i + 1].top) / 2);
      waypoints.push({ x: snap(srcX), y: gapY });
      waypoints.push({ x: snap(tgtX), y: gapY });
    }

    return { ...edge, waypoints, exitX: 1, exitY: 0.5, entryX: 0, entryY: 0.5 };
  });

  // Post-process: auto-space exitY for nodes with many right-side exits
  const srcExitCount = {};
  for (const edge of routedEdges) {
    srcExitCount[edge.from] = (srcExitCount[edge.from] || 0) + 1;
  }
  for (let i = 0; i < routedEdges.length; i++) {
    const e = routedEdges[i];
    const count = srcExitCount[e.from] || 1;
    if (count > 2) {
      const idx = routedEdges.slice(0, i).filter(prev => prev.from === e.from).length;
      e.exitY = Number((0.1 + ((0.8 * idx) / (count - 1))).toFixed(2));
    }
  }

  return routedEdges;
}

function layeredLayout(nodes, edges, specZones = [], canvasW = 1920, zoneMode = 'filled') {
  if (!nodes || nodes.length === 0) return { nodes: [], zones: [] };

  // ── Phase 1: Group nodes by layer ──
  const layerMap = new Map();
  for (const node of nodes) {
    const layer = node.layer || 'default';
    if (!layerMap.has(layer)) layerMap.set(layer, []);
    layerMap.get(layer).push({ ...node }); // shallow copy
  }

  const layerOrder = [...layerMap.keys()];
  const zoneH = SPACING.ZONE_PAD_TOP + SPACING.NODE_H + SPACING.ZONE_PAD_BOTTOM;
  const nLayers = layerOrder.length;
  const canvasH = 1080; // PPT 16:9
  // Adaptive V_GAP: fit all layers within canvas
  const maxVGap = Math.floor((canvasH - 80 - nLayers * zoneH) / Math.max(nLayers - 1, 1));
  const vGap = Math.min(SPACING.V_GAP, Math.max(40, maxVGap));

  if (layerOrder.length === 1) {
    // Single layer — just center
    const arr = layerMap.get(layerOrder[0]);
    const totalW = arr.length * SPACING.NODE_W + (arr.length - 1) * SPACING.H_GAP;
    const startX = Math.round((canvasW - totalW) / 2 / 10) * 10;
    arr.forEach((n, i) => { n.x = startX + i * (SPACING.NODE_W + SPACING.H_GAP); n.y = 80; });
    return { nodes: arr, zones: [] };
  }

  // ── Phase 2: Barycenter crossing reduction ──
  // Build edge index: nodeId → connected nodes in adjacent layers
  const edgeMap = new Map();
  if (edges) {
    for (const e of edges) {
      const src = typeof e === 'string' ? e : e.from;
      const tgt = typeof e === 'string' ? e.split('->')[1] : e.to;
      if (!edgeMap.has(src)) edgeMap.set(src, []);
      if (!edgeMap.has(tgt)) edgeMap.set(tgt, []);
      edgeMap.get(src).push(tgt);
      edgeMap.get(tgt).push(src);
    }
  }

  function getNodeById(id) {
    for (const arr of layerMap.values()) {
      const found = arr.find(n => (n.id || n.label) === id);
      if (found) return found;
    }
    return null;
  }

  // Iterate layers top-down, reorder each by barycenter of connections to layer above
  for (let i = 1; i < layerOrder.length; i++) {
    const upperLayer = layerMap.get(layerOrder[i - 1]);
    const currentLayer = layerMap.get(layerOrder[i]);

    // Assign a temporary index to each upper-layer node (their current order)
    const upperIndex = new Map();
    upperLayer.forEach((n, idx) => upperIndex.set(n.id || n.label, idx));

    // Compute barycenter for each current-layer node
    const barycenters = currentLayer.map(node => {
      const neighbors = edgeMap.get(node.id || node.label) || [];
      const positions = neighbors
        .map(nid => upperIndex.get(nid))
        .filter(p => p !== undefined);
      if (positions.length === 0) return currentLayer.indexOf(node); // keep original pos
      return positions.reduce((a, b) => a + b, 0) / positions.length;
    });

    // Sort current layer by barycenter
    const indexed = currentLayer.map((n, idx) => ({ node: n, bary: barycenters[idx], orig: idx }));
    indexed.sort((a, b) => a.bary - b.bary || a.orig - b.orig);
    layerMap.set(layerOrder[i], indexed.map(x => x.node));
  }

  // ── Phase 3: Coordinate assignment ──
  // Find the widest layer to determine common width
  let maxLayerWidth = 0;
  for (const [, arr] of layerMap) {
    const w = arr.length * SPACING.NODE_W + (arr.length - 1) * SPACING.H_GAP;
    if (w > maxLayerWidth) maxLayerWidth = w;
  }

  const zoneW = maxLayerWidth + SPACING.ZONE_PAD_X * 2;
  const startX = Math.round((canvasW - zoneW) / 2 / 10) * 10;
  let currentY = 80; // top margin

  const zones = [];

  for (let i = 0; i < layerOrder.length; i++) {
    const arr = layerMap.get(layerOrder[i]);
    const totalW = arr.length * SPACING.NODE_W + (arr.length - 1) * SPACING.H_GAP;
    const nodeStartX = startX + SPACING.ZONE_PAD_X + Math.round((maxLayerWidth - totalW) / 2 / 10) * 10;

    // Assign node positions
    arr.forEach((n, j) => {
      n.x = Math.round((nodeStartX + j * (SPACING.NODE_W + SPACING.H_GAP)) / 10) * 10;
      n.y = Math.round((currentY + SPACING.ZONE_PAD_TOP) / 10) * 10;
      n.width = SPACING.NODE_W;
      n.height = SPACING.NODE_H;
    });

    // Zone bounding box
    // Preserve label from original spec zones if available
    const origZone = (specZones || []).find(z => z.layer === layerOrder[i]);
    const zoneLabel = origZone?.label || layerOrder[i];

    zones.push({
      id: origZone?.id || `zone-${layerOrder[i]}`,
      label: zoneLabel,
      layer: layerOrder[i],
      x: startX,
      y: Math.round(currentY / 10) * 10,
      width: zoneW,
      height: SPACING.ZONE_PAD_TOP + SPACING.NODE_H + SPACING.ZONE_PAD_BOTTOM,
    });

    // ★ Next layer starts after adaptive V_GAP gap
    currentY += Math.round((zoneH + vGap) / 10) * 10;
  }

  // Flatten nodes
  const resultNodes = [];
  for (const arr of layerMap.values()) resultNodes.push(...arr);

  return { nodes: resultNodes, zones };
}

function treeLayout(nodes, rootId) {
  const childrenMap = new Map();
  for (const node of nodes) {
    if (!node.parent) continue;
    const pid = node.parent;
    if (!childrenMap.has(pid)) childrenMap.set(pid, []);
    childrenMap.get(pid).push({ ...node });
  }

  let maxDepth = 0;
  function layoutSubtree(parentId, depth, x) {
    const children = childrenMap.get(parentId) || [];
    if (depth > maxDepth) maxDepth = depth;
    if (children.length === 0) return x + SPACING.NODE_W + SPACING.H_GAP;
    let childX = x;
    for (const child of children) {
      child.x = childX;
      child.y = 80 + depth * (SPACING.NODE_H + SPACING.V_GAP);
      child.width = SPACING.NODE_W;
      child.height = SPACING.NODE_H;
      childX = layoutSubtree(child.id || child.label, depth + 1, childX);
    }
    return childX;
  }
  layoutSubtree(rootId, 1, 100);
  return { nodes };
}

function flowLayout(nodes, direction = 'LR') {
  const isHorizontal = direction === 'LR';
  let pos = 100;
  for (const node of nodes) {
    if (isHorizontal) { node.x = pos; node.y = 400; }
    else { node.x = 800; node.y = pos; }
    node.width = SPACING.NODE_W;
    node.height = SPACING.NODE_H;
    pos += SPACING.NODE_W + SPACING.H_GAP;
  }
  return { nodes };
}

/**
 * ★ Radial layout (推荐默认) — 中心节点 + 卫星节点环形排列
 * Hub at center, satellites on concentric rings by layer distance.
 */
function radialLayout(nodes, hubId, canvasW = 1920) {
  if (!nodes || nodes.length === 0) return { nodes: [], zones: [] };

  const cx = Math.round(canvasW / 2 / 10) * 10;
  const cy = 540; // PPT 16:9 vertical center
  const hub = nodes.find(n => (n.id || n.label) === hubId) || nodes[0];

  // Group satellites by layer → each layer = one ring
  const layerMap = new Map();
  for (const node of nodes) {
    if ((node.id || node.label) === (hubId || hub.id || hub.label)) continue;
    const layer = node.layer || 'satellites';
    if (!layerMap.has(layer)) layerMap.set(layer, []);
    layerMap.get(layer).push({ ...node });
  }

  const layerOrder = [...layerMap.keys()];
  // Base ring radius scales with layer depth
  const RING_GAP = 160;  // px between concentric rings
  const BASE_RADIUS = 200;

  hub.x = cx - SPACING.NODE_W / 2;
  hub.y = cy - SPACING.NODE_H / 2;
  hub.width = SPACING.NODE_W;
  hub.height = SPACING.NODE_H;

  const zones = [];

  for (let li = 0; li < layerOrder.length; li++) {
    const satellites = layerMap.get(layerOrder[li]);
    const ringRadius = BASE_RADIUS + li * RING_GAP;
    const count = satellites.length;

    satellites.forEach((n, i) => {
      const angle = (2 * Math.PI * i) / count - Math.PI / 2;
      const nx = cx + ringRadius * Math.cos(angle);
      const ny = cy + ringRadius * Math.sin(angle);
      n.x = Math.round((nx - SPACING.NODE_W / 2) / 10) * 10;
      n.y = Math.round((ny - SPACING.NODE_H / 2) / 10) * 10;
      n.width = SPACING.NODE_W;
      n.height = SPACING.NODE_H;
    });

    // Zone ring for this layer
    zones.push({
      id: `zone-ring-${li}`,
      label: layerOrder[li],
      layer: layerOrder[li],
      x: Math.round((cx - ringRadius - SPACING.ZONE_PAD_X) / 10) * 10,
      y: Math.round((cy - ringRadius - SPACING.ZONE_PAD_TOP) / 10) * 10,
      width: Math.round((ringRadius * 2 + SPACING.ZONE_PAD_X * 2) / 10) * 10,
      height: Math.round((ringRadius * 2 + SPACING.ZONE_PAD_TOP + SPACING.ZONE_PAD_BOTTOM) / 10) * 10,
    });
  }

  const resultNodes = [hub, ...layerMap.values().flatMap(arr => arr)];
  return { nodes: resultNodes, zones };
}

function gridLayout(nodes, columns = 3) {
  nodes.forEach((n, i) => {
    n.x = 80 + (i % columns) * (SPACING.NODE_W + SPACING.H_GAP);
    n.y = 80 + Math.floor(i / columns) * (SPACING.NODE_H + SPACING.V_GAP);
    n.width = SPACING.NODE_W;
    n.height = SPACING.NODE_H;
  });
  return { nodes };
}

/**
 * ★ 图元重叠消解 — 检测并推开重叠的节点包围盒
 * 迭代最多5轮，每轮将重叠节点对沿最短轴推开。
 */
function resolveOverlaps(nodes, minGap = 24) {
  if (!nodes || nodes.length < 2) return nodes;
  const result = nodes.map(n => ({
    ...n,
    x: n.x || 0, y: n.y || 0,
    width: n.width || 140, height: n.height || 60,
  }));

  // Force-directed overlap resolution — all nodes repel each other
  for (let pass = 0; pass < 30; pass++) {
    const forces = result.map(() => ({ fx: 0, fy: 0 }));
    let maxForce = 0;

    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        const a = result[i], b = result[j];
        const dx = (a.x + a.width / 2) - (b.x + b.width / 2);
        const dy = (a.y + a.height / 2) - (b.y + b.height / 2);
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const minDist = (a.width + b.width) / 2 + (a.height + b.height) / 4 + minGap;

        if (dist < minDist) {
          const strength = (minDist - dist) / minDist * 40;
          const fx = (dx / dist) * strength;
          const fy = (dy / dist) * strength;
          forces[i].fx += fx; forces[i].fy += fy;
          forces[j].fx -= fx; forces[j].fy -= fy;
          maxForce = Math.max(maxForce, Math.abs(fx), Math.abs(fy));
        }
      }
    }

    if (maxForce < 0.5) break; // converged

    // Apply forces with damping
    for (let i = 0; i < result.length; i++) {
      result[i].x += Math.round(forces[i].fx / 10) * 10;
      result[i].y += Math.round(forces[i].fy / 10) * 10;
      if (result[i].x < 0) result[i].x = 0;
      if (result[i].y < 0) result[i].y = 0;
    }
  }
  return result;
}

/**
 * ★★★ 分组优先布局 (Groups-First Layout) ★★★
 *
 * 优先级: 分组 → 布局 → 连线
 *
 * 1. 有 groups → 先放置组容器，再在组内排列节点
 * 2. 无 groups → 回退到节点级布局
 *
 * 布局优先级: RADIAL > FLOW(LR/TB) > LAYERED
 */
function groupedLayout(spec, canvasW = 1920) {
  const nodes = (spec.nodes || []).map(n => ({ ...n }));
  const groups = spec.groups || [];
  const layout = (spec.meta?.layout || '').toUpperCase();
  const hubId = spec.meta?.hubId;

  if (groups.length === 0) {
    // No groups — fall back to node-level layout
    return null;
  }

  // ── Phase 1: Place group centers ──
  const groupMap = new Map();
  const nodeToGroup = new Map();
  for (const g of groups) {
    const gNodes = (g.nodes || []).map(id => nodes.find(n => (n.id || n.label) === id)).filter(Boolean);
    groupMap.set(g.id, { ...g, _nodes: gNodes });
    for (const n of gNodes) nodeToGroup.set(n.id || n.label, g.id);
  }
  // Unassigned nodes → synthetic group
  const orphans = nodes.filter(n => !nodeToGroup.has(n.id || n.label));
  if (orphans.length > 0) {
    groupMap.set('_orphans', { id: '_orphans', label: '', _nodes: orphans, fill: '#FAFAFA', stroke: '#E0E0E0' });
  }

  const groupList = [...groupMap.values()];
  const nGroups = groupList.length;
  const cx = Math.round(canvasW / 2 / 10) * 10;
  const cy = 540;

  // Place groups: FLOW(L→R/T→B) or RADIAL(rings) or LAYERED(rows)
  if (layout === 'FLOW' || layout === 'ARCHITECTURE' || layout === 'FLOWCHART') {
    // ★ FLOW: groups arranged L→R (horizontal) or T→B (vertical)
    const dir = spec.meta?.direction || 'TB'; // TB=top→bottom, LR=left→right
    const isVertical = dir === 'TB';
    const flowGap = 80;
    let pos = 120;
    const sorted = [...groupList].sort((a, b) => (a._nodes.length || 0) - (b._nodes.length || 0));
    for (const g of sorted) {
      if (isVertical) {
        g._cx = cx; g._cy = pos;
        pos += (g._nodes.length > 3 ? 120 : 80) + flowGap;
      } else {
        g._cx = pos; g._cy = cy;
        const gw = g._nodes.reduce((s, n) => s + (n.width || 140), 0) + (g._nodes.length - 1) * SPACING.H_GAP + 60;
        pos += gw + flowGap;
      }
    }
  } else if (layout === 'RADIAL') {
    // ★ RADIAL group placement: groups on concentric rings
    const hubGroup = hubId ? groupMap.get(groupMap.has(hubId) ? hubId : [...groupMap.keys()].find(k => {
      const g = groupMap.get(k);
      return g._nodes.some(n => (n.id || n.label) === hubId);
    })) : groupList[0];

    const otherGroups = groupList.filter(g => g.id !== (hubGroup?.id));
    const RING_GAP = 220;
    const BASE_R = 260;

    // Hub group at center
    if (hubGroup) {
      hubGroup._cx = cx;
      hubGroup._cy = cy;
    }

    // Place other groups on rings
    otherGroups.forEach((g, i) => {
      const ringIdx = Math.floor(i / 6); // max 6 groups per ring
      const posInRing = i % 6;
      const ringR = BASE_R + ringIdx * RING_GAP;
      const angle = (2 * Math.PI * posInRing) / Math.min(6, Math.max(1, otherGroups.length - ringIdx * 6)) - Math.PI / 2;
      g._cx = Math.round((cx + ringR * Math.cos(angle)) / 10) * 10;
      g._cy = Math.round((cy + ringR * Math.sin(angle)) / 10) * 10;
    });
  } else {
    // ★ LAYERED/FLOW group placement: groups in rows
    const rowH = SPACING.NODE_H + SPACING.ZONE_PAD_TOP + SPACING.ZONE_PAD_BOTTOM + 80;
    groupList.forEach((g, i) => {
      g._cx = cx;
      g._cy = 120 + i * rowH;
    });
  }

  // ── Phase 2: Place nodes within each group ──
  const pad = SPACING.GROUP_PAD;
  const gap = SPACING.GROUP_GAP;
  for (const g of groupList) {
    const members = g._nodes;
    const memberW = members.reduce((sum, n) => sum + (n.width || SPACING.NODE_W), 0) + (members.length - 1) * SPACING.H_GAP;
    const startX = Math.round((g._cx - memberW / 2) / 10) * 10;
    const y = Math.round((g._cy - (SPACING.NODE_H / 2)) / 10) * 10;

    let x = startX;
    for (const n of members) {
      n.x = x;
      n.y = y;
      n.width = n.width || SPACING.NODE_W;
      n.height = n.height || SPACING.NODE_H;
      x += (n.width || SPACING.NODE_W) + SPACING.H_GAP;
    }

    // Group bounding box
    const minX = Math.min(...members.map(n => n.x));
    const minY = Math.min(...members.map(n => n.y));
    const maxX = Math.max(...members.map(n => n.x + (n.width || SPACING.NODE_W)));
    const maxY = Math.max(...members.map(n => n.y + (n.height || SPACING.NODE_H)));
    g.x = Math.round((minX - pad) / 10) * 10;
    g.y = Math.round((minY - 26 - pad / 2) / 10) * 10;
    g.width = Math.round((maxX - minX + pad * 2) / 10) * 10;
    g.height = Math.round((maxY - minY + 26 + pad) / 10) * 10;
  }

  // ── Phase 2b: ★ 分组间隔检测与调整 ──
  const visibleGroups = groupList.filter(g => g.id !== '_orphans');
  for (let pass = 0; pass < 3; pass++) {
    let moved = false;
    for (let i = 0; i < visibleGroups.length; i++) {
      for (let j = i + 1; j < visibleGroups.length; j++) {
        const a = visibleGroups[i], b = visibleGroups[j];
        if (!a.x || !b.x) continue;

        // Check overlap with GROUP_GAP margin
        const ax1 = a.x - gap, ay1 = a.y - gap;
        const ax2 = a.x + a.width + gap, ay2 = a.y + a.height + gap;
        const bx1 = b.x, by1 = b.y;
        const bx2 = b.x + b.width, by2 = b.y + b.height;

        if (ax1 < bx2 && ax2 > bx1 && ay1 < by2 && ay2 > by1) {
          // Overlap detected — push apart
          const overlapY = Math.min(ay2 - by1, by2 - ay1);
          const overlapX = Math.min(ax2 - bx1, bx2 - ax1);

          if (overlapY < overlapX || layout === 'LAYERED') {
            const push = overlapY / 2 + gap;
            const dir = (a._cy || 0) < (b._cy || 0) ? -1 : 1;
            for (const n of a._nodes) { n.y += dir * -push; }
            for (const n of b._nodes) { n.y += dir * push; }
            a.y += dir * -push; a._cy = (a._cy || 0) + dir * -push;
            b.y += dir * push;  b._cy = (b._cy || 0) + dir * push;
          } else {
            const push = overlapX / 2 + gap;
            const dir = (a._cx || 0) < (b._cx || 0) ? -1 : 1;
            for (const n of a._nodes) { n.x += dir * -push; }
            for (const n of b._nodes) { n.x += dir * push; }
            a.x += dir * -push; a._cx = (a._cx || 0) + dir * -push;
            b.x += dir * push;  b._cx = (b._cx || 0) + dir * push;
          }
          moved = true;
        }
      }
    }
    if (!moved) break;
  }

  // ── Phase 3: Edge waypoints ──
  const edges = spec.edges || [];
  const routedEdges = (edges.length > 0 && groups.length > 0)
    ? computeEdgeRouting(nodes, edges, [], 'divider')
    : edges;

  // Collect zone rings
  const zones = groupList.filter(g => g.id !== '_orphans').map((g, i) => ({
    id: `zone-${g.id}`,
    label: g.label,
    layer: g.label,
    x: g.x, y: g.y, width: g.width, height: g.height,
  }));

  return { nodes, zones, edges: routedEdges, groups: groupList.filter(g => g.id !== '_orphans') };
}

/**
 * 为 spec.groups 中定义的每个组计算包围盒（后处理模式，用于无分组优先时）
 */
function computeGroupContainers(nodes, groups) {
  if (!groups || groups.length === 0) return [];
  const nodeMap = new Map();
  for (const n of nodes) nodeMap.set(n.id || n.label, n);

  const PAD = 24; // internal padding
  const LABEL_H = 26; // title bar

  return groups.map(g => {
    const members = (g.nodes || []).map(id => nodeMap.get(id)).filter(Boolean);
    if (members.length === 0) return null;

    const minX = Math.min(...members.map(n => n.x));
    const minY = Math.min(...members.map(n => n.y));
    const maxX = Math.max(...members.map(n => n.x + (n.width || 140)));
    const maxY = Math.max(...members.map(n => n.y + (n.height || 60)));

    return {
      id: g.id,
      label: g.label || '',
      x: Math.round((minX - PAD) / 10) * 10,
      y: Math.round((minY - LABEL_H - PAD / 2) / 10) * 10,
      width: Math.round((maxX - minX + PAD * 2) / 10) * 10,
      height: Math.round((maxY - minY + LABEL_H + PAD) / 10) * 10,
      fill: g.fill || '#F8FAFC',
      stroke: g.stroke || '#94A3B8',
    };
  }).filter(Boolean);
}

function computeLayout(spec) {
  const nodes = spec.nodes || [];
  const edges = spec.edges || [];
  const layout = spec.meta?.layout;
  const canvasW = spec.meta?.canvas === 'ppt-16:9' ? 1920 : 1200;
  const zoneMode = spec.meta?.zoneMode || 'filled';

  // ★ 优先级: FLOW(LR/TB) > 分组 > RADIAL > LAYERED
  //    architecture/flowchart → FLOW（垂直流/水平流优先）
  const mode = layout || (
    ['architecture', 'flowchart'].includes(spec.meta?.diagramType) ? 'FLOW' : 'LAYERED'
  );

  // ★★★ 分组其次: 有 groups → 使用 groups-first 布局（含FLOW支持）
  const hasGroups = (spec.groups || []).length > 0;
  let result;
  if (hasGroups && mode !== 'LAYERED') {
    result = groupedLayout(spec, canvasW);
    if (result) { result._engine = 'groups-first'; }
  }

  // 回退到节点级布局
  if (!result) {
    switch (mode.toUpperCase()) {
      case 'TREE':   result = treeLayout(nodes, spec.meta?.rootId || nodes[0]?.id); break;
      case 'FLOW':   result = flowLayout(nodes, spec.meta?.direction || 'LR'); break;
      case 'RADIAL': result = radialLayout(nodes, spec.meta?.hubId, canvasW); break;
      case 'GRID':   result = gridLayout(nodes, spec.meta?.columns || 3); break;
      case 'LAYERED':
      default:       result = layeredLayout(nodes, edges, spec.zones || [], canvasW, zoneMode); break;
    }
  }

  // Compute edge waypoints that clear zone boundaries
  if (result.zones && result.zones.length > 1) {
    result.edges = computeEdgeRouting(result.nodes, edges, result.zones, zoneMode);
  } else {
    result.edges = edges;
  }

  // ★ Group containers: compute bounding boxes around grouped nodes
  const groups = spec.groups || [];
  if (groups.length > 0) {
    result.groups = computeGroupContainers(result.nodes, groups);
  }

  // ★ 图元重叠消解 + 画布自动扩展
  if (result.nodes && result.nodes.length > 1) {
    result.nodes = resolveOverlaps(result.nodes);
    if (groups.length > 0) {
      result.groups = computeGroupContainers(result.nodes, groups);
    }

    // ★ 画布自动扩展: 不限制于 PPT 16:9
    const MARGIN = 60;
    let maxX = 0, maxY = 0;
    for (const n of result.nodes) {
      if ((n.x || 0) + (n.width || 140) > maxX) maxX = n.x + (n.width || 140);
      if ((n.y || 0) + (n.height || 60) > maxY) maxY = n.y + (n.height || 60);
    }
    result._canvasW = Math.max(canvasW, Math.ceil((maxX + MARGIN) / 10) * 10);
    result._canvasH = Math.max(1080, Math.ceil((maxY + MARGIN) / 10) * 10);
  }

  return result;
}

// CLI — run layout on a spec and output updated spec JSON
async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.log('Usage: node layout.js <spec.yaml|spec.json> [--mode LAYERED|TREE|FLOW|RADIAL|GRID]');
    process.exit(1);
  }

  const fs = require('fs');
  const input = args[0];
  if (!fs.existsSync(input)) { console.error(`File not found: ${input}`); process.exit(1); }

  let spec;
  try { spec = JSON.parse(fs.readFileSync(input, 'utf8')); }
  catch { console.error('Failed to parse spec (use JSON format)'); process.exit(1); }

  const modeIdx = args.indexOf('--mode');
  if (modeIdx > -1) spec.meta.layout = args[modeIdx + 1];

  const result = computeLayout(spec);

  // Merge layout back into spec
  spec.nodes = result.nodes;
  if (result.zones && result.zones.length > 0) spec.zones = result.zones;
  if (result.edges) spec.edges = result.edges;

  console.log(JSON.stringify(spec, null, 2));
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { resolveOverlaps, groupedLayout, layeredLayout, treeLayout, flowLayout, radialLayout, gridLayout, computeLayout, computeEdgeRouting, computeGroupContainers };
