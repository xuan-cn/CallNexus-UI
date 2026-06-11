export type CallDirection = 'INBOUND' | 'OUTBOUND' | 'INTERNAL' | 'UNKNOWN';
export type CallStatus = 'CREATED' | 'RINGING' | 'ANSWERED' | 'BRIDGED' | 'ENDED';

export interface CallRecordVO {
  id: string | number;
  nodeId: string | number;
  channelUuid: string;
  callUuid?: string;
  direction: CallDirection;
  callerNumber?: string;
  calledNumber?: string;
  agentId?: string | number;
  agentExtension?: string;
  callStatus: CallStatus;
  startedAt?: string;
  ringingAt?: string;
  answeredAt?: string;
  endedAt?: string;
  durationSeconds: number;
  billableSeconds: number;
  hangupCause?: string;
}

export interface CallRecordQuery extends PageQuery {
  participantNumber?: string;
  callerNumber?: string;
  calledNumber?: string;
  direction?: CallDirection;
  callStatus?: CallStatus;
  hangupCause?: string;
}
