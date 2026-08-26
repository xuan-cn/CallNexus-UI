export type AutoOutboundStatus = 'DRAFT' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'STOPPED';
export type AutoOutboundDialMode = 'AGENTLESS_AI' | 'AGENTLESS_IVR' | 'PROGRESSIVE';
export type AutoOutboundTargetType = 'AI_AGENT' | 'IVR_FLOW' | 'SKILL_GROUP';
export type AutoOutboundRetryResult = 'NO_ANSWER' | 'BUSY' | 'FAILED' | 'OTHER';

export interface AutoOutboundCallWindow {
  id?: string | number;
  weekdays: number[];
  startTime: string;
  endTime: string;
  enabled: boolean;
  sortOrder?: number;
}

export interface AutoOutboundRetryRule {
  id?: string | number;
  resultCode: AutoOutboundRetryResult;
  retryEnabled: boolean;
  maxRetryCount: number;
  retryIntervalMinutes: number;
  sortOrder?: number;
}

export interface AutoOutboundTaskForm {
  taskCode: string;
  taskName: string;
  description?: string;
  nodeId?: string | number;
  callerNumberId?: string | number;
  outboundLinePolicyId?: string | number;
  dialMode: AutoOutboundDialMode;
  targetType: AutoOutboundTargetType;
  targetId?: string | number;
  skillGroupId?: string | number;
  concurrencyLimit: number;
  callsPerMinute: number;
  maxCallsPerDay: number;
  maxCallsTotal: number;
  minCallIntervalMinutes: number;
  scheduleTimezone: string;
  resultWritebackEnabled: boolean;
  connectedTag?: string;
  failedTag?: string;
  callWindows: AutoOutboundCallWindow[];
  retryRules: AutoOutboundRetryRule[];
  version?: number;
}

export interface AutoOutboundTaskVO extends AutoOutboundTaskForm {
  id: string | number;
  taskType: 'AUTO';
  status: AutoOutboundStatus;
  totalCount: number;
  pendingCount: number;
  completedCount: number;
  activeCount: number;
  lastScheduledAt?: string;
  lastScheduleSummary?: string;
  createTime?: string;
}

export interface AutoOutboundSourceForm {
  importTaskId?: string | number;
  importBatchId?: string | number;
  customerType?: string;
  tags?: string;
  skillGroupId?: string | number;
  agentId?: string | number;
  assignmentState: 'ALL' | 'ASSIGNED' | 'UNASSIGNED';
  phoneStrategy: 'PRIMARY_ONLY' | 'PRIMARY_OR_FIRST' | 'LABEL_OR_PRIMARY';
  phoneLabel?: string;
  enabled: boolean;
}

export interface AutoOutboundSourceVO extends AutoOutboundSourceForm {
  id: string | number;
  taskId: string | number;
  importTaskId: string | number;
  importTaskName: string;
  filterSummary?: string;
  createTime?: string;
}

export interface AutoOutboundMaterializeVO {
  sourceCount: number;
  candidateCount: number;
  addedCount: number;
  duplicateCount: number;
  invalidPhoneCount: number;
  blacklistedCount: number;
}

export interface AutoOutboundMemberVO {
  id: string | number;
  customerId: string | number;
  customerName?: string;
  phoneNumber: string;
  customerPhoneId?: string | number;
  phoneLabel?: string;
  sourceId?: string | number;
  sourceImportTaskId?: string | number;
  sourceImportBatchId?: string | number;
  status: string;
  attemptCount: number;
  blockedReason?: string;
  lastResultCode?: string;
  lastResultLabel?: string;
  lastResultRemark?: string;
  failureCategory?: string;
  failureCategoryLabel?: string;
  retryable?: boolean;
  lastAttemptAt?: string;
  createTime?: string;
}

export interface AutoOutboundMonitorVO {
  taskId: string | number;
  taskStatus: AutoOutboundStatus;
  pendingCount: number;
  scheduledCount: number;
  processingCount: number;
  dialingCount: number;
  completedCount: number;
  activeConcurrency: number;
  queuedCount: number;
  todayCallCount: number;
  todayAnsweredCount: number;
  todayAnswerRate: number;
  failureMetrics: Array<{ category: string; categoryLabel: string; count: number; retryable: boolean }>;
  schedulerOwner?: string;
  schedulerLeaseUntil?: string;
  schedulerHeartbeatAt?: string;
  lastScheduledAt?: string;
  lastScheduleSummary?: string;
}

export interface AutoOutboundSchedulerResultVO {
  tenantCount: number;
  scannedTaskCount: number;
  leasedTaskCount: number;
  scheduledMemberCount: number;
  recoveredDispatchCount: number;
  completedTaskCount: number;
}
