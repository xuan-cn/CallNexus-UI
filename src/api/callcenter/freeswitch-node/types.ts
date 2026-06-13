export interface FreeSwitchNodeVO {
  id: string | number;
  nodeCode: string;
  nodeName: string;
  sipDomain: string;
  wssUrl: string;
  eslHost: string;
  eslPort: number;
  enabled: boolean;
  agentEnabled: boolean;
  agentLastHeartbeat?: string;
  agentVersion?: string;
  mediaRootPath: string;
  version: number;
  createTime: string;
}

export interface FreeSwitchNodeForm {
  id?: string | number;
  nodeCode: string;
  nodeName: string;
  sipDomain: string;
  wssUrl: string;
  eslHost: string;
  eslPort: number;
  eslPassword?: string;
  enabled: boolean;
  agentEnabled: boolean;
  mediaRootPath: string;
  version?: number;
}

export interface FreeSwitchNodeQuery extends PageQuery {
  nodeCode?: string;
  nodeName?: string;
  enabled?: boolean;
}
