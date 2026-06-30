import request from '@/utils/request';
import type { AxiosPromise } from 'axios';
import type { DispatchActiveCallVO, DispatchCallTopologyVO, DispatchExtensionStatusVO, DispatchOperatorExtensionVO } from './types';

export const getDispatchOperatorExtension = (): AxiosPromise<DispatchOperatorExtensionVO> =>
  request({ url: '/api/v1/dispatch/calls/operator-extension', method: 'get' });

export const bindDispatchOperatorExtension = (sipAccountId: string | number): AxiosPromise<DispatchOperatorExtensionVO> =>
  request({ url: '/api/v1/dispatch/calls/operator-extension', method: 'post', data: { sipAccountId } });

export const listDispatchExtensionStatuses = (): AxiosPromise<DispatchExtensionStatusVO[]> =>
  request({ url: '/api/v1/dispatch/calls/extensions', method: 'get' });

export const listDispatchActiveCalls = (): AxiosPromise<DispatchActiveCallVO[]> =>
  request({ url: '/api/v1/dispatch/calls/active', method: 'get' });

export const getDispatchCallTopology = (businessCallId: string): AxiosPromise<DispatchCallTopologyVO> =>
  request({ url: `/api/v1/dispatch/calls/${businessCallId}/topology`, method: 'get' });
