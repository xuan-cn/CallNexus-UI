import request from '@/utils/request';

export interface CreateCustomerForm {
  primaryPhone: string;
  customerName?: string;
  templateId?: string | number;
  sourceCallId?: string;
  formData: Record<string, unknown>;
}

export interface UpdateCustomerForm {
  customerName?: string;
  templateId?: string | number;
  formData: Record<string, unknown>;
}

export interface CustomerFollowUpVO {
  id: string | number;
  content: string;
  followUpBy?: string | number;
  followUpByName?: string;
  followUpTime: string;
}

export interface CustomerVO {
  id: string | number;
  primaryPhone: string;
  customerName?: string;
  templateId?: string | number;
  sourceCallId?: string;
  createTime: string;
  formData?: Record<string, unknown>;
}

export interface CustomerQuery extends PageQuery {
  primaryPhone?: string;
  customerName?: string;
}

export const listCustomers = (params: CustomerQuery) => request({ url: '/api/v1/customers', method: 'get', params });

export const getCustomer = (id: string | number) => request<CustomerVO>({ url: `/api/v1/customers/${id}`, method: 'get' });

export const getCustomerByPhone = (primaryPhone: string) =>
  request<CustomerVO | null>({ url: '/api/v1/customers/by-phone', method: 'get', params: { primaryPhone } });

export const createCustomer = (data: CreateCustomerForm) => request({ url: '/api/v1/customers', method: 'post', data });

export const updateCustomer = (id: string | number, data: UpdateCustomerForm) => request({ url: `/api/v1/customers/${id}`, method: 'put', data });

export const listCustomerFollowUps = (id: string | number) =>
  request<CustomerFollowUpVO[]>({ url: `/api/v1/customers/${id}/follow-ups`, method: 'get' });

export const addCustomerFollowUp = (id: string | number, content: string) =>
  request<string | number>({ url: `/api/v1/customers/${id}/follow-ups`, method: 'post', data: { content } });
