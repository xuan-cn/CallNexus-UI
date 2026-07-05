import request from '@/utils/request';
import type { AxiosPromise } from 'axios';

export interface DispatchTransferToExtensionRequest {
  targetExtension: string;
}

export interface DispatchMonitorRequest {
  targetExtension: string;
}

export interface DispatchSingleCallRequest {
  targetExtension: string;
}

export interface DispatchGroupCallRequest {
  targetExtensions: string[];
}

export interface DispatchBroadcastRequest {
  mediaAssetId: string | number;
  targetExtensions: string[];
}

export interface DispatchIntercomRequest {
  targetExtension: string;
}

export interface DispatchIntercomTalkRequest {
  talking: boolean;
}

export type DispatchCallTaskType = 'SINGLE' | 'GROUP' | 'BROADCAST' | 'INTERCOM';
export type DispatchCallTaskState = 'STARTING' | 'RUNNING' | 'SUCCESS' | 'PARTIAL' | 'FAILED' | 'CANCELLED';
export type DispatchCallTargetState = 'PENDING' | 'SUBMITTED' | 'RINGING' | 'ANSWERED' | 'ENDED' | 'FAILED' | 'CANCELLED';

export interface DispatchCallTargetVO {
  id: string | number;
  sipAccountId: string | number;
  targetExtension: string;
  targetLegUuid: string;
  targetState: DispatchCallTargetState;
  answered: boolean;
  failureReason?: string;
  submittedAt?: string;
  ringingAt?: string;
  answeredAt?: string;
  endedAt?: string;
}

export interface DispatchCallTaskVO {
  id: string | number;
  businessCallId: string;
  nodeId: string | number;
  operatorExtension: string;
  operatorLegUuid?: string;
  mediaAssetId?: string | number;
  mediaName?: string;
  mediaPath?: string;
  intercomTalking?: boolean;
  taskType: DispatchCallTaskType;
  taskState: DispatchCallTaskState;
  totalCount: number;
  answeredCount: number;
  failedCount: number;
  cancelledCount: number;
  startedAt: string;
  endedAt?: string;
  targets?: DispatchCallTargetVO[];
}

/** 调度员强制结束整通业务通话。 */
export const forceHangupDispatchCall = (businessCallId: string): AxiosPromise<void> =>
  request({
    url: `/api/v1/dispatch/calls/${businessCallId}/force-hangup`,
    method: 'post'
  });

/** 调度员将当前客户腿强制转接到指定 SIP 分机。 */
export const forceTransferDispatchCallToExtension = (businessCallId: string, data: DispatchTransferToExtensionRequest): AxiosPromise<void> =>
  request({
    url: `/api/v1/dispatch/calls/${businessCallId}/force-transfer`,
    method: 'post',
    data
  });

/** 回呼当前调度员绑定分机，并监听指定活动分机电话腿。 */
export const startDispatchMonitor = (businessCallId: string, data: DispatchMonitorRequest): AxiosPromise<string> =>
  request({
    url: `/api/v1/dispatch/calls/${businessCallId}/monitor`,
    method: 'post',
    data
  });

/** 回呼当前调度员绑定分机并进入耳语模式，客户听不到调度员声音。 */
export const startDispatchWhisper = (businessCallId: string, data: DispatchMonitorRequest): AxiosPromise<string> =>
  request({
    url: `/api/v1/dispatch/calls/${businessCallId}/whisper`,
    method: 'post',
    data
  });

/** 回呼当前调度员绑定分机并强插三方通话。 */
export const startDispatchBarge = (businessCallId: string, data: DispatchMonitorRequest): AxiosPromise<string> =>
  request({
    url: `/api/v1/dispatch/calls/${businessCallId}/barge`,
    method: 'post',
    data
  });

/** 将指定分机尚未接听的振铃来电强接到当前调度员绑定分机。 */
export const pickupDispatchCall = (businessCallId: string, data: DispatchMonitorRequest): AxiosPromise<string> =>
  request({
    url: `/api/v1/dispatch/calls/${businessCallId}/pickup`,
    method: 'post',
    data
  });

/** 使用当前调度分机呼叫一个目标分机。 */
export const startDispatchSingleCall = (data: DispatchSingleCallRequest): AxiosPromise<DispatchCallTaskVO> =>
  request({
    url: '/api/v1/dispatch/calls/single',
    method: 'post',
    data
  });

/** 使用当前调度分机同时呼叫多个目标分机。 */
export const startDispatchGroupCall = (data: DispatchGroupCallRequest): AxiosPromise<DispatchCallTaskVO> =>
  request({
    url: '/api/v1/dispatch/calls/group',
    method: 'post',
    data
  });

/** 向选中分机播放已同步到 FreeSWITCH 节点的预录音媒体。 */
export const startDispatchBroadcast = (data: DispatchBroadcastRequest): AxiosPromise<DispatchCallTaskVO> =>
  request({
    url: '/api/v1/dispatch/calls/broadcast',
    method: 'post',
    data
  });

/** 向单个目标分机发起半双工调度对讲。 */
export const startDispatchIntercom = (data: DispatchIntercomRequest): AxiosPromise<DispatchCallTaskVO> =>
  request({
    url: '/api/v1/dispatch/calls/intercom',
    method: 'post',
    data
  });

/** 查询最近的调度单呼和组呼任务。 */
export const listDispatchCallTasks = (): AxiosPromise<DispatchCallTaskVO[]> =>
  request({
    url: '/api/v1/dispatch/calls/tasks',
    method: 'get'
  });

/** 查询调度呼叫任务及目标明细。 */
export const getDispatchCallTask = (taskId: string | number): AxiosPromise<DispatchCallTaskVO> =>
  request({
    url: `/api/v1/dispatch/calls/tasks/${taskId}`,
    method: 'get'
  });

/** 停止任务中尚未接听的目标电话腿，不中断已经接听的分机。 */
export const stopDispatchUnansweredTargets = (taskId: string | number): AxiosPromise<void> =>
  request({
    url: `/api/v1/dispatch/calls/tasks/${taskId}/stop-unanswered`,
    method: 'post'
  });

/** 立即终止广播任务中所有尚未结束的目标电话腿。 */
export const terminateDispatchBroadcast = (taskId: string | number): AxiosPromise<void> =>
  request({
    url: `/api/v1/dispatch/calls/tasks/${taskId}/terminate-broadcast`,
    method: 'post'
  });

/** 设置对讲调度分机是否开放发言。 */
export const setDispatchIntercomTalking = (taskId: string | number, data: DispatchIntercomTalkRequest): AxiosPromise<void> =>
  request({
    url: `/api/v1/dispatch/calls/tasks/${taskId}/intercom/talk`,
    method: 'post',
    data
  });

/** 结束对讲会议及其全部电话腿。 */
export const terminateDispatchIntercom = (taskId: string | number): AxiosPromise<void> =>
  request({
    url: `/api/v1/dispatch/calls/tasks/${taskId}/terminate-intercom`,
    method: 'post'
  });
