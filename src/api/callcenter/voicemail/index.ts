import request from '@/utils/request';
import type { VoiceMailBoxForm, VoiceMailBoxQuery, VoiceMailBoxVO, VoiceMailMessageQuery, VoiceMailMessageVO } from './types';

export const listVoiceMailBoxes = (params?: VoiceMailBoxQuery) =>
  request<TableDataInfo<VoiceMailBoxVO>>({
    url: '/api/v1/voicemail-boxes',
    method: 'get',
    params
  });

export const getVoiceMailBox = (id: string | number) =>
  request<R<VoiceMailBoxVO>>({
    url: `/api/v1/voicemail-boxes/${id}`,
    method: 'get'
  });

export const createVoiceMailBox = (data: VoiceMailBoxForm) =>
  request<R<string | number>>({
    url: '/api/v1/voicemail-boxes',
    method: 'post',
    data
  });

export const updateVoiceMailBox = (data: VoiceMailBoxForm) =>
  request<R<void>>({
    url: `/api/v1/voicemail-boxes/${data.id}`,
    method: 'put',
    data
  });

export const deleteVoiceMailBox = (id: string | number) =>
  request<R<void>>({
    url: `/api/v1/voicemail-boxes/${id}`,
    method: 'delete'
  });

export const listVoiceMailMessages = (params?: VoiceMailMessageQuery) =>
  request<TableDataInfo<VoiceMailMessageVO>>({
    url: '/api/v1/voicemail-messages',
    method: 'get',
    params
  });

export const getVoiceMailMessage = (id: string | number) =>
  request<R<VoiceMailMessageVO>>({
    url: `/api/v1/voicemail-messages/${id}`,
    method: 'get'
  });

export const handleVoiceMailMessage = (id: string | number, data: { status: string; handleRemark?: string }) =>
  request<R<void>>({
    url: `/api/v1/voicemail-messages/${id}/handle`,
    method: 'put',
    data
  });
