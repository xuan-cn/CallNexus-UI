import request from '@/utils/request';
import type { AxiosPromise } from 'axios';

export interface SmsChannel {
  id?: string | number;
  channelName: string;
  supplier: 'ALIBABA' | 'TENCENT';
  sdkAppId: string;
  signature: string;
  enabled: boolean;
  minuteLimit: number;
  dailyLimit: number;
  version?: number;
  keyConfigured?: boolean;
  secretConfigured?: boolean;
  accessKeyId?: string;
  accessKeySecret?: string;
}
export interface SmsVariable {
  key: string;
  source: 'MANUAL' | 'CUSTOMER_NAME' | 'PRIMARY_PHONE';
}
export interface SmsTemplate {
  id?: string | number;
  channelId?: string | number;
  templateName: string;
  providerTemplateId: string;
  content: string;
  variables: SmsVariable[];
  enabled: boolean;
  version?: number;
}
export interface SmsRecord {
  id: string | number;
  customerId?: string | number;
  phone: string;
  channelName: string;
  templateName: string;
  content: string;
  source: string;
  operatorName: string;
  status: string;
  resultCode?: string;
  providerReference?: string;
  createTime: string;
  submittedAt?: string;
}
export interface SmsSend {
  templateId?: string | number;
  phone: string;
  parameters: Record<string, string>;
  requestId: string;
}
export interface SmsPreview {
  templateId: string | number;
  phone: string;
  content: string;
  parameters: Record<string, string>;
}
export interface SmsContext {
  customerName: string;
  primaryPhone: string;
  phones: { phoneNumber: string; normalizedPhone?: string; enabled: boolean }[];
  templates: SmsTemplate[];
}
const root = '/api/v1/sms';
export const smsChannels = (): AxiosPromise<SmsChannel[]> => request({ url: `${root}/channels`, method: 'get' });
export const smsTemplateChannels = (): AxiosPromise<SmsChannel[]> => request({ url: `${root}/template-channels`, method: 'get' });
export const saveSmsChannel = (data: SmsChannel) =>
  request({ url: `${root}/channels${data.id ? `/${data.id}` : ''}`, method: data.id ? 'put' : 'post', data, headers: { isEncrypt: 'true' } });
export const smsTemplates = (): AxiosPromise<SmsTemplate[]> => request({ url: `${root}/templates`, method: 'get' });
export const saveSmsTemplate = (data: SmsTemplate) =>
  request({ url: `${root}/templates${data.id ? `/${data.id}` : ''}`, method: data.id ? 'put' : 'post', data });
export const smsRecords = (params: PageQuery & { phone?: string; status?: string }): AxiosPromise<SmsRecord[]> =>
  request({ url: `${root}/records`, method: 'get', params });
export const smsCustomerContext = (id: string | number): AxiosPromise<SmsContext> => request({ url: `${root}/customers/${id}`, method: 'get' });
export const smsCustomerRecords = (id: string | number, params: PageQuery): AxiosPromise<SmsRecord[]> =>
  request({ url: `${root}/customers/${id}/records`, method: 'get', params });
export const previewCustomerSms = (id: string | number, data: SmsSend): AxiosPromise<SmsPreview> =>
  request({ url: `${root}/customers/${id}/preview`, method: 'post', data });
export const sendCustomerSms = (id: string | number, data: SmsSend) => request({ url: `${root}/customers/${id}/send`, method: 'post', data });
export const smsTestTemplates = (id: string | number): AxiosPromise<SmsTemplate[]> =>
  request({ url: `${root}/channels/${id}/test-templates`, method: 'get' });
export const sendTestSms = (id: string | number, data: SmsSend) => request({ url: `${root}/channels/${id}/test`, method: 'post', data });
export const previewTestSms = (id: string | number, data: SmsSend): AxiosPromise<SmsPreview> =>
  request({ url: `${root}/channels/${id}/test-preview`, method: 'post', data });
export const newSmsRequestId = () => Array.from(crypto.getRandomValues(new Uint32Array(4)), (value) => value.toString(16).padStart(8, '0')).join('');

export const smsStatusLabels: Record<string, string> = {
  QUEUED: '等待提交',
  PROCESSING: '提交中',
  ACCEPTED: '服务商已受理',
  REJECTED: '提交被拒绝',
  UNKNOWN: '结果未知'
};
