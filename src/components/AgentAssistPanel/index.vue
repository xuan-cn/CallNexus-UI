<template>
  <section class="agent-assist-panel">
    <header class="assist-header">
      <strong>通话辅助</strong>
      <el-tag :type="connected ? 'success' : 'info'" effect="plain" round>
        {{ connected ? '实时接收中' : '连接中' }}
      </el-tag>
    </header>

    <div ref="transcriptRef" class="assist-transcript">
      <div v-if="dialogueItems.length" class="dialogue-list">
        <article
          v-for="item in dialogueItems"
          :key="String(item.segment.id)"
          class="dialogue-turn"
          :class="`speaker-${String(item.segment.speaker || 'UNKNOWN').toLowerCase()}`"
        >
          <div class="dialogue-item">
            <span class="speaker-label">{{ speakerLabel(item.segment.speaker) }}</span>
            <span class="dialogue-text">{{ item.segment.textContent }}</span>
          </div>

          <div v-if="item.segment.speaker === 'CUSTOMER' && (item.suggestion || detail?.assistAgentId)" class="segment-suggestion">
            <div class="suggestion-heading">
              <span>辅助话术</span>
              <el-tag v-if="item.suggestion?.sourceType" size="small" effect="plain">
                {{ sourceLabel(item.suggestion.sourceType) }}
              </el-tag>
            </div>
            <div v-if="!item.suggestion || item.suggestion.status === 'PROCESSING'" class="assist-thinking">
              <i></i><i></i><i></i><span>正在生成建议</span>
            </div>
            <div v-else-if="item.suggestion.status === 'FAILED'" class="assist-failed">
              <span>{{ item.suggestion.failureReason || '建议生成失败' }}</span>
              <el-button link type="primary" @click="regenerate(item.suggestion)">重新生成</el-button>
            </div>
            <template v-else>
              <div class="suggestion-content">{{ item.suggestion.suggestedReply }}</div>
              <div class="suggestion-actions">
                <el-button link type="primary" @click="copySuggestion(item.suggestion.suggestedReply)">复制话术</el-button>
                <el-button link type="primary" @click="regenerate(item.suggestion)">换一条</el-button>
              </div>
            </template>
          </div>
        </article>
      </div>
      <el-empty v-else description="客户开始说话后，这里会实时显示对话" :image-size="52" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus';
import { getAgentAssist, regenerateAgentAssistSuggestion, streamAgentAssist } from '@/api/callcenter/agent-assist';
import type { AgentAssistDetailVO, AgentAssistStreamEvent, AgentAssistSuggestionVO } from '@/api/callcenter/agent-assist/types';
import type { AiCallTranscriptSegmentVO } from '@/api/callcenter/ai-speech/types';

const props = defineProps<{ businessCallId?: string }>();

const detail = ref<AgentAssistDetailVO>();
const connected = ref(false);
const transcriptRef = ref<HTMLElement>();
let streamController: AbortController | undefined;
let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
let reconcileTimer: ReturnType<typeof setInterval> | undefined;
let streamCallId = '';
let loadingDetail = false;

const callId = computed(() => props.businessCallId?.trim() || '');
const segments = computed(() => detail.value?.transcriptSegments || []);
const dialogueItems = computed(() => {
  const suggestions = new Map((detail.value?.suggestions || []).map((item) => [String(item.transcriptSegmentId), item]));
  return segments.value.map((segment) => ({ segment, suggestion: suggestions.get(String(segment.id)) }));
});

const speakerLabel = (speaker?: string) => ({ CUSTOMER: '客户', AGENT: '坐席', AI: 'AI' })[speaker || ''] || '通话方';
const sourceLabel = (source?: string) => {
  if (!source) return '';
  if (source.startsWith('FAQ')) return 'FAQ';
  if (source === 'DOCUMENT') return '知识文档';
  if (source === 'MODEL') return '模型建议';
  return source;
};

const scrollToBottom = async () => {
  await nextTick();
  transcriptRef.value?.scrollTo({ top: transcriptRef.value.scrollHeight, behavior: 'smooth' });
};

const load = async () => {
  if (!callId.value || loadingDetail) {
    if (!callId.value) detail.value = undefined;
    return;
  }
  loadingDetail = true;
  try {
    detail.value = (await getAgentAssist(callId.value)).data;
    await scrollToBottom();
  } finally {
    loadingDetail = false;
  }
};

const upsertSegment = (segment?: AiCallTranscriptSegmentVO) => {
  if (!segment) return;
  const current = detail.value || ({ businessCallId: callId.value, transcriptSegments: [], suggestions: [] } as AgentAssistDetailVO);
  const index = current.transcriptSegments.findIndex((item) => String(item.id) === String(segment.id));
  if (index >= 0) current.transcriptSegments[index] = segment;
  else current.transcriptSegments.push(segment);
  detail.value = { ...current, transcriptSegments: [...current.transcriptSegments] };
  void scrollToBottom();
};

const upsertSuggestion = (suggestion?: AgentAssistSuggestionVO) => {
  if (!suggestion) return;
  const current = detail.value || ({ businessCallId: callId.value, transcriptSegments: [], suggestions: [] } as AgentAssistDetailVO);
  const index = current.suggestions.findIndex((item) => String(item.id) === String(suggestion.id));
  if (index >= 0) current.suggestions[index] = suggestion;
  else current.suggestions.push(suggestion);
  detail.value = { ...current, suggestions: [...current.suggestions] };
  void scrollToBottom();
};

const handleStreamEvent = (event: string, payload: AgentAssistStreamEvent) => {
  if (event === 'connected') connected.value = true;
  if (event === 'segment') upsertSegment(payload.segment);
  if (event === 'suggestion') upsertSuggestion(payload.suggestion);
};

const stopStream = () => {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = undefined;
  streamController?.abort();
  streamController = undefined;
  streamCallId = '';
  connected.value = false;
};

const stopReconcile = () => {
  if (reconcileTimer) clearInterval(reconcileTimer);
  reconcileTimer = undefined;
};

const startReconcile = () => {
  stopReconcile();
  if (!callId.value) return;
  reconcileTimer = setInterval(() => void load().catch(() => undefined), 2000);
};

const startStream = () => {
  stopStream();
  const currentCallId = callId.value;
  if (!currentCallId) return;
  streamCallId = currentCallId;
  const connect = () => {
    if (streamCallId !== currentCallId) return;
    const controller = new AbortController();
    streamController = controller;
    streamAgentAssist(currentCallId, handleStreamEvent, controller.signal)
      .catch((error) => {
        if (error?.name !== 'AbortError') console.warn('Agent assist stream disconnected', error);
      })
      .finally(() => {
        connected.value = false;
        if (controller.signal.aborted || streamCallId !== currentCallId) return;
        reconnectTimer = setTimeout(connect, 1500);
      });
  };
  connect();
};

const copySuggestion = async (content?: string) => {
  if (!content) return;
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(content);
  } else {
    const textarea = document.createElement('textarea');
    textarea.value = content;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
  }
  ElMessage.success('建议话术已复制');
};

const regenerate = async (suggestion: AgentAssistSuggestionVO) => {
  if (!callId.value) return;
  await regenerateAgentAssistSuggestion(callId.value, suggestion.id);
  suggestion.status = 'PROCESSING';
  suggestion.suggestedReply = undefined;
  suggestion.failureReason = undefined;
  upsertSuggestion(suggestion);
};

watch(
  callId,
  async () => {
    stopStream();
    stopReconcile();
    await load().catch(() => undefined);
    startStream();
    startReconcile();
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  stopStream();
  stopReconcile();
});
</script>

<style scoped lang="scss">
.agent-assist-panel {
  padding: 14px;
  border: 1px solid #dbe7f5;
  border-radius: 12px;
  background: #fff;
}

.assist-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;

  strong {
    color: #17345f;
    font-size: 15px;
  }
}

.assist-transcript {
  min-width: 0;
  min-height: 280px;
  max-height: 560px;
  overflow-y: auto;
  padding: 10px;
  border: 1px solid #e3eaf4;
  border-radius: 10px;
  background: #f7f9fc;
}

.dialogue-list {
  display: grid;
  gap: 12px;
}

.dialogue-turn {
  display: grid;
  min-width: 0;

  &.speaker-agent,
  &.speaker-ai {
    .dialogue-item {
      justify-self: end;
      background: #edf6ff;
    }
  }
}

.dialogue-item {
  display: grid;
  width: min(82%, 560px);
  padding: 8px 11px;
  border: 1px solid transparent;
  border-radius: 11px;
  color: #243552;
  font: inherit;
  text-align: left;
  background: #fff;
}

.speaker-label {
  margin-bottom: 2px;
  color: #8190a6;
  font-size: 11px;
}

.dialogue-text {
  overflow-wrap: anywhere;
  font-size: 13px;
  line-height: 1.6;
}

.segment-suggestion {
  width: min(88%, 590px);
  box-sizing: border-box;
  margin-top: 6px;
  margin-left: 12px;
  padding: 9px 11px;
  border: 1px solid #cfe3fa;
  border-radius: 10px;
  background: #eef6ff;
}

.suggestion-heading,
.suggestion-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.suggestion-heading {
  color: #17345f;
  font-size: 12px;
  font-weight: 700;
}

.suggestion-content {
  margin-top: 6px;
  color: #1d3557;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.suggestion-actions {
  justify-content: flex-end;
  margin-top: 3px;
  color: #97a3b6;
  font-size: 11px;
}

.assist-thinking,
.assist-failed {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  color: #7d899b;
  font-size: 12px;
}

.assist-thinking i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #aeb8c7;
  animation: assist-dot 1.1s ease-in-out infinite;

  &:nth-child(2) {
    animation-delay: 0.14s;
  }

  &:nth-child(3) {
    margin-right: 4px;
    animation-delay: 0.28s;
  }
}

@keyframes assist-dot {
  0%,
  100% {
    transform: translateY(1px);
    opacity: 0.45;
  }
  50% {
    transform: translateY(-4px);
    opacity: 1;
  }
}
</style>
