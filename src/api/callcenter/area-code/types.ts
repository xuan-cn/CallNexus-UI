export interface AreaCodeVO {
  id: string | number;
  countryCode: string;
  province: string;
  city: string;
  areaCode: string;
  enabled: boolean;
  createTime?: string;
  version?: number;
}

export interface AreaCodeForm {
  id?: string | number;
  countryCode: string;
  province: string;
  city: string;
  areaCode: string;
  enabled: boolean;
  version?: number;
}

export interface AreaCodeQuery extends PageQuery {
  countryCode?: string;
  province?: string;
  city?: string;
  areaCode?: string;
  enabled?: boolean;
}

export interface PhoneNumberNormalizeForm {
  rawNumber: string;
  localAreaCode?: string;
  addLocalAreaCode?: boolean;
  stripChinaCountryCode?: boolean;
  outboundPrefix?: string;
}

export interface PhoneNumberNormalizeResult {
  rawNumber: string;
  cleanedNumber: string;
  normalizedNumber: string;
  dialNumber: string;
  numberType: string;
  countryCode?: string;
  areaCode?: string;
  mobileSegment?: string;
  province?: string;
  city?: string;
  carrier?: string;
  changed: boolean;
  reason: string;
}
