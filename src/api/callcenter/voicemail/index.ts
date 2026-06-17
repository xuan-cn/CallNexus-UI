import request from '@/utils/request';
import type { AxiosPromise } from 'axios';
import type { VoiceMailBoxForm, VoiceMailBoxQuery, VoiceMailBoxVO, VoiceMailMessageQuery, VoiceMailMessageVO } from './types';

export const listVoiceMailBoxes = (params?: VoiceMailBoxQuery): AxiosPromise<VoiceMailBoxVO[]> =>
  request({
    url: '/api/v1/voicemail-boxes',
    method: 'get',
    params
  });

export const getVoiceMailBox = (id: string | number): AxiosPromise<VoiceMailBoxVO> =>
  request({
    url: `/api/v1/voicemail-boxes/${id}`,
    method: 'get'
  });

export const createVoiceMailBox = (data: VoiceMailBoxForm) =>
  request({
    url: '/api/v1/voicemail-boxes',
    method: 'post',
    data
  });

export const updateVoiceMailBox = (data: VoiceMailBoxForm) =>
  request({
    url: `/api/v1/voicemail-boxes/${data.id}`,
    method: 'put',
    data
  });

export const deleteVoiceMailBox = (id: string | number) =>
  request({
    url: `/api/v1/voicemail-boxes/${id}`,
    method: 'delete'
  });

export const listVoiceMailMessages = (params?: VoiceMailMessageQuery): AxiosPromise<VoiceMailMessageVO[]> =>
  request({
    url: '/api/v1/voicemail-messages',
    method: 'get',
    params
  });

export const getVoiceMailMessage = (id: string | number): AxiosPromise<VoiceMailMessageVO> =>
  request({
    url: `/api/v1/voicemail-messages/${id}`,
    method: 'get'
  });

export const handleVoiceMailMessage = (id: string | number, data: { status: string; handleRemark?: string }) =>
  request({
    url: `/api/v1/voicemail-messages/${id}/handle`,
    method: 'put',
    data
  });
