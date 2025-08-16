
// Robust Dagre usage: use the scoped package with named exports
import { graphlib, layout as dagreLayout } from '@dagrejs/dagre';

/**
 * Build a dagre graph from React Flow nodes/edges, honoring:
 * - 'partner' edges between person nodes (encourage proximity)
 * - 'parent' edges person->union (rank up)
 * - 'child' edges union->person (rank down)
 * - Sibling alignment: ensure children of same union share rank (Top→Bottom only)
 */
export function computeLayout(nodes, edges, direction = 'TB') {
  if (!graphlib || typeof graphlib.Graph !== 'function' || typeof dagreLayout !== 'function') {
    console.warn('[layout] Dagre unavailable; returning input state as-is.');
    return { nodes, edges };
  }

  const g = new graphlib.Graph({ multigraph: true, compound: true });
  g.setGraph({
    rankdir: 'TB',
    nodesep: 50,
    ranksep: 90,
    edgesep: 10
  });
  g.setDefaultEdgeLabel(() => ({}));

  const getSize = (n) => ({
    width: n?.style?.width ?? n?.width ?? (n.type === 'union' ? 36 : 180),
    height: n?.style?.height ?? n?.height ?? (n.type === 'union' ? 36 : 72)
  });

  // Add nodes
  nodes.forEach((n) => {
    const { width, height } = getSize(n);
    g.setNode(n.id, { width, height });
  });

  // Add edges with weights to influence layout
  edges.forEach((e) => {
    if (!e?.source || !e?.target) return;
    const w =
      e.kind === 'partner' ? 1 :
      e.kind === 'parent'  ? 2 :
      e.kind === 'child'   ? 2 : 1;
    g.setEdge(e.source, e.target, { weight: w }, e.id);
  });

  // Sibling alignment: for each union, make children share the same rank by linking them through invisible edges
  const childrenByUnion = {};
  edges.forEach((e) => {
    if (e.kind === 'child') {
      childrenByUnion[e.source] = childrenByUnion[e.source] || [];
      childrenByUnion[e.source].push(e.target);
    }
  });
  Object.values(childrenByUnion).forEach((kids) => {
    for (let i = 1; i < kids.length; i++) {
      // Create a zero-length constraint edge to keep them aligned
      g.setEdge(kids[i - 1], kids[i], { weight: 0.5 }, `sib-${kids[i-1]}-${kids[i]}`);
    }
  });

  dagreLayout(g);

  const isLR = false; // left-right layout removed
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  const laidOutNodes = nodes.map((n) => {
    const dag = g.node(n.id);
    if (!dag) return n;
    const { width, height } = getSize(n);
    const x = dag.x - width / 2;
    const y = dag.y - height / 2;
    return {
      ...n,
      position: { x, y },
      targetPosition: isLR ? 'left' : 'top',
      sourcePosition: isLR ? 'right' : 'bottom',
    };
  });

  // Dynamic union width: stretch union bars across span of their partners or children.
  const idToNode = new Map(laidOutNodes.map(n => [n.id, n]));
  const unions = laidOutNodes.filter(n => n.type === 'union');
  unions.forEach(union => {
    const unionId = union.id;
    // Partner parents -> edges person->union (parent edges)
    const parentNodes = edges.filter(e => e.kind === 'parent' && e.target === unionId).map(e => idToNode.get(e.source)).filter(Boolean);
    const childNodes = edges.filter(e => e.kind === 'child' && e.source === unionId).map(e => idToNode.get(e.target)).filter(Boolean);
    const spanNodes = childNodes.length ? childNodes : parentNodes;
    if (spanNodes.length >= 2) {
      const minX = Math.min(...spanNodes.map(p => p.position.x));
      const maxX = Math.max(...spanNodes.map(p => p.position.x + (p.style?.width || 180)));
      const desiredWidth = Math.max(80, maxX - minX - 20); // a little inset
      union.style = { ...(union.style || {}), width: desiredWidth, height: 18 };
      // Center union horizontally over span
      union.position.x = minX + (maxX - minX)/2 - desiredWidth/2;
    } else if (spanNodes.length === 1) {
      // Align over single node
      const p = spanNodes[0];
      const w = 80;
      union.style = { ...(union.style || {}), width: w, height: 18 };
      union.position.x = p.position.x + ((p.style?.width || 180)/2) - w/2;
    }
  });

  // Return edges untouched
  return { nodes: laidOutNodes, edges: [...edges] };
}

// Friendly layout: lighter pass that keeps original x for siblings and centers union minimally.
export function computeFriendlyLayout(nodes, edges, direction = 'TB') {
  // Start from basic computeLayout but skip width stretching & sibling tight packing.
  const { nodes: baseNodes, edges: baseEdges } = computeLayout(nodes, edges, direction);
  // Undo union stretching: set union width to default minimal (keep position.x centered relative to partners only)
  const parentsByUnion = {};
  edges.forEach(e => { if (e.kind === 'parent') { (parentsByUnion[e.target] ||= []).push(e.source); }});
  const nodeMap = new Map(baseNodes.map(n => [n.id, n]));
  Object.entries(parentsByUnion).forEach(([unionId, parentIds]) => {
    const unionNode = nodeMap.get(unionId);
    if (!unionNode) return;
    const parents = parentIds.map(id => nodeMap.get(id)).filter(Boolean);
    if (!parents.length) return;
    const minX = Math.min(...parents.map(p => p.position.x));
    const maxX = Math.max(...parents.map(p => p.position.x + (p.style?.width || 180)));
    const center = (minX + maxX)/2;
    const w = 90;
    unionNode.style = { ...(unionNode.style||{}), width: w, height: 18 };
    unionNode.position.x = center - w/2;
  });
  return { nodes: [...nodeMap.values()], edges: baseEdges };
}

/**
 * Cycle detection to avoid creating ancestry loops.
 * Returns true if adding an edge (u -> v) would create a cycle in ancestry graph.
 * We only consider parent/child relations through union nodes.
 */
export function wouldCreateCycle(nodes, edges, u, v) {
  // Build adjacency for ancestry: union->child (child edges) and person->union (parent edges) create direction down
  const adj = new Map();
  const add = (a,b) => { if (!adj.has(a)) adj.set(a, new Set()); adj.get(a).add(b); };

  edges.forEach((e) => {
    if (e.kind === 'parent' || e.kind === 'child') add(e.source, e.target);
  });

  // Tentatively add the new link
  add(u, v);

  // Check if v can reach u => cycle
  const seen = new Set();
  const stack = [v];
  while (stack.length) {
    const cur = stack.pop();
    if (cur === u) return true;
    if (seen.has(cur)) continue;
    seen.add(cur);
    (adj.get(cur) || []).forEach(n => stack.push(n));
  }
  return false;
}
