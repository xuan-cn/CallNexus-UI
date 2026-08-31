import type { AiCallTranscriptSegmentVO } from '@/api/callcenter/ai-speech/types';
import type { AiTicketDraftVO } from '@/api/callcenter/ai-ticket-draft';

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
  ticketDraft?: AiTicketDraftVO;
}

export interface AgentAssistStreamEvent {
  businessCallId: string;
  suggestion?: AgentAssistSuggestionVO;
  segment?: AiCallTranscriptSegmentVO;
  ticketDraft?: AiTicketDraftVO;
}
