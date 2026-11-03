import type { AiWorkflowNode, AiWorkflowEdge } from '@/api/callcenter/ai-workflow/types';

// Keep shared joins (and their downstream paths) visible when hiding one branch.
export function foldableNodeIds(nodes: AiWorkflowNode[], edges: AiWorkflowEdge[], root: string): Set<string> {
  if (!nodes.some((node) => node.id === root)) return new Set();
  const known = new Set(nodes.filter((node) => node.type !== 'START').map((node) => node.id));
  const hidden = new Set<string>();
  const queue = [root];
  const visited = new Set<string>();
  while (queue.length) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    for (const edge of edges.filter((edge) => edge.source === id)) {
      if (edge.target !== root && known.has(edge.target)) {
        hidden.add(edge.target);
        queue.push(edge.target);
      }
    }
  }
  let changed = true;
  while (changed) {
    changed = false;
    for (const id of hidden) {
      if (edges.some((edge) => edge.target === id && edge.source !== root && !hidden.has(edge.source))) {
        hidden.delete(id);
        changed = true;
      }
    }
  }
  return hidden;
}
