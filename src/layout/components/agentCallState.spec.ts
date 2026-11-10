import { describe, expect, it } from 'vitest';
import { idleAgentCallState, reduceAgentCallState, resolvePreConnectEventPhase } from './agentCallState';

describe('resolvePreConnectEventPhase', () => {
  const isCurrentIdentity = (identity: string) => identity === '1002';

  it('uses the target phase even when the display numbers are missing', () => {
    expect(
      resolvePreConnectEventPhase({ agentExtension: '1002', callerNumber: '', calledNumber: '', callPhase: 'INCOMING_RINGING' }, isCurrentIdentity)
    ).toBe('INCOMING_RINGING');
  });

  it('does not ring the peer just because the peer appears in display numbers', () => {
    expect(
      resolvePreConnectEventPhase(
        { agentExtension: '1001', callerNumber: '1002', calledNumber: '1001', callPhase: 'INCOMING_RINGING' },
        isCurrentIdentity
      )
    ).toBeUndefined();
  });

  it('preserves outbound phase and supports older events without a phase', () => {
    const event = { agentExtension: '1002', callerNumber: '1001', calledNumber: '1002' };
    expect(resolvePreConnectEventPhase({ ...event, callPhase: 'OUTBOUND_DIALING' }, isCurrentIdentity)).toBe('OUTBOUND_DIALING');
    expect(resolvePreConnectEventPhase({ ...event, callPhase: undefined }, isCurrentIdentity)).toBe('INCOMING_RINGING');
  });
});

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
