import request from '@/utils/request';
import type { AxiosPromise } from 'axios';
import type {
  AgentPresenceLogVO,
  AgentReportVO,
  CallAgentStatisticVO,
  CallDetailVO,
  CallDistributionVO,
  OverviewKpiVO,
  OutboundAttemptDetailVO,
  OutboundReportSummaryVO,
  OutboundTaskReportVO,
  OutboundTrendPointVO,
  QueueReportVO,
  ReportAgentOptionVO,
  ReportQueueOptionVO,
  ReportSkillGroupOptionVO,
  ReportQuery,
  ReportTrendPointVO,
  SatisfactionDetailVO,
  SatisfactionRankingVO,
  SatisfactionScoreDistributionVO,
  SatisfactionSummaryVO,
  SatisfactionTrendPointVO
} from './types';

export const listReportAgentOptions = (): AxiosPromise<ReportAgentOptionVO[]> => request({ url: '/api/v1/reports/agent-options', method: 'get' });
export const listReportQueueOptions = (): AxiosPromise<ReportQueueOptionVO[]> => request({ url: '/api/v1/reports/queue-options', method: 'get' });
export const listReportSkillGroupOptions = (): AxiosPromise<ReportSkillGroupOptionVO[]> =>
  request({ url: '/api/v1/reports/skill-group-options', method: 'get' });

export const getSatisfactionReportSummary = (params: ReportQuery): AxiosPromise<SatisfactionSummaryVO> =>
  request({ url: '/api/v1/reports/satisfaction/summary', method: 'get', params });
export const getSatisfactionReportTrend = (params: ReportQuery): AxiosPromise<SatisfactionTrendPointVO[]> =>
  request({ url: '/api/v1/reports/satisfaction/trend', method: 'get', params });
export const getSatisfactionReportDistribution = (params: ReportQuery): AxiosPromise<SatisfactionScoreDistributionVO[]> =>
  request({ url: '/api/v1/reports/satisfaction/distribution', method: 'get', params });
export const listSatisfactionQueueRankings = (params: ReportQuery): AxiosPromise<SatisfactionRankingVO[]> =>
  request({ url: '/api/v1/reports/satisfaction/queues', method: 'get', params });
export const listSatisfactionAgentRankings = (params: ReportQuery): AxiosPromise<SatisfactionRankingVO[]> =>
  request({ url: '/api/v1/reports/satisfaction/agents', method: 'get', params });
export const listSatisfactionDetails = (params: ReportQuery): AxiosPromise<SatisfactionDetailVO[]> =>
  request({ url: '/api/v1/reports/satisfaction/details', method: 'get', params });

export const getReportOverview = (params: ReportQuery): AxiosPromise<OverviewKpiVO> =>
  request({ url: '/api/v1/reports/overview/kpis', method: 'get', params });
export const getReportOverviewTrend = (params: ReportQuery): AxiosPromise<ReportTrendPointVO[]> =>
  request({ url: '/api/v1/reports/overview/trend', method: 'get', params });
export const getReportOverviewDistribution = (params: ReportQuery): AxiosPromise<CallDistributionVO[]> =>
  request({ url: '/api/v1/reports/overview/distribution', method: 'get', params });
export const getCallReportSummary = (params: ReportQuery): AxiosPromise<OverviewKpiVO> =>
  request({ url: '/api/v1/reports/calls/summary', method: 'get', params });
export const getCallReportTrend = (params: ReportQuery): AxiosPromise<ReportTrendPointVO[]> =>
  request({ url: '/api/v1/reports/calls/trend', method: 'get', params });
export const getCallReportDistribution = (params: ReportQuery): AxiosPromise<CallDistributionVO[]> =>
  request({ url: '/api/v1/reports/calls/distribution', method: 'get', params });
export const listCallReportDetails = (params: ReportQuery): AxiosPromise<CallDetailVO[]> =>
  request({ url: '/api/v1/reports/calls/details', method: 'get', params });
export const listCallReportStatistics = (params: ReportQuery): AxiosPromise<CallAgentStatisticVO[]> =>
  request({ url: '/api/v1/reports/calls/statistics', method: 'get', params });
export const listAgentReports = (params: ReportQuery): AxiosPromise<AgentReportVO[]> =>
  request({ url: '/api/v1/reports/agents/summary', method: 'get', params });
export const listAgentReportPresenceLogs = (agentId: string | number, params: ReportQuery): AxiosPromise<AgentPresenceLogVO[]> =>
  request({ url: `/api/v1/reports/agents/${agentId}/presence-logs`, method: 'get', params });
export const listAgentReportCalls = (agentId: string | number, params: ReportQuery): AxiosPromise<CallDetailVO[]> =>
  request({ url: `/api/v1/reports/agents/${agentId}/calls`, method: 'get', params });
export const listQueueReports = (params: ReportQuery): AxiosPromise<QueueReportVO[]> =>
  request({ url: '/api/v1/reports/queues/summary', method: 'get', params });
export const getOutboundReportSummary = (params: ReportQuery): AxiosPromise<OutboundReportSummaryVO> =>
  request({ url: '/api/v1/reports/outbound/summary', method: 'get', params });
export const getOutboundReportTrend = (params: ReportQuery): AxiosPromise<OutboundTrendPointVO[]> =>
  request({ url: '/api/v1/reports/outbound/trend', method: 'get', params });
export const getOutboundReportDistribution = (params: ReportQuery): AxiosPromise<CallDistributionVO[]> =>
  request({ url: '/api/v1/reports/outbound/distribution', method: 'get', params });
export const listOutboundTaskReports = (params: ReportQuery): AxiosPromise<OutboundTaskReportVO[]> =>
  request({ url: '/api/v1/reports/outbound/tasks', method: 'get', params });
export const listOutboundAttemptDetails = (params: ReportQuery): AxiosPromise<OutboundAttemptDetailVO[]> =>
  request({ url: '/api/v1/reports/outbound/attempts', method: 'get', params });
