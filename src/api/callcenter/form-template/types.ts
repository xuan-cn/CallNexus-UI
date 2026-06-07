export type FormBusinessType = 'CUSTOMER' | 'TICKET';
export type FormFieldType = 'INPUT' | 'TEXTAREA' | 'RADIO' | 'CHECKBOX' | 'SELECT' | 'MULTI_SELECT' | 'NUMBER' | 'DATE' | 'DATETIME';

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
  options: FormFieldOption[];
}

export interface FormTemplate {
  id?: string | number;
  templateCode: string;
  templateName: string;
  businessType: FormBusinessType;
  enabled: boolean;
  version?: number;
  fields: FormField[];
}
