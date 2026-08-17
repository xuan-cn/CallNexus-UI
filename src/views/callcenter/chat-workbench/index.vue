<template>
  <div class="chat-workbench">
    <aside class="conversation-panel">
      <div class="panel-heading">
        <div>
          <h2>在线会话</h2>
          <span>{{ total }} 个会话</span>
        </div>
        <el-button circle :icon="Refresh" :loading="loading" @click="refreshAll()" />
      </div>

      <el-segmented
        v-model="query.status"
        class="conversation-status-tabs"
        :options="statusOptions"
        @change="handleStatusChange"
      />

      <el-input v-model="query.keyword" class="conversation-search" clearable placeholder="搜索访客、电话或会话编号" @keyup.enter="refreshAll">
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>

      <div v-loading="loading" class="conversation-list">
        <button
          v-for="item in rows"
          :key="item.id"
          class="conversation-item"
          :class="{ active: String(selectedId) === String(item.id) }"
          @click="selectConversation(item)"
        >
          <span class="visitor-avatar">{{ avatarText(item.visitorName) }}</span>
          <span class="conversation-summary">
            <strong>{{ item.visitorName || '访客' }}</strong>
            <small>{{ item.channelName || item.conversationNo }}</small>
          </span>
          <span class="conversation-meta">
            <el-badge v-if="item.unreadAgentCount" :value="item.unreadAgentCount" />
            <small>{{ timeOnly(item.lastMessageAt || item.queuedAt) }}</small>
          </span>
        </button>
        <el-empty v-if="!loading && !rows.length" description="暂无会话" :image-size="72" />
      </div>

      <pagination
        v-show="total > query.pageSize"
        v-model:page="query.pageNum"
        v-model:limit="query.pageSize"
        class="conversation-pagination"
        :total="total"
        :pager-count="5"
        layout="prev, pager, next"
        float="none"
        :auto-scroll="false"
        @pagination="load()"
      />
    </aside>

    <main class="dialog-panel">
      <template v-if="detail">
        <header class="dialog-heading">
          <div>
            <h2>{{ detail.conversation.visitorName || '访客' }}</h2>
            <span>{{ statusLabel(detail.conversation.status) }} · {{ detail.conversation.conversationNo }}</span>
          </div>
          <div class="dialog-actions">
            <el-button
              v-if="detail.conversation.status === 'QUEUING'"
              v-hasPermi="['callcenter:chat-conversation:claim']"
              type="primary"
              @click="claim"
            >
              领取会话
            </el-button>
            <el-button
              v-if="canCloseConversation"
              v-hasPermi="['callcenter:chat-conversation:close']"
              plain
              type="danger"
              @click="closeConversation"
            >
              结束会话
            </el-button>
          </div>
        </header>

        <section ref="messageScroller" class="message-list" @click="handleMessageClick">
          <div v-for="message in detail.messages" :key="message.id" class="message-row" :class="message.senderType.toLowerCase()">
            <div v-if="message.senderType === 'SYSTEM'" class="system-message">{{ message.content }}</div>
            <template v-else>
              <div class="message-author">{{ senderName(message) }}</div>
              <div class="message-bubble" v-html="renderTextWithLinks(message.content)"></div>
              <div class="message-time">{{ timeOnly(message.sentAt) }}</div>
            </template>
          </div>
        </section>

        <footer v-if="canReply" class="message-composer">
          <el-input
            v-model="draft"
            type="textarea"
            :rows="4"
            resize="none"
            maxlength="4000"
            show-word-limit
            placeholder="输入回复，Ctrl + Enter 发送"
            @keydown.ctrl.enter.prevent="send"
          />
          <div class="composer-footer">
            <span>消息将保存到完整会话记录</span>
            <el-button type="primary" :disabled="!draft.trim()" :loading="sending" @click="send">
              发送
            </el-button>
          </div>
        </footer>
        <footer v-else class="message-composer readonly-composer">
          {{ composerHint }}
        </footer>
      </template>

      <el-empty v-else description="从左侧选择一个会话开始处理" />
    </main>

    <aside v-if="detail" class="visitor-panel">
      <h3>访客信息</h3>
      <dl>
        <dt>访客名称</dt>
        <dd>{{ detail.conversation.visitorName || '-' }}</dd>
        <dt>联系电话</dt>
        <dd>{{ detail.conversation.phone || '-' }}</dd>
        <dt>邮箱</dt>
        <dd>{{ detail.conversation.email || '-' }}</dd>
        <dt>接入渠道</dt>
        <dd>{{ detail.conversation.channelName || '-' }}</dd>
        <dt>排队时间</dt>
        <dd>{{ detail.conversation.queuedAt || '-' }}</dd>
        <dt>接待客服</dt>
        <dd>{{ detail.conversation.assignedUserName || '尚未领取' }}</dd>
      </dl>
      <el-alert
        title="客户、工单联动"
        description="第一阶段保留关联字段，下一阶段从这里识别或新建客户、创建工单。"
        type="info"
        :closable="false"
        show-icon
      />
    </aside>
  </div>
</template>

<script setup name="ChatWorkbench" lang="ts">
import { computed, getCurrentInstance, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { Refresh, Search } from '@element-plus/icons-vue';
import { useUserStore } from '@/store/modules/user';
import { copyMiniProgramLinkFromEvent, renderTextWithLinks } from '@/utils/messageLinkify';
import {
  ChatConversationDetailVO,
  ChatConversationVO,
  claimChatConversation,
  closeChatConversation,
  getChatConversation,
  listChatConversations,
  markChatConversationRead,
  sendAgentChatMessage
} from '@/api/callcenter/chat';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;
const userStore = useUserStore();

const loading = ref(false);
const sending = ref(false);
const rows = ref<ChatConversationVO[]>([]);
const total = ref(0);
const selectedId = ref<string | number>();
const detail = ref<ChatConversationDetailVO>();
const draft = ref('');
const messageScroller = ref<HTMLElement>();
const query = reactive({ pageNum: 1, pageSize: 20, status: 'OPEN', keyword: '' });

let pollTimer: number | undefined;
let polling = false;

const statusOptions = [
  { label: '待处理', value: 'OPEN' },
  { label: 'AI接待', value: 'AI_SERVING' },
  { label: '排队', value: 'QUEUING' },
  { label: '服务', value: 'ACTIVE' },
  { label: '结束', value: 'CLOSED' }
];

const statusLabel = (status: string) =>
  ({ AI_SERVING: 'AI接待', QUEUING: '排队中', ACTIVE: '服务中', CLOSED: '已结束', ABANDONED: '已离开' })[status] || status;

const sameId = (left?: string | number, right?: string | number) => left != null && right != null && String(left) === String(right);
const isAssignedToMe = computed(() => sameId(detail.value?.conversation.assignedUserId, userStore.userId));
const canReply = computed(() => detail.value?.conversation.status === 'ACTIVE' && isAssignedToMe.value);
const canMarkRead = computed(() => detail.value?.conversation.status === 'ACTIVE' && isAssignedToMe.value);
const canCloseConversation = computed(() => {
  const status = detail.value?.conversation.status;
  if (status === 'ACTIVE') return isAssignedToMe.value;
  return status === 'AI_SERVING' || status === 'QUEUING';
});

const composerHint = computed(() => {
  const status = detail.value?.conversation.status;
  if (status === 'QUEUING') return '领取会话后可以回复';
  if (status === 'AI_SERVING') return 'AI 正在接待，当前仅可查看会话';
  if (status === 'ACTIVE' && !isAssignedToMe.value) {
    return `该会话由 ${detail.value?.conversation.assignedUserName || '其他坐席'} 接待中，当前仅可查看`;
  }
  if (status === 'CLOSED' || status === 'ABANDONED') return '会话已结束，无法继续回复';
  return '请选择需要处理的会话';
});

const senderName = (message: { senderType: string; senderName?: string }) => {
  if (message.senderType === 'VISITOR') return detail.value?.conversation.visitorName || '访客';
  if (message.senderType === 'AI') return message.senderName || 'AI助手';
  return message.senderName || '客服';
};
const handleMessageClick = async (event: MouseEvent) => {
  const copied = await copyMiniProgramLinkFromEvent(event);
  if (copied) proxy?.$modal.msgSuccess('小程序链接已复制，请在微信中打开');
};

const avatarText = (name?: string) => (name || '访客').trim().slice(0, 1);

const timeOnly = (value?: string) => (value ? value.slice(11, 16) : '');

const createClientMessageId = () => {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const listParams = () => ({
  pageNum: query.pageNum,
  pageSize: query.pageSize,
  status: query.status,
  keyword: query.keyword
});

const sameConversationList = (nextRows: ChatConversationVO[]) => JSON.stringify(nextRows) === JSON.stringify(rows.value);

const load = async (silent = false) => {
  if (!silent) loading.value = true;
  try {
    const res = await listChatConversations(listParams());
    const nextRows = (res.rows || []) as ChatConversationVO[];
    const nextTotal = res.total || 0;
    if (!sameConversationList(nextRows)) rows.value = nextRows;
    if (total.value !== nextTotal) total.value = nextTotal;
  } finally {
    if (!silent) loading.value = false;
  }
};

const loadDetail = async (scroll = false) => {
  if (!selectedId.value) return;
  const previousLast = detail.value?.messages.at(-1)?.id;
  detail.value = (await getChatConversation(selectedId.value)).data;
  if (detail.value.conversation.unreadAgentCount && canMarkRead.value) {
    await markChatConversationRead(selectedId.value);
  }
  if (scroll || previousLast !== detail.value.messages.at(-1)?.id) {
    await nextTick();
    if (messageScroller.value) messageScroller.value.scrollTop = messageScroller.value.scrollHeight;
  }
};

const refreshAll = async (silent = false) => {
  await load(silent);
  await loadDetail();
};

const selectConversation = async (item: ChatConversationVO) => {
  selectedId.value = item.id;
  await loadDetail(true);
};

const handleStatusChange = () => {
  query.pageNum = 1;
  selectedId.value = undefined;
  detail.value = undefined;
  load();
};

const claim = async () => {
  if (!selectedId.value) return;
  await claimChatConversation(selectedId.value);
  proxy?.$modal.msgSuccess('会话领取成功');
  query.status = 'ACTIVE';
  query.pageNum = 1;
  await loadDetail(true);
  await load(true);
};

const send = async () => {
  if (!selectedId.value || !draft.value.trim() || !canReply.value) return;
  sending.value = true;
  try {
    await sendAgentChatMessage(selectedId.value, draft.value.trim(), createClientMessageId());
    draft.value = '';
    await loadDetail(true);
  } finally {
    sending.value = false;
  }
};

const closeConversation = async () => {
  if (!selectedId.value) return;
  await proxy?.$modal.confirm('确认结束本次在线客服会话吗？');
  await closeChatConversation(selectedId.value);
  await refreshAll();
};

const poll = async () => {
  if (polling || document.hidden) return;
  polling = true;
  try {
    await refreshAll(true);
  } finally {
    polling = false;
  }
};

onMounted(async () => {
  await load();
  pollTimer = window.setInterval(poll, 1500);
});

onBeforeUnmount(() => {
  if (pollTimer) window.clearInterval(pollTimer);
});
</script>

<style scoped>
.chat-workbench {
  display: grid;
  grid-template-columns: 310px minmax(480px, 1fr) 280px;
  height: calc(100vh - 136px);
  min-height: 0;
  margin: 8px;
  overflow: hidden;
  border: 1px solid var(--el-border-color-light);
  border-radius: 14px;
  background: var(--el-bg-color);
}

.conversation-panel,
.visitor-panel {
  min-width: 0;
  min-height: 0;
  padding: 18px;
  background: var(--el-fill-color-extra-light);
}

.conversation-panel {
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--el-border-color-light);
}

.panel-heading,
.dialog-heading,
.composer-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

h2,
h3 {
  margin: 0;
}

.panel-heading span,
.dialog-heading span,
.composer-footer span {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.conversation-status-tabs {
  width: 100%;
  margin-top: 12px;
}

.conversation-status-tabs :deep(.el-segmented__item) {
  min-width: 0;
  padding: 0 6px;
}

.conversation-status-tabs :deep(.el-segmented__item-label) {
  overflow: visible;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}

.conversation-search {
  margin: 14px 0 10px;
}

.conversation-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.conversation-pagination {
  display: flex;
  flex-shrink: 0;
  justify-content: center;
  padding-top: 10px;
}

.conversation-pagination :deep(.pagination-container) {
  width: 100%;
}

.conversation-pagination :deep(.el-pagination) {
  justify-content: center;
  width: 100%;
  min-width: 0;
  white-space: nowrap;
}

.conversation-item {
  display: grid;
  grid-template-columns: 42px 1fr auto;
  gap: 10px;
  width: 100%;
  margin-bottom: 7px;
  padding: 11px;
  text-align: left;
  border: 0;
  border-radius: 10px;
  background: transparent;
  cursor: pointer;
}

.conversation-item:hover,
.conversation-item.active {
  background: var(--el-color-primary-light-9);
}

.visitor-avatar {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  color: white;
  border-radius: 50%;
  background: var(--el-color-primary);
}

.conversation-summary,
.conversation-meta {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 5px;
}

.conversation-summary small {
  overflow: hidden;
  color: var(--el-text-color-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation-meta {
  align-items: flex-end;
  color: var(--el-text-color-placeholder);
}

.dialog-panel {
  display: flex;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  flex-direction: column;
}

.dialog-heading {
  min-height: 68px;
  padding: 0 20px;
  border-bottom: 1px solid var(--el-border-color-light);
}

.message-list {
  flex: 1;
  min-height: 0;
  padding: 18px 22px;
  overflow-y: auto;
  background: #f6f8fb;
}

.message-row {
  display: flex;
  min-width: 0;
  max-width: 100%;
  margin-bottom: 18px;
  flex-direction: column;
  align-items: flex-start;
}

.message-row.agent {
  align-items: flex-end;
}

.message-author,
.message-time {
  margin: 0 8px 5px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.message-time {
  margin-top: 5px;
}

.message-bubble {
  min-width: 0;
  max-width: 72%;
  padding: 11px 14px;
  line-height: 1.65;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
  word-break: break-word;
  border-radius: 4px 14px 14px;
  background: white;
  box-shadow: 0 4px 14px rgb(31 45 61 / 6%);
}

.message-bubble :deep(a) {
  color: var(--el-color-primary);
  overflow-wrap: anywhere;
  text-decoration: underline !important;
  text-underline-offset: 2px;
  word-break: break-all;
  cursor: pointer;
}

.message-row.agent .message-bubble {
  color: white;
  border-radius: 14px 4px 14px 14px;
  background: var(--el-color-primary);
}

.message-row.agent .message-bubble :deep(a) {
  color: white;
  text-decoration-color: currentcolor;
}

.system-message {
  align-self: center;
  padding: 5px 12px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  border-radius: 14px;
  background: var(--el-fill-color);
}

.message-composer {
  flex-shrink: 0;
  padding: 12px 18px 14px;
  border-top: 1px solid var(--el-border-color-light);
}

.readonly-composer {
  color: var(--el-text-color-secondary);
  font-size: 13px;
  text-align: center;
  background: var(--el-fill-color-extra-light);
}

.composer-footer {
  margin-top: 10px;
}

.visitor-panel {
  overflow-y: auto;
  border-left: 1px solid var(--el-border-color-light);
}

@media (max-height: 760px) {
  .chat-workbench {
    height: calc(100vh - 112px);
    margin-top: 4px;
    margin-bottom: 4px;
  }

  .conversation-panel,
  .visitor-panel {
    padding: 12px;
  }

  .dialog-heading {
    min-height: 60px;
  }

  .message-composer {
    padding: 10px 14px 12px;
  }
}

.visitor-panel dl {
  display: grid;
  grid-template-columns: 76px 1fr;
  gap: 14px 8px;
  margin: 24px 0;
  font-size: 13px;
}

.visitor-panel dt {
  color: var(--el-text-color-secondary);
}

.visitor-panel dd {
  min-width: 0;
  margin: 0;
  overflow-wrap: anywhere;
}

@media (max-width: 1250px) {
  .chat-workbench {
    grid-template-columns: 290px minmax(440px, 1fr);
  }

  .visitor-panel {
    display: none;
  }
}
</style>
