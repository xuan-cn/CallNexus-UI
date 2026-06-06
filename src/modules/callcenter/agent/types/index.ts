/**
 * 呼叫中心模块 - 坐席子模块类型定义
 */

import type { AgentStatus, AGENT_STATUS_LABELS } from '../types'

/** 坐席操作命令 */
export type AgentCommand = 'signIn' | 'signOut' | 'idle' | 'busy' | 'afterCall'

/** 拨号键盘配置 */
export interface DialKey {
  number: string
  letters: string
}

/** 默认拨号键盘 */
export const DIAL_KEYS: DialKey[] = [
  { number: '1', letters: '' },
  { number: '2', letters: 'ABC' },
  { number: '3', letters: 'DEF' },
  { number: '4', letters: 'GHI' },
  { number: '5', letters: 'JKL' },
  { number: '6', letters: 'MNO' },
  { number: '7', letters: 'PQRS' },
  { number: '8', letters: 'TUV' },
  { number: '9', letters: 'WXYZ' },
  { number: '*', letters: '' },
  { number: '0', letters: '+' },
  { number: '#', letters: '' }
]

/** 坐席工具栏暴露的方法 */
export interface AgentToolbarExpose {
  simulateIncomingCall: () => void
  acceptCall: () => void
  rejectCall: () => void
}
