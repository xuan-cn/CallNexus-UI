import type { AiCallTranscriptSegmentVO } from '@/api/callcenter/ai-speech/types';

export interface AgentAssistSuggestionVO {
  id: string | number;
  transcriptSegmentId: string | number;
  customerText: string;
  suggestedReply?: string;
  sourceType?: string;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  failureReason?: string;
  processingMs?: number;
  createTime?: string;
}

export interface AgentAssistDetailVO {
  sessionId?: string | number;
  callSessionId?: string | number;
  businessCallId: string;
  skillGroupId?: string | number;
  assistAgentId?: string | number;
  assistAgentName?: string;
  sessionState?: string;
  transcriptSegments: AiCallTranscriptSegmentVO[];
  suggestions: AgentAssistSuggestionVO[];
}

export interface AgentAssistStreamEvent {
  businessCallId: string;
  suggestion?: AgentAssistSuggestionVO;
  segment?: AiCallTranscriptSegmentVO;
}
