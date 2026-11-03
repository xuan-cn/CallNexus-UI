import { describe, expect, it } from 'vitest';
import { testOperationState } from './testOperationState';
describe('test operation availability', () => {
  it('keeps playback operations separate from normal input', () => {
    expect(testOperationState('WAITING_TTS', true, false)).toEqual({
      send: false,
      interrupt: true,
      playbackCompleted: true,
      silence: false,
      stop: true
    });
    expect(testOperationState('WAITING_INPUT', true, false)).toEqual({
      send: true,
      interrupt: false,
      playbackCompleted: false,
      silence: true,
      stop: true
    });
  });
  it('requires text to interrupt and disables operations while busy', () => {
    expect(testOperationState('WAITING_TTS', false, false).interrupt).toBe(false);
    expect(Object.values(testOperationState('WAITING_INPUT', true, true)).every((value) => !value)).toBe(true);
  });
  it('disables all operations before starting and after ending', () => {
    for (const status of [undefined, 'COMPLETED', 'TRANSFERRED', 'FAILED', 'TERMINATED']) {
      expect(Object.values(testOperationState(status, true, false)).every((value) => !value)).toBe(true);
    }
  });
});
