<template>
  <div class="assistant-shell">
    <div class="conversation-row">
      <el-select v-model="conversationId" clearable placeholder="历史对话" @change="loadMessages">
        <el-option v-for="item in conversations" :key="item.id" :label="item.title" :value="item.id" />
      </el-select>
      <el-tooltip content="删除当前对话" placement="top">
        <el-button icon="Delete" circle plain type="danger" :disabled="!conversationId || sending" @click="removeConversation" />
      </el-tooltip>
      <el-button plain type="danger" :disabled="!conversations.length || sending" @click="clearConversations">清空</el-button>
      <el-button icon="Plus" @click="newConversation">新对话</el-button>
      <el-button icon="Refresh" circle @click="loadConversations" />
    </div>
    <div ref="messageBox" class="message-box">
      <el-empty v-if="!messages.length" description="正在创建新对话" />
      <div v-for="(message, index) in messages" :key="message.id || index" class="message" :class="message.role.toLowerCase()">
        <div class="message-label">
          {{ message.role === 'USER' ? '我' : agentName }}
          <el-tag v-if="message.role === 'ASSISTANT' && message.sourceType" size="small" type="info" :title="retrievalDetail(message)">
            {{ sourceText(message.sourceType) }}
          </el-tag>
        </div>
        <el-collapse v-if="message.role === 'ASSISTANT' && retrievalHitCount(message)" class="retrieval-panel">
          <el-collapse-item>
            <template #title>
              <div class="retrieval-title">
                <el-icon><Collection /></el-icon>
                <span>知识库搜索</span>
                <small>命中 {{ retrievalHitCount(message) }} 条</small>
              </div>
            </template>
            <div v-for="(citation, citationIndex) in message.citations" :key="citationIndex" class="citation">
              <div class="citation-heading">
                <b>{{ citation.sourceName }}</b>
                <span>{{ citation.sourceLocation }}</span>
                <small>相似度 {{ Number(citation.score).toFixed(4) }}</small>
              </div>
              <p>{{ citation.quotedContent }}</p>
            </div>
          </el-collapse-item>
        </el-collapse>
        <div
          v-if="message.role === 'ASSISTANT' && message.status === 'PROCESSING' && !message.content"
          class="message-content typing-indicator"
          role="status"
          aria-label="正在生成回答"
        >
          <span></span><span></span><span></span>
        </div>
        <div v-else class="message-content" v-html="safeMarkdown(message.content || '')"></div>
      </div>
    </div>
    <div class="composer">
      <el-input
        v-model="question"
        type="textarea"
        :rows="3"
        resize="none"
        placeholder="输入问题，Ctrl + Enter 发送"
        @keydown.ctrl.enter.prevent="send"
      />
      <div class="composer-actions">
        <span class="text-gray-400">回答将标明知识来源</span>
        <el-button type="primary" :loading="sending" :disabled="!question.trim()" @click="send">发送</el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  clearAiConversations,
  deleteAiConversation,
  listAiConversations,
  listAiMessages,
  startAiConversation,
  streamAiChat
} from '@/api/callcenter/ai-knowledge';
import type { AiCitationVO, AiConversationVO, AiMessageVO, Id } from '@/api/callcenter/ai-knowledge/types';

const props = defineProps<{ agentId: Id; agentName: string }>();
const { proxy } = getCurrentInstance() as ComponentInternalInstance;
const sending = ref(false);
const question = ref('');
const conversations = ref<AiConversationVO[]>([]);
const messages = ref<AiMessageVO[]>([]);
const conversationId = ref<Id>();
const messageBox = ref<HTMLElement>();
let controller: AbortController | undefined;
let typingTimer: ReturnType<typeof setInterval> | undefined;
let typingTarget: AiMessageVO | undefined;
const typingQueue: string[] = [];
const typingWaiters: Array<() => void> = [];

const finishTyping = () => {
  if (typingTimer) clearInterval(typingTimer);
  typingTimer = undefined;
  typingTarget = undefined;
  typingWaiters.splice(0).forEach((resolve) => resolve());
};

const startTyping = () => {
  if (typingTimer) return;
  typingTimer = setInterval(() => {
    const character = typingQueue.shift();
    if (character !== undefined && typingTarget) {
      typingTarget.content += character;
      scroll();
    }
    if (!typingQueue.length) finishTyping();
  }, 16);
};

const enqueueTyping = (target: AiMessageVO, content: string) => {
  if (!content) return;
  typingTarget = target;
  typingQueue.push(...Array.from(content));
  startTyping();
};

const waitForTyping = () => {
  if (!typingTimer && !typingQueue.length) return Promise.resolve();
  return new Promise<void>((resolve) => typingWaiters.push(resolve));
};

const resetTyping = () => {
  typingQueue.splice(0);
  finishTyping();
};

const loadConversations = async () => {
  conversations.value = (await listAiConversations(props.agentId)).data || [];
};
const loadMessages = async () => {
  messages.value = conversationId.value ? (await listAiMessages(conversationId.value)).data || [] : [];
  scroll();
};
const beginConversation = async () => {
  const response = await startAiConversation(props.agentId);
  conversationId.value = response.data.conversation.id;
  messages.value = [response.data.message];
  question.value = '';
  await loadConversations();
  scroll();
};
const reset = async () => {
  controller?.abort();
  controller = undefined;
  resetTyping();
  conversationId.value = undefined;
  conversations.value = [];
  messages.value = [];
  await loadConversations();
  await beginConversation();
};
const newConversation = async () => {
  conversationId.value = undefined;
  messages.value = [];
  await beginConversation();
};
const removeConversation = async () => {
  if (!conversationId.value || sending.value) return;
  await proxy?.$modal.confirm('确认删除当前历史对话吗？删除后无法在界面恢复。');
  await deleteAiConversation(conversationId.value);
  conversationId.value = undefined;
  messages.value = [];
  await loadConversations();
  if (conversations.value.length) {
    conversationId.value = conversations.value[0].id;
    await loadMessages();
  } else {
    await beginConversation();
  }
  proxy?.$modal.msgSuccess('历史对话已删除');
};
const clearConversations = async () => {
  if (!conversations.value.length || sending.value) return;
  await proxy?.$modal.confirm('确认清空当前 AI 助手的全部历史对话吗？清空后无法在界面恢复。');
  await clearAiConversations(props.agentId);
  conversationId.value = undefined;
  conversations.value = [];
  messages.value = [];
  await beginConversation();
  proxy?.$modal.msgSuccess('历史对话已清空，已创建新对话');
};
const send = async () => {
  if (!question.value.trim() || sending.value) return;
  const text = question.value.trim();
  question.value = '';
  messages.value.push({
    id: `u-${Date.now()}`,
    conversationId: conversationId.value || '',
    role: 'USER',
    content: text,
    sourceType: 'USER',
    status: 'COMPLETED',
    citations: []
  });
  const answer = reactive<AiMessageVO>({
    id: `a-${Date.now()}`,
    conversationId: conversationId.value || '',
    role: 'ASSISTANT',
    content: '',
    sourceType: '',
    status: 'PROCESSING',
    citations: []
  });
  messages.value.push(answer);
  sending.value = true;
  controller = new AbortController();
  scroll();
  try {
    await streamAiChat(
      props.agentId,
      { conversationId: conversationId.value, message: text },
      ({ event, data }) => {
        if (event === 'conversation') {
          conversationId.value = data.conversationId;
          answer.conversationId = data.conversationId;
        } else if (event === 'retrieval') {
          answer.sourceType = data.sourceType;
          answer.retrievalInfo = data;
        } else if (event === 'delta') {
          enqueueTyping(answer, data.content || '');
        } else if (event === 'citation') {
          answer.citations.push({
            sourceType: data.sourceType,
            sourceName: data.sourceName,
            sourceLocation: data.location,
            quotedContent: data.content,
            score: data.score
          } as AiCitationVO);
        } else if (event === 'completed') {
          answer.id = data.messageId;
          answer.status = 'COMPLETED';
        } else if (event === 'error') {
          resetTyping();
          answer.content = data.message;
          answer.status = 'FAILED';
        }
        scroll();
      },
      controller.signal
    );
    await waitForTyping();
    await loadConversations();
  } catch (error: any) {
    if (error?.name !== 'AbortError') {
      resetTyping();
      answer.content = error?.message || 'AI 对话失败';
      answer.status = 'FAILED';
    }
  } finally {
    sending.value = false;
    controller = undefined;
    scroll();
  }
};
const abort = () => {
  controller?.abort();
  controller = undefined;
  resetTyping();
};
const scroll = () =>
  nextTick(() => {
    if (messageBox.value) messageBox.value.scrollTop = messageBox.value.scrollHeight;
  });
const sourceText = (value: string) =>
  ({
    GREETING: '开场白',
    FAQ_EXACT: 'FAQ 精确',
    FAQ_SEMANTIC: 'FAQ 语义',
    DOCUMENT: '知识文档',
    DOCUMENT_DIRECT: '知识原文',
    MODEL: '模型通用',
    STRICT: '知识未命中'
  })[value] || value;
const retrievalDetail = (message: AiMessageVO) => {
  const info = message.retrievalInfo;
  if (!info) return '';
  const values = [`命中 ${info.hitCount || 0} 条`];
  if (info.bestFaqScore != null) values.push(`FAQ 最高 ${Number(info.bestFaqScore).toFixed(4)}`);
  if (info.bestDocumentScore != null) values.push(`文档最高 ${Number(info.bestDocumentScore).toFixed(4)}`);
  return values.join('，');
};
const retrievalHitCount = (message: AiMessageVO) => Number(message.retrievalInfo?.hitCount || message.citations?.length || 0);
const safeMarkdown = (value: string) => {
  const escaped = (value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  return escaped
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/^### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/^# (.+)$/gm, '<h2>$1</h2>')
    .replace(/\n/g, '<br>');
};

watch(() => props.agentId, reset, { immediate: true });
onBeforeUnmount(abort);
</script>

<style scoped>
.assistant-shell {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.conversation-row {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) auto auto auto auto;
  gap: 8px;
}
.message-box {
  flex: 1;
  min-height: 280px;
  overflow: auto;
  background: #f6f8fb;
  border-radius: 12px;
  padding: 16px;
}
.message {
  margin-bottom: 16px;
  max-width: 92%;
}
.message.user {
  margin-left: auto;
}
.message-label {
  font-size: 12px;
  color: #64748b;
  margin-bottom: 5px;
  display: flex;
  gap: 6px;
  align-items: center;
}
.message-content {
  padding: 11px 13px;
  border-radius: 10px;
  background: #fff;
  font-size: 14px;
  line-height: 1.7;
  word-break: break-word;
}
.typing-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 46px;
}
.typing-indicator span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #b8c0cc;
  animation: typing-bounce 1.1s ease-in-out infinite;
}
.typing-indicator span:nth-child(2) {
  animation-delay: 0.14s;
}
.typing-indicator span:nth-child(3) {
  animation-delay: 0.28s;
}
@keyframes typing-bounce {
  0%,
  60%,
  100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-5px);
  }
}
.user .message-content {
  background: #053b70;
  color: #fff;
}
.retrieval-panel {
  margin: 0 0 7px;
  border: 0;
  --el-collapse-border-color: transparent;
}
.retrieval-panel :deep(.el-collapse-item__header) {
  height: 44px;
  padding: 0 14px;
  border: 0;
  border-radius: 10px;
  background: #eef1f6;
  color: #25324b;
}
.retrieval-panel :deep(.el-collapse-item__wrap) {
  border: 0;
  background: transparent;
}
.retrieval-panel :deep(.el-collapse-item__content) {
  padding: 4px 14px 2px;
}
.retrieval-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}
.retrieval-title small {
  color: #8a94a6;
  font-weight: 400;
}
.citation {
  padding: 12px 0;
  border-bottom: 1px solid #e5e7eb;
}
.citation:last-child {
  border-bottom: 0;
}
.citation-heading {
  display: flex;
  align-items: center;
  gap: 8px;
}
.citation-heading span {
  color: #64748b;
}
.citation-heading small {
  margin-left: auto;
  color: #8a94a6;
}
.citation p {
  margin: 7px 0 0;
  color: #4b5563;
  line-height: 1.65;
  white-space: pre-wrap;
}
.composer {
  border-top: 1px solid #e5e7eb;
  padding-top: 10px;
}
.composer-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  font-size: 12px;
}
</style>
