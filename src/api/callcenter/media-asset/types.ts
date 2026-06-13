export type MediaAssetCategory = 'IVR_PROMPT' | 'QUEUE_WAIT_MUSIC' | 'RINGBACK_TONE' | 'USER_MUSIC' | 'CALL_RECORDING';
export type MediaAssetSourceType = 'UPLOAD' | 'TTS' | 'RECORDING' | 'AI_GENERATED';

export interface MediaAssetVO {
  id: string | number;
  assetName: string;
  category: MediaAssetCategory;
  sourceType: MediaAssetSourceType;
  ossId: string | number;
  originalFileName?: string;
  contentType?: string;
  fileSuffix?: string;
  fileSize?: number;
  durationMs?: number;
  sampleRate?: number;
  channels?: number;
  codec?: string;
  languageCode?: string;
  enabled: boolean;
  referenceCount: number;
  latestVersionId?: string | number;
  latestVersionNo?: number;
  currentPublicationId?: string | number;
  publishStatus?: 'DRAFT' | 'PUBLISHING' | 'PARTIAL' | 'PUBLISHED' | 'FAILED' | 'UNPUBLISHED';
  syncSuccessCount?: number;
  syncFailedCount?: number;
  transcriptStatus: 'NONE' | 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED';
  transcriptText?: string;
  summaryText?: string;
  remark?: string;
  playbackUrl?: string;
  version: number;
  createTime: string;
}

export interface MediaVersionVO {
  id: string | number;
  versionNo: number;
  originalFileName?: string;
  fileSize?: number;
  durationMs?: number;
  status: string;
  createTime: string;
}

export interface MediaSyncVO {
  id: string | number;
  publicationId: string | number;
  nodeId: string | number;
  nodeName: string;
  versionNo: number;
  status: string;
  targetPath: string;
  retryCount: number;
  failureReason?: string;
  syncedAt?: string;
}

export interface MediaAssetQuery extends PageQuery {
  assetName?: string;
  category?: MediaAssetCategory;
  sourceType?: MediaAssetSourceType;
  enabled?: boolean;
}

export interface MediaAssetForm {
  id?: string | number;
  assetName: string;
  category: MediaAssetCategory;
  languageCode?: string;
  remark?: string;
  enabled: boolean;
  version?: number;
}

export interface MediaAssetUploadForm {
  assetName: string;
  category: MediaAssetCategory;
  languageCode?: string;
  remark?: string;
  durationMs?: number;
  file: File;
}
