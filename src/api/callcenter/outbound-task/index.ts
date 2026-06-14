import request from '@/utils/request';
import { CompleteOutboundMemberForm, OutboundMemberVO, OutboundTaskForm, OutboundTaskStatisticsVO, OutboundTaskVO } from './types';

export const listOutboundTasks = () => request<OutboundTaskVO[]>({ url: '/api/v1/outbound-tasks', method: 'get' });
export const getOutboundTask = (id: string | number) => request<OutboundTaskVO>({ url: `/api/v1/outbound-tasks/${id}`, method: 'get' });
export const createOutboundTask = (data: OutboundTaskForm) => request<string | number>({ url: '/api/v1/outbound-tasks', method: 'post', data });
export const updateOutboundTask = (id: string | number, data: OutboundTaskForm) => request({ url: `/api/v1/outbound-tasks/${id}`, method: 'put', data });
export const deleteOutboundTask = (id: string | number) => request({ url: `/api/v1/outbound-tasks/${id}`, method: 'delete' });
export const startOutboundTask = (id: string | number) => request({ url: `/api/v1/outbound-tasks/${id}/start`, method: 'post' });
export const pauseOutboundTask = (id: string | number) => request({ url: `/api/v1/outbound-tasks/${id}/pause`, method: 'post' });
export const addOutboundCustomers = (id: string | number, customerIds: Array<string | number>) =>
  request({ url: `/api/v1/outbound-tasks/${id}/members`, method: 'post', data: { customerIds } });
export const listOutboundMembers = (id: string | number) => request<OutboundMemberVO[]>({ url: `/api/v1/outbound-tasks/${id}/members`, method: 'get' });
export const getOutboundTaskStatistics = (id: string | number) => request<OutboundTaskStatisticsVO>({ url: `/api/v1/outbound-tasks/${id}/statistics`, method: 'get' });
export const recoverExpiredOutboundMembers = (id: string | number) => request<number>({ url: `/api/v1/outbound-tasks/${id}/recover-expired`, method: 'post' });
export const claimNextOutboundMember = (id: string | number) => request<OutboundMemberVO>({ url: `/api/v1/outbound-tasks/${id}/claim-next`, method: 'post' });
export const renewOutboundMemberLease = (memberId: string | number) => request<OutboundMemberVO>({ url: `/api/v1/outbound-tasks/members/${memberId}/renew-lease`, method: 'post' });
export const dialOutboundMember = (memberId: string | number) => request<OutboundMemberVO>({ url: `/api/v1/outbound-tasks/members/${memberId}/dial`, method: 'post' });
export const completeOutboundMember = (memberId: string | number, data: CompleteOutboundMemberForm) =>
  request({ url: `/api/v1/outbound-tasks/members/${memberId}/complete`, method: 'post', data });
