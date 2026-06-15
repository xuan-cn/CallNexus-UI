export type OutboundBlacklistScope = 'GLOBAL' | 'TASK';
export type OutboundBlacklistSource = 'MANUAL' | 'EXCEL' | 'CUSTOMER_REQUEST' | 'SYSTEM_RULE';

export interface OutboundBlacklistVO {
  id: string | number;
  scopeType: OutboundBlacklistScope;
  taskId?: string | number;
  taskName?: string;
  originalPhone: string;
  normalizedPhone: string;
  reason?: string;
  source: OutboundBlacklistSource;
  effectiveAt?: string;
  expiresAt?: string;
  enabled: boolean;
  active: boolean;
  createTime?: string;
}

export interface OutboundBlacklistForm {
  id?: string | number;
  scopeType: OutboundBlacklistScope;
  taskId?: string | number;
  phoneNumber: string;
  reason?: string;
  source: OutboundBlacklistSource;
  effectiveAt?: string;
  expiresAt?: string;
  enabled: boolean;
}

export interface OutboundBlacklistImportRowVO {
  id: string | number;
  rowNumber: number;
  originalPhone?: string;
  normalizedPhone?: string;
  reason?: string;
  status: 'VALID' | 'INVALID' | 'DUPLICATE_FILE' | 'DUPLICATE_EXISTING';
  errorMessage?: string;
}

export interface OutboundBlacklistImportBatchVO {
  id: string | number;
  scopeType: OutboundBlacklistScope;
  taskId?: string | number;
  fileName: string;
  status: 'PREVIEW' | 'IMPORTING' | 'IMPORTED';
  totalCount: number;
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  importedCount: number;
  rows: OutboundBlacklistImportRowVO[];
}
