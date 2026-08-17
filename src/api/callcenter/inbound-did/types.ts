export type InboundEntryType = 'DID' | 'PORT' | 'ACCOUNT' | 'HEADER';
export type InboundRouteTargetType = 'IVR' | 'QUEUE' | 'EXTENSION' | 'VOICEMAIL' | 'BUSINESS_HOURS';

export interface InboundDidEntryVO {
  id: string | number;
  nodeId: string | number;
  nodeName?: string;
  gatewayId: string | number;
  gatewayName?: string;
  entryName: string;
  entryType: InboundEntryType;
  didNumber?: string;
  portCode?: string;
  accountCode?: string;
  headerName?: string;
  headerValue?: string;
  routeTargetType: InboundRouteTargetType;
  routeTargetId: string;
  routeTargetName?: string;
  priority: number;
  enabled: boolean;
  remark?: string;
  version?: number;
  createTime?: string;
}

export interface InboundDidEntryForm {
  id?: string | number;
  nodeId?: string | number;
  gatewayId?: string | number;
  entryName: string;
  entryType: InboundEntryType;
  didNumber?: string;
  portCode?: string;
  accountCode?: string;
  headerName?: string;
  headerValue?: string;
  routeTargetType: InboundRouteTargetType;
  routeTargetId: string;
  priority: number;
  enabled: boolean;
  remark?: string;
  version?: number;
}

export interface InboundDidEntryQuery extends PageQuery {
  nodeId?: string | number;
  gatewayId?: string | number;
  entryName?: string;
  entryType?: InboundEntryType;
  didNumber?: string;
  routeTargetType?: InboundRouteTargetType;
  enabled?: boolean;
}

export interface InboundRouteTestForm {
  nodeId?: string | number;
  gatewayId?: string | number;
  callerNumber?: string;
  calledNumber?: string;
  portCode?: string;
  accountCode?: string;
  headerName?: string;
  headerValue?: string;
}

export interface InboundRouteMatchResult {
  matched: boolean;
  matchedType?: string;
  matchedMessage?: string;
  entryId?: string | number;
  entryName?: string;
  entryType?: InboundEntryType;
  matchValue?: string;
  routeTargetType?: InboundRouteTargetType;
  routeTargetId?: string;
  routeTargetName?: string;
  priority?: number;
  message?: string;
}
