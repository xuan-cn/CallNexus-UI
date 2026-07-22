import request from '@/utils/request';
import { AxiosPromise } from 'axios';
import { MobileNumberSegmentForm, MobileNumberSegmentQuery, MobileNumberSegmentVO } from './types';

export const listMobileNumberSegments = (query: MobileNumberSegmentQuery): AxiosPromise<MobileNumberSegmentVO[]> =>
  request({ url: '/api/v1/mobile-number-segments', method: 'get', params: query });

export const getMobileNumberSegment = (id: string | number): AxiosPromise<MobileNumberSegmentVO> =>
  request({ url: `/api/v1/mobile-number-segments/${id}`, method: 'get' });

export const createMobileNumberSegment = (data: MobileNumberSegmentForm): AxiosPromise<string | number> =>
  request({ url: '/api/v1/mobile-number-segments', method: 'post', data });

export const updateMobileNumberSegment = (data: MobileNumberSegmentForm) =>
  request({ url: `/api/v1/mobile-number-segments/${data.id}`, method: 'put', data });

export const deleteMobileNumberSegment = (id: string | number) => request({ url: `/api/v1/mobile-number-segments/${id}`, method: 'delete' });
