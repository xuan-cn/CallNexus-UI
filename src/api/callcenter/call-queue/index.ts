import request from '@/utils/request';
import { AxiosPromise } from 'axios';
import { CallQueueForm, CallQueueVO } from './types';

export const listCallQueues = (): AxiosPromise<CallQueueVO[]> => request({ url: '/api/v1/call-queues', method: 'get' });
export const getCallQueue = (id: string | number): AxiosPromise<CallQueueVO> => request({ url: `/api/v1/call-queues/${id}`, method: 'get' });
export const createCallQueue = (data: CallQueueForm) => request({ url: '/api/v1/call-queues', method: 'post', data });
export const updateCallQueue = (data: CallQueueForm) => request({ url: `/api/v1/call-queues/${data.id}`, method: 'put', data });
export const syncCallQueue = (id: string | number) => request({ url: `/api/v1/call-queues/${id}/sync`, method: 'post' });
export const deleteCallQueue = (id: string | number) => request({ url: `/api/v1/call-queues/${id}`, method: 'delete' });
