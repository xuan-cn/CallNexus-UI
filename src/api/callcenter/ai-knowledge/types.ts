export type Id = string | number;
export interface PageQuery {
  pageNum: number;
  pageSize: number;
}

export interface AiModelProviderVO {
  id: Id;
  providerCode: string;
  providerName: string;
  providerType: string;
  baseUrl: string;
  apiKeyConfigured: boolean;
  organizationId?: string;
  connectTimeoutSeconds: number;
  readTimeoutSeconds: number;
  extraConfigJson?: string;
  enabled: boolean;
  version?: number;
}
export interface AiModelProviderForm extends Omit<AiModelProviderVO, 'id' | 'apiKeyConfigured'> {
  id?: Id;
  apiKey?: string;
}
export interface AiModelVO {
  id: Id;
  providerId: Id;
  providerName?: string;
  modelCode: string;
  modelName: string;
  capability: 'CHAT' | 'EMBEDDING';
  vectorDimension?: number;
  maxBatchSize?: number;
  maxInputTokens?: number;
  defaultModel: boolean;
  requestOptionsJson?: string;
  enabled: boolean;
  version?: number;
}
export interface AiModelForm extends Omit<AiModelVO, 'id' | 'providerName' | 'vectorDimension'> {
  id?: Id;
  vectorDimension?: number;
}

export interface KnowledgeBaseVO {
  id: Id;
  knowledgeCode: string;
  knowledgeName: string;
  description?: string;
  embeddingModelId: Id;
  embeddingModelName?: string;
  collectionName?: string;
  chunkSize: number;
  chunkOverlap: number;
  defaultTopK: number;
  scoreThreshold: number;
  status: string;
  documentCount: number;
  faqCount: number;
  chunkCount: number;
  failureReason?: string;
  enabled: boolean;
  version?: number;
}
export interface KnowledgeBaseForm {
  id?: Id;
  knowledgeCode: string;
  knowledgeName: string;
  description?: string;
  embeddingModelId?: Id;
  chunkSize: number;
  chunkOverlap: number;
  defaultTopK: number;
  scoreThreshold: number;
  enabled: boolean;
}
export interface KnowledgeDocumentVO {
  id: Id;
  knowledgeBaseId: Id;
  documentName: string;
  documentType: string;
  currentVersionId?: Id;
  versionNo?: number;
  status: string;
  parseStatus?: string;
  indexStatus?: string;
  chunkCount?: number;
  failureReason?: string;
  enabled: boolean;
  createTime?: string;
}
export interface KnowledgeChunkVO {
  id: Id;
  chunkIndex: number;
  titlePath?: string;
  pageNumber?: number;
  sheetName?: string;
  rowStart?: number;
  rowEnd?: number;
  textContent: string;
  indexState: string;
}
export interface KnowledgeFaqVO {
  id: Id;
  knowledgeBaseId: Id;
  faqCode: string;
  faqName: string;
  currentVersionId?: Id;
  versionNo?: number;
  standardQuestion?: string;
  standardAnswer?: string;
  aliases?: string[];
  status: string;
  indexStatus?: string;
  answerMode: string;
  failureReason?: string;
  enabled: boolean;
  version?: number;
}
export interface KnowledgeFaqForm {
  id?: Id;
  faqCode: string;
  faqName: string;
  standardQuestion: string;
  standardAnswer: string;
  aliases: string[];
  answerMode: 'DIRECT' | 'CONTEXT';
  enabled: boolean;
}
export interface KnowledgeTaskVO {
  id: Id;
  taskType: string;
  knowledgeBaseId: Id;
  documentId?: Id;
  faqId?: Id;
  status: string;
  retryCount: number;
  progressTotal: number;
  progressCompleted: number;
  failureReason?: string;
  nextRetryAt?: string;
  startedAt?: string;
  finishedAt?: string;
}
export interface KnowledgeSearchHitVO {
  sourceType: string;
  score: number;
  title: string;
  content: string;
  location?: string;
  metadata?: Record<string, unknown>;
}
export interface FaqCandidateBatchVO {
  id: Id;
  knowledgeBaseId: Id;
  sourceType: 'EXCEL' | 'AI_DOCUMENT';
  documentId?: Id;
  chatModelId?: Id;
  sourceFileName?: string;
  status: string;
  totalCount: number;
  validCount: number;
  invalidCount: number;
  confirmedCount: number;
  failureReason?: string;
  createTime?: string;
  finishedAt?: string;
}
export interface FaqCandidateVO {
  id: Id;
  batchId: Id;
  rowNumber: number;
  faqCode: string;
  faqName: string;
  standardQuestion: string;
  standardAnswer: string;
  aliases: string[];
  answerMode: 'DIRECT' | 'CONTEXT';
  sourceLocation?: string;
  sourceText?: string;
  confidence?: number;
  status: string;
  errorMessage?: string;
  faqId?: Id;
  version?: number;
}
export interface FaqCandidateForm {
  faqCode: string;
  faqName: string;
  standardQuestion: string;
  standardAnswer: string;
  aliases: string[];
  answerMode: 'DIRECT' | 'CONTEXT';
  version?: number;
}

export interface AiAgentVO {
  id: Id;
  agentCode: string;
  agentName: string;
  description?: string;
  chatModelId: Id;
  chatModelName?: string;
  systemPrompt?: string;
  welcomeMessage?: string;
  retrievalMode: string;
  retrievalFailurePolicy: 'STRICT' | 'FALLBACK_MODEL';
  topK: number;
  scoreThreshold: number;
  faqScoreThreshold: number;
  temperature: number;
  maxOutputTokens: number;
  historyMessageLimit: number;
  systemAssistant: boolean;
  enabled: boolean;
  version?: number;
  voiceTransport?: 'HTTP' | 'WS';
  voiceTransportWsUrl?: string;
  knowledgeBaseIds: Id[];
  knowledgeBaseNames: string[];
}
export interface AiAgentForm extends Omit<AiAgentVO, 'id' | 'chatModelName' | 'knowledgeBaseNames'> {
  id?: Id;
}
export interface AiConversationVO {
  id: Id;
  agentId: Id;
  agentName?: string;
  title: string;
  status: string;
  lastMessageAt?: string;
}
export interface AiCitationVO {
  id?: Id;
  sourceType: string;
  knowledgeBaseId?: Id;
  documentId?: Id;
  faqId?: Id;
  sourceName: string;
  sourceLocation?: string;
  quotedContent: string;
  score: number;
}
export interface AiMessageVO {
  id: Id;
  conversationId: Id;
  role: string;
  content: string;
  sourceType: string;
  status: string;
  failureReason?: string;
  createTime?: string;
  citations: AiCitationVO[];
  retrievalInfo?: { hitCount?: number; fallback?: boolean; bestFaqScore?: number; bestDocumentScore?: number };
}
export interface AiConversationStartVO {
  conversation: AiConversationVO;
  message: AiMessageVO;
}
export interface AiStreamEvent {
  event: 'conversation' | 'retrieval' | 'delta' | 'citation' | 'completed' | 'error';
  data: any;
}
