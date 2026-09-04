import request from '@/utils/request';
import { AxiosPromise } from 'axios';

export interface HomeBusinessOverview {
  customerTotal: number;
  customerPeriodNew: number;
  customerUnassigned: number;
  ticketTotal: number;
  ticketOpen: number;
  ticketProcessing: number;
  ticketResolved: number;
  ticketClosed: number;
  ticketPeriodNew: number;
  inboundCount: number;
  outboundCount: number;
  answeredCount: number;
  answerRate: number;
  outboundTaskTotal: number;
  outboundTaskCompleted: number;
  outboundCompletionRate: number;
  voicemailPending: number;
}

/** GET /api/v1/callcenter/home/overview */
export const getHomeBusinessOverview = (params?: {
  beginDate?: string;
  endDate?: string;
}): AxiosPromise<HomeBusinessOverview> => {
  return request({
    url: '/api/v1/callcenter/home/overview',
    method: 'get',
    params
  });
};
