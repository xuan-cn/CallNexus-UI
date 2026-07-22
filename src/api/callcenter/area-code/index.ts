import request from '@/utils/request';
import { AxiosPromise } from 'axios';
import { AreaCodeForm, AreaCodeQuery, AreaCodeVO, PhoneNumberNormalizeForm, PhoneNumberNormalizeResult } from './types';

export const listAreaCodes = (query: AreaCodeQuery): AxiosPromise<AreaCodeVO[]> =>
  request({ url: '/api/v1/area-codes', method: 'get', params: query });

export const getAreaCode = (id: string | number): AxiosPromise<AreaCodeVO> =>
  request({ url: `/api/v1/area-codes/${id}`, method: 'get' });

export const createAreaCode = (data: AreaCodeForm): AxiosPromise<string | number> =>
  request({ url: '/api/v1/area-codes', method: 'post', data });

export const updateAreaCode = (data: AreaCodeForm) =>
  request({ url: `/api/v1/area-codes/${data.id}`, method: 'put', data });

export const deleteAreaCode = (id: string | number) =>
  request({ url: `/api/v1/area-codes/${id}`, method: 'delete' });

export const testPhoneNumberNormalize = (data: PhoneNumberNormalizeForm): AxiosPromise<PhoneNumberNormalizeResult> =>
  request({ url: '/api/v1/phone-number-normalization/test', method: 'post', data });
