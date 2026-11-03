import type { AiWorkflowNode, AiWorkflowValidationIssue } from '@/api/callcenter/ai-workflow/types';

export const validationIssues = (messages: string[], nodes: AiWorkflowNode[], details: AiWorkflowValidationIssue[] = []) => {
  const counts = new Map<string, number>();
  messages.forEach((message) => counts.set(message, (counts.get(message) || 0) + 1));
  return [...counts].map(([raw, count]) => {
    const matched: AiWorkflowNode[] = [];
    let message = raw;
    // Match complete identifiers, so node "q" cannot match a UUID or another node's ID.
    for (const node of [...nodes].sort((a, b) => b.id.length - a.id.length)) {
      const escaped = node.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(`(^|[^A-Za-z0-9_-])${escaped}(?=$|[^A-Za-z0-9_-])`, 'g');
      if (!node.id || (!pattern.test(raw) && !details.some((item) => item.message === raw && item.nodeId === node.id))) continue;
      matched.push(node);
    }
    // One replacement pass avoids interpreting a node name as another identifier.
    if (matched.length) {
      const names = new Map(matched.map((node) => [node.id, node.name || node.type]));
      const identifiers = matched.map((node) => node.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
      message = raw.replace(
        new RegExp(`(^|[^A-Za-z0-9_-])(${identifiers})(?=$|[^A-Za-z0-9_-])`, 'g'),
        (_, prefix: string, id: string) => `${prefix}「${names.get(id)}」`
      );
    }
    return { raw, message, count, nodes: matched, edges: details.filter((item) => item.message === raw && item.edgeId) };
  });
};
