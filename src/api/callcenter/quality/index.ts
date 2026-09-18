import request from '@/utils/request';
import type { AxiosPromise } from 'axios';
import type { CallRecordVO } from '@/api/callcenter/call-record/types';
import type {
  ManualQualityTaskForm,
  QualityCallCandidateQuery,
  QualityAppealAcceptForm,
  QualityAppealCreateForm,
  QualityAppealDetailVO,
  QualityAppealQuery,
  QualityAppealVO,
  QualityCalibrationVO,
  QualityMyResultVO,
  QualityReviewForm,
  QualityTaskDetailVO,
  QualityTaskQuery,
  QualityTaskVO,
  QualitySamplingExecutionVO,
  QualitySamplingOptionsVO,
  QualitySamplingPlanForm,
  QualitySamplingPlanQuery,
  QualitySamplingPlanVO,
  QualityDeductionItemVO,
  QualityAiAdoptionSummaryVO,
  QualityAiAdoptionRankingDimension,
  QualityAiAdoptionRankingVO,
  QualityAiModificationVO,
  QualityAppealRankingDimension,
  QualityAppealRankingVO,
  QualityAppealSummaryVO,
  QualityReportDetailVO,
  QualityReportOptionsVO,
  QualityReportQuery,
  QualityReportRankingVO,
  QualityReportSummaryVO,
  QualityReportTrendVO,
  QualityOperationQuery,
  QualityReportSnapshotVO,
  QualityAlertRuleVO,
  QualityAlertRuleForm,
  QualityAlertRecordVO,
  QualityTemplateForm,
  QualityTemplateVO,
  QualityUserOptionVO
} from './types';

export const listQualityTemplates = (): AxiosPromise<QualityTemplateVO[]> => request({ url: '/api/v1/quality/templates', method: 'get' });
export const getQualityTemplate = (id: string | number): AxiosPromise<QualityTemplateVO> =>
  request({ url: `/api/v1/quality/templates/${id}`, method: 'get' });
export const createQualityTemplate = (data: QualityTemplateForm): AxiosPromise<string | number> =>
  request({ url: '/api/v1/quality/templates', method: 'post', data });
export const updateQualityTemplate = (id: string | number, data: QualityTemplateForm): AxiosPromise<void> =>
  request({ url: `/api/v1/quality/templates/${id}`, method: 'put', data });
export const deleteQualityTemplate = (id: string | number): AxiosPromise<void> =>
  request({ url: `/api/v1/quality/templates/${id}`, method: 'delete' });
export const publishQualityTemplate = (id: string | number): AxiosPromise<string | number> =>
  request({ url: `/api/v1/quality/templates/${id}/publish`, method: 'post' });

export const pageQualityTasks = (params: QualityTaskQuery): Promise<{ rows: QualityTaskVO[]; total: number }> =>
  request({ url: '/api/v1/quality/tasks', method: 'get', params });
export const getQualityTask = (id: string | number): AxiosPromise<QualityTaskDetailVO> =>
  request({ url: `/api/v1/quality/tasks/${id}`, method: 'get' });
export const pageQualityCallCandidates = (params: QualityCallCandidateQuery): Promise<{ rows: CallRecordVO[]; total: number }> =>
  request({ url: '/api/v1/quality/tasks/call-candidates', method: 'get', params });
export const listQualityReviewers = (): AxiosPromise<QualityUserOptionVO[]> => request({ url: '/api/v1/quality/tasks/reviewers', method: 'get' });
export const createManualQualityTasks = (data: ManualQualityTaskForm): AxiosPromise<Array<string | number>> =>
  request({ url: '/api/v1/quality/tasks/manual', method: 'post', data });
export const assignQualityTask = (id: string | number, reviewerId: string | number): AxiosPromise<void> =>
  request({ url: `/api/v1/quality/tasks/${id}/assign`, method: 'post', data: { reviewerId } });
export const claimQualityTask = (id: string | number): AxiosPromise<void> => request({ url: `/api/v1/quality/tasks/${id}/claim`, method: 'post' });
export const triggerQualityAiReview = (id: string | number): AxiosPromise<string | number> =>
  request({ url: `/api/v1/quality/tasks/${id}/ai-review`, method: 'post' });
export const submitQualityReview = (id: string | number, data: QualityReviewForm): AxiosPromise<string | number> =>
  request({ url: `/api/v1/quality/tasks/${id}/submit`, method: 'post', data });
export const publishQualityResult = (id: string | number): AxiosPromise<void> =>
  request({ url: `/api/v1/quality/tasks/${id}/publish`, method: 'post' });

export const pageMyQualityResults = (params: QualityTaskQuery): Promise<{ rows: QualityMyResultVO[]; total: number }> =>
  request({ url: '/api/v1/quality/my-results', method: 'get', params });
export const getMyQualityResult = (id: string | number): AxiosPromise<QualityTaskDetailVO> =>
  request({ url: `/api/v1/quality/my-results/${id}`, method: 'get' });
export const createQualityAppeal = (taskId: string | number, data: QualityAppealCreateForm): AxiosPromise<string | number> =>
  request({ url: `/api/v1/quality/tasks/${taskId}/appeals`, method: 'post', data });
export const pageQualityAppeals = (params: QualityAppealQuery): Promise<{ rows: QualityAppealVO[]; total: number }> =>
  request({ url: '/api/v1/quality/appeals', method: 'get', params });
export const getQualityAppeal = (id: string | number): AxiosPromise<QualityAppealDetailVO> =>
  request({ url: `/api/v1/quality/appeals/${id}`, method: 'get' });
export const getQualityCalibration = (): AxiosPromise<QualityCalibrationVO[]> =>
  request({ url: '/api/v1/quality/appeals/calibration', method: 'get' });
export const rejectQualityAppeal = (id: string | number, reviewConclusion: string): AxiosPromise<void> =>
  request({ url: `/api/v1/quality/appeals/${id}/reject`, method: 'post', data: { reviewConclusion } });
export const recheckQualityAppeal = (id: string | number, reviewConclusion: string): AxiosPromise<void> =>
  request({ url: `/api/v1/quality/appeals/${id}/recheck`, method: 'post', data: { reviewConclusion } });
export const acceptQualityAppeal = (id: string | number, data: QualityAppealAcceptForm): AxiosPromise<string | number> =>
  request({ url: `/api/v1/quality/appeals/${id}/accept`, method: 'post', data });

export const pageQualitySamplingPlans = (params: QualitySamplingPlanQuery): Promise<{ rows: QualitySamplingPlanVO[]; total: number }> =>
  request({ url: '/api/v1/quality/plans', method: 'get', params });
export const getQualitySamplingPlan = (id: string | number): AxiosPromise<QualitySamplingPlanVO> =>
  request({ url: `/api/v1/quality/plans/${id}`, method: 'get' });
export const getQualitySamplingOptions = (): AxiosPromise<QualitySamplingOptionsVO> =>
  request({ url: '/api/v1/quality/plans/options', method: 'get' });
export const createQualitySamplingPlan = (data: QualitySamplingPlanForm): AxiosPromise<string | number> =>
  request({ url: '/api/v1/quality/plans', method: 'post', data });
export const updateQualitySamplingPlan = (id: string | number, data: QualitySamplingPlanForm): AxiosPromise<void> =>
  request({ url: `/api/v1/quality/plans/${id}`, method: 'put', data });
export const deleteQualitySamplingPlan = (id: string | number): AxiosPromise<void> =>
  request({ url: `/api/v1/quality/plans/${id}`, method: 'delete' });
export const executeQualitySamplingPlan = (id: string | number): AxiosPromise<QualitySamplingExecutionVO> =>
  request({ url: `/api/v1/quality/plans/${id}/execute`, method: 'post' });
export const pageQualitySamplingExecutions = (
  id: string | number,
  params: PageQuery
): Promise<{ rows: QualitySamplingExecutionVO[]; total: number }> =>
  request({ url: `/api/v1/quality/plans/${id}/executions`, method: 'get', params });

export const getQualityReportSummary = (params: QualityReportQuery): AxiosPromise<QualityReportSummaryVO> =>
  request({ url: '/api/v1/quality/reports/summary', method: 'get', params });
export const getQualityReportTrend = (params: QualityReportQuery): AxiosPromise<QualityReportTrendVO[]> =>
  request({ url: '/api/v1/quality/reports/trend', method: 'get', params });
export const listQualityAgentRanking = (params: QualityReportQuery): AxiosPromise<QualityReportRankingVO[]> =>
  request({ url: '/api/v1/quality/reports/agent-ranking', method: 'get', params });
export const listQualitySkillGroupRanking = (params: QualityReportQuery): AxiosPromise<QualityReportRankingVO[]> =>
  request({ url: '/api/v1/quality/reports/skill-group-ranking', method: 'get', params });
export const getQualityReportOptions = (): AxiosPromise<QualityReportOptionsVO> => request({ url: '/api/v1/quality/reports/options', method: 'get' });
export const listQualityDeductionItems = (params: QualityReportQuery): AxiosPromise<QualityDeductionItemVO[]> =>
  request({ url: '/api/v1/quality/reports/deduction-items', method: 'get', params });
export const pageQualityReportDetails = (params: QualityReportQuery): Promise<{ rows: QualityReportDetailVO[]; total: number }> =>
  request({ url: '/api/v1/quality/reports/details', method: 'get', params });
export const getQualityAiAdoption = (params: QualityReportQuery): AxiosPromise<QualityAiAdoptionSummaryVO> =>
  request({ url: '/api/v1/quality/reports/ai-adoption', method: 'get', params });
export const listQualityAiModifications = (params: QualityReportQuery): AxiosPromise<QualityAiModificationVO[]> =>
  request({ url: '/api/v1/quality/reports/ai-modifications', method: 'get', params });
export const listQualityAiAdoptionRanking = (
  params: QualityReportQuery,
  dimension: QualityAiAdoptionRankingDimension
): AxiosPromise<QualityAiAdoptionRankingVO[]> =>
  request({ url: '/api/v1/quality/reports/ai-adoption-ranking', method: 'get', params: { ...params, dimension } });
export const getQualityAppealSummary = (params: QualityReportQuery): AxiosPromise<QualityAppealSummaryVO> =>
  request({ url: '/api/v1/quality/reports/appeal-summary', method: 'get', params });
export const listQualityAppealRanking = (
  params: QualityReportQuery,
  dimension: QualityAppealRankingDimension
): AxiosPromise<QualityAppealRankingVO[]> =>
  request({ url: '/api/v1/quality/reports/appeal-ranking', method: 'get', params: { ...params, dimension } });

export const pageQualityReportSnapshots = (params: QualityOperationQuery): Promise<{ rows: QualityReportSnapshotVO[]; total: number }> =>
  request({ url: '/api/v1/quality/operations/snapshots', method: 'get', params });
export const generateQualityReportSnapshot = (periodType: 'DAILY' | 'WEEKLY'): AxiosPromise<QualityReportSnapshotVO[]> =>
  request({ url: '/api/v1/quality/operations/snapshots/generate', method: 'post', data: { periodType } });
export const pageQualityAlertRules = (params: QualityOperationQuery): Promise<{ rows: QualityAlertRuleVO[]; total: number }> =>
  request({ url: '/api/v1/quality/operations/rules', method: 'get', params });
export const createQualityAlertRule = (data: QualityAlertRuleForm): AxiosPromise<string | number> =>
  request({ url: '/api/v1/quality/operations/rules', method: 'post', data });
export const updateQualityAlertRule = (id: string | number, data: QualityAlertRuleForm): AxiosPromise<void> =>
  request({ url: `/api/v1/quality/operations/rules/${id}`, method: 'put', data });
export const deleteQualityAlertRule = (id: string | number): AxiosPromise<void> =>
  request({ url: `/api/v1/quality/operations/rules/${id}`, method: 'delete' });
export const pageQualityAlertRecords = (params: QualityOperationQuery): Promise<{ rows: QualityAlertRecordVO[]; total: number }> =>
  request({ url: '/api/v1/quality/operations/alerts', method: 'get', params });
export const acknowledgeQualityAlert = (id: string | number, handleRemark?: string): AxiosPromise<void> =>
  request({ url: `/api/v1/quality/operations/alerts/${id}/acknowledge`, method: 'post', data: { handleRemark } });
export const closeQualityAlert = (id: string | number, handleRemark?: string): AxiosPromise<void> =>
  request({ url: `/api/v1/quality/operations/alerts/${id}/close`, method: 'post', data: { handleRemark } });
