export type IvrNodeType = 'START' | 'PLAYBACK' | 'DTMF' | 'EXTENSION' | 'HANGUP';

export interface IvrNode {
  id: string;
  type: IvrNodeType;
  name: string;
  x: number;
  y: number;
  config: {
    [key: string]: string | number | boolean | undefined;
    mediaId?: string | number;
    extension?: string;
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
