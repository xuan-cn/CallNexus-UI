import request from '@/utils/request';
import { AxiosPromise } from 'axios';
import { CallControlVO, OriginateCallForm } from './types';

export const originateCall = (data: OriginateCallForm): AxiosPromise<CallControlVO> => request({ url: '/api/v1/calls', method: 'post', data });

export const hangupCall = (callId: string) => request({ url: `/api/v1/calls/${callId}`, method: 'delete' });
