import type { CallRecordQuery, CallRecordVO } from '@/api/callcenter/call-record/types';
import type { AiCallTranscriptVO } from '@/api/callcenter/ai-speech/types';

export type QualityStatus = 'PENDING' | 'ASSIGNED' | 'REVIEWING' | 'SUBMITTED' | 'PUBLISHED' | 'APPEALED' | 'CLOSED' | 'CANCELLED';
export interface QualityTemplateItemVO {
  id?: string | number;
  dimensionCode: string;
  dimensionName: string;
  itemCode: string;
  itemName: string;
  itemType: 'DEDUCTION' | 'AWARD' | 'MANUAL';
  scoreValue: number;
  fatalFlag: boolean;
  allowNotApplicable: boolean;
  evidenceRequired: boolean;
  aiReviewEnabled: boolean;
  aiConfidenceThreshold: number;
  aiPromptHint?: string;
  ruleDescription?: string;
  sortOrder: number;
}
export interface QualityTemplateVO {
  id: string | number;
  templateCode: string;
  templateName: string;
  directionScope: string;
  totalScore: number;
  qualifiedScore: number;
  aiReviewEnabled: boolean;
  status: string;
  currentVersionId?: string | number;
  currentVersionNo?: number;
  remark?: string;
  version?: number;
  createTime?: string;
  items: QualityTemplateItemVO[];
}
export type QualityTemplateForm = Omit<QualityTemplateVO, 'id' | 'status' | 'currentVersionId' | 'currentVersionNo' | 'createTime'> & {
  id?: string | number;
};
export interface QualityTaskVO {
  id: string | number;
  taskCode: string;
  source: string;
  samplingPlanId?: string | number;
  samplingExecutionId?: string | number;
  callSessionId: string | number;
  businessCallId?: string;
  templateId: string | number;
  templateName?: string;
  templateVersionNo?: number;
  templateTotalScore?: number;
  templateQualifiedScore?: number;
  aiReviewEnabled?: boolean;
  agentId?: string | number;
  agentName?: string;
  agentExtension?: string;
  queueId?: string | number;
  queueName?: string;
  reviewerId?: string | number;
  reviewerName?: string;
  status: QualityStatus;
  priority: number;
  totalScore?: number;
  qualified?: boolean;
  assignedAt?: string;
  submittedAt?: string;
  publishedAt?: string;
  createTime?: string;
}
export interface QualityItemResultVO {
  id?: string | number;
  templateItemId: string | number;
  itemCode?: string;
  itemName?: string;
  result: '' | 'PASSED' | 'FAILED' | 'NOT_APPLICABLE' | 'NEEDS_MANUAL_REVIEW';
  scoreChange?: number;
  confidence?: number;
  reason?: string;
  evidenceJson?: string;
  manuallyModified?: boolean;
  modificationReason?: string;
}
export interface QualityResultVO {
  id: string | number;
  resultVersion: number;
  totalScore: number;
  qualified: boolean;
  fatalFlag: boolean;
  summary?: string;
  improvementSuggestion?: string;
  source: string;
  aiModelId?: string | number;
  items: QualityItemResultVO[];
}
export interface QualityTaskDetailVO extends QualityTaskVO {
  call: CallRecordVO;
  transcript?: AiCallTranscriptVO;
  templateItems: QualityTemplateItemVO[];
  result?: QualityResultVO;
  aiResult?: QualityResultVO;
  aiReviewStatus?: 'PENDING' | 'PROCESSING' | 'RETRY' | 'SUCCESS' | 'FAILED';
  aiReviewError?: string;
}
export interface QualityTaskQuery extends PageQuery {
  keyword?: string;
  status?: string;
  reviewerId?: string | number;
  agentId?: string | number;
  templateId?: string | number;
  mine?: boolean;
  createdAtFrom?: string;
  createdAtTo?: string;
}
export interface QualityUserOptionVO {
  id: string | number;
  name: string;
}
export interface ManualQualityTaskForm {
  templateId?: string | number;
  callSessionIds: Array<string | number>;
  priority: number;
  reviewerId?: string | number;
}
export interface QualityReviewForm {
  summary?: string;
  improvementSuggestion?: string;
  items: QualityItemResultVO[];
}
export type QualityAppealStatus = 'SUBMITTED' | 'REJECTED' | 'RECHECK_REQUESTED' | 'ACCEPTED';
export interface QualityMyResultVO extends QualityTaskVO {
  appealId?: string | number;
  appealStatus?: QualityAppealStatus;
  appealDeadline?: string;
  canAppeal: boolean;
}
export interface QualityAppealVO {
  id: string | number;
  taskId: string | number;
  taskCode: string;
  businessCallId?: string;
  qualityResultId: string | number;
  originalScore?: number;
  originalQualified?: boolean;
  appealReason: string;
  attachmentOssIds?: string;
  status: QualityAppealStatus;
  appellantId: string | number;
  appellantName?: string;
  appealedAt: string;
  appealDeadline: string;
  reviewerId?: string | number;
  reviewerName?: string;
  reviewedAt?: string;
  reviewConclusion?: string;
  reviewResultId?: string | number;
  reviewScore?: number;
  reviewQualified?: boolean;
}
export interface QualityAppealDetailVO extends QualityAppealVO {
  task: QualityTaskDetailVO;
  originalResult: QualityResultVO;
  reviewResult?: QualityResultVO;
}
export interface QualityAppealQuery extends PageQuery {
  keyword?: string;
  status?: string;
  appealedAtFrom?: string;
  appealedAtTo?: string;
}
export interface QualityAppealCreateForm {
  appealReason: string;
  attachmentOssIds?: string;
}
export interface QualityAppealAcceptForm extends QualityReviewForm {
  reviewConclusion: string;
}
export interface QualityCalibrationVO {
  reviewerId: string | number;
  reviewerName: string;
  reviewedCount: number;
  averageScore: number;
  appealedCount: number;
  adjustedCount: number;
  adjustmentRate: number;
}
export type QualityCallCandidateQuery = CallRecordQuery;

export type QualitySamplingMethod = 'RANDOM_COUNT' | 'RANDOM_RATE' | 'STRATIFIED' | 'RISK_FIRST';
export type QualityScheduleType = 'MANUAL' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
export interface QualityOptionVO {
  id: string | number;
  name: string;
}
export interface QualitySamplingPlanVO {
  id: string | number;
  planCode: string;
  planName: string;
  templateId: string | number;
  templateName?: string;
  samplingMethod: QualitySamplingMethod;
  sampleCount?: number;
  sampleRate?: number;
  stratifyDimension?: 'AGENT' | 'SKILL_GROUP';
  directionScope: string;
  queueId?: string | number;
  queueName?: string;
  skillGroupId?: string | number;
  skillGroupName?: string;
  agentId?: string | number;
  agentName?: string;
  minDurationSeconds?: number;
  maxDurationSeconds?: number;
  requireRecording?: boolean;
  requireTranscript?: boolean;
  lookbackDays: number;
  minPerAgent: number;
  maxPerAgent?: number;
  cooldownDays: number;
  excludeSampled: boolean;
  reviewerId?: string | number;
  reviewerName?: string;
  priority: number;
  scheduleType: QualityScheduleType;
  scheduleTime?: string;
  scheduleDay?: number;
  enabled: boolean;
  lastExecutedAt?: string;
  remark?: string;
  version?: number;
  createTime?: string;
}
export type QualitySamplingPlanForm = Omit<
  QualitySamplingPlanVO,
  'id' | 'templateId' | 'templateName' | 'queueName' | 'skillGroupName' | 'agentName' | 'reviewerName' | 'lastExecutedAt' | 'createTime'
> & {
  id?: string | number;
  templateId?: string | number;
};
export interface QualitySamplingPlanQuery extends PageQuery {
  keyword?: string;
  samplingMethod?: string;
  scheduleType?: string;
  enabled?: boolean;
}
export interface QualitySamplingExecutionVO {
  id: string | number;
  planId: string | number;
  executionCode: string;
  triggerType: string;
  status: string;
  windowStart?: string;
  windowEnd?: string;
  candidateCount: number;
  selectedCount: number;
  taskCount: number;
  excludedCount: number;
  exclusionSummary?: string;
  errorMessage?: string;
  startedAt: string;
  finishedAt?: string;
}

export interface QualityReportQuery extends PageQuery {
  beginDate?: string;
  endDate?: string;
  agentId?: string | number;
  queueId?: string | number;
  skillGroupId?: string | number;
  qualified?: boolean;
  fatalFlag?: boolean;
  keyword?: string;
}

export type QualityOperationPeriod = 'DAILY' | 'WEEKLY';
export type QualityOperationScope = 'TENANT' | 'QUEUE' | 'SKILL_GROUP';
export type QualityAlertMetric = 'COVERAGE_RATE' | 'AVERAGE_SCORE' | 'QUALIFIED_RATE' | 'FATAL_RATE' | 'AI_ADOPTION_RATE' | 'APPEAL_RATE';
export interface QualityOperationQuery extends PageQuery {
  periodType?: QualityOperationPeriod;
  metricCode?: QualityAlertMetric;
  status?: 'OPEN' | 'ACKNOWLEDGED' | 'CLOSED';
  scopeType?: QualityOperationScope;
  beginDate?: string;
  endDate?: string;
  keyword?: string;
}
export interface QualityReportSnapshotVO {
  id: string | number;
  periodType: QualityOperationPeriod;
  periodStart: string;
  periodEnd: string;
  scopeType: QualityOperationScope;
  scopeId: string | number;
  scopeName: string;
  eligibleCallCount: number;
  reviewedCallCount: number;
  coverageRate: number;
  resultCount: number;
  averageScore: number;
  qualifiedCount: number;
  qualifiedRate: number;
  fatalCount: number;
  fatalRate: number;
  aiAdoptionRate: number;
  appealRate: number;
  generatedAt: string;
}
export interface QualityAlertRuleVO {
  id: string | number;
  ruleName: string;
  periodType: QualityOperationPeriod;
  metricCode: QualityAlertMetric;
  compareOperator: 'LT' | 'LTE' | 'GT' | 'GTE';
  thresholdValue: number;
  scopeType: QualityOperationScope;
  scopeId?: string | number;
  scopeName: string;
  enabled: boolean;
  remark?: string;
}
export type QualityAlertRuleForm = Omit<QualityAlertRuleVO, 'id'> & { id?: string | number };
export interface QualityAlertRecordVO {
  id: string | number;
  ruleName: string;
  periodType: QualityOperationPeriod;
  periodStart: string;
  periodEnd: string;
  metricCode: QualityAlertMetric;
  actualValue: number;
  compareOperator: string;
  thresholdValue: number;
  scopeName: string;
  status: 'OPEN' | 'ACKNOWLEDGED' | 'CLOSED';
  triggeredAt: string;
  acknowledgedName?: string;
  closedName?: string;
  handleRemark?: string;
}

export interface QualityReportSummaryVO {
  eligibleCallCount: number;
  reviewedCallCount: number;
  coverageRate: number;
  resultCount: number;
  averageScore: number;
  qualifiedCount: number;
  qualifiedRate: number;
  fatalCount: number;
  fatalRate: number;
}

export interface QualityReportTrendVO {
  bucket: string;
  eligibleCallCount: number;
  reviewedCallCount: number;
  coverageRate: number;
  resultCount: number;
  averageScore: number;
  qualifiedCount: number;
  qualifiedRate: number;
}

export interface QualityReportRankingVO {
  dimensionId?: string | number;
  dimensionName: string;
  resultCount: number;
  averageScore: number;
  qualifiedCount: number;
  qualifiedRate: number;
  fatalCount: number;
}

export interface QualityReportOptionsVO {
  agents: QualityOptionVO[];
  queues: QualityOptionVO[];
  skillGroups: QualityOptionVO[];
}

export interface QualityDeductionItemVO {
  itemCode: string;
  itemName: string;
  occurrenceCount: number;
  affectedCallCount: number;
  totalDeduction: number;
}

export interface QualityAiAdoptionSummaryVO {
  aiTaskCount: number;
  evaluatedItemCount: number;
  adoptedItemCount: number;
  modifiedItemCount: number;
  adoptionRate: number;
}

export interface QualityAiModificationVO {
  itemCode: string;
  itemName: string;
  evaluatedCount: number;
  modifiedCount: number;
}

export type QualityAiAdoptionRankingDimension = 'AGENT' | 'REVIEWER' | 'TEMPLATE';
export interface QualityAiAdoptionRankingVO {
  dimensionId?: string | number;
  dimensionName: string;
  aiTaskCount: number;
  evaluatedItemCount: number;
  adoptedItemCount: number;
  modifiedItemCount: number;
  adoptionRate: number;
}

export interface QualityAppealSummaryVO {
  publishedTaskCount: number;
  appealCount: number;
  appealedTaskCount: number;
  pendingCount: number;
  maintainedCount: number;
  adjustedCount: number;
  recheckedCount: number;
  appealRate: number;
  successRate: number;
}

export type QualityAppealRankingDimension = 'AGENT' | 'REVIEWER' | 'SKILL_GROUP';
export interface QualityAppealRankingVO {
  dimensionId?: string | number;
  dimensionName: string;
  publishedCount: number;
  appealedCount: number;
  acceptedCount: number;
  completedCount: number;
  appealRate: number;
  successRate: number;
}

export interface QualityReportDetailVO {
  taskId: string | number;
  taskCode: string;
  callSessionId: string | number;
  businessCallId?: string;
  callEndedAt?: string;
  agentId?: string | number;
  agentName?: string;
  agentExtension?: string;
  queueId?: string | number;
  queueName?: string;
  skillGroupId?: string | number;
  skillGroupName?: string;
  reviewerId?: string | number;
  reviewerName?: string;
  templateName?: string;
  templateVersionNo?: number;
  totalScore: number;
  qualified: boolean;
  fatalFlag: boolean;
  summary?: string;
  appealStatus?: QualityAppealStatus;
  publishedAt?: string;
}
export interface QualitySamplingOptionsVO {
  queues: QualityOptionVO[];
  skillGroups: QualityOptionVO[];
  agents: QualityOptionVO[];
}
