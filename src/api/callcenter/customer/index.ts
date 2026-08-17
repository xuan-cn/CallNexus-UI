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
  assignmentId?: string | number;
  customerType?: string;
  sourceChannel?: string;
  tags?: string;
  skillGroupId?: string | number;
  agentId?: string | number;
  assignmentSource?: string;
  importBatchId?: string | number;
  importTaskId?: string | number;
  assignmentRemark?: string;
}

export interface CustomerQuery extends PageQuery {
  primaryPhone?: string;
  customerName?: string;
  customerType?: string;
  sourceChannel?: string;
  tags?: string;
  skillGroupId?: string | number;
  agentId?: string | number;
    importBatchId?: string | number;
    importTaskId?: string | number;
  assignmentState?: 'ASSIGNED' | 'UNASSIGNED' | '';
}

export interface CustomerAssignmentForm {
    customerIds: Array<string | number>;
    selectAll?: boolean;
    selectionQuery?: CustomerQuery;
  customerType?: string;
  sourceChannel?: string;
  tags?: string;
  skillGroupId?: string | number;
  agentId?: string | number;
  remark?: string;
}

export interface CustomerImportBatchQuery extends PageQuery {
  fileName?: string;
  status?: CustomerImportBatchStatus | '';
}

export type CustomerImportStatus = 'IMPORTED' | 'SKIPPED' | 'FAILED';
export type CustomerImportBatchStatus = 'PENDING' | 'IMPORTING' | 'PROCESSING' | 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILED';

export interface CustomerImportRowVO {
  id?: string | number;
  rowNumber: number;
  customerName?: string;
  primaryPhone?: string;
  originalPhone?: string;
  normalizedPhone?: string;
  customerType?: string;
  sourceChannel?: string;
  tags?: string;
  skillGroupId?: string | number;
  agentId?: string | number;
  status: CustomerImportStatus;
  message?: string;
  errorMessage?: string;
  customerId?: string | number;
}

export interface CustomerImportResultVO {
  batchId?: string | number;
  fileName?: string;
  status?: CustomerImportBatchStatus;
  createTime?: string;
  finishedAt?: string;
  duplicateStrategy?: string;
  defaultCustomerType?: string;
  defaultSourceChannel?: string;
  defaultTags?: string;
  defaultSkillGroupId?: string | number;
  defaultAgentId?: string | number;
  defaultRemark?: string;
  totalCount: number;
  importedCount: number;
  skippedCount: number;
  failedCount: number;
  failureReason?: string;
  rows: CustomerImportRowVO[];
}

export interface CustomerImportForm {
  duplicateStrategy?: 'SKIP' | 'UPDATE_ASSIGNMENT';
  defaultCustomerType?: string;
  defaultSourceChannel?: string;
  defaultTags?: string;
  defaultSkillGroupId?: string | number;
  defaultAgentId?: string | number;
  defaultRemark?: string;
  formTemplateId?: string | number;
  fieldMappingJson?: string;
  assignmentRulesJson?: string;
}

export interface CustomerImportRowUpdateForm {
  customerName?: string;
  originalPhone?: string;
  customerType?: string;
  sourceChannel?: string;
  tags?: string;
  skillGroupId?: string | number;
  agentId?: string | number;
}

export interface CustomerImportRetryForm {
  rowIds?: Array<string | number>;
}

export interface CustomerImportAnalysisColumn {
  header: string;
  suggestedField?: string;
}

export interface CustomerImportAnalysisVO {
  fileName?: string;
  totalRows: number;
  columns: CustomerImportAnalysisColumn[];
  sampleRows: Record<string, string>[];
}

export const listCustomers = (params: CustomerQuery) => request({ url: '/api/v1/customers', method: 'get', params });

export const getCustomer = (id: string | number) => request<CustomerVO>({ url: `/api/v1/customers/${id}`, method: 'get' });

export const getCustomerByPhone = (primaryPhone: string) =>
  request<CustomerVO | null>({ url: '/api/v1/customers/by-phone', method: 'get', params: { primaryPhone } });

export const createCustomer = (data: CreateCustomerForm) => request({ url: '/api/v1/customers', method: 'post', data });

export const assignCustomers = (data: CustomerAssignmentForm) => request<void>({ url: '/api/v1/customers/assignments', method: 'post', data });

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

export const importCustomersWithOptions = (file: File, form: CustomerImportForm) => {
  const data = new FormData();
  data.append('file', file);
  Object.entries(form || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && `${value}`.trim() !== '') {
      data.append(key, `${value}`);
    }
  });
  return request<CustomerImportResultVO>({
    url: '/api/v1/customers/import/preview',
    method: 'post',
    data,
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

export const startCustomerImport = (file: File, form: CustomerImportForm) => {
  const data = new FormData();
  data.append('file', file);
  Object.entries(form || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && `${value}`.trim() !== '') {
      data.append(key, `${value}`);
    }
  });
  return request<CustomerImportResultVO>({
    url: '/api/v1/customers/import/start',
    method: 'post',
    data,
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

export const pageCustomerImportBatches = (params: CustomerImportBatchQuery) =>
  request<{ rows: CustomerImportResultVO[]; total: number }>({ url: '/api/v1/customers/import-batches', method: 'get', params });

export const listCustomerImportBatches = () => request<CustomerImportResultVO[]>({ url: '/api/v1/customers/import-batches/recent', method: 'get' });

export const getCustomerImportBatch = (batchId: string | number) =>
  request<CustomerImportResultVO>({ url: `/api/v1/customers/import-batches/${batchId}`, method: 'get' });

export const updateCustomerImportRow = (batchId: string | number, rowId: string | number, data: CustomerImportRowUpdateForm) =>
  request<CustomerImportResultVO>({ url: `/api/v1/customers/import-batches/${batchId}/rows/${rowId}`, method: 'put', data });

export const retryCustomerImportRows = (batchId: string | number, data: CustomerImportRetryForm = {}) =>
  request<CustomerImportResultVO>({ url: `/api/v1/customers/import-batches/${batchId}/retry`, method: 'post', data });

export const analyzeCustomerImportFile = (file: File) => {
  const data = new FormData();
  data.append('file', file);
  return request<CustomerImportAnalysisVO>({
    url: '/api/v1/customers/import/analyze',
    method: 'post',
    data,
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};
