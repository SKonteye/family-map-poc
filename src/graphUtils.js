
/**
 * Utilities for manipulating the family graph in-memory.
 * Node types:
 *  - person
 *  - union (represents a partnership/marriage of two persons)
 * Edge kinds:
 *  - partner (person -> person) [undirected semantics but stored once]
 *  - parent  (person -> union)
 *  - child   (union -> person)
 */

export function makeId(prefix='N') {
  return `${prefix}_${Math.random().toString(36).slice(2,9)}`;
}

export function hasPartnerEdge(edges, a, b) {
  return edges.some(e => e.kind === 'partner' &&
    ((e.source === a && e.target === b) || (e.source === b && e.target === a)));
}

export function findOrCreateUnion(nodes, edges, a, b) {
  // Try to find existing union for this couple (by convention: union nodes remember partners in data.partners sorted)
  const key = [a,b].sort().join('|');
  const existing = nodes.find(n => n.type === 'union' && n.data?.key === key);
  if (existing) return { nodes, edges, unionId: existing.id };

  const unionId = makeId('U');
  const unionNode = {
    id: unionId,
    type: 'union',
    data: { key, partners: [a,b].sort() },
    position: { x: 0, y: 0 },
    style: { width: 36, height: 36 }
  };
  const withUnion = [...nodes, unionNode];

  // Connect parents to union (parent edges)
  const e1 = { id: makeId('E'), source: a, target: unionId, kind: 'parent' };
  const e2 = { id: makeId('E'), source: b, target: unionId, kind: 'parent' };
  const withEdges = [...edges, e1, e2];

  return { nodes: withUnion, edges: withEdges, unionId };
}

export function addChildToUnion(nodes, edges, unionId, childNodeId) {
  const e = { id: makeId('E'), source: unionId, target: childNodeId, kind: 'child' };
  return { nodes, edges: [...edges, e] };
}
