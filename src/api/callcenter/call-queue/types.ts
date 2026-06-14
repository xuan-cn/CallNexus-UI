export type QueueStrategy = 'LONGEST_IDLE_AGENT' | 'ROUND_ROBIN' | 'TOP_DOWN' | 'RING_ALL';

export interface CallQueueVO {
  id: string | number;
  queueCode: string;
  queueName: string;
  nodeGroupId: string | number;
  nodeGroupName?: string;
  nodeIds?: Array<string | number>;
  skillGroupId: string | number;
  skillGroupName?: string;
  strategy: QueueStrategy;
  waitMediaId?: string | number;
  maxWaitSeconds: number;
  ringTimeoutSeconds: number;
  maxNoAnswer: number;
  wrapUpSeconds: number;
  syncStatus: 'NOT_SYNCED' | 'SYNCED' | 'PARTIAL' | 'FAILED';
  lastSyncedAt?: string;
  syncError?: string;
  enabled: boolean;
  remark?: string;
  version?: number;
  createTime?: string;
}

export interface CallQueueForm extends Omit<CallQueueVO, 'id' | 'nodeGroupName' | 'skillGroupName' | 'syncStatus' | 'lastSyncedAt' | 'syncError' | 'createTime'> {
  id?: string | number;
}
