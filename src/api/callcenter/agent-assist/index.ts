import request from '@/utils/request';
import { getToken } from '@/utils/auth';
import type { AxiosPromise } from 'axios';
import type { AgentAssistDetailVO, AgentAssistStreamEvent } from './types';

const root = '/api/v1/calls';

export const getAgentAssist = (businessCallId: string): AxiosPromise<AgentAssistDetailVO> =>
  request({ url: `${root}/${businessCallId}/agent-assist`, method: 'get' });

export const regenerateAgentAssistSuggestion = (businessCallId: string, suggestionId: string | number) =>
  request({ url: `${root}/${businessCallId}/agent-assist/suggestions/${suggestionId}/regenerate`, method: 'post' });

export const streamAgentAssist = async (
  businessCallId: string,
  onEvent: (event: string, data: AgentAssistStreamEvent) => void,
  signal?: AbortSignal
) => {
  const response = await fetch(`${import.meta.env.VITE_APP_BASE_API}${root}/${businessCallId}/agent-assist/stream`, {
    method: 'GET',
    signal,
    headers: {
      Authorization: `Bearer ${getToken()}`,
      clientid: import.meta.env.VITE_APP_CLIENT_ID,
      Accept: 'text/event-stream'
    }
  });
  if (!response.ok || !response.body) throw new Error(`Agent assist stream request failed, HTTP status=${response.status}`);
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
      if (dataLines.length) onEvent(event, JSON.parse(dataLines.join('\n')) as AgentAssistStreamEvent);
    }
  }
};
