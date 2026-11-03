import { describe, expect, it } from 'vitest';
import type { AiWorkflowNodeTraceVO } from '@/api/callcenter/ai-workflow/types';
import { matchPathText, nextExecutedNode, timingRows } from './tracePresentation';
const trace = (patch: Partial<AiWorkflowNodeTraceVO> = {}): AiWorkflowNodeTraceVO => ({
  id: 1,
  nodeId: 'q',
  nodeType: 'DIALOGUE_STEP',
  nodeName: '确认身份',
  turnNo: 1,
  status: 'CONTINUE',
  durationMs: 12,
  ...patch
});
describe('workflow trace presentation', () => {
  it('keeps conflict evidence even after AI resolves it', () => {
    expect(matchPathText(trace({ dialogueDetails: { matchReason: 'MATCH_CONFLICT', aiCalled: true, reason: 'AI_MATCH' } }))).toBe(
      '多个出口同时命中，不能直接推进 → AI 辅助理解'
    );
  });
  it('does not infer unrecorded rule results or a model call', () => {
    expect(matchPathText(trace())).toBe('未记录');
    expect(matchPathText(trace({ dialogueDetails: { reason: 'AI_MATCH' } }))).toBe('规则结果未记录');
    expect(matchPathText(trace({ dialogueDetails: { reason: 'ASKING' } }))).toContain('首次提问');
  });
  it('only reports the next node when it really ran in the same turn', () => {
    const next = trace({ nodeName: '上传说明' });
    expect(nextExecutedNode([trace(), next], 0)).toBe('上传说明');
    expect(nextExecutedNode([trace()], 0)).toBeUndefined();
    expect(nextExecutedNode([trace(), trace({ turnNo: 2 })], 0)).toBeUndefined();
    expect(nextExecutedNode([trace({ status: 'SPEAK_RETRY' }), next], 0)).toBeUndefined();
  });
  it('preserves measured zero without inventing missing durations', () => {
    expect(timingRows(trace({ dialogueDetails: { timings: { matching: 0, intent: 3 } } }))).toEqual([
      { label: '规则及意图判断', value: 0 },
      { label: '其中：意图服务', value: 3 }
    ]);
    expect(timingRows(trace())).toEqual([]);
  });
});
