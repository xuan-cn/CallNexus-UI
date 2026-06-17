import request from '@/utils/request';
import type { AxiosPromise } from 'axios';
import type { CallCenterConfigGroup, CallCenterConfigSaveRequest } from './types';

export const listCallCenterConfigGroups = (): AxiosPromise<CallCenterConfigGroup[]> =>
  request({ url: '/api/v1/callcenter-config/groups', method: 'get' });

export const getCallCenterConfigGroup = (groupCode: string): AxiosPromise<CallCenterConfigGroup> =>
  request({ url: `/api/v1/callcenter-config/groups/${groupCode}`, method: 'get' });

export const saveCallCenterConfigGroup = (groupCode: string, data: CallCenterConfigSaveRequest) =>
  request({ url: `/api/v1/callcenter-config/groups/${groupCode}`, method: 'put', data });

export const resetCallCenterConfigItem = (configKey: string) =>
  request({ url: `/api/v1/callcenter-config/items/${encodeURIComponent(configKey)}`, method: 'delete' });
