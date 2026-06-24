import request from '@/utils/request';
import { AxiosPromise } from 'axios';
import {
  AiSpeechTaskQuery,
  AiSpeechTaskVO,
  AiSpeechTemplateForm,
  AiSpeechTemplateVO,
  AiTtsProviderForm,
  AiTtsProviderVO,
  TtsTestForm,
  TtsTestVO
} from './types';

export const listTtsProviders = (): AxiosPromise<AiTtsProviderVO[]> =>
  request({ url: '/api/v1/ai/tts-providers', method: 'get' });

export const createTtsProvider = (data: AiTtsProviderForm) => request({ url: '/api/v1/ai/tts-providers', method: 'post', data });

export const updateTtsProvider = (data: AiTtsProviderForm) => request({ url: `/api/v1/ai/tts-providers/${data.id}`, method: 'put', data });

export const deleteTtsProvider = (id: string | number) => request({ url: `/api/v1/ai/tts-providers/${id}`, method: 'delete' });

export const testTtsProvider = (id: string | number, data: TtsTestForm): AxiosPromise<TtsTestVO> =>
  request({ url: `/api/v1/ai/tts-providers/${id}/test`, method: 'post', data });

export const listSpeechTemplates = (): AxiosPromise<AiSpeechTemplateVO[]> =>
  request({ url: '/api/v1/ai/speech-templates', method: 'get' });

export const createSpeechTemplate = (data: AiSpeechTemplateForm) => request({ url: '/api/v1/ai/speech-templates', method: 'post', data });

export const updateSpeechTemplate = (data: AiSpeechTemplateForm) =>
  request({ url: `/api/v1/ai/speech-templates/${data.id}`, method: 'put', data });

export const deleteSpeechTemplate = (id: string | number) => request({ url: `/api/v1/ai/speech-templates/${id}`, method: 'delete' });

export const listSpeechTasks = (query: AiSpeechTaskQuery): AxiosPromise<AiSpeechTaskVO[]> =>
  request({ url: '/api/v1/ai/speech-tasks', method: 'get', params: query });
