import { describe, expect, it } from 'vitest';
import { idleAgentCallState, reduceAgentCallState } from './agentCallState';

describe('reduceAgentCallState', () => {
  it('does not regress a connected call to a delayed ringing event', () => {
    const connected = reduceAgentCallState(idleAgentCallState(), {
      phase: 'CONNECTED',
      businessCallId: 'call-1',
      agentLegUuid: 'leg-1',
      version: 2
    });
    const result = reduceAgentCallState(connected, {
      phase: 'INCOMING_RINGING',
      businessCallId: 'call-1',
      agentLegUuid: 'leg-1',
      version: 3
    });
    expect(result).toBe(connected);
  });

  it('ignores a hangup event from an older business call', () => {
    const connected = reduceAgentCallState(idleAgentCallState(), {
      phase: 'CONNECTED',
      businessCallId: 'call-new',
      agentLegUuid: 'leg-new',
      version: 10
    });
    const result = reduceAgentCallState(connected, {
      phase: 'ENDED',
      businessCallId: 'call-old',
      agentLegUuid: 'leg-old',
      version: 11
    });
    expect(result).toBe(connected);
  });

  it('ignores delayed ringing from another call while the current call is connected', () => {
    const connected = reduceAgentCallState(idleAgentCallState(), {
      phase: 'CONNECTED',
      businessCallId: 'call-current',
      agentLegUuid: 'leg-current',
      version: 10
    });
    const result = reduceAgentCallState(connected, {
      phase: 'INCOMING_RINGING',
      businessCallId: 'call-old',
      agentLegUuid: 'leg-old',
      version: 11
    });
    expect(result).toBe(connected);
  });

  it('ignores hangup from a replaced agent leg in the same business call', () => {
    const connected = reduceAgentCallState(idleAgentCallState(), {
      phase: 'CONNECTED',
      businessCallId: 'call-1',
      agentLegUuid: 'leg-new',
      version: 20
    });
    const result = reduceAgentCallState(connected, {
      phase: 'ENDED',
      businessCallId: 'call-1',
      agentLegUuid: 'leg-old',
      version: 21
    });
    expect(result).toBe(connected);
  });
});
