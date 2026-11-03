import { describe, expect, it } from 'vitest';
import { buildWorkflowTree, initialTreeExpandedKeys } from './workflowTree';
describe('workflow tree view', () => {
  it('uses stable node keys, omits sequential labels, and initially opens the trunk to its first branch', () => {
    const nodes = ['s', 'a', 'b', 'c', 'd'].map((id) => ({ id, name: id, type: id === 's' ? 'START' : 'TEMPLATE_REPLY', x: 0, y: 0, config: {} }));
    const edges = [
      ['s', 'a'],
      ['a', 'b'],
      ['b', 'c'],
      ['b', 'd']
    ].map(([source, target]) => ({ id: source + target, source, target }));
    const tree = buildWorkflowTree({ schemaVersion: '1.0', variables: [], nodes, edges }, () => '继续');
    expect(tree[0].children[0].branch).toBe('');
    expect(initialTreeExpandedKeys(tree)).toEqual(['node:s', 'node:a', 'node:b']);
    const renamed = buildWorkflowTree(
      { schemaVersion: '1.0', variables: [], nodes: nodes.map((node) => ({ ...node, name: 'new' })), edges },
      () => '继续'
    );
    expect(renamed[0].children[0].key).toBe(tree[0].children[0].key);
    expect(tree[0].stepCount).toBe(4);
  });
  it('represents shared joins and loops as references without changing the graph', () => {
    const graph = {
      schemaVersion: '1.0',
      variables: [],
      nodes: ['s', 'a', 'b', 'join', 'orphan'].map((id) => ({ id, name: id, type: id === 's' ? 'START' : 'END', x: 0, y: 0, config: {} })),
      edges: [
        ['s', 'a'],
        ['s', 'b'],
        ['a', 'join'],
        ['b', 'join'],
        ['join', 'a']
      ].map(([source, target], i) => ({ id: String(i), source, target }))
    };
    const before = JSON.stringify(graph);
    const tree = buildWorkflowTree(graph, () => '继续');
    expect(tree[0].children[0].children[0].children[0].reference).toBe('cycle');
    expect(tree[0].children[1].children[0].reference).toBe('shared');
    expect(tree[1].name).toBe('orphan');
    expect(JSON.stringify(graph)).toBe(before);
  });
});
