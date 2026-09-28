export type FormBusinessType = 'CUSTOMER' | 'TICKET';
export type FormFieldType =
  | 'INPUT'
  | 'TEXTAREA'
  | 'RADIO'
  | 'CHECKBOX'
  | 'SELECT'
  | 'MULTI_SELECT'
  | 'NUMBER'
  | 'DATE'
  | 'DATETIME'
  | 'FILE';
export type FormQueryMode = 'AUTO' | 'EQ' | 'LIKE' | 'BETWEEN' | 'CONTAINS_ANY';

export interface FormFieldOption {
  id?: string | number;
  label: string;
  value: string;
  sortOrder?: number;
}

export interface FormField {
  id?: string | number;
  fieldCode: string;
  fieldName: string;
  fieldType: FormFieldType;
  required: boolean;
  sortOrder?: number;
  layoutSpan?: 12 | 24;
  defaultValue?: string;
  placeholder?: string;
  validationRules?: string;
  listVisible?: boolean;
  queryEnabled?: boolean;
  queryMode?: FormQueryMode;
  queryOrder?: number;
  fieldRemark?: string;
  importEnabled?: boolean;
  exportEnabled?: boolean;
  aiFillEnabled?: boolean;
  dialEnabled?: boolean;
  enabled?: boolean;
  options: FormFieldOption[];
}

export interface FormQueryField {
  fieldCode: string;
  fieldName: string;
  fieldType: FormFieldType;
  queryMode: FormQueryMode;
  queryOrder?: number;
  placeholder?: string;
  fieldRemark?: string;
  options: FormFieldOption[];
}

export interface FormQuerySchema {
  templateId: string | number;
  templateName: string;
  businessType: FormBusinessType;
  fields: FormQueryField[];
}

export interface DynamicFieldFilter {
  fieldCode: string;
  operator: FormQueryMode;
  value: unknown;
  endValue?: unknown;
}

export interface FormTemplate {
  id?: string | number;
  templateCode: string;
  templateName: string;
  businessType: FormBusinessType;
  workflowCode?: string;
  deadlineEnabled?: boolean;
  resolutionLimitMinutes?: number;
  remindBeforeMinutes?: number;
  enabled: boolean;
  version?: number;
  fields: FormField[];
}
