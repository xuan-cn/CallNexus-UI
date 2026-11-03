import { describe, expect, it } from 'vitest';
import { connectTreeStep } from './treeEditing';
const n = (id: string) => ({ id, name: id, type: 'TEMPLATE_REPLY', x: 0, y: 0, config: {} });
const graph = {
  schemaVersion: '1.0',
  variables: [],
  nodes: [n('a'), n('b'), n('other')],
  edges: [
    { id: 'ab', source: 'a', target: 'b', condition: 'TRUE' },
    { id: 'other', source: 'a', target: 'other', condition: 'FALSE' }
  ]
};
describe('tree step editing', () => {
  it('inserts into one outlet and keeps its old continuation and other branches', () => {
    let seq = 0;
    const next = connectTreeStep(graph, 'a', 'TRUE', n('new'), '', false, () => String(seq++));
    expect(next.edges).toContainEqual({ id: '1', source: 'new', target: 'b', condition: '' });
    expect(next.edges).toContainEqual(graph.edges[1]);
    expect(graph.nodes).toHaveLength(3);
    expect(graph.edges).toHaveLength(2);
  });
  it('connects existing nodes without deleting old nodes', () => {
    const next = connectTreeStep(graph, 'a', 'TRUE', 'other', '', false, () => 'new');
    expect(next.nodes).toEqual(graph.nodes);
    expect(next.edges.filter((e) => e.condition === 'TRUE')[0].target).toBe('other');
  });
  it('rejects ambiguous exits, invalid targets and terminal insertions', () => {
    expect(() => connectTreeStep(graph, 'a', 'TRUE', n('end'), '', true, () => 'x')).toThrow();
    expect(() => connectTreeStep(graph, 'a', 'TRUE', 'a', '', false, () => 'x')).toThrow();
    expect(() =>
      connectTreeStep({ ...graph, edges: [...graph.edges, { ...graph.edges[0], id: 'dup' }] }, 'a', 'TRUE', 'b', '', false, () => 'x')
    ).toThrow();
  });
});
