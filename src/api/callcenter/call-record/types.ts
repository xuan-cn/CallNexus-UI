import type { VoiceMailMessageVO } from '@/api/callcenter/voicemail/types';

export type CallDirection = 'INBOUND' | 'OUTBOUND' | 'INTERNAL' | 'UNKNOWN';
export type CallStatus = 'CREATED' | 'RINGING' | 'ANSWERED' | 'BRIDGED' | 'ENDED';

export interface CallRecordVO {
  id: string | number;
  businessCallId?: string;
  nodeId: string | number;
  channelUuid?: string;
  callUuid?: string;
  direction: CallDirection;
  callerNumber?: string;
  calledNumber?: string;
  agentId?: string | number;
  agentExtension?: string;
  handlingQueueId?: string | number;
  handlingQueueName?: string;
  customerId?: string | number;
  ticketId?: string | number;
  callStatus: CallStatus;
  startedAt?: string;
  ringingAt?: string;
  answeredAt?: string;
  endedAt?: string;
  durationSeconds: number;
  billableSeconds: number;
  hangupCause?: string;
  recordingOssId?: string | number;
  recordingMediaId?: string | number;
  recordingFileName?: string;
  recordingStatus?: 'NONE' | 'PENDING' | 'UPLOADED' | 'FAILED';
  recordingUrl?: string;
  legs?: CallLegVO[];
  events?: CallEventVO[];
  businessTimeline?: CallBusinessTimelineVO[];
  voicemailMessages?: VoiceMailMessageVO[];
  diagnosticLegs?: CallDiagnosticLegVO[];
  diagnosticBridges?: CallDiagnosticBridgeVO[];
  agentSessions?: AgentCallSessionVO[];
  satisfaction?: CallSatisfactionVO;
}

export interface CallSatisfactionVO {
  score?: number;
  digit?: string;
  status: 'SUBMITTED' | 'NO_INPUT';
  submittedAt?: string;
}

export interface CallLegVO {
  id: string | number;
  channelUuid: string;
  callUuid?: string;
  direction: CallDirection;
  callerNumber?: string;
  calledNumber?: string;
  agentExtension?: string;
  callStatus: CallStatus;
  startedAt?: string;
  answeredAt?: string;
  endedAt?: string;
  durationSeconds: number;
  billableSeconds: number;
  hangupCause?: string;
}

export interface CallEventVO {
  id: string | number;
  channelUuid?: string;
  relatedChannelUuid?: string;
  eventType: string;
  fromTarget?: string;
  toTarget?: string;
  occurredAt: string;
}

export interface CallBusinessTimelineVO {
  id: string | number;
  occurredAt: string;
  type: string;
  title: string;
  description?: string;
  actor?: string;
  target?: string;
  tone?: string;
  channelUuid?: string;
  relatedChannelUuid?: string;
}

export interface CallDiagnosticLegVO {
  id: string | number;
  businessCallId?: string;
  nodeId?: string | number;
  legUuid: string;
  legRole?: string;
  agentId?: string | number;
  agentExtension?: string;
  callerNumber?: string;
  calledNumber?: string;
  legState?: string;
  active?: boolean;
  ringingAt?: string;
  answeredAt?: string;
  bridgedAt?: string;
  heldAt?: string;
  parkedAt?: string;
  endedAt?: string;
  hangupCause?: string;
}

export interface CallDiagnosticBridgeVO {
  id: string | number;
  businessCallId?: string;
  nodeId?: string | number;
  leftLegUuid?: string;
  rightLegUuid?: string;
  bridgeType?: string;
  bridgeState?: string;
  startedAt?: string;
  endedAt?: string;
}

export interface AgentCallSessionVO {
  id: string | number;
  businessCallId?: string;
  nodeId?: string | number;
  agentId?: string | number;
  agentExtension?: string;
  agentLegUuid?: string;
  role?: string;
  sessionState?: string;
  visible?: boolean;
  joinedAt?: string;
  leftAt?: string;
}

export interface CallRecordQuery extends PageQuery {
  customerId?: string | number;
  ticketId?: string | number;
  participantNumber?: string;
  callerNumber?: string;
  calledNumber?: string;
  direction?: CallDirection;
  callStatus?: CallStatus;
  hangupCause?: string;
}
