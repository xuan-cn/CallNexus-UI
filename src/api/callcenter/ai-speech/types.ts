export interface AiTtsProviderVO {
  id: string | number;
  providerCode: string;
  providerName: string;
  providerType: string;
  endpointUrl: string;
  httpMethod: string;
  authType: string;
  authHeaderName?: string;
  defaultVoice?: string;
  defaultFormat: string;
  defaultSampleRate: number;
  timeoutSeconds: number;
  enabled: boolean;
  remark?: string;
}

export interface AiTtsProviderForm {
  id?: string | number;
  providerCode: string;
  providerName: string;
  providerType: string;
  endpointUrl: string;
  httpMethod: string;
  authType: string;
  authHeaderName?: string;
  authToken?: string;
  defaultVoice?: string;
  defaultFormat: string;
  defaultSampleRate: number;
  timeoutSeconds: number;
  enabled: boolean;
  remark?: string;
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
  status: string;
  failureReason?: string;
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
  sentenceIndex?: number;
  startMs?: number;
  endMs?: number;
  textContent: string;
  finalResult: boolean;
  confidence?: number;
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
