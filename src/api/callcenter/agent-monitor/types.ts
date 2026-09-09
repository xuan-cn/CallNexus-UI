export type AgentMonitorStatus = 'OFFLINE' | 'IDLE' | 'NOT_READY' | 'BUSY' | 'AFTER_CALL';

export interface AgentMonitorOverviewVO {
  totalAgentCount: number;
  onlineAgentCount: number;
  idleAgentCount: number;
  notReadyAgentCount: number;
  busyAgentCount: number;
  afterCallAgentCount: number;
  offlineAgentCount: number;
  todayHandledCount: number;
  inboundAnsweredCount: number;
  outboundAnsweredCount: number;
  missedOfferCount: number;
  totalTalkSeconds: number;
  averageTalkSeconds: number;
  onlineSeconds: number;
  idleSeconds: number;
  notReadySeconds: number;
  busySeconds: number;
  afterCallSeconds: number;
  utilizationRate: number;
}

export interface AgentMonitorVO {
  agentId: string | number;
  agentCode: string;
  agentName: string;
  userId?: string | number;
  extension?: string;
  skillGroupIds?: string;
  skillGroupNames?: string;
  enabled: boolean;
  status: AgentMonitorStatus;
  statusText: string;
  signedInAt?: string;
  statusUpdatedAt?: string;
  todayHandledCount: number;
  inboundAnsweredCount: number;
  outboundAnsweredCount: number;
  missedOfferCount: number;
  totalTalkSeconds: number;
  averageTalkSeconds: number;
  onlineSeconds: number;
  idleSeconds: number;
  notReadySeconds: number;
  busySeconds: number;
  afterCallSeconds: number;
  utilizationRate: number;
  currentBusinessCallId?: string;
  currentDirection?: string;
  currentPeerNumber?: string;
  currentCallState?: string;
  currentCallStartedAt?: string;
}

export interface AgentMonitorCallVO {
  legId: string | number;
  sessionId?: string | number;
  businessCallId: string;
  direction?: string;
  customerNumber?: string;
  legState: string;
  ringingAt?: string;
  answeredAt?: string;
  endedAt?: string;
  talkSeconds: number;
  hangupCause?: string;
}

export interface AgentMonitorSkillGroupVO {
  id: string | number;
  groupName: string;
}

export interface AgentMonitorPresenceLogVO {
  id: string | number;
  previousStatus?: AgentMonitorStatus;
  status: AgentMonitorStatus;
  source: string;
  businessCallId?: string;
  startedAt: string;
  endedAt?: string;
  durationSeconds: number;
}

export interface AgentMonitorQuery extends PageQuery {
  keyword?: string;
  skillGroupId?: string | number;
  status?: AgentMonitorStatus;
  enabled?: boolean;
  beginDate?: string;
  endDate?: string;
}
