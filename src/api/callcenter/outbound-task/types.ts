export type OutboundTaskStatus = 'DRAFT' | 'RUNNING' | 'PAUSED' | 'COMPLETED';
export type OutboundMemberStatus = 'PENDING' | 'CLAIMED' | 'DIALING' | 'COMPLETED' | 'RETRY' | 'SKIPPED';

export interface OutboundTaskVO {
  id: string | number;
  taskCode: string;
  taskName: string;
  taskType: 'PREVIEW';
  status: OutboundTaskStatus;
  description?: string;
  totalCount: number;
  pendingCount: number;
  completedCount: number;
  version?: number;
  createTime?: string;
}

export interface OutboundTaskForm {
  taskCode: string;
  taskName: string;
  description?: string;
  version?: number;
}

export interface OutboundMemberVO {
  id: string | number;
  taskId: string | number;
  customerId: string | number;
  customerName?: string;
  phoneNumber: string;
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
}

export interface OutboundTaskStatisticsVO {
  taskId: string | number;
  totalCount: number;
  pendingCount: number;
  claimedCount: number;
  dialingCount: number;
  completedCount: number;
  retryCount: number;
  dialedCount: number;
  connectedCount: number;
  completionRate: number;
  connectionRate: number;
  resultDistribution: Record<string, number>;
}

export interface CompleteOutboundMemberForm {
  resultCode: 'CONNECTED' | 'NO_ANSWER' | 'BUSY' | 'INVALID_NUMBER' | 'NOT_INTERESTED' | 'FOLLOW_UP' | 'OTHER';
  resultRemark?: string;
  nextFollowUpAt?: string;
  retry: boolean;
}
