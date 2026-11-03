export function testOperationState(status: string | undefined, hasText: boolean, busy: boolean) {
  const active = Boolean(status) && !['COMPLETED', 'TRANSFERRED', 'FAILED', 'TERMINATED'].includes(status!);
  return {
    send: !busy && status === 'WAITING_INPUT' && hasText,
    interrupt: !busy && status === 'WAITING_TTS' && hasText,
    playbackCompleted: !busy && status === 'WAITING_TTS',
    silence: !busy && status === 'WAITING_INPUT',
    stop: !busy && active
  };
}
