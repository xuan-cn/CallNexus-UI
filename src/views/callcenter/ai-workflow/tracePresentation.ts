import type { AiWorkflowNodeTraceVO } from '@/api/callcenter/ai-workflow/types';

export function matchReasonText(reason?: string): string {
  return (
    (
      {
        EXACT_MATCH: '整句规则命中',
        KEYWORD_MATCH: '关键词规则命中',
        INTENT_MATCH: '意图识别命中',
        MATCH_CONFLICT: '多个出口同时命中，不能直接推进',
        INTENT_FAILED: '意图识别未成功',
        NO_MATCH: '规则未命中',
        EVENT: '显式事件触发'
      } as Record<string, string>
    )[reason || ''] ||
    reason ||
    '未记录'
  );
}

export function matchPathText(item: AiWorkflowNodeTraceVO): string {
  const detail = item.dialogueDetails;
  if (!detail) return '未记录';
  if (detail.reason === 'ASKING') return '首次提问，不判断输入';
  if (detail.reason === 'FIELDS_REUSED') return '复用已收集信息';
  const source =
    detail.matchReason === 'NO_MATCH' && detail.timings?.intent !== undefined
      ? '规则及意图均未命中'
      : detail.matchReason
        ? matchReasonText(detail.matchReason)
        : '规则结果未记录';
  return detail.aiCalled ? source + ' → AI 辅助理解' : source;
}

export function nextExecutedNode(traces: AiWorkflowNodeTraceVO[], index: number): string | undefined {
  const current = traces[index];
  const next = traces[index + 1];
  return current?.status === 'CONTINUE' && next && next.turnNo === current.turnNo ? next.nodeName : undefined;
}

export function timingRows(item: AiWorkflowNodeTraceVO): Array<{ label: string; value: number }> {
  const timings = item.dialogueDetails?.timings;
  return (
    Object.entries({
      matching: '规则及意图判断',
      intent: '其中：意图服务',
      understanding: 'AI 辅助理解',
      extraction: '字段提取',
      knowledge: '插问回答生成'
    }) as Array<[keyof NonNullable<typeof timings>, string]>
  )
    .filter(([key]) => {
      const value = timings?.[key];
      return typeof value === 'number' && Number.isFinite(value) && value >= 0;
    })
    .map(([key, label]) => ({ label, value: timings![key]! }));
}
