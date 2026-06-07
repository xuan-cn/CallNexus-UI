import request from '@/utils/request';
import { AxiosPromise } from 'axios';
import { SipAccountForm, SipAccountQuery, SipAccountVO } from './types';

export const listSipAccounts = (query: SipAccountQuery): AxiosPromise<SipAccountVO[]> =>
  request({ url: '/api/v1/sip-accounts', method: 'get', params: query });

export const getSipAccount = (id: string | number): AxiosPromise<SipAccountVO> => request({ url: `/api/v1/sip-accounts/${id}`, method: 'get' });

export const createSipAccount = (data: SipAccountForm) =>
  request({ url: '/api/v1/sip-accounts', method: 'post', data, headers: { isEncrypt: 'true' } });

export const updateSipAccount = (data: SipAccountForm) =>
  request({ url: `/api/v1/sip-accounts/${data.id}`, method: 'put', data, headers: { isEncrypt: 'true' } });

export const deleteSipAccount = (id: string | number) => request({ url: `/api/v1/sip-accounts/${id}`, method: 'delete' });
