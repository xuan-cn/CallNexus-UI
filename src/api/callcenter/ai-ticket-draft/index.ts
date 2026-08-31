import request from '@/utils/request';

export type AiTicketDraftStatus = 'GENERATING' | 'PENDING_REVIEW' | 'LOW_CONFIDENCE' | 'CREATED' | 'REJECTED' | 'FAILED';
export interface AiTicketDraftVO {
  id: string | number;
  aiAgentId: string | number;
  sourceCallId: string;
  customerId?: string | number;
  callerNumber?: string;
  ticketTemplateId: string | number;
  status: AiTicketDraftStatus;
  confidence?: number;
  title?: string;
  summary?: string;
  formData: Record<string, any>;
  missingFields: string[];
  evidence: Array<Record<string, any>>;
  conversation?: string;
  recordingOssId?: string | number;
  recordingFileName?: string;
  failureReason?: string;
  formalTicketId?: string | number;
  version: number;
  createTime: string;
}
export interface AiTicketDraftQuery extends PageQuery { status?: string; callerNumber?: string; aiAgentId?: string | number }
export interface AiTicketDraftBatchItem { id: string | number; version: number }
export interface AiTicketDraftBatchResultItem { draftId: string | number; success: boolean; ticketId?: string | number; message: string }
export interface AiTicketDraftBatchResult { total: number; success: number; failed: number; items: AiTicketDraftBatchResultItem[] }
export const listAiTicketDrafts = (params: AiTicketDraftQuery) => request({ url: '/api/v1/ai-ticket-drafts', method: 'get', params });
export const getAiTicketDraft = (id: string | number) => request<AiTicketDraftVO>({ url: `/api/v1/ai-ticket-drafts/${id}`, method: 'get' });
export const updateAiTicketDraft = (id: string | number, data: Pick<AiTicketDraftVO, 'version' | 'title' | 'summary' | 'formData'>) =>
  request({ url: `/api/v1/ai-ticket-drafts/${id}`, method: 'put', data });
export const approveAiTicketDraft = (id: string | number, version: number) =>
  request<string | number>({ url: `/api/v1/ai-ticket-drafts/${id}/approve`, method: 'post', data: { version } });
export const rejectAiTicketDraft = (id: string | number, version: number, reason: string) =>
  request({ url: `/api/v1/ai-ticket-drafts/${id}/reject`, method: 'post', data: { version, reason } });
export const batchApproveAiTicketDrafts = (items: AiTicketDraftBatchItem[], reason?: string) =>
  request<AiTicketDraftBatchResult>({ url: '/api/v1/ai-ticket-drafts/batch-approve', method: 'post', data: { items, reason } });
export const batchRejectAiTicketDrafts = (items: AiTicketDraftBatchItem[], reason: string) =>
  request<AiTicketDraftBatchResult>({ url: '/api/v1/ai-ticket-drafts/batch-reject', method: 'post', data: { items, reason } });
export const regenerateAiTicketDraft = (id: string | number, version: number) =>
  request({ url: `/api/v1/ai-ticket-drafts/${id}/regenerate`, method: 'post', data: { version } });
