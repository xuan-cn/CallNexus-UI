import request from '@/utils/request';
import type { DynamicFieldFilter } from '@/api/callcenter/form-template/types';

export interface CreateTicketForm {
  customerId?: string | number;
  callerNumber?: string;
  sourceCallId?: string;
  templateId?: string | number;
  urgencyLevelId?: string | number;
  formData: Record<string, unknown>;
}

export interface TicketUrgencyLevelVO {
  id: string | number;
  levelCode: string;
  levelName: string;
  priorityWeight: number;
  tagColor: string;
  isDefault: boolean;
  enabled: boolean;
  sortOrder: number;
  remark?: string;
  version?: number;
  createTime?: string;
}

export type TicketUrgencyLevelForm = Omit<TicketUrgencyLevelVO, 'id' | 'createTime'>;

export interface UpdateTicketDeadlineForm {
  enabled: boolean;
  dueAt?: string;
  remindBeforeMinutes?: number;
}

export type TicketStatus = 'OPEN' | 'PROCESSING' | 'RESOLVED' | 'CLOSED';
export type TicketDeadlineStatus = 'NORMAL' | 'DUE_SOON' | 'OVERDUE' | 'COMPLETED' | 'COMPLETED_OVERDUE' | 'CANCELLED';

export interface TicketVO {
  id: string | number;
  ticketNo: string;
  ticketStatus: TicketStatus;
  urgencyLevelId?: string | number;
  urgencyCode?: string;
  urgencyName?: string;
  urgencyWeight?: number;
  urgencyColor?: string;
  customerId?: string | number;
  callerNumber?: string;
  sourceCallId?: string;
  templateId?: string | number;
  workflowCode?: string;
  processStatus?: string;
  flowInstanceId?: string | number;
  currentNodeCode?: string;
  currentNodeName?: string;
  submittedAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  resolutionLimitMinutes?: number;
  dueAt?: string;
  remindAt?: string;
  deadlineStatus?: TicketDeadlineStatus;
  remainingSeconds?: number;
  createTime: string;
  formData?: Record<string, unknown>;
}

export interface TicketQuery extends PageQuery {
  ticketNo?: string;
  callerNumber?: string;
  ticketStatus?: TicketStatus;
  deadlineStatus?: TicketDeadlineStatus;
  urgencyCode?: string;
  templateId?: string | number;
  dynamicFilters?: DynamicFieldFilter[];
}

export const listTickets = (params: TicketQuery) => request({ url: '/api/v1/tickets', method: 'get', params });

export const searchTickets = (data: TicketQuery) => request({ url: '/api/v1/tickets/search', method: 'post', data });

export const exportTickets = (data: TicketQuery) =>
  request<Blob>({ url: '/api/v1/tickets/export', method: 'post', data, responseType: 'blob' });

export const getTicket = (id: string | number) => request<TicketVO>({ url: `/api/v1/tickets/${id}`, method: 'get' });

export const createTicket = (data: CreateTicketForm) => request({ url: '/api/v1/tickets', method: 'post', data });

export const submitTicket = (id: string | number) => request({ url: `/api/v1/tickets/${id}/submit`, method: 'post' });

export const resolveTicketDirectly = (id: string | number) => request({ url: `/api/v1/tickets/${id}/resolve`, method: 'post' });

export const closeTicket = (id: string | number) => request({ url: `/api/v1/tickets/${id}/close`, method: 'post' });

export const updateTicketDeadline = (id: string | number, data: UpdateTicketDeadlineForm) =>
  request({ url: `/api/v1/tickets/${id}/deadline`, method: 'put', data });

export const updateTicketUrgency = (id: string | number, urgencyLevelId: string | number) =>
  request({ url: `/api/v1/tickets/${id}/urgency`, method: 'put', data: { urgencyLevelId } });

export const listTicketUrgencyLevels = (includeDisabled = false) =>
  request<TicketUrgencyLevelVO[]>({ url: '/api/v1/ticket-urgency-levels', method: 'get', params: { includeDisabled } });

export const createTicketUrgencyLevel = (data: TicketUrgencyLevelForm) =>
  request<string | number>({ url: '/api/v1/ticket-urgency-levels', method: 'post', data });

export const updateTicketUrgencyLevel = (id: string | number, data: TicketUrgencyLevelForm) =>
  request({ url: `/api/v1/ticket-urgency-levels/${id}`, method: 'put', data });

export const deleteTicketUrgencyLevel = (id: string | number) =>
  request({ url: `/api/v1/ticket-urgency-levels/${id}`, method: 'delete' });
