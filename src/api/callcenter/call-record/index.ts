import request from '@/utils/request';
import { AxiosPromise } from 'axios';
import { CallRecordQuery, CallRecordVO } from './types';

export const listCallRecords = (query: CallRecordQuery): AxiosPromise<CallRecordVO[]> =>
  request({ url: '/api/v1/call-records', method: 'get', params: query });

export const getCallRecord = (id: string | number): AxiosPromise<CallRecordVO> => request({ url: `/api/v1/call-records/${id}`, method: 'get' });
