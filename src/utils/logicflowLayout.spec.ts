import { describe, expect, it } from 'vitest';
import { createLayeredFlowLayout } from './logicflowLayout';

const nodes = [
  { id: 'start', type: 'START', x: 100, y: 100, config: { text: 'start' } },
  { id: 'question', x: 350, y: 100 },
  { id: 'yes', x: 600, y: 100 },
  { id: 'no', x: 600, y: 300 }
];
const edges = [
  { source: 'start', target: 'question' },
  { source: 'question', target: 'yes' },
  { source: 'question', target: 'no' }
];
describe('flow layout direction', () => {
  it('preserves the default left-to-right layout for other designers', () => {
    const [start, question, yes, no] = createLayeredFlowLayout(nodes, edges);
    expect(start.x).toBeLessThan(question.x);
    expect(question.x).toBeLessThan(yes.x);
    expect(yes.x).toBe(no.x);
    expect(yes.y).toBeLessThan(no.y);
  });
  it('places successive steps below their parents and siblings side by side', () => {
    const [start, question, yes, no] = createLayeredFlowLayout(nodes, edges, { direction: 'TB' });
    expect(start.y).toBeLessThan(question.y);
    expect(question.y).toBeLessThan(yes.y);
    expect(yes.y).toBe(no.y);
    expect(yes.x).toBeLessThan(no.x);
    expect(start.x).toBe(question.x);
  });
  it('preserves inputs, edge relationships and node configuration', () => {
    const snapshot = JSON.stringify({ nodes, edges });
    const result = createLayeredFlowLayout(nodes, edges, { direction: 'TB' });
    expect(JSON.stringify({ nodes, edges })).toBe(snapshot);
    expect(result[0].config).toEqual(nodes[0].config);
    expect(result[0]).not.toBe(nodes[0]);
  });
  it('handles cycles, shared targets and disconnected nodes without duplicates', () => {
    const graphNodes = [...nodes, { id: 'orphan', x: 0, y: 0 }];
    const graphEdges = [...edges, { source: 'yes', target: 'question' }, { source: 'no', target: 'yes' }, { source: 'missing', target: 'start' }];
    const result = createLayeredFlowLayout(graphNodes, graphEdges, { direction: 'TB' });
    expect(result).toHaveLength(graphNodes.length);
    expect(new Set(result.map((node) => node.id)).size).toBe(graphNodes.length);
    expect(result.every((node) => Number.isFinite(node.x) && Number.isFinite(node.y))).toBe(true);
    expect(createLayeredFlowLayout(result, graphEdges, { direction: 'TB' })).toEqual(result);
  });
  it('respects configured origins and gaps', () => {
    const [start, question, yes, no] = createLayeredFlowLayout(nodes, edges, {
      direction: 'TB',
      originX: 20,
      originY: 30,
      horizontalGap: 300,
      verticalGap: 180
    });
    expect(start.y).toBe(30);
    expect(question.y - start.y).toBe(180);
    expect(no.x - yes.x).toBe(300);
  });
  it('supports empty and single-node graphs', () => {
    expect(createLayeredFlowLayout([], [], { direction: 'TB' })).toEqual([]);
    expect(createLayeredFlowLayout([nodes[0]], [], { direction: 'TB' })).toEqual([nodes[0]]);
  });
});
