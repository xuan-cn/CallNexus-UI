import request from '@/utils/request';
import { AxiosPromise } from 'axios';
import {
  AiSpeechTaskQuery,
  AiSpeechTaskVO,
  AiSpeechTemplateForm,
  AiSpeechTemplateVO,
  AiCallTranscriptVO,
  AiSpeechProviderForm,
  AiSpeechProviderVO,
  AsrTestVO,
  TtsTestForm,
  TtsTestVO
} from './types';

export const listSpeechProviders = (): AxiosPromise<AiSpeechProviderVO[]> => request({ url: '/api/v1/ai/speech-providers', method: 'get' });

export const createSpeechProvider = (data: AiSpeechProviderForm) => request({ url: '/api/v1/ai/speech-providers', method: 'post', data });

export const updateSpeechProvider = (data: AiSpeechProviderForm) => request({ url: `/api/v1/ai/speech-providers/${data.id}`, method: 'put', data });

export const deleteSpeechProvider = (id: string | number) => request({ url: `/api/v1/ai/speech-providers/${id}`, method: 'delete' });

export const testTtsProvider = (id: string | number, data: TtsTestForm): AxiosPromise<TtsTestVO> =>
  request({ url: `/api/v1/ai/speech-providers/${id}/test`, method: 'post', data });

export const testAsrProvider = (id: string | number, data: FormData): AxiosPromise<AsrTestVO> =>
  request({
    url: `/api/v1/ai/speech-providers/${id}/asr/test`,
    method: 'post',
    data,
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000
  });

export const listSpeechTemplates = (): AxiosPromise<AiSpeechTemplateVO[]> => request({ url: '/api/v1/ai/speech-templates', method: 'get' });

export const createSpeechTemplate = (data: AiSpeechTemplateForm) => request({ url: '/api/v1/ai/speech-templates', method: 'post', data });

export const updateSpeechTemplate = (data: AiSpeechTemplateForm) => request({ url: `/api/v1/ai/speech-templates/${data.id}`, method: 'put', data });

export const deleteSpeechTemplate = (id: string | number) => request({ url: `/api/v1/ai/speech-templates/${id}`, method: 'delete' });

export const listSpeechTasks = (query: AiSpeechTaskQuery): AxiosPromise<AiSpeechTaskVO[]> =>
  request({ url: '/api/v1/ai/speech-tasks', method: 'get', params: query });

export const getCallTranscript = (callSessionId: string | number): AxiosPromise<AiCallTranscriptVO> =>
  request({ url: `/api/v1/ai/call-transcripts/${callSessionId}`, method: 'get' });

export const transcribeCallRecording = (callSessionId: string | number): AxiosPromise<AiCallTranscriptVO> =>
  request({ url: `/api/v1/ai/call-transcripts/${callSessionId}/transcribe`, method: 'post' });
