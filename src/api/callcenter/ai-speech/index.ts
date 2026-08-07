import request from '@/utils/request';
import { getToken } from '@/utils/auth';
import { AxiosPromise } from 'axios';
import {
  AiSpeechTaskQuery,
  AiSpeechTaskVO,
  AiSpeechTemplateForm,
  AiSpeechTemplateVO,
  AiCallTranscriptVO,
  AiCallTranscriptStreamEvent,
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

export const streamCallTranscript = async (
  callSessionId: string | number,
  onEvent: (event: string, data: AiCallTranscriptStreamEvent) => void,
  signal?: AbortSignal
) => {
  const response = await fetch(`${import.meta.env.VITE_APP_BASE_API}/api/v1/ai/call-transcripts/${callSessionId}/stream`, {
    method: 'GET',
    signal,
    headers: {
      Authorization: `Bearer ${getToken()}`,
      clientid: import.meta.env.VITE_APP_CLIENT_ID,
      Accept: 'text/event-stream'
    }
  });
  if (!response.ok || !response.body) {
    throw new Error(`Transcript stream request failed, HTTP status=${response.status}`);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
    const blocks = buffer.split('\n\n');
    buffer = blocks.pop() || '';
    for (const block of blocks) {
      let event = 'message';
      const dataLines: string[] = [];
      for (const line of block.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
      }
      if (dataLines.length > 0) {
        onEvent(event, JSON.parse(dataLines.join('\n')) as AiCallTranscriptStreamEvent);
      }
    }
  }
};

export const transcribeCallRecording = (callSessionId: string | number): AxiosPromise<AiCallTranscriptVO> =>
  request({ url: `/api/v1/ai/call-transcripts/${callSessionId}/transcribe`, method: 'post' });
