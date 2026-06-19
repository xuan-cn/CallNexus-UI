import request from '@/utils/request';
import { AxiosPromise } from 'axios';
import { CallControlVO, OriginateCallForm } from './types';

export const originateCall = (data: OriginateCallForm): AxiosPromise<CallControlVO> => request({ url: '/api/v1/calls', method: 'post', data });

export const hangupCall = (callId: string) => request({ url: `/api/v1/calls/${callId}`, method: 'delete' });

export const holdCall = (callId: string) => request({ url: `/api/v1/calls/${callId}/hold`, method: 'post' });

export const unholdCall = (callId: string) => request({ url: `/api/v1/calls/${callId}/unhold`, method: 'post' });

export const transferCall = (callId: string, targetExtension: string) =>
  request({ url: `/api/v1/calls/${callId}/transfer`, method: 'post', data: { targetExtension } });

export const startConsultTransfer = (callId: string, targetExtension: string): AxiosPromise<CallControlVO> =>
  request({ url: `/api/v1/calls/${callId}/consult-transfer`, method: 'post', data: { targetExtension } });

export const cancelConsultTransfer = (callId: string) => request({ url: `/api/v1/calls/${callId}/consult-transfer/cancel`, method: 'post' });

export const completeConsultTransfer = (callId: string) => request({ url: `/api/v1/calls/${callId}/consult-transfer/complete`, method: 'post' });
