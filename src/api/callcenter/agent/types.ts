export interface AgentVO {
  id: string | number;
  agentCode: string;
  agentName: string;
  userId?: string | number;
  sipAccountId?: string | number;
  sipExtension?: string;
  sipDisplayName?: string;
  sipDomain?: string;
  enabled: boolean;
  version: number;
  createTime: string;
}

export interface AgentForm {
  id?: string | number;
  agentCode: string;
  agentName: string;
  userId?: string | number;
  enabled: boolean;
  version?: number;
}

export interface AgentQuery extends PageQuery {
  agentCode?: string;
  agentName?: string;
  enabled?: boolean;
}

export type AgentPresenceStatus = 'OFFLINE' | 'IDLE' | 'BUSY' | 'AFTER_CALL';

export interface CurrentAgentVO {
  configured: boolean;
  agentId?: string | number;
  agentCode?: string;
  agentName?: string;
  userId?: string | number;
  sipAccountId?: string | number;
  nodeId?: string | number;
  extension?: string;
  sipDisplayName?: string;
  sipDomain?: string;
  wssUrl?: string;
  activeCallId?: string;
  activeCallNumber?: string;
  status: AgentPresenceStatus;
  afterCallRemainingSeconds?: number;
  signedInAt?: string;
  updatedAt?: string;
}
