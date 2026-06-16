export type PhoneNumberType = 'DID' | 'CALLER_ID' | 'BOTH';
export type PhoneRouteType = 'NONE' | 'EXTENSION' | 'IVR' | 'QUEUE' | 'VOICEMAIL' | 'BUSINESS_HOURS';
export type BusinessHoursTargetType = 'EXTENSION' | 'IVR' | 'QUEUE' | 'VOICEMAIL' | 'HANGUP';
export interface PhoneBusinessHoursRoute {
  id?: string | number;
  planId?: string | number;
  inHoursTargetType: BusinessHoursTargetType;
  inHoursTarget?: string;
  outHoursTargetType: BusinessHoursTargetType;
  outHoursTarget?: string;
}

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
  businessHoursRoute?: PhoneBusinessHoursRoute;
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
  businessHoursRoute: PhoneBusinessHoursRoute;
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
