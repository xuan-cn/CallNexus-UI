import type { AgentCallSessionVO, CallDiagnosticBridgeVO, CallDiagnosticLegVO } from '@/api/callcenter/call-record/types';

export type DispatchTopologyStatus = 'NORMAL' | 'SYNCING' | 'STALE';

export interface DispatchActiveCallVO {
  sessionId: string | number;
  businessCallId: string;
  nodeId?: string | number;
  direction?: string;
  callerNumber?: string;
  calledNumber?: string;
  callStatus?: string;
  currentBridgeState?: string;
  queueId?: string | number;
  queueName?: string;
  ownerAgentId?: string | number;
  ownerAgentExtension?: string;
  startedAt?: string;
  answeredAt?: string;
  elapsedSeconds: number;
  activeLegCount: number;
  activeBridgeCount: number;
  visibleAgentCount: number;
  agentExtensions: string[];
  topologyStatus: DispatchTopologyStatus;
  topologyMessage: string;
}

export interface DispatchCallTopologyVO {
  call: DispatchActiveCallVO;
  legs: CallDiagnosticLegVO[];
  bridges: CallDiagnosticBridgeVO[];
  agentSessions: AgentCallSessionVO[];
}
