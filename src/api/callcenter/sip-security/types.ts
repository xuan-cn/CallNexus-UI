export interface SipSecurityEventVO {
  id: string | number;
  nodeId: string | number;
  sipAccountId?: string | number;
  extensionSnapshot?: string;
  authUsernameSnapshot?: string;
  sourceIp?: string;
  sourcePort?: number;
  transport?: string;
  userAgent?: string;
  result: 'SUCCESS' | 'FAILURE' | 'BLOCKED';
  reasonCode?: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  occurredAt: string;
}

export interface SipSecurityBlockVO {
  id: string | number;
  nodeId: string | number;
  sipAccountId?: string | number;
  sourceIp?: string;
  blockType: 'IP' | 'ACCOUNT' | 'IP_ACCOUNT';
  status: 'ACTIVE' | 'EXPIRED' | 'RELEASED';
  triggerCount: number;
  blockedAt: string;
  expiresAt?: string;
  reasonDetail?: string;
  executionStatus?: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'NOT_REQUIRED';
}

export interface SipSecurityPolicyVO {
  id?: string | number;
  nodeId: string | number;
  enabled: boolean;
  pairWindowSeconds: number;
  pairFailureThreshold: number;
  accountWindowSeconds: number;
  accountFailureThreshold: number;
  ipWindowSeconds: number;
  ipFailureThreshold: number;
  firstBlockSeconds: number;
  secondBlockSeconds: number;
  repeatedBlockSeconds: number;
  alertEnabled: boolean;
  version?: number;
}

export interface SipSecurityEventQuery extends PageQuery {
  nodeId?: string | number;
  extension?: string;
  sourceIp?: string;
  result?: string;
  riskLevel?: string;
  beginTime?: string;
  endTime?: string;
}

export interface SipSecurityBlockQuery extends PageQuery {
  nodeId?: string | number;
  blockType?: string;
  sourceIp?: string;
  status?: string;
}
