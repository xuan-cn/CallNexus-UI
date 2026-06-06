/**
 * 共享类型定义
 */

/** API 统一响应结构 */
export interface ApiResponse<T = unknown> {
  code: string
  message: string
  data: T
  traceId?: string
}

/** 分页请求参数 */
export interface PageQuery {
  page: number
  pageSize: number
}

/** 分页响应结构 */
export interface PageResult<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
}

/** 通用状态 */
export type CommonStatus = 'normal' | 'disabled'

/** 时间范围 */
export interface TimeRange {
  start: Date | string
  end: Date | string
}

/** 键值对 */
export interface KeyValue<K = string, V = string> {
  label: K
  value: V
}
