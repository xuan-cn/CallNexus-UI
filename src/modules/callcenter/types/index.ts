/**
 * 呼叫中心模块类型定义
 */

/** 坐席状态 */
export type AgentStatus = 'idle' | 'busy' | 'afterCall' | 'offline'

/** 坐席状态标签映射 */
export const AGENT_STATUS_LABELS: Record<AgentStatus, string> = {
  idle: '示闲',
  busy: '示忙',
  afterCall: '话后处理',
  offline: '离线'
}

/** 坐席状态颜色映射 */
export const AGENT_STATUS_COLORS: Record<AgentStatus, string> = {
  idle: '#22c55e',
  busy: '#ef4444',
  afterCall: '#f59e0b',
  offline: '#94a3b8'
}

/** 呼叫状态 */
export type CallStatus = 'created' | 'routing' | 'ringing' | 'answered' | 'bridged' | 'hangup' | 'completed' | 'failed'

/** 呼叫方向 */
export type CallDirection = 'inbound' | 'outbound'

/** 坐席信息 */
export interface Agent {
  id: string
  name: string
  extension: string
  status: AgentStatus
  signedIn: boolean
  skills?: string[]
}

/** 来电信息 */
export interface IncomingCall {
  callId: string
  callerNumber: string
  calleeNumber: string
  direction: CallDirection
  timestamp: Date
}

/** 通话信息 */
export interface ActiveCall {
  callId: string
  channelId: string
  remoteNumber: string
  direction: CallDirection
  status: CallStatus
  duration: number
  startTime: Date
}
