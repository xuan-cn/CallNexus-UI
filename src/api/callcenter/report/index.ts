import request from '@/utils/request';
import type { AxiosPromise } from 'axios';
import type { AgentReportVO, CallDetailVO, CallDistributionVO, OverviewKpiVO, QueueReportVO, ReportQuery, ReportTrendPointVO } from './types';

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
export const listAgentReports = (params: ReportQuery): AxiosPromise<AgentReportVO[]> =>
  request({ url: '/api/v1/reports/agents/summary', method: 'get', params });
export const listQueueReports = (params: ReportQuery): AxiosPromise<QueueReportVO[]> =>
  request({ url: '/api/v1/reports/queues/summary', method: 'get', params });
