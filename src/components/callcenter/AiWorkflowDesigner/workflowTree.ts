import type { AiWorkflowDefinition } from '@/api/callcenter/ai-workflow/types';
export interface WorkflowTreeEntry {
  key: string;
  nodeId: string;
  name: string;
  branch: string;
  reference?: 'cycle' | 'shared';
  stepCount: number;
  children: WorkflowTreeEntry[];
}
export function buildWorkflowTree(graph: AiWorkflowDefinition, label: (source: string, condition?: string) => string): WorkflowTreeEntry[] {
  const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
  const visited = new Set<string>();
  const visit = (id: string, branch: string, path: Set<string>, edgeId = id): WorkflowTreeEntry => {
    const entry: WorkflowTreeEntry = {
      key: `node:${id}`,
      nodeId: id,
      name: nodes.get(id)?.name || `缺失节点：${id}`,
      branch,
      children: [],
      stepCount: 0
    };
    if (path.has(id)) {
      entry.reference = 'cycle';
      entry.key = `ref:${edgeId}`;
      return entry;
    }
    if (visited.has(id)) {
      entry.reference = 'shared';
      entry.key = `ref:${edgeId}`;
      return entry;
    }
    visited.add(id);
    const nextPath = new Set(path).add(id);
    entry.children = graph.edges
      .filter((edge) => edge.source === id)
      .map((edge) => visit(edge.target, edge.condition ? label(id, edge.condition) : '', nextPath, edge.id));
    entry.stepCount = entry.children.reduce((count, child) => count + (child.reference ? 0 : 1 + child.stepCount), 0);
    return entry;
  };
  const roots = graph.nodes.filter((node) => node.type === 'START').map((node) => visit(node.id, '', new Set()));
  for (const node of graph.nodes) if (!visited.has(node.id)) roots.push(visit(node.id, '未连接到开始节点', new Set()));
  return roots;
}

export function initialTreeExpandedKeys(entries: WorkflowTreeEntry[]): string[] {
  const keys: string[] = [];
  for (const root of entries) {
    let entry = root;
    let depth = 0;
    while (entry.children.length && depth++ < 8) {
      keys.push(entry.key);
      if (entry.children.length !== 1 || entry.children[0].reference) break;
      entry = entry.children[0];
    }
  }
  return keys;
}
