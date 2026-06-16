export interface VoiceMailBoxVO {
  id: string | number;
  boxCode: string;
  boxName: string;
  promptMediaId: string | number;
  promptMediaName?: string;
  maxSeconds: number;
  silenceThreshold: number;
  silenceHits: number;
  enabled: boolean;
  remark?: string;
  version: number;
  createTime?: string;
}

export interface VoiceMailBoxForm {
  id?: string | number;
  boxCode: string;
  boxName: string;
  promptMediaId?: string | number;
  maxSeconds: number;
  silenceThreshold: number;
  silenceHits: number;
  enabled: boolean;
  remark?: string;
  version?: number;
}

export interface VoiceMailBoxQuery extends PageQuery {
  boxCode?: string;
  boxName?: string;
  enabled?: boolean;
}

export interface VoiceMailMessageVO {
  id: string | number;
  voicemailBoxId: string | number;
  businessCallId?: string;
  callSessionId?: string | number;
  nodeId?: string | number;
  callerNumber?: string;
  calledNumber?: string;
  customerId?: string | number;
  ticketId?: string | number;
  recordingOssId: string | number;
  recordingMediaId: string | number;
  recordingFileName?: string;
  durationMs?: number;
  status: 'UNHANDLED' | 'HANDLED' | 'INVALID';
  handledBy?: string | number;
  handledAt?: string;
  handleRemark?: string;
  playbackUrl?: string;
  createTime?: string;
  version: number;
}

export interface VoiceMailMessageQuery extends PageQuery {
  voicemailBoxId?: string | number;
  callerNumber?: string;
  calledNumber?: string;
  status?: string;
}
