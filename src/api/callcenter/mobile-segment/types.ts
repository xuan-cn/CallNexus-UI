export interface MobileNumberSegmentVO {
  id: string | number;
  countryCode: string;
  segmentPrefix: string;
  province: string;
  city: string;
  carrier: string;
  enabled: boolean;
  createTime?: string;
  version?: number;
}

export interface MobileNumberSegmentForm {
  id?: string | number;
  countryCode: string;
  segmentPrefix: string;
  province: string;
  city: string;
  carrier: string;
  enabled: boolean;
  version?: number;
}

export interface MobileNumberSegmentQuery extends PageQuery {
  countryCode?: string;
  segmentPrefix?: string;
  province?: string;
  city?: string;
  carrier?: string;
  enabled?: boolean;
}
