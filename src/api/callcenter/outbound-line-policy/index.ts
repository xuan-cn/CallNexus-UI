import request from '@/utils/request';
import { AxiosPromise } from 'axios';
import { OutboundLinePolicyForm, OutboundLinePolicyQuery, OutboundLinePolicyVO } from './types';

export const listOutboundLinePolicies = (query?: OutboundLinePolicyQuery): AxiosPromise<OutboundLinePolicyVO[]> =>
  request({ url: '/api/v1/outbound-line-policies', method: 'get', params: query });

export const getOutboundLinePolicy = (id: string | number): AxiosPromise<OutboundLinePolicyVO> =>
  request({ url: `/api/v1/outbound-line-policies/${id}`, method: 'get' });

export const createOutboundLinePolicy = (data: OutboundLinePolicyForm) =>
  request({ url: '/api/v1/outbound-line-policies', method: 'post', data });

export const updateOutboundLinePolicy = (data: OutboundLinePolicyForm) =>
  request({ url: `/api/v1/outbound-line-policies/${data.id}`, method: 'put', data });

export const deleteOutboundLinePolicy = (id: string | number) =>
  request({ url: `/api/v1/outbound-line-policies/${id}`, method: 'delete' });
