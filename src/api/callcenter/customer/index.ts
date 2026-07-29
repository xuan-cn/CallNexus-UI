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
  sourceCallId?: string;
  templateId?: string | number;
  formData: Record<string, unknown>;
}

export type CustomerPhoneType = 'MOBILE' | 'HOME' | 'WORK' | 'OTHER';

export interface CustomerPhoneForm {
  phoneNumber: string;
  phoneType?: CustomerPhoneType;
  phoneLabel?: string;
  primaryFlag?: boolean;
  enabled?: boolean;
  sortOrder?: number;
}

export interface CustomerPhoneVO extends CustomerPhoneForm {
  id: string | number;
  normalizedPhone: string;
  primaryFlag: boolean;
  enabled: boolean;
  sortOrder: number;
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
  phones?: CustomerPhoneVO[];
  formData?: Record<string, unknown>;
}

export interface CustomerQuery extends PageQuery {
  primaryPhone?: string;
  customerName?: string;
}

export type CustomerImportStatus = 'IMPORTED' | 'SKIPPED' | 'FAILED';

export interface CustomerImportRowVO {
  rowNumber: number;
  customerName?: string;
  primaryPhone?: string;
  status: CustomerImportStatus;
  message: string;
  customerId?: string | number;
}

export interface CustomerImportResultVO {
  totalCount: number;
  importedCount: number;
  skippedCount: number;
  failedCount: number;
  rows: CustomerImportRowVO[];
}

export const listCustomers = (params: CustomerQuery) => request({ url: '/api/v1/customers', method: 'get', params });

export const getCustomer = (id: string | number) => request<CustomerVO>({ url: `/api/v1/customers/${id}`, method: 'get' });

export const getCustomerByPhone = (primaryPhone: string) =>
  request<CustomerVO | null>({ url: '/api/v1/customers/by-phone', method: 'get', params: { primaryPhone } });

export const createCustomer = (data: CreateCustomerForm) => request({ url: '/api/v1/customers', method: 'post', data });

export const updateCustomer = (id: string | number, data: UpdateCustomerForm) => request({ url: `/api/v1/customers/${id}`, method: 'put', data });

export const listCustomerPhones = (id: string | number) => request<CustomerPhoneVO[]>({ url: `/api/v1/customers/${id}/phones`, method: 'get' });

export const addCustomerPhone = (id: string | number, data: CustomerPhoneForm) =>
  request<string | number>({ url: `/api/v1/customers/${id}/phones`, method: 'post', data });

export const updateCustomerPhone = (id: string | number, phoneId: string | number, data: CustomerPhoneForm) =>
  request<void>({ url: `/api/v1/customers/${id}/phones/${phoneId}`, method: 'put', data });

export const setCustomerPrimaryPhone = (id: string | number, phoneId: string | number) =>
  request<void>({ url: `/api/v1/customers/${id}/phones/${phoneId}/primary`, method: 'put' });

export const deleteCustomerPhone = (id: string | number, phoneId: string | number) =>
  request<void>({ url: `/api/v1/customers/${id}/phones/${phoneId}`, method: 'delete' });

export const listCustomerFollowUps = (id: string | number) =>
  request<CustomerFollowUpVO[]>({ url: `/api/v1/customers/${id}/follow-ups`, method: 'get' });

export const addCustomerFollowUp = (id: string | number, content: string) =>
  request<string | number>({ url: `/api/v1/customers/${id}/follow-ups`, method: 'post', data: { content } });

export const importCustomers = (file: File) => {
  const data = new FormData();
  data.append('file', file);
  return request<CustomerImportResultVO>({
    url: '/api/v1/customers/import',
    method: 'post',
    data,
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};
