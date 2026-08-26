import request from '@/utils/request';

export interface CreateTicketForm {
  customerId?: string | number;
  callerNumber?: string;
  sourceCallId?: string;
  templateId?: string | number;
  formData: Record<string, unknown>;
}

export type TicketStatus = 'OPEN' | 'PROCESSING' | 'RESOLVED' | 'CLOSED';

export interface TicketVO {
  id: string | number;
  ticketNo: string;
  ticketStatus: TicketStatus;
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
  createTime: string;
  formData?: Record<string, unknown>;
}

export interface TicketQuery extends PageQuery {
  ticketNo?: string;
  callerNumber?: string;
  ticketStatus?: TicketStatus;
}

export const listTickets = (params: TicketQuery) => request({ url: '/api/v1/tickets', method: 'get', params });

export const getTicket = (id: string | number) => request<TicketVO>({ url: `/api/v1/tickets/${id}`, method: 'get' });

export const createTicket = (data: CreateTicketForm) => request({ url: '/api/v1/tickets', method: 'post', data });

export const submitTicket = (id: string | number) => request({ url: `/api/v1/tickets/${id}/submit`, method: 'post' });

export const resolveTicketDirectly = (id: string | number) => request({ url: `/api/v1/tickets/${id}/resolve`, method: 'post' });

export const closeTicket = (id: string | number) => request({ url: `/api/v1/tickets/${id}/close`, method: 'post' });
