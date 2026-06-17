export type CallCenterConfigEditorType = 'INPUT' | 'NUMBER' | 'SWITCH' | 'SELECT';
export type CallCenterConfigValueType = 'STRING' | 'INT' | 'BOOLEAN' | 'SELECT';
export type CallCenterConfigSource = 'DEFAULT' | 'TENANT';

export interface CallCenterConfigOption {
  label: string;
  value: string;
}

export interface CallCenterConfigItem {
  groupCode: string;
  groupName: string;
  configKey: string;
  configName: string;
  valueType: CallCenterConfigValueType;
  editorType: CallCenterConfigEditorType;
  defaultValue?: string;
  configValue?: string;
  effectiveValue?: string;
  source: CallCenterConfigSource;
  unit?: string;
  optionsJson?: string;
  description?: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  sortOrder: number;
}

export interface CallCenterConfigGroup {
  groupCode: string;
  groupName: string;
  items: CallCenterConfigItem[];
}

export interface CallCenterConfigSaveRequest {
  items: Array<{
    configKey: string;
    configValue?: string;
  }>;
}
