import request from '@/utils/request';
import { AxiosPromise } from 'axios';

export interface HomeScreenKpi {
  label: string;
  value: string;
  extra: string;
  tone?: 'is-up' | 'is-down' | string | null;
}

export interface HomeScreenHeroCore {
  inbound: string;
  inboundExtra: string;
  inboundTone?: 'is-up' | 'is-down' | string | null;
  answerRate: number;
}

export interface HomeScreenAgentStat {
  label: string;
  value: number;
  color: string;
}

export interface HomeScreenAgentSummary {
  total: number;
  items: HomeScreenAgentStat[];
}

export interface HomeScreenQueueRank {
  name: string;
  waiting: number;
  percent: number;
}

export interface HomeScreenSkillRate {
  name: string;
  rate: number;
}

export interface HomeScreenTrendPoint {
  hour: string;
  inbound: number;
  outbound: number;
  answered: number;
}

export interface HomeScreenFeedItem {
  id: string;
  time: string;
  type: string;
  phone: string;
  target: string;
  status: string;
  tagClass: string;
}

export interface HomeScreenTicketSummary {
  open: number;
  processing: number;
  resolved: number;
  closed: number;
}

export interface HomeScreenCustomerRecent {
  id: string;
  name: string;
  phone: string;
  time: string;
}

export interface HomeScreenCustomerSummary {
  todayNew: number;
  total: number;
  unassigned: number;
  recent?: HomeScreenCustomerRecent[];
}

export interface HomeScreenDashboard {
  kpis: HomeScreenKpi[];
  heroCore: HomeScreenHeroCore;
  agentSummary: HomeScreenAgentSummary;
  /** @deprecated kept for backend compat; UI no longer renders */
  queueRanking?: HomeScreenQueueRank[];
  /** @deprecated kept for backend compat; UI no longer renders */
  skillGroups?: HomeScreenSkillRate[];
  trendHours: HomeScreenTrendPoint[];
  liveFeed: HomeScreenFeedItem[];
  ticketSummary?: HomeScreenTicketSummary;
  customerSummary?: HomeScreenCustomerSummary;
}

/** GET /api/v1/callcenter/screen/home/dashboard */
export const getHomeScreenDashboard = (): AxiosPromise<HomeScreenDashboard> => {
  return request({
    url: '/api/v1/callcenter/screen/home/dashboard',
    method: 'get'
  });
};
