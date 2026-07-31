export type AclAction = 'ALLOW' | 'DENY';
export type AclPurpose = 'SIP_ENDPOINT' | 'CARRIER_INGRESS';

export interface FreeSwitchAclEntry {
  action: AclAction;
  cidr: string;
  description?: string;
}

export interface FreeSwitchAclVO {
  id: string | number;
  nodeId: string | number;
  aclCode: string;
  aclName: string;
  purpose: AclPurpose;
  defaultAction: AclAction;
  entries: FreeSwitchAclEntry[];
  enabled: boolean;
  publishedVersionNo?: number;
  syncStatus: string;
  syncError?: string;
  version: number;
  createTime: string;
  updateTime: string;
}

export interface FreeSwitchAclForm {
  id?: string | number;
  nodeId?: string | number;
  aclCode: string;
  aclName: string;
  purpose: AclPurpose;
  defaultAction: AclAction;
  entries: FreeSwitchAclEntry[];
  enabled: boolean;
  version?: number;
}

export interface FreeSwitchAclQuery extends PageQuery {
  nodeId?: string | number;
  aclName?: string;
  purpose?: AclPurpose;
  enabled?: boolean;
}

export interface FreeSwitchAclIpTestVO {
  ip: string;
  allowed: boolean;
  action: AclAction;
  matchedCidr?: string;
  message: string;
}
