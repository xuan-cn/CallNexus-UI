export type IvrNodeType = 'START' | 'PLAYBACK' | 'DTMF' | 'EXTENSION' | 'QUEUE' | 'BUSINESS_HOURS' | 'VOICEMAIL' | 'AI_AGENT' | 'EXTERNAL_NUMBER' | 'HANGUP';

export interface IvrExternalNumberTarget {
  number: string;
  name?: string;
  sortOrder?: number;
  enabled?: boolean;
}

export interface IvrExternalNumberGroupConfig {
  strategy?: 'ORDER' | 'ROUND_ROBIN' | 'MEMORY';
  outboundPolicyId?: string | number;
  ringTimeoutSeconds?: number;
  failoverEnabled?: boolean;
  numbers?: IvrExternalNumberTarget[];
}

export interface IvrNode {
  id: string;
  type: IvrNodeType;
  name: string;
  x: number;
  y: number;
  config: {
    [key: string]: unknown;
    mediaId?: string | number;
    extension?: string;
    queueId?: string | number;
    planId?: string | number;
    boxId?: string | number;
    aiAgentId?: string | number;
    externalNumberGroup?: IvrExternalNumberGroupConfig;
  };
}

export interface IvrEdge {
  id: string;
  source: string;
  target: string;
  condition?: string;
}

export interface IvrGraph {
  nodes: IvrNode[];
  edges: IvrEdge[];
}

export interface IvrFlowVO {
  id: string | number;
  flowCode: string;
  flowName: string;
  nodeGroupId: string | number;
  nodeGroupName?: string;
  nodeIds: Array<string | number>;
  draftGraphJson: string;
  latestVersionNo: number;
  publishStatus: 'DRAFT' | 'PUBLISHED';
  enabled: boolean;
  remark?: string;
  version: number;
  createTime?: string;
}

export interface IvrFlowForm {
  id?: string | number;
  flowCode: string;
  flowName: string;
  nodeGroupId?: string | number;
  draftGraphJson: string;
  enabled: boolean;
  remark?: string;
  version?: number;
}

export interface IvrFlowVersionVO {
  id: string | number;
  flowId: string | number;
  versionNo: number;
  graphJson?: string;
  status: string;
  publishedAt: string;
  nodeCount: number;
  edgeCount: number;
  nodeTypeCounts: Partial<Record<IvrNodeType, number>>;
  currentVersion: boolean;
}
