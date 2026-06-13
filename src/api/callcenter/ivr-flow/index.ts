import request from '@/utils/request';
import { AxiosPromise } from 'axios';
import { IvrFlowForm, IvrFlowVO } from './types';

export const listIvrFlows = (): AxiosPromise<IvrFlowVO[]> =>
  request({ url: '/api/v1/ivr-flows', method: 'get' });

export const getIvrFlow = (id: string | number): AxiosPromise<IvrFlowVO> =>
  request({ url: `/api/v1/ivr-flows/${id}`, method: 'get' });

export const createIvrFlow = (data: IvrFlowForm) =>
  request({ url: '/api/v1/ivr-flows', method: 'post', data });

export const updateIvrFlow = (data: IvrFlowForm) =>
  request({ url: `/api/v1/ivr-flows/${data.id}`, method: 'put', data });

export const publishIvrFlow = (id: string | number) =>
  request({ url: `/api/v1/ivr-flows/${id}/publish`, method: 'post' });

export const deleteIvrFlow = (id: string | number) =>
  request({ url: `/api/v1/ivr-flows/${id}`, method: 'delete' });
