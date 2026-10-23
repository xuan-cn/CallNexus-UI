import request from '@/utils/request';
import type { AxiosPromise } from 'axios';
import type { SipSecurityBlockQuery, SipSecurityBlockVO, SipSecurityEventQuery, SipSecurityEventVO, SipSecurityPolicyVO } from './types';

export const listSipSecurityEvents = (params: SipSecurityEventQuery): AxiosPromise<SipSecurityEventVO[]> =>
  request({ url: '/api/v1/sip-registration-security/events', method: 'get', params });

export const listSipSecurityBlocks = (params: SipSecurityBlockQuery): AxiosPromise<SipSecurityBlockVO[]> =>
  request({ url: '/api/v1/sip-registration-security/blocks', method: 'get', params });

export const releaseSipSecurityBlock = (id: string | number, reason?: string) =>
  request({ url: `/api/v1/sip-registration-security/blocks/${id}/release`, method: 'post', data: { reason } });

export const listSipSecurityPolicies = (): AxiosPromise<SipSecurityPolicyVO[]> =>
  request({ url: '/api/v1/sip-registration-security/policies', method: 'get' });

export const getEffectiveSipSecurityPolicy = (nodeId: string | number): AxiosPromise<SipSecurityPolicyVO> =>
  request({ url: '/api/v1/sip-registration-security/policies/effective', method: 'get', params: { nodeId } });

export const saveSipSecurityPolicy = (data: SipSecurityPolicyVO): AxiosPromise<string | number> =>
  request({ url: '/api/v1/sip-registration-security/policies', method: 'post', data });
