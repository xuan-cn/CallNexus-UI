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
  settings?: {
    intentFallback?: AiWorkflowIntentFallbackPolicy;
    conversationRules?: Array<{
      event: string;
      enabled?: boolean;
      phrases?: string;
      matchMode?: string;
      keywordMode?: string;
      excludedKeywords?: string;
      intentCodes?: string[];
      aiUnderstandingEnabled?: boolean;
      action?: string;
      queueCode?: string;
      replyText?: string;
      retryText?: string;
      maxCount?: number;
    }>;
  };
}

export interface AiWorkflowIntentFallbackPolicy {
  fallbackMode: 'EDGE' | 'FIXED_RETRY' | 'AI_RETRY' | 'FIXED_CONTINUE' | 'AI_CONTINUE';
  fallbackText?: string;
  fallbackPrompt?: string;
  maxRetries?: number;
  retryLimitAction?: 'EDGE' | 'CONTINUE' | 'TRANSFER_QUEUE' | 'TRANSFER_EXTENSION' | 'HANGUP' | 'END';
  limitText?: string;
  limitQueueCode?: string;
  limitExtension?: string;
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
  issues?: AiWorkflowValidationIssue[];
}

export interface AiWorkflowValidationIssue {
  message: string;
  nodeId?: string;
  edgeId?: string;
  field?: string;
  condition?: string;
}

export interface AiWorkflowMediaOptionVO {
  id: Id;
  assetName: string;
  category: string;
  sourceType: string;
  durationMs?: number;
  publishStatus: 'PUBLISHED' | 'PARTIAL';
}

export interface AiAgentWorkflowBindingVO {
  id: Id;
  aiAgentId: Id;
  agentName?: string;
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
  ticketPreview?: {
    templateId: string;
    templateName: string;
    fields: { code: string; label: string; required: boolean; mapped: boolean; value?: unknown }[];
  };
  dialogueDetails?: {
    aiCalled?: boolean;
    decision?: string;
    confidence?: number;
    evidence?: string;
    optionCode?: string;
    optionLabel?: string;
    branchLabel?: string;
    matchReason?: string;
    matchedLabels?: string[];
    timings?: Partial<Record<'matching' | 'intent' | 'understanding' | 'extraction' | 'knowledge', number>>;
    detailsTruncated?: boolean;
    reason?: string;
    missingFields?: string[];
    limitReached?: boolean;
  };
  ruleDetails?: {
    eventLabel?: string;
    matchReason?: string;
    matchedLabels?: string[];
    aiCalled?: boolean;
    reason?: string;
    evidence?: string;
    confidence?: number;
    count?: number;
    maxCount?: number;
    action?: string;
  };
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
