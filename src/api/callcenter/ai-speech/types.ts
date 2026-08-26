export interface AiSpeechProviderVO {
  id: string | number;
  providerCode: string;
  providerName: string;
  providerType: string;
  ttsModel?: string;
  streamingTtsModel?: string;
  recordingAsrModel?: string;
  streamingAsrModel?: string;
  ttsVoice?: string;
  streamingTtsVoice?: string;
  ttsEndpointMode?: 'AUTO' | 'CUSTOM';
  streamingTtsEndpointMode?: 'AUTO' | 'CUSTOM';
  recordingAsrEndpointMode?: 'AUTO' | 'CUSTOM';
  streamingAsrEndpointMode?: 'AUTO' | 'CUSTOM';
  credentialValues?: Record<string, unknown>;
  configuredSecretFields?: string[];
  ttsEnabled: boolean;
  streamingTtsEnabled: boolean;
  recordingAsrEnabled: boolean;
  streamingAsrEnabled: boolean;
  defaultTts: boolean;
  defaultStreamingTts: boolean;
  defaultRecordingAsr: boolean;
  defaultStreamingAsr: boolean;
  endpointUrl: string;
  httpMethod: string;
  authType: string;
  authHeaderName?: string;
  authConfigured?: boolean;
  defaultVoice?: string;
  defaultFormat: string;
  defaultSampleRate: number;
  timeoutSeconds: number;
  streamingTtsEndpointUrl?: string;
  streamingTtsOptionsJson?: string;
  recordingAsrEndpointUrl?: string;
  streamingAsrEndpointUrl?: string;
  asrLanguage: string;
  asrFormat: string;
  asrSampleRate: number;
  asrEnablePunctuation: boolean;
  asrEnableItn: boolean;
  asrEnableIntermediateResult: boolean;
  asrSilenceTimeoutMs: number;
  asrMaxSentenceMs: number;
  asrOptionsJson?: string;
  enabled: boolean;
  lastTestStatus?: 'SUCCESS' | 'FAILED';
  lastTestMessage?: string;
  lastTestTime?: string;
  remark?: string;
}

export interface AiSpeechProviderForm {
  id?: string | number;
  providerCode?: string;
  providerName: string;
  providerType: string;
  ttsModel?: string;
  streamingTtsModel?: string;
  recordingAsrModel?: string;
  streamingAsrModel?: string;
  ttsVoice?: string;
  streamingTtsVoice?: string;
  ttsEndpointMode?: 'AUTO' | 'CUSTOM';
  streamingTtsEndpointMode?: 'AUTO' | 'CUSTOM';
  recordingAsrEndpointMode?: 'AUTO' | 'CUSTOM';
  streamingAsrEndpointMode?: 'AUTO' | 'CUSTOM';
  credentials?: Record<string, unknown>;
  ttsEnabled: boolean;
  streamingTtsEnabled: boolean;
  recordingAsrEnabled: boolean;
  streamingAsrEnabled: boolean;
  defaultTts: boolean;
  defaultStreamingTts: boolean;
  defaultRecordingAsr: boolean;
  defaultStreamingAsr: boolean;
  endpointUrl: string;
  httpMethod: string;
  authType: string;
  authHeaderName?: string;
  authToken?: string;
  defaultVoice?: string;
  defaultFormat: string;
  defaultSampleRate: number;
  timeoutSeconds: number;
  streamingTtsEndpointUrl?: string;
  streamingTtsOptionsJson?: string;
  recordingAsrEndpointUrl?: string;
  streamingAsrEndpointUrl?: string;
  asrLanguage: string;
  asrFormat: string;
  asrSampleRate: number;
  asrEnablePunctuation: boolean;
  asrEnableItn: boolean;
  asrEnableIntermediateResult: boolean;
  asrSilenceTimeoutMs: number;
  asrMaxSentenceMs: number;
  asrOptionsJson?: string;
  enabled: boolean;
  remark?: string;
}

export type SpeechCapability = 'TTS' | 'STREAMING_TTS' | 'RECORDING_ASR' | 'STREAMING_ASR';

export interface SpeechOptionDefinitionVO {
  value: string;
  label: string;
}

export interface SpeechFieldDefinitionVO {
  key: string;
  label: string;
  type: 'TEXT' | 'PASSWORD' | 'SELECT' | 'NUMBER' | 'SWITCH';
  required: boolean;
  secret: boolean;
  placeholder?: string;
  defaultValue?: unknown;
  options: SpeechOptionDefinitionVO[];
  advanced: boolean;
}

export interface SpeechModelDefinitionVO {
  id: string;
  label: string;
  recommended: boolean;
  formats: string[];
  sampleRates: number[];
  voices: SpeechVoiceDefinitionVO[];
  parameterSchema: Record<string, unknown>;
}

export interface SpeechVoiceDefinitionVO {
  id: string;
  label: string;
  recommended: boolean;
}

export interface SpeechCapabilityDefinitionVO {
  capability: SpeechCapability;
  label: string;
  supported: boolean;
  defaultModel?: string;
  models: SpeechModelDefinitionVO[];
  supportsVoiceList: boolean;
  supportsVoicePreview: boolean;
  fields: SpeechFieldDefinitionVO[];
}

export interface SpeechProviderDefinitionVO {
  providerType: string;
  label: string;
  description: string;
  credentialFields: SpeechFieldDefinitionVO[];
  capabilities: Partial<Record<SpeechCapability, SpeechCapabilityDefinitionVO>>;
}

export interface SpeechCapabilityCatalogVO {
  models: SpeechModelDefinitionVO[];
  voices: SpeechVoiceDefinitionVO[];
}

export interface SpeechProviderCatalogVO {
  providerId: string | number;
  providerType: string;
  catalogVersion: string;
  source: 'DYNAMIC' | 'BUILT_IN';
  refreshedAt: string;
  capabilities: Partial<Record<SpeechCapability, SpeechCapabilityCatalogVO>>;
  message: string;
}

export interface AiSpeechTemplateVO {
  id: string | number;
  templateCode: string;
  templateName: string;
  businessType: string;
  templateText: string;
  defaultVoice?: string;
  enabled: boolean;
  remark?: string;
}

export interface AiSpeechTemplateForm {
  id?: string | number;
  templateCode: string;
  templateName: string;
  businessType: string;
  templateText: string;
  defaultVoice?: string;
  enabled: boolean;
  remark?: string;
}

export interface AiSpeechTaskQuery extends PageQuery {
  taskType?: string;
  businessType?: string;
  status?: string;
}

export interface AiSpeechTaskVO {
  id: string | number;
  taskType: string;
  businessType: string;
  businessId?: string | number;
  providerId?: string | number;
  providerType?: string;
  voiceName?: string;
  textContent?: string;
  outputMediaId?: string | number;
  status: string;
  failureReason?: string;
  startedAt?: string;
  finishedAt?: string;
  createTime?: string;
}

export interface TtsTestForm {
  text: string;
  voice?: string;
  format?: string;
  sampleRate?: number;
}

export interface TtsTestVO {
  mediaId?: string | number;
  playbackUrl?: string;
  status?: string;
  failureReason?: string;
}

export interface AsrTestSegmentVO {
  sentenceIndex?: number;
  startMs?: number;
  endMs?: number;
  text: string;
  confidence?: number;
  finalResult: boolean;
}

export interface AsrTestVO {
  fullText: string;
  segments: AsrTestSegmentVO[];
}

export interface SpeechProviderTestVO {
  testType: string;
  status: 'SUCCESS' | 'FAILED';
  message: string;
  durationMs: number;
}

export interface AiGeneratedMediaVO {
  businessType: string;
  businessId: string | number;
  mediaId?: string | number;
  taskId?: string | number;
  generationStatus: string;
  generatedAt?: string;
  failureReason?: string;
  syncedPath?: string;
}

export interface AiCallTranscriptSegmentVO {
  id: string | number;
  speaker: string;
  sourceType?: string;
  legUuid?: string;
  agentId?: string | number;
  sentenceIndex?: number;
  startMs?: number;
  endMs?: number;
  messageTime?: string;
  textContent: string;
  finalResult: boolean;
  confidence?: number;
}

export interface AiCallTranscriptStreamEvent {
  callSessionId: string | number;
  transcriptId?: string | number;
  segment?: AiCallTranscriptSegmentVO;
}

export interface AiCallTranscriptVO {
  id: string | number;
  callSessionId: string | number;
  businessCallId: string;
  providerId?: string | number;
  providerType?: string;
  inputMediaId?: string | number;
  recordingOssId?: string | number;
  status: 'PROCESSING' | 'SUCCESS' | 'FAILED';
  fullText?: string;
  failureReason?: string;
  startedAt?: string;
  finishedAt?: string;
  createTime?: string;
  segments?: AiCallTranscriptSegmentVO[];
}

export interface AiCallRecordQuery extends PageQuery {
  participantNumber?: string;
  callerNumber?: string;
  calledNumber?: string;
  agentExtension?: string;
  callStatus?: string;
}

export interface AiCallRecordVO {
  transcriptId: string | number;
  callSessionId: string | number;
  businessCallId: string;
  nodeId?: string | number;
  direction?: string;
  callerNumber?: string;
  calledNumber?: string;
  agentId?: string | number;
  agentExtension?: string;
  ownerAgentId?: string | number;
  ownerAgentExtension?: string;
  handlingQueueId?: string | number;
  handlingQueueName?: string;
  callStatus?: string;
  startedAt?: string;
  answeredAt?: string;
  endedAt?: string;
  durationSeconds?: number;
  billableSeconds?: number;
  hangupCause?: string;
  recordingOssId?: string | number;
  recordingMediaId?: string | number;
  recordingFileName?: string;
  recordingStatus?: string;
  recordingUrl?: string;
  transcriptStatus?: 'PROCESSING' | 'SUCCESS' | 'FAILED';
  transcriptFailureReason?: string;
  transcriptStartedAt?: string;
  transcriptFinishedAt?: string;
  segmentCount?: number;
  customerSegmentCount?: number;
  aiSegmentCount?: number;
  agentSegmentCount?: number;
}
