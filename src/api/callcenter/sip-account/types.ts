export interface SipAccountVO {
  id: string | number;
  nodeId?: string | number;
  nodeName?: string;
  extension: string;
  authUsername: string;
  displayName: string;
  domain: string;
  enabled: boolean;
  version: number;
  createTime: string;
}

export interface SipAccountForm {
  id?: string | number;
  nodeId?: string | number;
  extension: string;
  authUsername?: string;
  displayName: string;
  domain: string;
  password?: string;
  enabled: boolean;
  version?: number;
}

export interface SipAccountQuery extends PageQuery {
  extension?: string;
  authUsername?: string;
  displayName?: string;
  enabled?: boolean;
}
