export type OutboundLinePolicyType = 'FIXED' | 'ROUND_ROBIN' | 'WEIGHT';

export interface OutboundLinePolicyItemVO {
  id?: string | number;
  policyId?: string | number;
  phoneNumberId?: string | number;
  phoneNumber?: string;
  phoneNumberName?: string;
  weight: number;
  sortOrder: number;
  enabled: boolean;
  version?: number;
}

export interface OutboundLinePolicyVO {
  id: string | number;
  nodeId: string | number;
  nodeName?: string;
  policyCode: string;
  policyName: string;
  policyType: OutboundLinePolicyType;
  defaultPolicy: boolean;
  enabled: boolean;
  remark?: string;
  version: number;
  createTime: string;
  items: OutboundLinePolicyItemVO[];
}

export interface OutboundLinePolicyForm {
  id?: string | number;
  nodeId?: string | number;
  policyCode: string;
  policyName: string;
  policyType: OutboundLinePolicyType;
  defaultPolicy: boolean;
  enabled: boolean;
  remark?: string;
  version?: number;
  items: OutboundLinePolicyItemVO[];
}

export interface OutboundLinePolicyQuery extends PageQuery {
  nodeId?: string | number;
  policyCode?: string;
  policyName?: string;
  policyType?: OutboundLinePolicyType;
  defaultPolicy?: boolean;
  enabled?: boolean;
}
