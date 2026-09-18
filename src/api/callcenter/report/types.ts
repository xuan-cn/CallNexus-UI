export interface ReportQuery extends PageQuery {
  beginDate?: string;
  endDate?: string;
  granularity?: 'HOUR' | 'DAY';
  direction?: 'INBOUND' | 'OUTBOUND' | 'INTERNAL';
  answerResult?: 'ANSWERED' | 'UNANSWERED';
  keyword?: string;
  agentId?: string | number;
  skillGroupId?: string | number;
  queueId?: string | number;
  taskId?: string | number;
  taskType?: 'PREVIEW' | 'AUTO';
  resultCode?: string;
  satisfactionStatus?: 'SUBMITTED' | 'NO_INPUT';
  satisfactionScore?: number;
}

export interface ReportAgentOptionVO {
  id: string | number;
  agentCode: string;
  agentName: string;
  extension?: string;
  enabled: boolean;
}

export interface ReportQueueOptionVO {
  id: string | number;
  queueCode: string;
  queueName: string;
  enabled: boolean;
}

export interface SatisfactionSummaryVO {
  invitationCount: number;
  submittedCount: number;
  noInputCount: number;
  averageScore: number;
  participationRate: number;
  satisfactionRate: number;
  dissatisfactionRate: number;
  noInputRate: number;
}

export interface SatisfactionTrendPointVO {
  bucket: string;
  invitationCount: number;
  submittedCount: number;
  satisfiedCount: number;
  averageScore: number;
  participationRate: number;
  satisfactionRate: number;
}

export interface SatisfactionScoreDistributionVO {
  score: number;
  count: number;
}

export interface SatisfactionRankingVO {
  dimensionId?: string | number;
  dimensionName: string;
  invitationCount: number;
  submittedCount: number;
  averageScore: number;
  participationRate: number;
  satisfactionRate: number;
}

export interface SatisfactionDetailVO {
  id: string | number;
  sessionId: string | number;
  businessCallId: string;
  evaluatedAt: string;
  callStartedAt?: string;
  queueId: string | number;
  queueName?: string;
  skillGroupName?: string;
  agentId?: string | number;
  agentName?: string;
  agentExtension?: string;
  customerNumber?: string;
  score?: number;
  digit?: string;
  status: 'SUBMITTED' | 'NO_INPUT';
  talkSeconds: number;
}

export interface OverviewKpiVO {
  totalCalls: number;
  inboundCalls: number;
  outboundCalls: number;
  answeredCalls: number;
  unansweredCalls: number;
  answerRate: number;
  totalTalkSeconds: number;
  averageTalkSeconds: number;
  onlineAgents: number;
  waitingCalls: number;
}

export interface ReportTrendPointVO {
  bucket: string;
  totalCalls: number;
  inboundCalls: number;
  outboundCalls: number;
  answeredCalls: number;
}

export interface CallDistributionVO {
  category: string;
  count: number;
}

export interface CallDetailVO {
  id: string | number;
  businessCallId: string;
  direction: string;
  customerNumber?: string;
  agentName?: string;
  agentExtension?: string;
  queueName?: string;
  callStatus: string;
  startedAt?: string;
  answeredAt?: string;
  endedAt?: string;
  waitSeconds: number;
  talkSeconds: number;
  hangupCause?: string;
}

export interface AgentReportVO {
  agentId: string | number;
  agentCode: string;
  agentName: string;
  extension?: string;
  skillGroupNames?: string;
  handledCount: number;
  inboundAnsweredCount: number;
  outboundAnsweredCount: number;
  missedCount: number;
  totalTalkSeconds: number;
  averageTalkSeconds: number;
  averageResponseSeconds: number;
  onlineSeconds: number;
  notReadySeconds: number;
  afterCallSeconds: number;
  utilizationRate: number;
}

export type AgentPresenceStatus = 'OFFLINE' | 'IDLE' | 'NOT_READY' | 'BUSY' | 'AFTER_CALL';

export interface AgentPresenceLogVO {
  id: string | number;
  previousStatus?: AgentPresenceStatus;
  status: AgentPresenceStatus;
  source: string;
  businessCallId?: string;
  startedAt: string;
  endedAt?: string;
  durationSeconds: number;
}

export interface QueueReportVO {
  queueId: string | number;
  queueCode: string;
  queueName: string;
  skillGroupName?: string;
  enteredCount: number;
  answeredCount: number;
  abandonedCount: number;
  timeoutCount: number;
  answerRate: number;
  abandonRate: number;
  averageWaitSeconds: number;
  maximumWaitSeconds: number;
  serviceLevel: number;
}

export interface OutboundReportSummaryVO {
  memberCount: number;
  dialedMemberCount: number;
  undialedMemberCount: number;
  attemptCount: number;
  answeredCount: number;
  businessSuccessCount: number;
  retryAttemptCount: number;
  totalTalkSeconds: number;
  averageAttempts: number;
  answerRate: number;
  conversionRate: number;
}

export interface OutboundTrendPointVO {
  bucket: string;
  attemptCount: number;
  answeredCount: number;
  businessSuccessCount: number;
}

export interface OutboundTaskReportVO {
  taskId: string | number;
  taskName: string;
  taskType: 'PREVIEW' | 'AUTO';
  status: string;
  memberCount: number;
  dialedMemberCount: number;
  attemptCount: number;
  answeredCount: number;
  businessSuccessCount: number;
  answerRate: number;
  conversionRate: number;
}

export interface OutboundAttemptDetailVO {
  id: string | number;
  taskId: string | number;
  taskName: string;
  taskType: 'PREVIEW' | 'AUTO';
  customerName?: string;
  phoneNumber?: string;
  agentName?: string;
  attemptNo: number;
  status: string;
  resultCode?: string;
  startedAt?: string;
  answeredAt?: string;
  endedAt?: string;
  durationSeconds: number;
  billableSeconds: number;
  hangupCause?: string;
  failureCategory?: string;
}
