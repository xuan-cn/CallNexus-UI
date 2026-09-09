import type { AiCallTranscriptSegmentVO } from '@/api/callcenter/ai-speech/types';

/**
 * Keep transport and persistence segments intact while presenting one bubble
 * for each consecutive AI response turn.
 */
export const mergeConsecutiveAiSegments = (segments: AiCallTranscriptSegmentVO[]): AiCallTranscriptSegmentVO[] => {
  const merged: AiCallTranscriptSegmentVO[] = [];
  for (const segment of segments) {
    const previous = merged[merged.length - 1];
    if (segment.speaker === 'AI' && previous?.speaker === 'AI') {
      previous.textContent = `${previous.textContent || ''}${segment.textContent || ''}`;
      previous.endMs = segment.endMs ?? previous.endMs;
      previous.finalResult = segment.finalResult;
      continue;
    }
    merged.push({ ...segment });
  }
  return merged;
};
