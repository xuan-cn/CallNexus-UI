import request from '@/utils/request';
import { AxiosPromise } from 'axios';
import { AiGeneratedMediaVO } from '@/api/callcenter/ai-speech/types';
import { AgentForm, AgentPresenceStatus, AgentQuery, AgentVO, AgentWebRtcConfigVO, CurrentAgentVO } from './types';

export const listAgents = (query: AgentQuery): AxiosPromise<AgentVO[]> => request({ url: '/api/v1/agents', method: 'get', params: query });

export const getAgent = (id: string | number): AxiosPromise<AgentVO> => request({ url: `/api/v1/agents/${id}`, method: 'get' });

export const createAgent = (data: AgentForm) => request({ url: '/api/v1/agents', method: 'post', data });

export const updateAgent = (data: AgentForm) => request({ url: `/api/v1/agents/${data.id}`, method: 'put', data });

export const deleteAgent = (id: string | number) => request({ url: `/api/v1/agents/${id}`, method: 'delete' });

export const bindAgentExtension = (id: string | number, sipAccountId: string | number) =>
  request({ url: `/api/v1/agents/${id}/extension`, method: 'put', data: { sipAccountId } });

export const unbindAgentExtension = (id: string | number) => request({ url: `/api/v1/agents/${id}/extension`, method: 'delete' });

export const generateAgentPrompt = (
  id: string | number,
  data: { nodeGroupIds?: Array<string | number>; templateId?: string | number } = {}
): AxiosPromise<AiGeneratedMediaVO> => request({ url: `/api/v1/agents/${id}/prompt/generate`, method: 'post', data });

export const generateAgentPrompts = (data: {
  agentIds?: Array<string | number>;
  agentCode?: string;
  agentName?: string;
  enabled?: boolean;
  onlyMissing?: boolean;
  templateId?: string | number;
  nodeGroupIds?: Array<string | number>;
}): AxiosPromise<number> => request({ url: '/api/v1/agents/prompts/generate', method: 'post', data });

export const getAgentPrompt = (id: string | number): AxiosPromise<AiGeneratedMediaVO> =>
  request({ url: `/api/v1/agents/${id}/prompt`, method: 'get' });

export const getCurrentAgent = (): AxiosPromise<CurrentAgentVO> => request({ url: '/api/v1/agent-session/me', method: 'get' });

export const getCurrentAgentWebRtcConfig = (): AxiosPromise<AgentWebRtcConfigVO> =>
  request({ url: '/api/v1/agent-session/webrtc-config', method: 'get' });

export const signInCurrentAgent = (): AxiosPromise<CurrentAgentVO> => request({ url: '/api/v1/agent-session/sign-in', method: 'put' });

export const changeCurrentAgentStatus = (status: AgentPresenceStatus): AxiosPromise<CurrentAgentVO> =>
  request({ url: '/api/v1/agent-session/status', method: 'put', data: { status }, headers: { repeatSubmit: false } });

export const signOutCurrentAgent = () => request({ url: '/api/v1/agent-session/sign-out', method: 'delete' });
