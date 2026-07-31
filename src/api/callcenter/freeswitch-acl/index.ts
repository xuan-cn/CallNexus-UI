import request from '@/utils/request';
import type { FreeSwitchAclForm, FreeSwitchAclIpTestVO, FreeSwitchAclQuery, FreeSwitchAclVO } from './types';
import type { AxiosPromise } from 'axios';

export const listFreeSwitchAcls = (query: FreeSwitchAclQuery) =>
  request<FreeSwitchAclVO[]>({ url: '/api/v1/freeswitch-acls', method: 'get', params: query });

export const getFreeSwitchAcl = (id: string | number): AxiosPromise<FreeSwitchAclVO> =>
  request({ url: `/api/v1/freeswitch-acls/${id}`, method: 'get' });

export const createFreeSwitchAcl = (data: FreeSwitchAclForm) =>
  request({ url: '/api/v1/freeswitch-acls', method: 'post', data });

export const updateFreeSwitchAcl = (id: string | number, data: FreeSwitchAclForm) =>
  request({ url: `/api/v1/freeswitch-acls/${id}`, method: 'put', data });

export const deleteFreeSwitchAcl = (id: string | number) =>
  request({ url: `/api/v1/freeswitch-acls/${id}`, method: 'delete' });

export const publishFreeSwitchAcl = (id: string | number) =>
  request({ url: `/api/v1/freeswitch-acls/${id}/publish`, method: 'post' });

export const rollbackFreeSwitchAcl = (id: string | number) =>
  request({ url: `/api/v1/freeswitch-acls/${id}/rollback`, method: 'post' });

export const testFreeSwitchAclIp = (id: string | number, ip: string): AxiosPromise<FreeSwitchAclIpTestVO> =>
  request({ url: `/api/v1/freeswitch-acls/${id}/test-ip`, method: 'post', data: { ip } });

export const previewFreeSwitchAcl = (id: string | number): AxiosPromise<string> =>
  request({ url: `/api/v1/freeswitch-acls/${id}/preview`, method: 'get' });
