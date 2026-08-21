export interface AgentVO {
  id: string | number;
  agentCode: string;
  agentName: string;
  userId?: string | number;
  callerNumberId?: string | number;
  sipAccountId?: string | number;
  sipExtension?: string;
  sipDisplayName?: string;
  sipDomain?: string;
  promptMediaId?: string | number;
  promptGenerationStatus?: string;
  promptFailureReason?: string;
  promptSyncedPath?: string;
  enabled: boolean;
  version: number;
  createTime: string;
}

export interface AgentForm {
  id?: string | number;
  agentCode: string;
  agentName: string;
  userId?: string | number;
  callerNumberId?: string | number;
  enabled: boolean;
  version?: number;
}

export interface AgentQuery extends PageQuery {
  agentCode?: string;
  agentName?: string;
  enabled?: boolean;
}

export type AgentPresenceStatus = 'OFFLINE' | 'IDLE' | 'BUSY' | 'AFTER_CALL';
export type AgentCallPhase = 'IDLE' | 'INCOMING_RINGING' | 'OUTBOUND_DIALING' | 'CONNECTED' | 'HELD' | 'ENDING' | 'ENDED';
export type AgentCallOperation = 'NONE' | 'TRANSFERRING_IVR' | 'CONSULTING' | 'CONFERENCE' | 'BLIND_TRANSFERRING';

export interface CurrentAgentVO {
  configured: boolean;
  agentId?: string | number;
  agentCode?: string;
  agentName?: string;
  userId?: string | number;
  callerNumberId?: string | number;
  sipAccountId?: string | number;
  nodeId?: string | number;
  extension?: string;
  authUsername?: string;
  sipDisplayName?: string;
  sipDomain?: string;
  wssUrl?: string;
  activeCallId?: string;
  activeCallNumber?: string;
  activeAgentLegUuid?: string;
  activeCallPhase?: AgentCallPhase;
  activeCallOperation?: AgentCallOperation;
  activeCallStateVersion?: number;
  status: AgentPresenceStatus;
  afterCallRemainingSeconds?: number;
  signedInAt?: string;
  updatedAt?: string;
}

export interface AgentWebRtcConfigVO {
  agentId?: string | number;
  sipAccountId?: string | number;
  nodeId?: string | number;
  extension: string;
  authUsername: string;
  sipDisplayName?: string;
  sipDomain: string;
  wssUrl: string;
  authPassword: string;
}
