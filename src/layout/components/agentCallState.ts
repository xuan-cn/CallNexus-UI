import type { AgentCallOperation, AgentCallPhase } from '@/api/callcenter/agent/types';

export interface AgentCallState {
  phase: AgentCallPhase;
  operation: AgentCallOperation;
  businessCallId: string;
  agentLegUuid: string;
  version: number;
}

export interface AgentCallTransition {
  phase: AgentCallPhase;
  operation?: AgentCallOperation;
  businessCallId?: string;
  agentLegUuid?: string;
  version?: number;
}

export const idleAgentCallState = (): AgentCallState => ({
  phase: 'IDLE',
  operation: 'NONE',
  businessCallId: '',
  agentLegUuid: '',
  version: 0
});

const isPreConnectPhase = (phase: AgentCallPhase) => phase === 'INCOMING_RINGING' || phase === 'OUTBOUND_DIALING';

export const resolvePreConnectEventPhase = (
  event: { agentExtension: string; callerNumber: string; calledNumber: string; callPhase: unknown },
  isCurrentIdentity: (identity: string) => boolean
): AgentCallPhase | undefined => {
  if (event.agentExtension && !isCurrentIdentity(event.agentExtension)) return;
  if (!event.agentExtension && !isCurrentIdentity(event.callerNumber) && !isCurrentIdentity(event.calledNumber)) return;
  if (event.callPhase) {
    return event.callPhase === 'INCOMING_RINGING' || event.callPhase === 'OUTBOUND_DIALING' ? event.callPhase : undefined;
  }
  // Older events may not carry a phase or a recipient.
  return !isCurrentIdentity(event.callerNumber) && !!event.calledNumber && (event.agentExtension || isCurrentIdentity(event.calledNumber))
    ? 'INCOMING_RINGING'
    : 'OUTBOUND_DIALING';
};

export const reduceAgentCallState = (current: AgentCallState, transition: AgentCallTransition): AgentCallState => {
  const businessCallId = String(transition.businessCallId || '');
  const agentLegUuid = String(transition.agentLegUuid || '');
  const version = Number(transition.version || 0);
  const sameBusinessCall = !current.businessCallId || !businessCallId || current.businessCallId === businessCallId;

  if (!sameBusinessCall) {
    if (transition.phase === 'ENDED' || transition.phase === 'ENDING' || transition.phase === 'IDLE') return current;
    if ((current.phase === 'CONNECTED' || current.phase === 'HELD') && isPreConnectPhase(transition.phase)) return current;
    return {
      phase: transition.phase,
      operation: transition.operation || 'NONE',
      businessCallId,
      agentLegUuid,
      version
    };
  }

  if (version > 0 && current.version > 0 && version <= current.version) return current;
  if ((current.phase === 'CONNECTED' || current.phase === 'HELD') && isPreConnectPhase(transition.phase)) return current;

  if (transition.phase === 'ENDED' || transition.phase === 'ENDING') {
    if (current.agentLegUuid && agentLegUuid && current.agentLegUuid !== agentLegUuid) return current;
  }

  return {
    phase: transition.phase,
    operation: transition.operation || current.operation || 'NONE',
    businessCallId: businessCallId || current.businessCallId,
    agentLegUuid: agentLegUuid || current.agentLegUuid,
    version: version || current.version
  };
};
