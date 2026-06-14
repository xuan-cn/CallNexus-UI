import request from '@/utils/request';
import { AxiosPromise } from 'axios';
import { IvrFlowForm, IvrFlowVersionVO, IvrFlowVO } from './types';

export const listIvrFlows = (): AxiosPromise<IvrFlowVO[]> =>
  request({ url: '/api/v1/ivr-flows', method: 'get' });

export const getIvrFlow = (id: string | number): AxiosPromise<IvrFlowVO> =>
  request({ url: `/api/v1/ivr-flows/${id}`, method: 'get' });

export const listIvrFlowVersions = (id: string | number): AxiosPromise<IvrFlowVersionVO[]> =>
  request({ url: `/api/v1/ivr-flows/${id}/versions`, method: 'get' });

export const getIvrFlowVersion = (id: string | number, versionNo: number): AxiosPromise<IvrFlowVersionVO> =>
  request({ url: `/api/v1/ivr-flows/${id}/versions/${versionNo}`, method: 'get' });

export const createIvrFlow = (data: IvrFlowForm) =>
  request({ url: '/api/v1/ivr-flows', method: 'post', data });

export const updateIvrFlow = (data: IvrFlowForm) =>
  request({ url: `/api/v1/ivr-flows/${data.id}`, method: 'put', data });

export const publishIvrFlow = (id: string | number) =>
  request({ url: `/api/v1/ivr-flows/${id}/publish`, method: 'post' });

export const unpublishIvrFlow = (id: string | number) =>
  request({ url: `/api/v1/ivr-flows/${id}/unpublish`, method: 'post' });

export const rollbackIvrFlowVersion = (id: string | number, versionNo: number) =>
  request({ url: `/api/v1/ivr-flows/${id}/versions/${versionNo}/rollback`, method: 'post' });

export const deleteIvrFlow = (id: string | number) =>
  request({ url: `/api/v1/ivr-flows/${id}`, method: 'delete' });
