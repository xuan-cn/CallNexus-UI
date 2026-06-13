import request from '@/utils/request';
import { AxiosPromise } from 'axios';
import { FreeSwitchNodeForm, FreeSwitchNodeQuery, FreeSwitchNodeVO } from './types';

export const listFreeSwitchNodes = (query: FreeSwitchNodeQuery): AxiosPromise<FreeSwitchNodeVO[]> =>
  request({ url: '/api/v1/freeswitch-nodes', method: 'get', params: query });

export const getFreeSwitchNode = (id: string | number): AxiosPromise<FreeSwitchNodeVO> =>
  request({ url: `/api/v1/freeswitch-nodes/${id}`, method: 'get' });

export const createFreeSwitchNode = (data: FreeSwitchNodeForm) =>
  request({ url: '/api/v1/freeswitch-nodes', method: 'post', data, headers: { isEncrypt: 'true' } });

export const updateFreeSwitchNode = (data: FreeSwitchNodeForm) =>
  request({ url: `/api/v1/freeswitch-nodes/${data.id}`, method: 'put', data, headers: { isEncrypt: 'true' } });

export const deleteFreeSwitchNode = (id: string | number) => request({ url: `/api/v1/freeswitch-nodes/${id}`, method: 'delete' });
export const resetFreeSwitchNodeAgentToken = (id: string | number): AxiosPromise<string> =>
  request({ url: `/api/v1/freeswitch-nodes/${id}/agent-token`, method: 'post' });
