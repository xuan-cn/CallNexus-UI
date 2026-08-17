import request from '@/utils/request';
import type { CustomerAssignmentForm, CustomerImportAnalysisVO, CustomerImportResultVO, CustomerImportRowVO, CustomerQuery, CustomerVO } from '@/api/callcenter/customer';

export type ImportTaskStatus = 'ENABLED' | 'DISABLED';
export type DuplicateStrategy = 'SKIP' | 'UPDATE';

export interface CustomerImportTaskVO {
  id: string | number;
  taskCode: string;
  taskName: string;
  description?: string;
  status: ImportTaskStatus;
  duplicateStrategy: DuplicateStrategy;
  formTemplateId?: string | number;
  fieldMappingJson?: string;
  defaultCustomerType?: string;
  defaultSourceChannel?: string;
  defaultTags?: string;
  defaultRemark?: string;
  batchCount: number;
  importedCount: number;
  failedCount: number;
  assignedCount: number;
  unassignedCount: number;
  lastImportTime?: string;
  createTime?: string;
}

export interface CustomerImportTaskForm {
  taskName: string;
  description?: string;
  duplicateStrategy: DuplicateStrategy;
  formTemplateId?: string | number;
  fieldMappingJson?: string;
  defaultCustomerType?: string;
  defaultSourceChannel?: string;
  defaultTags?: string;
  defaultRemark?: string;
}

export interface CustomerImportTaskQuery extends PageQuery {
  taskName?: string;
  status?: ImportTaskStatus | '';
}

export const pageImportTasks = (params: CustomerImportTaskQuery) =>
  request<{ rows: CustomerImportTaskVO[]; total: number }>({ url: '/api/v1/customer-import-tasks', method: 'get', params });

export const getImportTask = (taskId: string | number) =>
  request<CustomerImportTaskVO>({ url: `/api/v1/customer-import-tasks/${taskId}`, method: 'get' });

export const createImportTask = (data: CustomerImportTaskForm) =>
  request<string | number>({ url: '/api/v1/customer-import-tasks', method: 'post', data });

export const updateImportTask = (taskId: string | number, data: CustomerImportTaskForm) =>
  request<void>({ url: `/api/v1/customer-import-tasks/${taskId}`, method: 'put', data });

export const deleteImportTask = (taskId: string | number) =>
  request<void>({ url: `/api/v1/customer-import-tasks/${taskId}`, method: 'delete' });

export const updateImportTaskStatus = (taskId: string | number, status: ImportTaskStatus) =>
  request<void>({ url: `/api/v1/customer-import-tasks/${taskId}/status`, method: 'put', data: { status } });

export const analyzeImportTaskFile = (taskId: string | number, file: File) => {
  const data = new FormData();
  data.append('file', file);
  return request<CustomerImportAnalysisVO>({
    url: `/api/v1/customer-import-tasks/${taskId}/analyze`,
    method: 'post',
    data,
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

export const uploadImportTaskBatch = (taskId: string | number, file: File) => {
  const data = new FormData();
  data.append('file', file);
  return request<CustomerImportResultVO>({
    url: `/api/v1/customer-import-tasks/${taskId}/batches`,
    method: 'post',
    data,
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

export const pageImportTaskBatches = (taskId: string | number, params: PageQuery & { fileName?: string; status?: string }) =>
  request<{ rows: CustomerImportResultVO[]; total: number }>({ url: `/api/v1/customer-import-tasks/${taskId}/batches`, method: 'get', params });

export const pageImportTaskRows = (taskId: string | number, batchId: string | number, params: PageQuery & { status?: string }) =>
  request<{ rows: CustomerImportRowVO[]; total: number }>({
    url: `/api/v1/customer-import-tasks/${taskId}/batches/${batchId}/rows`,
    method: 'get',
    params
  });

export const retryImportTaskRows = (taskId: string | number, batchId: string | number, rowIds?: Array<string | number>) =>
  request<CustomerImportResultVO>({
    url: `/api/v1/customer-import-tasks/${taskId}/batches/${batchId}/retry`,
    method: 'post',
    data: { rowIds: rowIds || [] }
  });

export const pageImportTaskCustomers = (taskId: string | number, params: CustomerQuery) =>
  request<{ rows: CustomerVO[]; total: number }>({ url: `/api/v1/customer-import-tasks/${taskId}/customers`, method: 'get', params });

export const assignImportTaskCustomers = (taskId: string | number, data: CustomerAssignmentForm) =>
  request<void>({ url: `/api/v1/customer-import-tasks/${taskId}/assignments`, method: 'post', data });
