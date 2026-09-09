import request from '@/utils/request';
import { AxiosPromise } from 'axios';
import type {
  AgentMonitorCallVO,
  AgentMonitorOverviewVO,
  AgentMonitorPresenceLogVO,
  AgentMonitorQuery,
  AgentMonitorSkillGroupVO,
  AgentMonitorVO
} from './types';

export const getAgentMonitorOverview = (params?: Pick<AgentMonitorQuery, 'beginDate' | 'endDate'>): AxiosPromise<AgentMonitorOverviewVO> =>
  request({ url: '/api/v1/agent-monitor/overview', method: 'get', params });

export const listAgentMonitorSkillGroups = (): AxiosPromise<AgentMonitorSkillGroupVO[]> =>
  request({ url: '/api/v1/agent-monitor/skill-groups', method: 'get' });

export const listAgentMonitor = (params: AgentMonitorQuery): AxiosPromise<AgentMonitorVO[]> =>
  request({ url: '/api/v1/agent-monitor/agents', method: 'get', params });

export const listAgentMonitorCalls = (agentId: string | number, params: PageQuery): AxiosPromise<AgentMonitorCallVO[]> =>
  request({ url: `/api/v1/agent-monitor/agents/${agentId}/calls`, method: 'get', params });

export const listAgentMonitorPresenceLogs = (
  agentId: string | number,
  params: PageQuery & Pick<AgentMonitorQuery, 'beginDate' | 'endDate'>
): AxiosPromise<AgentMonitorPresenceLogVO[]> =>
  request({ url: `/api/v1/agent-monitor/agents/${agentId}/presence-logs`, method: 'get', params });
