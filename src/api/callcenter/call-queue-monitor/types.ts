export type QueueHealthStatus = 'NORMAL' | 'WARNING' | 'ABNORMAL';
export type AgentRuntimeStatus = 'OFFLINE' | 'IDLE' | 'BUSY' | 'AFTER_CALL';

export interface CallQueueMonitorVO {
  queueId: string | number;
  queueCode: string;
  queueName: string;
  nodeGroupName?: string;
  skillGroupName?: string;
  syncStatus?: string;
  syncError?: string;
  lastSyncedAt?: string;
  enabled: boolean;
  maxWaitSeconds?: number;
  enteredCount: number;
  answeredCount: number;
  abandonedCount: number;
  timeoutCount: number;
  waitingCount: number;
  ringingCount: number;
  totalAgentCount: number;
  onlineAgentCount: number;
  idleAgentCount: number;
  busyAgentCount: number;
  offlineAgentCount: number;
  averageWaitSeconds: number;
  longestWaitSeconds: number;
  answerRate: number;
  abandonRate: number;
  healthStatus: QueueHealthStatus;
  healthText: string;
}

export interface CallQueueMonitorOverviewVO {
  queueCount: number;
  healthyQueueCount: number;
  warningQueueCount: number;
  abnormalQueueCount: number;
  currentWaitingCount: number;
  currentRingingCount: number;
  totalAgentCount: number;
  onlineAgentCount: number;
  idleAgentCount: number;
  busyAgentCount: number;
  todayEnteredCount: number;
  todayAnsweredCount: number;
  todayAbandonedCount: number;
  todayTimeoutCount: number;
  averageWaitSeconds: number;
  longestWaitSeconds: number;
  answerRate: number;
  abandonRate: number;
}

export interface CallQueueAgentStatusVO {
  agentId: string | number;
  agentCode: string;
  agentName: string;
  userId?: string | number;
  extension?: string;
  status: AgentRuntimeStatus;
  statusText: string;
  enabled: boolean;
  assignable: boolean;
  signedInAt?: string;
  updatedAt?: string;
  lastAnsweredAt?: string;
}

export interface CallQueueTrendPointVO {
  hour: number;
  enteredCount: number;
  answeredCount: number;
  abandonedCount: number;
  timeoutCount: number;
}

export interface CallQueueRecentEventVO {
  eventId: string | number;
  sessionId: string | number;
  eventType: string;
  eventText: string;
  callerNumber?: string;
  calledNumber?: string;
  agentExtension?: string;
  hangupCause?: string;
  waitSeconds?: number;
  fromTarget?: string;
  toTarget?: string;
  occurredAt: string;
  metadataJson?: string;
}

export interface CallQueueRecentCallVO {
  sessionId: string | number;
  businessCallId?: string;
  direction?: string;
  callerNumber?: string;
  calledNumber?: string;
  agentId?: string | number;
  agentExtension?: string;
  callStatus?: string;
  startedAt?: string;
  answeredAt?: string;
  endedAt?: string;
  waitSeconds?: number;
  durationSeconds?: number;
  billableSeconds?: number;
  hangupCause?: string;
  recordingStatus?: string;
}
