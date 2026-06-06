/**
 * 外呼模块类型定义
 */

/** 外呼任务状态 */
export type OutboundTaskStatus = 'draft' | 'ready' | 'running' | 'paused' | 'finished' | 'cancelled'

/** 外呼任务类型 */
export type OutboundTaskType = 'preview' | 'progressive' | 'predictive' | 'robot'

/** 外呼任务状态标签 */
export const OUTBOUND_TASK_STATUS_LABELS: Record<OutboundTaskStatus, string> = {
  draft: '草稿',
  ready: '就绪',
  running: '运行中',
  paused: '已暂停',
  finished: '已完成',
  cancelled: '已取消'
}

/** 外呼任务类型标签 */
export const OUTBOUND_TASK_TYPE_LABELS: Record<OutboundTaskType, string> = {
  preview: '预览外呼',
  progressive: '渐进外呼',
  predictive: '预测外呼',
  robot: '机器人外呼'
}

/** 外呼任务 */
export interface OutboundTask {
  id: string
  name: string
  type: OutboundTaskType
  status: OutboundTaskStatus
  totalContacts: number
  completedContacts: number
  successCount: number
  failCount: number
  startTime?: Date
  endTime?: Date
  createdAt: Date
}

/** 外呼联系人 */
export interface OutboundContact {
  id: string
  taskId: string
  name: string
  phone: string
  status: 'pending' | 'calling' | 'success' | 'failed' | 'skipped'
  callCount: number
  maxRetries: number
  lastCallTime?: Date
  lastCallResult?: string
}

/** 外呼统计 */
export interface OutboundStatistics {
  totalCalls: number
  successCalls: number
  failCalls: number
  successRate: number
  avgDuration: number
  avgWaitTime: number
}
