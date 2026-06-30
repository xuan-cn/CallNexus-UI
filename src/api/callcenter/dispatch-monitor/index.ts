import request from '@/utils/request';
import type { AxiosPromise } from 'axios';
import type { DispatchActiveCallVO, DispatchCallTopologyVO, DispatchExtensionStatusVO } from './types';

export const listDispatchExtensionStatuses = (): AxiosPromise<DispatchExtensionStatusVO[]> =>
  request({ url: '/api/v1/dispatch/calls/extensions', method: 'get' });

export const listDispatchActiveCalls = (): AxiosPromise<DispatchActiveCallVO[]> =>
  request({ url: '/api/v1/dispatch/calls/active', method: 'get' });

export const getDispatchCallTopology = (businessCallId: string): AxiosPromise<DispatchCallTopologyVO> =>
  request({ url: `/api/v1/dispatch/calls/${businessCallId}/topology`, method: 'get' });
