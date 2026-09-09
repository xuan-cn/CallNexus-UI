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
