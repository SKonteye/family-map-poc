
import { describe, it, expect } from 'vitest';
import { computeLayout, wouldCreateCycle } from '../src/layout.js';

const mkPerson = (id, name) => ({
  id,
  type: 'person',
  data: { name },
  position: { x: 0, y: 0 },
  style: { width: 180, height: 72 },
});
const mkUnion = (id, partners=[]) => ({
  id,
  type: 'union',
  data: { partners },
  position: { x: 0, y: 0 },
  style: { width: 36, height: 36 },
});

describe('computeLayout', () => {
  it('returns arrays and assigns positions', () => {
    const nodes = [mkPerson('A','A')];
    const edges = [];
    const out = computeLayout(nodes, edges, 'TB');
    expect(Array.isArray(out.nodes)).toBe(true);
    expect(Array.isArray(out.edges)).toBe(true);
    expect(typeof out.nodes[0].position.x).toBe('number');
  });

  it('keeps siblings aligned under the same union (TB)', () => {
    const nodes = [mkUnion('U'), mkPerson('B','B'), mkPerson('C','C')];
    const edges = [{ id: 'e1', source: 'U', target: 'B', kind: 'child' }, { id: 'e2', source: 'U', target: 'C', kind: 'child' }];
    const { nodes: out } = computeLayout(nodes, edges, 'TB');
    const B = out.find(n => n.id === 'B'), C = out.find(n => n.id === 'C');
    expect(Math.abs(B.position.y - C.position.y)).toBeLessThan(40);
  });

  it('does not mutate edges', () => {
    const nodes = [mkPerson('A','A'), mkPerson('B','B'), mkUnion('U')];
    const edges = [
      { id: 'p', source: 'A', target: 'B', kind: 'partner' },
      { id: 'pa', source: 'A', target: 'U', kind: 'parent' },
      { id: 'pb', source: 'B', target: 'U', kind: 'parent' },
    ];
    const out = computeLayout(nodes, edges, 'TB');
    expect(out.edges).toHaveLength(3);
  });
});

describe('wouldCreateCycle', () => {
  it('detects ancestry cycles (union -> person back to ancestor)', () => {
    const nodes = [mkPerson('A','A'), mkPerson('B','B'), mkUnion('U'), mkPerson('C','C')];
    const edges = [
      { id: 'pa', source: 'A', target: 'U', kind: 'parent' },
      { id: 'pb', source: 'B', target: 'U', kind: 'parent' },
      { id: 'uc', source: 'U', target: 'C', kind: 'child' },
    ];
    // Adding edge U -> A (child edge making A descendant of A) should be cycle
    expect(wouldCreateCycle(nodes, edges, 'U', 'A')).toBe(true);
    // Adding edge U -> X (new person) should not be cycle
    expect(wouldCreateCycle(nodes, edges, 'U', 'C')).toBe(false); // already exists
  });
});
