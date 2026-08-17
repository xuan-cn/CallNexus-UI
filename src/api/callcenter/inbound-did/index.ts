import request from '@/utils/request';
import { AxiosPromise } from 'axios';
import { InboundDidEntryForm, InboundDidEntryQuery, InboundDidEntryVO, InboundRouteMatchResult, InboundRouteTestForm } from './types';

export const listInboundDidEntries = (query: InboundDidEntryQuery): AxiosPromise<InboundDidEntryVO[]> =>
  request({ url: '/api/v1/inbound-did-entries', method: 'get', params: query });

export const getInboundDidEntry = (id: string | number): AxiosPromise<InboundDidEntryVO> =>
  request({ url: `/api/v1/inbound-did-entries/${id}`, method: 'get' });

export const createInboundDidEntry = (data: InboundDidEntryForm) =>
  request({ url: '/api/v1/inbound-did-entries', method: 'post', data });

export const updateInboundDidEntry = (data: InboundDidEntryForm) =>
  request({ url: `/api/v1/inbound-did-entries/${data.id}`, method: 'put', data });

export const deleteInboundDidEntry = (id: string | number) => request({ url: `/api/v1/inbound-did-entries/${id}`, method: 'delete' });

export const testInboundRoute = (data: InboundRouteTestForm): AxiosPromise<InboundRouteMatchResult> =>
  request({ url: '/api/v1/inbound-did-entries/route-test', method: 'post', data });
