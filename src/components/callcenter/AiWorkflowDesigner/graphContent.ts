import type { AiWorkflowDefinition, AiWorkflowNode, AiWorkflowEdge } from '@/api/callcenter/ai-workflow/types';

export function withGraphContent(graph: AiWorkflowDefinition, nodes: AiWorkflowNode[], edges: AiWorkflowEdge[]): AiWorkflowDefinition {
  return { ...graph, schemaVersion: graph.schemaVersion || '1.0', variables: graph.variables || [], nodes, edges };
}
