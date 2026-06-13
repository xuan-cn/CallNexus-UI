export type PhoneNumberType = 'DID' | 'CALLER_ID' | 'BOTH';
export type PhoneRouteType = 'NONE' | 'EXTENSION' | 'IVR';

export interface PhoneNumberVO {
  id: string | number;
  number: string;
  numberName: string;
  numberType: PhoneNumberType;
  nodeId: string | number;
  nodeName?: string;
  gatewayId?: string | number;
  gatewayName?: string;
  routeType: PhoneRouteType;
  routeTarget?: string;
  outboundDefault: boolean;
  enabled: boolean;
  version: number;
  createTime: string;
}

export interface PhoneNumberForm {
  id?: string | number;
  number: string;
  numberName: string;
  numberType: PhoneNumberType;
  nodeId?: string | number;
  gatewayId?: string | number;
  routeType: PhoneRouteType;
  routeTarget?: string;
  outboundDefault: boolean;
  enabled: boolean;
  version?: number;
}

export interface PhoneNumberQuery extends PageQuery {
  nodeId?: string | number;
  gatewayId?: string | number;
  number?: string;
  numberName?: string;
  numberType?: PhoneNumberType;
  routeType?: PhoneRouteType;
  enabled?: boolean;
}
