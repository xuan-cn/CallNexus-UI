import request from '@/utils/request';
import { OutboundBlacklistForm, OutboundBlacklistImportBatchVO, OutboundBlacklistScope, OutboundBlacklistVO } from './types';

export const listOutboundBlacklists = () => request<OutboundBlacklistVO[]>({ url: '/api/v1/outbound-blacklists', method: 'get' });
export const getOutboundBlacklist = (id: string | number) =>
  request<OutboundBlacklistVO>({ url: `/api/v1/outbound-blacklists/${id}`, method: 'get' });
export const createOutboundBlacklist = (data: OutboundBlacklistForm) =>
  request<string | number>({ url: '/api/v1/outbound-blacklists', method: 'post', data });
export const updateOutboundBlacklist = (id: string | number, data: OutboundBlacklistForm) =>
  request({ url: `/api/v1/outbound-blacklists/${id}`, method: 'put', data });
export const deleteOutboundBlacklist = (id: string | number) => request({ url: `/api/v1/outbound-blacklists/${id}`, method: 'delete' });
export const enableOutboundBlacklist = (id: string | number) => request({ url: `/api/v1/outbound-blacklists/${id}/enable`, method: 'post' });
export const disableOutboundBlacklist = (id: string | number) => request({ url: `/api/v1/outbound-blacklists/${id}/disable`, method: 'post' });
export const previewOutboundBlacklistImport = (scopeType: OutboundBlacklistScope, taskId: string | number | undefined, file: File) => {
  const data = new FormData();
  data.append('scopeType', scopeType);
  if (taskId !== undefined) data.append('taskId', String(taskId));
  data.append('file', file);
  return request<OutboundBlacklistImportBatchVO>({ url: '/api/v1/outbound-blacklists/import-preview', method: 'post', data });
};
export const confirmOutboundBlacklistImport = (batchId: string | number) =>
  request<OutboundBlacklistImportBatchVO>({ url: `/api/v1/outbound-blacklists/import-batches/${batchId}/confirm`, method: 'post' });
