/**
 * 客户模块类型定义
 */

/** 客户状态 */
export type CustomerStatus = 'active' | 'inactive' | 'blacklist'

/** 客户信息 */
export interface Customer {
  id: string
  name: string
  phone: string
  email?: string
  company?: string
  status: CustomerStatus
  tags?: string[]
  createdAt: Date
  updatedAt: Date
}

/** 联系人信息 */
export interface Contact {
  id: string
  customerId: string
  name: string
  phone: string
  position?: string
  isPrimary: boolean
}

/** 客户标签 */
export interface CustomerTag {
  id: string
  name: string
  color: string
  count?: number
}
