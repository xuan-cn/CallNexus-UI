import type { AiWorkflowDefinition, AiWorkflowNode } from '@/api/callcenter/ai-workflow/types';
export function connectTreeStep(
  graph: AiWorkflowDefinition,
  source: string,
  condition: string,
  target: string | AiWorkflowNode,
  onward: string,
  terminal: boolean,
  id: () => string
): AiWorkflowDefinition {
  if (!graph.nodes.some((node) => node.id === source)) throw new Error('原节点已不存在，请重新选择');
  const old = graph.edges.filter((edge) => edge.source === source && (edge.condition || '') === condition);
  if (old.length > 1) throw new Error('该出口有多条连线，请先到连线视图修正');
  const creating = typeof target !== 'string';
  const targetId = creating ? target.id : target;
  if (targetId === source || (!creating && !graph.nodes.some((node) => node.id === targetId && node.type !== 'START')))
    throw new Error('下一步节点无效');
  if (creating && graph.nodes.some((node) => node.id === targetId)) throw new Error('新节点编号重复');
  if (creating && terminal && old.length) throw new Error('结束类节点不能接回原后续，请先调整原连线');
  const edges = graph.edges.filter((edge) => !old.includes(edge));
  edges.push({ id: id(), source, target: targetId, condition });
  if (creating && old.length) edges.push({ id: id(), source: targetId, target: old[0].target, condition: onward });
  return { ...graph, nodes: creating ? [...graph.nodes, target] : [...graph.nodes], edges };
}
