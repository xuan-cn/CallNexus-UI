export type Id = string | number;
export type AiWorkflowScene = 'VOICE_INBOUND' | 'VOICE_OUTBOUND' | 'ONLINE_CHAT' | 'COMMON';
export type AiWorkflowVersionStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface AiWorkflowVO {
  id: Id;
  workflowCode: string;
  workflowName: string;
  sceneType: AiWorkflowScene;
  description?: string;
  enabled: boolean;
  version: number;
  draftVersionId?: Id;
  draftVersionNo?: number;
  publishedVersionId?: Id;
  publishedVersionNo?: number;
  bindingCount: number;
  updateTime?: string;
}

export interface AiWorkflowForm {
  workflowCode: string;
  workflowName: string;
  sceneType: AiWorkflowScene;
  description?: string;
  enabled: boolean;
}

export interface AiWorkflowNode {
  id: string;
  type: string;
  name: string;
  x: number;
  y: number;
  config: Record<string, any>;
}

export interface AiWorkflowEdge {
  id: string;
  source: string;
  target: string;
  condition?: string;
}

export interface AiWorkflowDefinition {
  schemaVersion: string;
  variables: Array<Record<string, any>>;
  nodes: AiWorkflowNode[];
  edges: AiWorkflowEdge[];
}

export interface AiWorkflowVersionVO {
  id: Id;
  workflowId: Id;
  versionNo: number;
  versionName?: string;
  status: AiWorkflowVersionStatus;
  definitionJson: string;
  definitionHash: string;
  publishedBy?: Id;
  publishedAt?: string;
  createTime?: string;
  updateTime?: string;
}

export interface AiWorkflowValidationVO {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface AiAgentWorkflowBindingVO {
  id: Id;
  aiAgentId: Id;
  sceneType: Exclude<AiWorkflowScene, 'COMMON'>;
  workflowId: Id;
  workflowName: string;
  workflowVersionId: Id;
  workflowVersionNo: number;
  fallbackAction: 'DEFAULT_CONVERSATION' | 'TRANSFER_AGENT' | 'END_CONVERSATION';
  enabled: boolean;
}

export interface AiAgentWorkflowBindingForm {
  sceneType: Exclude<AiWorkflowScene, 'COMMON'>;
  workflowVersionId: Id;
  fallbackAction: 'DEFAULT_CONVERSATION' | 'TRANSFER_AGENT' | 'END_CONVERSATION';
  enabled: boolean;
}

export interface AiWorkflowNodeTraceVO {
  id: Id;
  nodeId: string;
  nodeType: string;
  nodeName: string;
  turnNo: number;
  status: string;
  branchValue?: string;
  inputSummary?: string;
  outputSummary?: string;
  durationMs: number;
  startedAt?: string;
}

export interface AiWorkflowTestExecutionVO {
  executionId: string;
  workflowId: Id;
  workflowVersionId: Id;
  workflowVersionNo: number;
  status: string;
  currentNodeId?: string;
  turnNo: number;
  waitingType?: string;
  waitingToken?: string;
  outputMessages: string[];
  variables: Record<string, unknown>;
  traces: AiWorkflowNodeTraceVO[];
  failureMessage?: string;
}

export interface AiWorkflowTestStartForm {
  agentId?: Id;
  variables: Record<string, unknown>;
}
