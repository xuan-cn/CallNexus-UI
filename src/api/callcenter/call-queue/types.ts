export type QueueStrategy = 'LONGEST_IDLE_AGENT' | 'ROUND_ROBIN' | 'TOP_DOWN' | 'RING_ALL';
export type QueueExitAction = 'HANGUP' | 'CONTINUE' | 'VOICEMAIL' | 'IVR' | 'EXTENSION' | 'QUEUE';
export type QueueNoAgentAction = 'WAIT' | 'HANGUP' | 'VOICEMAIL' | 'IVR' | 'EXTENSION' | 'QUEUE';
export type QueueAnswerAction = 'NONE' | 'PLAY_AGENT_NUMBER' | 'PLAY_MEDIA';
export type QueueHangupKeyAction = 'NONE' | 'AGENT' | 'CALLER';
export type QueueAgentNoAnswerAction = 'NEXT_AGENT' | 'BREAK_AGENT';

export interface CallQueueVO {
  id: string | number;
  queueCode: string;
  queueName: string;
  nodeGroupId: string | number;
  nodeGroupName?: string;
  nodeIds?: Array<string | number>;
  skillGroupId: string | number;
  skillGroupName?: string;
  strategy: QueueStrategy;
  waitMediaId?: string | number;
  callerNumberId?: string | number;
  maskCallerNumber: boolean;
  manualAnswer: boolean;
  busyTransferMobile: boolean;
  busyTransferNumber?: string;
  forceWaitSeconds: number;
  forceWaitMediaId?: string | number;
  answerAction: QueueAnswerAction;
  answerMediaId?: string | number;
  hangupKeyAction: QueueHangupKeyAction;
  satisfactionEnabled: boolean;
  satisfactionMediaId?: string | number;
  satisfactionTimeoutSeconds: number;
  timeoutAction: QueueExitAction;
  timeoutTarget?: string;
  noAgentAction: QueueNoAgentAction;
  noAgentTarget?: string;
  noAgentWaitSeconds: number;
  agentNoAnswerAction: QueueAgentNoAnswerAction;
  agentTimeoutTransferMobile: boolean;
  agentTimeoutTransferNumber?: string;
  stickyAgentEnabled: boolean;
  queueAnnounceEnabled: boolean;
  queueAnnounceInterval: number;
  queueAnnounceMediaId?: string | number;
  maxWaitSeconds: number;
  ringTimeoutSeconds: number;
  maxNoAnswer: number;
  wrapUpSeconds: number;
  syncStatus: 'NOT_SYNCED' | 'SYNCED' | 'PARTIAL' | 'FAILED';
  lastSyncedAt?: string;
  syncError?: string;
  enabled: boolean;
  remark?: string;
  version?: number;
  createTime?: string;
}

export interface CallQueueForm extends Omit<CallQueueVO, 'id' | 'nodeGroupName' | 'skillGroupName' | 'syncStatus' | 'lastSyncedAt' | 'syncError' | 'createTime'> {
  id?: string | number;
}
