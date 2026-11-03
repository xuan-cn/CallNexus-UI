import { describe, expect, it } from 'vitest';
import { validationIssues } from './validationIssues';
const nodes = [
  { id: '72f7a156-4f5a-4798-aa6c-a8c6f55ff8a1', type: 'DIALOGUE_STEP', name: '确认客户身份', config: {}, x: 0, y: 0 },
  { id: 'q', type: 'END', name: '结束', config: {}, x: 0, y: 0 }
];
describe('workflow validation issue presentation', () => {
  it('shows node names and keeps exact navigation IDs', () => {
    const [issue] = validationIssues([`业务答案无效：${nodes[0].id}`], nodes);
    expect(issue.message).toBe('业务答案无效：「确认客户身份」');
    expect(issue.nodes.map((node) => node.id)).toEqual([nodes[0].id]);
  });
  it('merges identical warnings without losing their count', () => {
    const result = validationIssues(['分支无效：q', '分支无效：q', '名称无效：q'], nodes);
    expect(result).toHaveLength(2);
    expect(result[0].count).toBe(2);
  });
  it('does not match fragments and retains global or missing-node errors', () => {
    const result = validationIssues(['unknown-q', '没有开始节点', '连线引用了不存在的节点：deleted'], nodes);
    expect(result.every((item) => item.nodes.length === 0)).toBe(true);
    expect(result[0].message).toBe('unknown-q');
  });
  it('identifies both ends of an edge and handles duplicate display names', () => {
    const sameName = nodes.map((node) => ({ ...node, name: '同名节点' }));
    const [issue] = validationIssues([`${nodes[0].id} -> q`], sameName);
    expect(issue.nodes).toHaveLength(2);
    expect(issue.message).toBe('「同名节点」 -> 「同名节点」');
  });
  it('keeps precise edge diagnostics when identical errors are grouped', () => {
    const [issue] = validationIssues(['分支不合法：q', '分支不合法：q'], nodes, [
      { message: '分支不合法：q', nodeId: 'q', edgeId: 'edge1', field: 'condition', condition: 'OLD_SELF' },
      { message: '分支不合法：q', nodeId: 'q', edgeId: 'edge2', field: 'condition', condition: 'OLD_FAMILY' }
    ]);
    expect(issue.count).toBe(2);
    expect(issue.edges.map((edge) => edge.edgeId)).toEqual(['edge1', 'edge2']);
    expect(issue.edges[0].condition).toBe('OLD_SELF');
  });
});
