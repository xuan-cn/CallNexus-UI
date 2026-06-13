export interface NodeGroupVO {
  id: string | number;
  groupCode: string;
  groupName: string;
  nodeIds: Array<string | number>;
  memberCount: number;
  enabled: boolean;
  remark?: string;
  version?: number;
  createTime?: string;
}

export interface NodeGroupForm {
  id?: string | number;
  groupCode: string;
  groupName: string;
  nodeIds: Array<string | number>;
  enabled: boolean;
  remark?: string;
  version?: number;
}
