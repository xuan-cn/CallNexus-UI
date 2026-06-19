import request from '@/utils/request';
import { AxiosPromise } from 'axios';
import {
  CallQueueAgentStatusVO,
  CallQueueMonitorOverviewVO,
  CallQueueMonitorVO,
  CallQueueRecentCallVO,
  CallQueueRecentEventVO,
  CallQueueTrendPointVO
} from './types';

export const listCallQueueMonitor = (): AxiosPromise<CallQueueMonitorVO[]> => request({ url: '/api/v1/call-queues/monitor', method: 'get' });

export const getCallQueueMonitorOverview = (): AxiosPromise<CallQueueMonitorOverviewVO> =>
  request({ url: '/api/v1/call-queues/monitor/overview', method: 'get' });

export const getCallQueueMonitor = (queueId: string | number): AxiosPromise<CallQueueMonitorVO> =>
  request({ url: `/api/v1/call-queues/${queueId}/monitor`, method: 'get' });

export const listCallQueueAgents = (queueId: string | number): AxiosPromise<CallQueueAgentStatusVO[]> =>
  request({ url: `/api/v1/call-queues/${queueId}/agents/status`, method: 'get' });

export const listCallQueueTrend = (queueId: string | number, date?: string): AxiosPromise<CallQueueTrendPointVO[]> =>
  request({ url: `/api/v1/call-queues/${queueId}/statistics/trend`, method: 'get', params: { date } });

export const listCallQueueRecentEvents = (queueId: string | number, limit = 20): AxiosPromise<CallQueueRecentEventVO[]> =>
  request({ url: `/api/v1/call-queues/${queueId}/events/recent`, method: 'get', params: { limit } });

export const listCallQueueRecentCalls = (queueId: string | number, limit = 20): AxiosPromise<CallQueueRecentCallVO[]> =>
  request({ url: `/api/v1/call-queues/${queueId}/calls/recent`, method: 'get', params: { limit } });
