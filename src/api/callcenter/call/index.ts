import request from '@/utils/request';
import { AxiosPromise } from 'axios';
import {
  CallConferenceInviteForm,
  CallConferenceMuteForm,
  CallConferenceVO,
  CallControlVO,
  CallNoteForm,
  OriginateCallForm,
  SendDtmfForm
} from './types';

export const originateCall = (data: OriginateCallForm): AxiosPromise<CallControlVO> => request({ url: '/api/v1/calls', method: 'post', data });

export const hangupCall = (callId: string) => request({ url: `/api/v1/calls/${callId}`, method: 'delete' });

export const holdCall = (callId: string) => request({ url: `/api/v1/calls/${callId}/hold`, method: 'post' });

export const unholdCall = (callId: string) => request({ url: `/api/v1/calls/${callId}/unhold`, method: 'post' });

export const muteCall = (callId: string) => request({ url: `/api/v1/calls/${callId}/mute`, method: 'post' });

export const unmuteCall = (callId: string) => request({ url: `/api/v1/calls/${callId}/unmute`, method: 'post' });

export const sendCallDtmf = (callId: string, data: SendDtmfForm) => request({ url: `/api/v1/calls/${callId}/dtmf`, method: 'post', data });

export const saveCallNote = (callId: string, data: CallNoteForm) => request({ url: `/api/v1/calls/${callId}/notes`, method: 'post', data });

export const transferCall = (callId: string, targetExtension: string) =>
  request({ url: `/api/v1/calls/${callId}/transfer`, method: 'post', data: { targetExtension } });

export const startConsultTransfer = (callId: string, targetExtension: string, phoneMode?: string): AxiosPromise<CallControlVO> =>
  request({ url: `/api/v1/calls/${callId}/consult-transfer`, method: 'post', data: { targetExtension, phoneMode } });

export const cancelConsultTransfer = (callId: string, phoneMode?: string) =>
  request({ url: `/api/v1/calls/${callId}/consult-transfer/cancel`, method: 'post', data: { phoneMode } });

export const completeConsultTransfer = (callId: string, phoneMode?: string) =>
  request({ url: `/api/v1/calls/${callId}/consult-transfer/complete`, method: 'post', data: { phoneMode } });

export const createCallConference = (callId: string): AxiosPromise<CallConferenceVO> =>
  request({ url: `/api/v1/calls/${callId}/conference`, method: 'post' });

export const getCallConference = (callId: string): AxiosPromise<CallConferenceVO | null> =>
  request({ url: `/api/v1/calls/${callId}/conference`, method: 'get' });

export const inviteCallConferenceMember = (callId: string, data: CallConferenceInviteForm): AxiosPromise<CallConferenceVO> =>
  request({ url: `/api/v1/calls/${callId}/conference/invitations`, method: 'post', data });

export const muteCallConferenceMember = (callId: string, memberId: string, data: CallConferenceMuteForm): AxiosPromise<CallConferenceVO> =>
  request({ url: `/api/v1/calls/${callId}/conference/members/${memberId}/mute`, method: 'post', data });

export const removeCallConferenceMember = (callId: string, memberId: string): AxiosPromise<CallConferenceVO> =>
  request({ url: `/api/v1/calls/${callId}/conference/members/${memberId}`, method: 'delete' });

export const leaveCallConference = (callId: string) => request({ url: `/api/v1/calls/${callId}/conference/leave`, method: 'post' });

export const endCallConference = (callId: string) => request({ url: `/api/v1/calls/${callId}/conference`, method: 'delete' });
