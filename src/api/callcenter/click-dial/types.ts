import type { CustomerPhoneVO } from '@/api/callcenter/customer';

export type ClickDialWorkFilter = 'UNCALLED' | 'DIALED' | 'PROCESSING' | 'FOLLOW_UP' | 'DUE_FOLLOW_UP' | 'COMPLETED' | 'ALL';
export type ClickDialStatus = 'UNCALLED' | 'PROCESSING' | 'FOLLOW_UP' | 'COMPLETED';
export type ClickDialResultCode = 'CONNECTED' | 'NO_ANSWER' | 'BUSY' | 'INVALID_NUMBER' | 'NOT_INTERESTED' | 'FOLLOW_UP' | 'OTHER';

export interface ClickDialCustomerQuery extends PageQuery {
  keyword?: string;
  customerType?: string;
  sourceChannel?: string;
  tags?: string;
  skillGroupId?: string | number;
  workFilter?: ClickDialWorkFilter;
  resultCode?: ClickDialResultCode | '';
  lastCalledStart?: string;
  lastCalledEnd?: string;
  followUpStart?: string;
  followUpEnd?: string;
}

export interface ClickDialCustomerVO {
  assignmentId: string | number;
  customerId: string | number;
  customerName?: string;
  primaryPhone?: string;
  templateId?: string | number;
  customerType?: string;
  sourceChannel?: string;
  tags?: string;
  skillGroupId?: string | number;
  assignmentRemark?: string;
  assignedAt?: string;
  dialStatus: ClickDialStatus;
  attemptCount: number;
  lastCalledAt?: string;
  lastBusinessCallId?: string;
  lastResultCode?: ClickDialResultCode;
  lastResultRemark?: string;
  nextFollowUpAt?: string;
  completedAt?: string;
  phones?: CustomerPhoneVO[];
}

export interface ClickDialSummaryVO {
  totalCount: number;
  uncalledCount: number;
  processingCount: number;
  followUpCount: number;
  dueFollowUpCount: number;
  completedCount: number;
  dialedCount: number;
}

export interface ClickDialCallVO {
  attemptId: string | number;
  assignmentId: string | number;
  businessCallId: string;
  frontendCallId: string;
  phoneNumber: string;
  status: string;
}

export interface CompleteClickDialForm {
  businessCallId: string;
  resultCode: ClickDialResultCode;
  dialStatus: Exclude<ClickDialStatus, 'UNCALLED'>;
  resultRemark?: string;
  nextFollowUpAt?: string;
}

export interface CustomerDialAttemptVO {
  id: string | number;
  phoneNumber: string;
  attemptNo: number;
  businessCallId: string;
  status: string;
  resultCode?: ClickDialResultCode;
  resultRemark?: string;
  suggestedResultCode?: ClickDialResultCode;
  startedAt: string;
  answeredAt?: string;
  endedAt?: string;
  durationSeconds: number;
  billableSeconds: number;
  hangupCause?: string;
}
