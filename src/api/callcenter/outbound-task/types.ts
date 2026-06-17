export type OutboundTaskStatus = 'DRAFT' | 'RUNNING' | 'PAUSED' | 'COMPLETED';
export type OutboundMemberStatus = 'PENDING' | 'CLAIMED' | 'DIALING' | 'COMPLETED' | 'RETRY' | 'SKIPPED' | 'BLOCKED';

export interface OutboundTaskVO {
  id: string | number;
  taskCode: string;
  taskName: string;
  taskType: 'PREVIEW';
  status: OutboundTaskStatus;
  description?: string;
  callerNumberId?: string | number;
  autoRetryEnabled: boolean;
  maxRetryCount: number;
  retryIntervalMinutes: number;
  retryResultCodes: string;
  autoAssignDueRetry: boolean;
  retryAssigneeAgentId?: string | number;
  totalCount: number;
  pendingCount: number;
  completedCount: number;
  dueRetryCount: number;
  lastScheduledAt?: string;
  lastScheduleSummary?: string;
  version?: number;
  createTime?: string;
}

export interface OutboundTaskForm {
  taskCode: string;
  taskName: string;
  description?: string;
  callerNumberId?: string | number;
  autoRetryEnabled: boolean;
  maxRetryCount: number;
  retryIntervalMinutes: number;
  retryResultCodes: string;
  autoAssignDueRetry: boolean;
  retryAssigneeAgentId?: string | number;
  version?: number;
}

export interface OutboundMemberVO {
  id: string | number;
  taskId: string | number;
  customerId: string | number;
  customerName?: string;
  phoneNumber: string;
  sourceType?: 'MANUAL' | 'EXCEL';
  importBatchId?: string | number;
  status: OutboundMemberStatus;
  claimedAgentId?: string | number;
  claimedAt?: string;
  leaseExpiresAt?: string;
  businessCallId?: string;
  attemptCount: number;
  resultCode?: string;
  resultRemark?: string;
  nextFollowUpAt?: string;
  completedAt?: string;
  completionReason?: 'MANUAL' | 'SYSTEM' | 'RETRY_LIMIT_REACHED';
  blockedReason?: string;
  blockedAt?: string;
  blockedBlacklistId?: string | number;
}

export interface OutboundImportRowVO {
  id: string | number;
  rowNumber: number;
  customerName?: string;
  originalPhone?: string;
  normalizedPhone?: string;
  status: 'VALID' | 'INVALID' | 'DUPLICATE_FILE' | 'DUPLICATE_TASK' | 'BLACKLISTED';
  errorMessage?: string;
  customerId?: string | number;
}

export interface OutboundImportBatchVO {
  id: string | number;
  taskId: string | number;
  fileName: string;
  status: 'PREVIEW' | 'IMPORTING' | 'IMPORTED';
  totalCount: number;
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  blacklistedCount: number;
  importedCount: number;
  rows: OutboundImportRowVO[];
}

export interface OutboundTaskStatisticsVO {
  taskId: string | number;
  totalCount: number;
  pendingCount: number;
  claimedCount: number;
  dialingCount: number;
  completedCount: number;
  retryCount: number;
  waitingRetryCount: number;
  retryLimitReachedCount: number;
  blockedCount: number;
  dialedCount: number;
  connectedCount: number;
  totalAttemptCount: number;
  answeredAttemptCount: number;
  completionRate: number;
  connectionRate: number;
  attemptConnectionRate: number;
  resultDistribution: Record<string, number>;
}

export interface AddOutboundMembersResult {
  addedCount: number;
  duplicateCount: number;
  blocked: Array<{ customerId: string | number; customerName?: string; phoneNumber: string; reason?: string; blacklistId: string | number }>;
}

export interface OutboundAttemptVO {
  id: string | number;
  taskId: string | number;
  memberId: string | number;
  customerId: string | number;
  taskName?: string;
  customerName?: string;
  phoneNumber?: string;
  agentId?: string | number;
  userId?: string | number;
  attemptNo: number;
  businessCallId: string;
  status: 'DIALING' | 'ANSWERED' | 'ENDED';
  resultCode?: string;
  resultRemark?: string;
  suggestedResultCode?: CompleteOutboundMemberForm['resultCode'];
  suggestedResultLabel?: string;
  startedAt: string;
  answeredAt?: string;
  endedAt?: string;
  durationSeconds: number;
  billableSeconds: number;
  hangupCause?: string;
  hangupCauseLabel?: string;
}

export interface OutboundAttemptQuery {
  pageNum: number;
  pageSize: number;
  taskId?: string | number;
  agentId?: string | number;
  phoneNumber?: string;
  resultCode?: string;
  suggestedResultCode?: string;
  hangupCause?: string;
  startedAtBegin?: string;
  startedAtEnd?: string;
}

export interface OutboundAgentSummaryVO {
  agentId: string | number;
  agentCode?: string;
  agentName?: string;
  attemptCount: number;
  answeredCount: number;
  connectedCount: number;
  customerCount: number;
  totalDurationSeconds: number;
  billableSeconds: number;
  answerRate: number;
  connectionRate: number;
}

export interface OutboundDailyTrendVO {
  date: string;
  attemptCount: number;
  answeredCount: number;
  connectedCount: number;
  customerCount: number;
  totalDurationSeconds: number;
  billableSeconds: number;
  answerRate: number;
  connectionRate: number;
}

export interface CompleteOutboundMemberForm {
  resultCode: 'CONNECTED' | 'NO_ANSWER' | 'BUSY' | 'INVALID_NUMBER' | 'NOT_INTERESTED' | 'FOLLOW_UP' | 'OTHER';
  resultRemark?: string;
  nextFollowUpAt?: string;
  retry: boolean;
}
