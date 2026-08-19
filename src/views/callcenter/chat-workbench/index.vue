<template>
  <div class="chat-workbench">
    <aside class="conversation-panel">
      <div class="panel-heading">
        <div>
          <h2>在线会话</h2>
          <span>{{ total }} 个会话</span>
        </div>
        <el-button circle plain :icon="Refresh" :loading="loading" @click="refreshAll()" />
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
          type="button"
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
        <el-empty v-if="!loading && !rows.length" description="暂无会话" :image-size="64" />
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
          <div class="dialog-heading-copy">
            <div class="dialog-title-row">
              <h2>{{ detail.conversation.visitorName || '访客' }}</h2>
              <el-tag size="small" effect="light" round>{{ statusLabel(detail.conversation.status) }}</el-tag>
            </div>
            <span>{{ detail.conversation.conversationNo }}</span>
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
            :rows="3"
            resize="none"
            maxlength="4000"
            show-word-limit
            placeholder="输入回复，Ctrl + Enter 发送"
            @keydown.ctrl.enter.prevent="send"
          />
          <div class="composer-footer">
            <span>消息将保存到完整会话记录</span>
            <el-button type="primary" :disabled="!draft.trim()" :loading="sending" @click="send">发送</el-button>
          </div>
        </footer>
        <footer v-else class="message-composer readonly-composer">
          {{ composerHint }}
        </footer>
      </template>

      <div v-else class="dialog-empty">
        <el-empty description="从左侧选择一个会话开始处理" :image-size="96" />
      </div>
    </main>

    <aside v-if="detail" class="visitor-panel">
      <div class="visitor-panel-head">
        <h3>访客信息</h3>
        <small>接待侧栏</small>
      </div>
      <div class="visitor-card">
        <dl>
          <div><dt>访客名称</dt><dd>{{ detail.conversation.visitorName || '-' }}</dd></div>
          <div><dt>联系电话</dt><dd>{{ detail.conversation.phone || '-' }}</dd></div>
          <div><dt>邮箱</dt><dd>{{ detail.conversation.email || '-' }}</dd></div>
          <div><dt>接入渠道</dt><dd>{{ detail.conversation.channelName || '-' }}</dd></div>
          <div><dt>排队时间</dt><dd>{{ detail.conversation.queuedAt || '-' }}</dd></div>
          <div><dt>接待客服</dt><dd>{{ detail.conversation.assignedUserName || '尚未领取' }}</dd></div>
        </dl>
      </div>
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

<style scoped lang="scss">
.chat-workbench {
  display: grid;
  grid-template-columns: 300px minmax(460px, 1fr) 270px;
  height: calc(100% - 16px);
  min-height: 0;
  margin: 8px;
  overflow: hidden;
  border: 1px solid #dce8f6;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 10px 24px rgba(28, 48, 78, 0.05);
}

.conversation-panel,
.visitor-panel {
  min-width: 0;
  min-height: 0;
  padding: 14px;
  background: linear-gradient(180deg, #f8fbff, #f4f7fb);
}

.conversation-panel {
  display: flex;
  flex-direction: column;
  border-right: 1px solid #e4ecf6;
}

.panel-heading,
.dialog-heading,
.composer-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

h2,
h3 {
  margin: 0;
  color: #15233d;
}

.panel-heading h2 {
  font-size: 16px;
}

.panel-heading span,
.dialog-heading span,
.composer-footer span {
  color: #7b8798;
  font-size: 12px;
}

.conversation-status-tabs {
  width: 100%;
  margin-top: 12px;
  padding: 3px;
  border-radius: 10px;
  background: #eef4fb;
}

.conversation-status-tabs :deep(.el-segmented) {
  background: transparent;
}

.conversation-status-tabs :deep(.el-segmented__item) {
  min-width: 0;
  padding: 0 4px;
}

.conversation-status-tabs :deep(.el-segmented__item-label) {
  overflow: visible;
  color: #5b6b82;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.conversation-status-tabs :deep(.el-segmented__item.is-selected .el-segmented__item-label) {
  color: #1d4ed8;
}

.conversation-search {
  margin: 12px 0 10px;
}

.conversation-search :deep(.el-input__wrapper) {
  border-radius: 10px;
  box-shadow: 0 0 0 1px #e4ecf6 inset;
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
  padding-top: 8px;
}

.conversation-pagination :deep(.pagination-container) {
  width: 100%;
  margin: 0;
  padding: 0;
}

.conversation-pagination :deep(.el-pagination) {
  justify-content: center;
  width: 100%;
  min-width: 0;
  white-space: nowrap;
}

.conversation-item {
  display: grid;
  grid-template-columns: 40px 1fr auto;
  gap: 10px;
  width: 100%;
  margin-bottom: 6px;
  padding: 10px;
  text-align: left;
  cursor: pointer;
  border: 1px solid transparent;
  border-radius: 12px;
  background: transparent;
  transition: border-color 0.16s ease, background 0.16s ease, box-shadow 0.16s ease;
}

.conversation-item:hover {
  border-color: #d7e6fb;
  background: #fff;
}

.conversation-item.active {
  border-color: #93c5fd;
  background: #eff6ff;
  box-shadow: 0 8px 16px rgba(37, 99, 235, 0.08);
}

.visitor-avatar {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  color: #fff;
  font-weight: 700;
  border-radius: 50%;
  background: linear-gradient(135deg, #38bdf8, #2563eb);
  box-shadow: 0 6px 12px rgba(37, 99, 235, 0.2);
}

.conversation-summary,
.conversation-meta {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}

.conversation-summary strong {
  overflow: hidden;
  color: #15233d;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation-summary small {
  overflow: hidden;
  color: #8b97aa;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation-meta {
  align-items: flex-end;
  color: #9aa6b8;
  font-size: 12px;
}

.dialog-panel {
  display: flex;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  flex-direction: column;
  background: #fff;
}

.dialog-heading {
  flex: none;
  min-height: 64px;
  padding: 12px 18px;
  border-bottom: 1px solid #eef3f8;
  background: linear-gradient(180deg, #ffffff, #f8fbff);
}

.dialog-heading-copy {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.dialog-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;

  h2 {
    overflow: hidden;
    font-size: 16px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.dialog-actions {
  display: flex;
  flex: none;
  gap: 8px;
}

.dialog-empty {
  display: grid;
  flex: 1;
  place-items: center;
  background:
    radial-gradient(circle at 50% 30%, rgba(56, 189, 248, 0.1), transparent 42%),
    linear-gradient(180deg, #f8fbff, #f4f7fb);
}

.message-list {
  flex: 1;
  min-height: 0;
  padding: 18px 20px;
  overflow-y: auto;
  background:
    radial-gradient(circle at 100% 0%, rgba(56, 189, 248, 0.08), transparent 34%),
    linear-gradient(180deg, #f8fbff, #f3f6fa);
}

.message-row {
  display: flex;
  min-width: 0;
  max-width: 100%;
  margin-bottom: 16px;
  flex-direction: column;
  align-items: flex-start;
}

.message-row.agent {
  align-items: flex-end;
}

.message-author,
.message-time {
  margin: 0 8px 5px;
  color: #7b8798;
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
  border: 1px solid #e8eef6;
  border-radius: 4px 14px 14px;
  background: #fff;
  box-shadow: 0 6px 14px rgba(28, 48, 78, 0.05);
}

.message-bubble :deep(a) {
  color: #2563eb;
  overflow-wrap: anywhere;
  text-decoration: underline !important;
  text-underline-offset: 2px;
  word-break: break-all;
  cursor: pointer;
}

.message-row.agent .message-bubble {
  color: #fff;
  border-color: transparent;
  border-radius: 14px 4px 14px 14px;
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  box-shadow: 0 10px 18px rgba(37, 99, 235, 0.18);
}

.message-row.agent .message-bubble :deep(a) {
  color: #fff;
  text-decoration-color: currentcolor;
}

.message-row.ai .message-bubble {
  border-color: #d7e6fb;
  background: #f2f7ff;
}

.system-message {
  align-self: center;
  padding: 5px 12px;
  color: #7b8798;
  font-size: 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid #e8eef6;
}

.message-composer {
  flex-shrink: 0;
  padding: 12px 16px 14px;
  border-top: 1px solid #eef3f8;
  background: #fff;
}

.message-composer :deep(.el-textarea__inner) {
  border-radius: 12px;
  background: #f7faff;
  box-shadow: 0 0 0 1px #e4ecf6 inset;
}

.readonly-composer {
  color: #7b8798;
  font-size: 13px;
  text-align: center;
  background: #f7faff;
}

.composer-footer {
  margin-top: 10px;
}

.visitor-panel {
  overflow-y: auto;
  border-left: 1px solid #e4ecf6;
}

.visitor-panel-head {
  margin-bottom: 12px;

  h3 {
    font-size: 15px;
  }

  small {
    color: #7b8798;
    font-size: 12px;
  }
}

.visitor-card {
  margin-bottom: 14px;
  padding: 12px;
  border: 1px solid #e4ecf6;
  border-radius: 12px;
  background: #fff;
}

.visitor-panel dl {
  display: grid;
  gap: 10px;
  margin: 0;
}

.visitor-panel dl > div {
  display: grid;
  grid-template-columns: 72px 1fr;
  gap: 8px;
  align-items: start;
}

.visitor-panel dt {
  color: #7b8798;
  font-size: 12px;
}

.visitor-panel dd {
  min-width: 0;
  margin: 0;
  color: #15233d;
  font-size: 13px;
  overflow-wrap: anywhere;
}

@media (max-height: 760px) {
  .chat-workbench {
    height: calc(100% - 8px);
    margin-top: 4px;
    margin-bottom: 4px;
  }

  .conversation-panel,
  .visitor-panel {
    padding: 12px;
  }

  .dialog-heading {
    min-height: 58px;
  }

  .message-composer {
    padding: 10px 14px 12px;
  }
}

@media (max-width: 1250px) {
  .chat-workbench {
    grid-template-columns: 280px minmax(420px, 1fr);
  }

  .visitor-panel {
    display: none;
  }
}
</style>
