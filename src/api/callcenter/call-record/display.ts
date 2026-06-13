const HANGUP_CAUSE_LABELS: Record<string, string> = {
  NONE: '未指定',
  NORMAL_CLEARING: '正常挂断',
  ORIGINATOR_CANCEL: '主叫取消',
  USER_BUSY: '用户忙',
  NO_USER_RESPONSE: '用户未响应',
  NO_ANSWER: '无人接听',
  CALL_REJECTED: '呼叫被拒绝',
  UNALLOCATED_NUMBER: '号码不存在',
  NO_ROUTE_DESTINATION: '无目标路由',
  NO_ROUTE_TRANSIT_NET: '无中继路由',
  DESTINATION_OUT_OF_ORDER: '目标不可用',
  INVALID_NUMBER_FORMAT: '号码格式无效',
  NORMAL_TEMPORARY_FAILURE: '临时故障',
  SWITCH_CONGESTION: '交换机拥塞',
  NETWORK_OUT_OF_ORDER: '网络故障',
  RECOVERY_ON_TIMER_EXPIRE: '等待响应超时',
  INCOMPATIBLE_DESTINATION: '目标不兼容',
  MANDATORY_IE_MISSING: '缺少必要信令信息',
  BEARERCAPABILITY_NOTAUTH: '承载能力未授权',
  BEARERCAPABILITY_NOTAVAIL: '承载能力不可用',
  SERVICE_NOT_IMPLEMENTED: '服务未实现',
  FACILITY_REJECTED: '服务被拒绝',
  SYSTEM_SHUTDOWN: '系统关闭',
  NORMAL_UNSPECIFIED: '正常结束',
  LOSE_RACE: '呼叫已由其他通道接听',
  MANAGER_REQUEST: '系统管理操作挂断',
  ATTENDED_TRANSFER: '咨询转接完成',
  BLIND_TRANSFER: '盲转完成',
  ALLOTTED_TIMEOUT: '通话时限到期',
  MEDIA_TIMEOUT: '媒体超时',
  PROGRESS_TIMEOUT: '呼叫进展超时',
  GATEWAY_DOWN: '网关不可用',
  INVALID_GATEWAY: '网关配置无效',
  CHAN_NOT_IMPLEMENTED: '通道未实现'
};

export const hangupCauseLabel = (cause?: string) => {
  if (!cause) return '-';
  const label = HANGUP_CAUSE_LABELS[cause];
  return label ? `${label}（${cause}）` : cause;
};
