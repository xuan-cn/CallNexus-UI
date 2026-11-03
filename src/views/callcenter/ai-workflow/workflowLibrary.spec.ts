import { describe, it, expect } from 'vitest';
import type { AiWorkflowVO } from '@/api/callcenter/ai-workflow/types';
import { filterWorkflows } from './workflowLibrary';

const workflows: AiWorkflowVO[] = [
  { id: '1', workflowCode: 'INBOUND', workflowName: '垫付首通', sceneType: 'VOICE_INBOUND', enabled: true, version: 1, bindingCount: 0 },
  { id: '2', workflowCode: 'OUTBOUND', workflowName: '材料回访', sceneType: 'VOICE_OUTBOUND', enabled: false, version: 1, bindingCount: 2 }
];
describe('workflow library filtering', () => {
  it('matches Chinese names and case insensitive codes', () => {
    expect(filterWorkflows(workflows, '垫付', '', '')).toEqual([workflows[0]]);
    expect(filterWorkflows(workflows, ' outbound ', '', '')).toEqual([workflows[1]]);
  });
  it('combines scene and enabled state without changing the source', () => {
    expect(filterWorkflows(workflows, '', 'VOICE_OUTBOUND', 'disabled')).toEqual([workflows[1]]);
    expect(filterWorkflows(workflows, '', 'VOICE_OUTBOUND', 'enabled')).toEqual([]);
    expect(filterWorkflows(workflows, '', '', '')).toEqual(workflows);
    expect(workflows).toHaveLength(2);
  });
});
