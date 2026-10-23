import request from '@/utils/request';
import type {
  ClickDialCallVO,
  ClickDialCustomerQuery,
  ClickDialCustomerVO,
  ClickDialSummaryVO,
  CompleteClickDialForm,
  CustomerDialAttemptVO
} from './types';

const baseUrl = '/api/v1/click-dial';

export const pageClickDialCustomers = (params: ClickDialCustomerQuery) =>
  request<ClickDialCustomerVO[]>({ url: `${baseUrl}/customers`, method: 'get', params });
export const getClickDialSummary = () => request<ClickDialSummaryVO>({ url: `${baseUrl}/summary`, method: 'get' });
export const dialAssignedCustomer = (assignmentId: string | number, phoneId?: string | number) =>
  request<ClickDialCallVO>({ url: `${baseUrl}/assignments/${assignmentId}/dial`, method: 'post', data: { phoneId } });
export const completeClickDialCustomer = (assignmentId: string | number, data: CompleteClickDialForm) =>
  request<void>({ url: `${baseUrl}/assignments/${assignmentId}/result`, method: 'put', data });
export const listCustomerDialAttempts = (assignmentId: string | number) =>
  request<CustomerDialAttemptVO[]>({ url: `${baseUrl}/assignments/${assignmentId}/attempts`, method: 'get' });
