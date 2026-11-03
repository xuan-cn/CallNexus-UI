import { describe, expect, it } from 'vitest';
import { foldableNodeIds } from './branchVisibility';
const nodes = ['start', 'root', 'a', 'other', 'join', 'end'].map((id) => ({
  id,
  type: id === 'start' ? 'START' : 'TEMPLATE_REPLY',
  name: id,
  x: 0,
  y: 0,
  config: {}
}));
const edge = (source: string, target: string) => ({ id: source + target, source, target });
describe('branch view folding', () => {
  it('preserves shared joins and their downstream nodes', () => {
    expect([...foldableNodeIds(nodes, [edge('root', 'a'), edge('a', 'join'), edge('other', 'join'), edge('join', 'end')], 'root')]).toEqual(['a']);
  });
  it('terminates on loops and never hides the root or start', () => {
    expect([...foldableNodeIds(nodes, [edge('root', 'a'), edge('a', 'root'), edge('a', 'start')], 'root')]).toEqual(['a']);
  });
  it('keeps disconnected nodes and graph content unchanged', () => {
    const edges = [edge('root', 'a')];
    const original = JSON.stringify({ nodes, edges });
    expect([...foldableNodeIds(nodes, edges, 'root')]).toEqual(['a']);
    expect(foldableNodeIds(nodes, edges, 'missing').size).toBe(0);
    expect(JSON.stringify({ nodes, edges })).toBe(original);
  });
});
