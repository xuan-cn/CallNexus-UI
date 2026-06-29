import request from '@/utils/request';
import type { AxiosPromise } from 'axios';
import type { DispatchActiveCallVO, DispatchCallTopologyVO } from './types';

export const listDispatchActiveCalls = (): AxiosPromise<DispatchActiveCallVO[]> =>
  request({ url: '/api/v1/dispatch/calls/active', method: 'get' });

export const getDispatchCallTopology = (businessCallId: string): AxiosPromise<DispatchCallTopologyVO> =>
  request({ url: `/api/v1/dispatch/calls/${businessCallId}/topology`, method: 'get' });
