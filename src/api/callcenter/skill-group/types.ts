export interface SkillGroupVO {
  id: string | number;
  groupCode: string;
  groupName: string;
  agentIds: Array<string | number>;
  memberCount: number;
  enabled: boolean;
  remark?: string;
  version?: number;
  createTime?: string;
}

export interface SkillGroupForm {
  id?: string | number;
  groupCode: string;
  groupName: string;
  agentIds: Array<string | number>;
  enabled: boolean;
  remark?: string;
  version?: number;
}
