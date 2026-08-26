import request from '@/utils/request';
import type {
  AutoOutboundMaterializeVO,
  AutoOutboundMonitorVO,
  AutoOutboundSchedulerResultVO,
  AutoOutboundMemberVO,
  AutoOutboundSourceForm,
  AutoOutboundSourceVO,
  AutoOutboundTaskForm,
  AutoOutboundTaskVO
} from './types';

const root = '/api/v1/auto-outbound-tasks';

export const listAutoOutboundTasks = () => request<AutoOutboundTaskVO[]>({ url: root, method: 'get' });
export const getAutoOutboundTask = (id: string | number) => request<AutoOutboundTaskVO>({ url: `${root}/${id}`, method: 'get' });
export const createAutoOutboundTask = (data: AutoOutboundTaskForm) => request<string | number>({ url: root, method: 'post', data });
export const updateAutoOutboundTask = (id: string | number, data: AutoOutboundTaskForm) => request({ url: `${root}/${id}`, method: 'put', data });
export const deleteAutoOutboundTask = (id: string | number) => request({ url: `${root}/${id}`, method: 'delete' });
export const startAutoOutboundTask = (id: string | number) => request({ url: `${root}/${id}/start`, method: 'post' });
export const pauseAutoOutboundTask = (id: string | number) => request({ url: `${root}/${id}/pause`, method: 'post' });
export const resumeAutoOutboundTask = (id: string | number) => request({ url: `${root}/${id}/resume`, method: 'post' });
export const stopAutoOutboundTask = (id: string | number) => request({ url: `${root}/${id}/stop`, method: 'post' });
export const rerunAutoOutboundTask = (id: string | number) => request({ url: `${root}/${id}/rerun`, method: 'post' });
export const listAutoOutboundSources = (id: string | number) => request<AutoOutboundSourceVO[]>({ url: `${root}/${id}/sources`, method: 'get' });
export const addAutoOutboundSource = (id: string | number, data: AutoOutboundSourceForm) =>
  request<string | number>({ url: `${root}/${id}/sources`, method: 'post', data });
export const deleteAutoOutboundSource = (id: string | number, sourceId: string | number) =>
  request({ url: `${root}/${id}/sources/${sourceId}`, method: 'delete' });
export const materializeAutoOutboundMembers = (id: string | number) =>
  request<AutoOutboundMaterializeVO>({ url: `${root}/${id}/members/materialize`, method: 'post' });
export const pageAutoOutboundMembers = (id: string | number, params: PageQuery & { status?: string; phoneNumber?: string }) =>
  request<{ rows: AutoOutboundMemberVO[]; total: number }>({ url: `${root}/${id}/members`, method: 'get', params });
export const getAutoOutboundMonitor = (id: string | number) => request<AutoOutboundMonitorVO>({ url: `${root}/${id}/monitor`, method: 'get' });
export const runAutoOutboundScheduler = () => request<AutoOutboundSchedulerResultVO>({ url: `${root}/scheduler/run`, method: 'post' });
