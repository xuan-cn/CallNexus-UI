import request from '@/utils/request';
import { AxiosPromise } from 'axios';
import { FreeSwitchGatewayForm, FreeSwitchGatewayQuery, FreeSwitchGatewayVO } from './types';

export const listFreeSwitchGateways = (query: FreeSwitchGatewayQuery): AxiosPromise<FreeSwitchGatewayVO[]> =>
  request({ url: '/api/v1/freeswitch-gateways', method: 'get', params: query });

export const getFreeSwitchGateway = (id: string | number): AxiosPromise<FreeSwitchGatewayVO> =>
  request({ url: `/api/v1/freeswitch-gateways/${id}`, method: 'get' });

export const createFreeSwitchGateway = (data: FreeSwitchGatewayForm) =>
  request({ url: '/api/v1/freeswitch-gateways', method: 'post', data, headers: { isEncrypt: 'true' } });

export const updateFreeSwitchGateway = (data: FreeSwitchGatewayForm) =>
  request({ url: `/api/v1/freeswitch-gateways/${data.id}`, method: 'put', data, headers: { isEncrypt: 'true' } });

export const deleteFreeSwitchGateway = (id: string | number) => request({ url: `/api/v1/freeswitch-gateways/${id}`, method: 'delete' });
