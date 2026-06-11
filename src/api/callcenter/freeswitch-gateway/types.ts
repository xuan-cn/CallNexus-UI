export type GatewayDirection = 'INBOUND' | 'OUTBOUND' | 'BOTH';
export type GatewayTransport = 'UDP' | 'TCP' | 'TLS';

export interface FreeSwitchGatewayVO {
  id: string | number;
  nodeId: string | number;
  nodeName?: string;
  gatewayCode: string;
  gatewayName: string;
  direction: GatewayDirection;
  proxy: string;
  realm?: string;
  username?: string;
  registerEnabled: boolean;
  transport: GatewayTransport;
  callerIdNumber?: string;
  ping: number;
  expireSeconds: number;
  retrySeconds: number;
  pingMax: number;
  pingMin: number;
  callerIdInFrom: boolean;
  fromUser?: string;
  fromDomain?: string;
  contactParams?: string;
  dialplanContext: string;
  extension: string;
  description?: string;
  enabled: boolean;
  version: number;
  createTime: string;
}

export interface FreeSwitchGatewayForm {
  id?: string | number;
  nodeId?: string | number;
  gatewayCode: string;
  gatewayName: string;
  direction: GatewayDirection;
  proxy: string;
  realm?: string;
  username?: string;
  password?: string;
  registerEnabled: boolean;
  transport: GatewayTransport;
  callerIdNumber?: string;
  ping: number;
  expireSeconds: number;
  retrySeconds: number;
  pingMax: number;
  pingMin: number;
  callerIdInFrom: boolean;
  fromUser?: string;
  fromDomain?: string;
  contactParams?: string;
  dialplanContext: string;
  extension: string;
  description?: string;
  enabled: boolean;
  version?: number;
}

export interface FreeSwitchGatewayQuery extends PageQuery {
  nodeId?: string | number;
  gatewayCode?: string;
  gatewayName?: string;
  direction?: GatewayDirection;
  enabled?: boolean;
}
