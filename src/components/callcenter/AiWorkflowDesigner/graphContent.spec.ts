import { describe, expect, it } from 'vitest';
import type { AiWorkflowDefinition } from '@/api/callcenter/ai-workflow/types';
import { withGraphContent } from './graphContent';

describe('workflow graph synchronization', () => {
  it('retains common fallback and variables when nodes change', () => {
    const graph: AiWorkflowDefinition = {
      schemaVersion: '1.0',
      nodes: [],
      edges: [],
      variables: [{ key: 'answer' }],
      settings: { intentFallback: { fallbackMode: 'AI_RETRY', maxRetries: 2 } }
    };
    const nodes = [{ id: 'start', type: 'START', name: '开始', x: 100, y: 100, config: {} }];
    const result = withGraphContent(graph, nodes, []);
    expect(result.settings).toEqual(graph.settings);
    expect(result.variables).toEqual(graph.variables);
    expect(result.nodes).toEqual(nodes);
    expect(graph.nodes).toEqual([]);
  });
  it('does not add a fallback policy to a graph without one', () => {
    const graph: AiWorkflowDefinition = { schemaVersion: '1.0', nodes: [], edges: [], variables: [] };
    expect(withGraphContent(graph, [], []).settings).toBeUndefined();
  });
});
