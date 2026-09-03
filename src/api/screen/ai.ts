import request from '@/utils/request';
import { AxiosPromise } from 'axios';

/** AI 话务大屏聚合数据（与后端 AiScreenDashboardResponse 对齐） */
export interface AiScreenKpi {
  label: string;
  value: string;
  extra: string;
  tone?: 'is-up' | 'is-down' | string | null;
}

export interface AiScreenHeroCore {
  resolve: number;
  transfer: number;
  failRate: number;
  inbound: number;
  avgConfidence: number;
}

export interface AiScreenHeroExtras {
  faqPending: number;
  todaySessions: number;
  activeAgents: number;
}

export interface AiScreenOutcome {
  label: string;
  value: number;
  color: string;
}

export interface AiScreenIntentRank {
  name: string;
  count: number;
  percent: number;
}

export interface AiScreenFeedItem {
  id: string;
  time: string;
  intent: string;
  reason: string;
  status: string;
  tagClass: string;
}

export interface AiScreenTrafficPoint {
  hour: string;
  ai: number;
  human: number;
  resolved: number;
}

export interface AiScreenLatencyPoint {
  hour: string;
  asr: number;
  tts: number;
}

export interface AiScreenDashboard {
  kpis: AiScreenKpi[];
  heroCore: AiScreenHeroCore;
  heroExtras: AiScreenHeroExtras;
  outcomes: AiScreenOutcome[];
  intentRanking: AiScreenIntentRank[];
  feed: AiScreenFeedItem[];
  trafficTrend: AiScreenTrafficPoint[];
  latencyTrend: AiScreenLatencyPoint[];
}

/** GET /api/v1/ai/screen/dashboard */
export const getAiScreenDashboard = (): AxiosPromise<AiScreenDashboard> => {
  return request({
    url: '/api/v1/ai/screen/dashboard',
    method: 'get'
  });
};
