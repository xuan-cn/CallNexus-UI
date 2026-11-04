import request from '@/utils/request';
import { AxiosPromise } from 'axios';
import {
  SipAccountBatchCreateForm,
  SipAccountForm,
  SipAccountQuery,
  SipAccountVO,
  SipRegistrationLockForm,
  SipRegistrationSecuritySummary
} from './types';

export const listSipAccounts = (query: SipAccountQuery): AxiosPromise<SipAccountVO[]> =>
  request({ url: '/api/v1/sip-accounts', method: 'get', params: query });

export const getSipAccount = (id: string | number): AxiosPromise<SipAccountVO> => request({ url: `/api/v1/sip-accounts/${id}`, method: 'get' });

export const getSipAccountPassword = (id: string | number): AxiosPromise<{ password: string }> =>
  request({ url: `/api/v1/sip-accounts/${id}/password`, method: 'get' });

export const createSipAccount = (data: SipAccountForm) =>
  request({ url: '/api/v1/sip-accounts', method: 'post', data, headers: { isEncrypt: 'true' } });

export const batchCreateSipAccounts = (data: SipAccountBatchCreateForm) =>
  request<number>({ url: '/api/v1/sip-accounts/batch', method: 'post', data, headers: { isEncrypt: 'true' } });

export const updateSipAccount = (data: SipAccountForm) =>
  request({ url: `/api/v1/sip-accounts/${data.id}`, method: 'put', data, headers: { isEncrypt: 'true' } });

export const deleteSipAccount = (id: string | number) => request({ url: `/api/v1/sip-accounts/${id}`, method: 'delete' });

export const getSipRegistrationSecuritySummary = (id: string | number): AxiosPromise<SipRegistrationSecuritySummary> =>
  request({ url: `/api/v1/sip-accounts/${id}/security-summary`, method: 'get' });

export const lockSipAccount = (id: string | number, data: SipRegistrationLockForm) =>
  request({ url: `/api/v1/sip-accounts/${id}/security-lock`, method: 'post', data });

export const unlockSipAccount = (id: string | number, data: SipRegistrationLockForm) =>
  request({ url: `/api/v1/sip-accounts/${id}/security-unlock`, method: 'post', data });
