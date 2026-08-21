<template>
  <div class="chat-workbench">
    <aside class="conversation-panel">
      <div class="panel-heading">
        <div class="panel-heading-copy">
          <h2>在线会话</h2>
          <span class="panel-count">{{ total }} 个会话</span>
        </div>
        <el-button class="refresh-btn" circle plain :icon="Refresh" :loading="loading" @click="refreshAll()" />
      </div>

      <div class="status-chips" role="tablist">
        <button
          v-for="option in statusOptions"
          :key="option.value"
          type="button"
          class="status-chip"
          :class="{ active: query.status === option.value }"
          @click="switchStatus(option.value)"
        >
          {{ option.label }}
        </button>
      </div>

      <el-input
        v-model="query.keyword"
        class="conversation-search"
        clearable
        placeholder="搜索访客、电话或会话编号"
        @keyup.enter="refreshAll"
      >
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
          <span class="visitor-avatar" :data-tone="avatarTone(item.visitorName)">
            {{ avatarText(item.visitorName) }}
            <i v-if="item.unreadAgentCount" class="unread-dot" />
          </span>
          <span class="conversation-body">
            <span class="conversation-top">
              <strong>{{ item.visitorName || '访客' }}</strong>
              <small>{{ timeOnly(item.lastMessageAt || item.queuedAt) }}</small>
            </span>
            <span class="conversation-bottom">
              <em>{{ item.channelName || '未命名渠道' }}</em>
              <span class="mini-status" :data-status="item.status">{{ statusLabel(item.status) }}</span>
            </span>
          </span>
        </button>
        <div v-if="!loading && !rows.length" class="list-empty">
          <div class="list-empty-icon">◎</div>
          <p>当前筛选下暂无会话</p>
        </div>
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
          <div class="dialog-identity">
            <span class="dialog-avatar" :data-tone="avatarTone(detail.conversation.visitorName)">
              {{ avatarText(detail.conversation.visitorName) }}
            </span>
            <div class="dialog-heading-copy">
              <div class="dialog-title-row">
                <h2>{{ detail.conversation.visitorName || '访客' }}</h2>
                <span class="status-pill" :data-status="detail.conversation.status">
                  {{ statusLabel(detail.conversation.status) }}
                </span>
              </div>
              <div class="dialog-sub">
                <span>{{ detail.conversation.channelName || '未命名渠道' }}</span>
                <span class="dot">·</span>
                <span class="conversation-no">{{ detail.conversation.conversationNo }}</span>
              </div>
            </div>
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
          <div
            v-for="(message, index) in detail.messages"
            :key="message.id"
            class="message-row"
            :class="message.senderType.toLowerCase()"
            :style="{ animationDelay: `${Math.min(index, 8) * 28}ms` }"
          >
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
            <span>消息将写入完整会话记录</span>
            <el-button type="primary" :disabled="!draft.trim()" :loading="sending" @click="send">发送</el-button>
          </div>
        </footer>
        <footer v-else class="message-composer readonly-composer">
          <span class="readonly-hint">{{ composerHint }}</span>
        </footer>
      </template>

      <div v-else class="dialog-empty">
        <div class="dialog-empty-card">
          <div class="dialog-empty-icon" aria-hidden="true">
            <el-icon :size="28"><ChatDotRound /></el-icon>
          </div>
          <h3>选择左侧会话开始接待</h3>
          <p>待处理、排队中的访客会出现在左侧列表</p>
        </div>
      </div>
    </main>

    <aside v-if="detail" class="visitor-panel">
      <div class="visitor-hero">
        <span class="visitor-hero-avatar" :data-tone="avatarTone(detail.conversation.visitorName)">
          {{ avatarText(detail.conversation.visitorName) }}
        </span>
        <div>
          <h3>{{ detail.conversation.visitorName || '访客' }}</h3>
          <span class="status-pill" :data-status="detail.conversation.status">
            {{ statusLabel(detail.conversation.status) }}
          </span>
        </div>
      </div>

      <div class="visitor-card">
        <div class="visitor-card-title">联系信息</div>
        <dl>
          <div>
            <dt>联系电话</dt>
            <dd>{{ detail.conversation.phone || '未提供' }}</dd>
          </div>
          <div>
            <dt>邮箱</dt>
            <dd>{{ detail.conversation.email || '未提供' }}</dd>
          </div>
          <div>
            <dt>接入渠道</dt>
            <dd>{{ detail.conversation.channelName || '-' }}</dd>
          </div>
        </dl>
      </div>

      <div class="visitor-card">
        <div class="visitor-card-title">接待进度</div>
        <dl>
          <div>
            <dt>排队时间</dt>
            <dd>{{ formatDateTime(detail.conversation.queuedAt) }}</dd>
          </div>
          <div>
            <dt>接待客服</dt>
            <dd>{{ detail.conversation.assignedUserName || '尚未领取' }}</dd>
          </div>
          <div>
            <dt>关联客户</dt>
            <dd>{{ detail.conversation.customerId ? `客户 #${detail.conversation.customerId}` : '未关联' }}</dd>
          </div>
          <div>
            <dt>关联工单</dt>
            <dd>{{ detail.conversation.ticketId ? `工单 #${detail.conversation.ticketId}` : '未关联' }}</dd>
          </div>
        </dl>
      </div>
    </aside>
  </div>
</template>

<script setup name="ChatWorkbench" lang="ts">
import { computed, getCurrentInstance, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { ChatDotRound, Refresh, Search } from '@element-plus/icons-vue';
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
  { label: '服务中', value: 'ACTIVE' },
  { label: '已结束', value: 'CLOSED' }
];

const statusLabel = (status: string) =>
  ({ AI_SERVING: 'AI接待', QUEUING: '排队中', ACTIVE: '服务中', CLOSED: '已结束', ABANDONED: '已离开', OPEN: '待处理' })[
    status
  ] || status;

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

const avatarTone = (name?: string) => {
  const text = (name || '访客').trim();
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) hash = (hash + text.charCodeAt(i) * (i + 1)) % 4;
  return String(hash);
};

const timeOnly = (value?: string) => (value ? value.slice(11, 16) : '');

const formatDateTime = (value?: string) => {
  if (!value) return '-';
  return value.length >= 16 ? value.slice(0, 16).replace('T', ' ') : value;
};

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

const switchStatus = (status: string) => {
  if (query.status === status) return;
  query.status = status;
  handleStatusChange();
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
  --wb-ink: #15233d;
  --wb-muted: #7b8798;
  --wb-line: #e2ebf5;
  --wb-soft: #f4f8fc;
  --wb-panel: #f7fafd;
  --wb-accent: #2563eb;
  --wb-accent-soft: #eff6ff;
  --wb-success: #0f766e;
  --wb-warn: #b45309;
  --wb-danger: #be123c;
  --wb-ai: #4338ca;

  display: grid;
  grid-template-columns: 312px minmax(460px, 1fr) 286px;
  height: calc(100% - 16px);
  min-height: 0;
  margin: 8px;
  overflow: hidden;
  border: 1px solid var(--wb-line);
  border-radius: 18px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(247, 250, 253, 0.96)),
    radial-gradient(circle at 0% 0%, rgba(37, 99, 235, 0.08), transparent 42%);
  box-shadow: 0 14px 32px rgba(21, 35, 61, 0.06);
}

.conversation-panel,
.visitor-panel {
  min-width: 0;
  min-height: 0;
  padding: 16px;
  background: linear-gradient(180deg, #fbfcfe, var(--wb-panel));
}

.conversation-panel {
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--wb-line);
}

.panel-heading,
.dialog-heading,
.composer-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.panel-heading-copy {
  display: grid;
  gap: 2px;
}

h2,
h3 {
  margin: 0;
  color: var(--wb-ink);
  letter-spacing: -0.02em;
}

.panel-heading h2 {
  font-size: 17px;
  font-weight: 720;
}

.panel-count,
.dialog-sub,
.composer-footer span,
.readonly-hint {
  color: var(--wb-muted);
  font-size: 12px;
}

.refresh-btn {
  border-color: #d7e4f4;
  background: #fff;
}

.status-chips {
  display: flex;
  flex-wrap: nowrap;
  gap: 4px;
  margin-top: 14px;
  overflow-x: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
}

.status-chip {
  flex: 1 1 0;
  min-width: 0;
  padding: 6px 4px;
  color: #5b6b82;
  font-size: 12px;
  font-weight: 650;
  line-height: 1.2;
  text-align: center;
  white-space: nowrap;
  cursor: pointer;
  border: 1px solid transparent;
  border-radius: 999px;
  background: #eef3f9;
  transition: background 0.16s ease, color 0.16s ease, border-color 0.16s ease, transform 0.16s ease;
}

.status-chip:hover {
  transform: translateY(-1px);
  background: #e5eef8;
}

.status-chip.active {
  color: #1d4ed8;
  border-color: #bfdbfe;
  background: #fff;
  box-shadow: 0 6px 14px rgba(37, 99, 235, 0.1);
}

.conversation-search {
  margin: 12px 0 10px;
}

.conversation-search :deep(.el-input__wrapper) {
  border-radius: 12px;
  box-shadow: 0 0 0 1px #dce7f3 inset;
  background: #fff;
}

.conversation-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-right: 2px;
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
  grid-template-columns: 42px 1fr;
  gap: 10px;
  width: 100%;
  margin-bottom: 8px;
  padding: 11px;
  text-align: left;
  cursor: pointer;
  border: 1px solid transparent;
  border-radius: 14px;
  background: transparent;
  transition: border-color 0.16s ease, background 0.16s ease, box-shadow 0.16s ease, transform 0.16s ease;
}

.conversation-item:hover {
  transform: translateY(-1px);
  border-color: #d7e6fb;
  background: #fff;
}

.conversation-item.active {
  border-color: #93c5fd;
  background: linear-gradient(180deg, #f5f9ff, #ebf3ff);
  box-shadow: 0 10px 18px rgba(37, 99, 235, 0.08);
}

.visitor-avatar,
.dialog-avatar,
.visitor-hero-avatar {
  position: relative;
  display: grid;
  place-items: center;
  color: #fff;
  font-weight: 700;
  border-radius: 50%;
  box-shadow: 0 8px 14px rgba(37, 99, 235, 0.18);
}

.visitor-avatar {
  width: 42px;
  height: 42px;
}

.dialog-avatar,
.visitor-hero-avatar {
  width: 44px;
  height: 44px;
  font-size: 16px;
}

.visitor-avatar[data-tone='0'],
.dialog-avatar[data-tone='0'],
.visitor-hero-avatar[data-tone='0'] {
  background: linear-gradient(135deg, #38bdf8, #2563eb);
}

.visitor-avatar[data-tone='1'],
.dialog-avatar[data-tone='1'],
.visitor-hero-avatar[data-tone='1'] {
  background: linear-gradient(135deg, #34d399, #0f766e);
}

.visitor-avatar[data-tone='2'],
.dialog-avatar[data-tone='2'],
.visitor-hero-avatar[data-tone='2'] {
  background: linear-gradient(135deg, #fbbf24, #d97706);
}

.visitor-avatar[data-tone='3'],
.dialog-avatar[data-tone='3'],
.visitor-hero-avatar[data-tone='3'] {
  background: linear-gradient(135deg, #a78bfa, #4f46e5);
}

.unread-dot {
  position: absolute;
  top: 0;
  right: 0;
  width: 9px;
  height: 9px;
  border: 2px solid #fff;
  border-radius: 50%;
  background: #ef4444;
}

.conversation-body {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.conversation-top,
.conversation-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}

.conversation-top strong {
  overflow: hidden;
  color: var(--wb-ink);
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation-top small,
.conversation-bottom em {
  overflow: hidden;
  color: var(--wb-muted);
  font-size: 12px;
  font-style: normal;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation-top small {
  flex: none;
}

.mini-status,
.status-pill {
  display: inline-flex;
  align-items: center;
  flex: none;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 700;
  border-radius: 999px;
  background: #eef2f7;
  color: #475569;
}

.mini-status[data-status='ACTIVE'],
.status-pill[data-status='ACTIVE'] {
  color: #0f766e;
  background: #ccfbf1;
}

.mini-status[data-status='QUEUING'],
.status-pill[data-status='QUEUING'] {
  color: #b45309;
  background: #ffedd5;
}

.mini-status[data-status='AI_SERVING'],
.status-pill[data-status='AI_SERVING'] {
  color: #4338ca;
  background: #e0e7ff;
}

.mini-status[data-status='CLOSED'],
.mini-status[data-status='ABANDONED'],
.status-pill[data-status='CLOSED'],
.status-pill[data-status='ABANDONED'] {
  color: #64748b;
  background: #e2e8f0;
}

.list-empty,
.dialog-empty {
  display: grid;
  place-items: center;
  min-height: 180px;
  color: var(--wb-muted);
  text-align: center;
}

.list-empty-icon {
  margin-bottom: 8px;
  color: #94a3b8;
  font-size: 28px;
}

.list-empty p,
.dialog-empty-card p {
  margin: 0;
  font-size: 13px;
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
  min-height: 72px;
  padding: 14px 18px;
  border-bottom: 1px solid #eef3f8;
  background: linear-gradient(180deg, #ffffff, #f8fbff);
}

.dialog-identity {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
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
    font-weight: 720;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.dialog-sub {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.conversation-no {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dot {
  opacity: 0.55;
}

.dialog-actions {
  display: flex;
  flex: none;
  gap: 8px;
}

.dialog-empty {
  flex: 1;
  background:
    radial-gradient(circle at 50% 28%, rgba(56, 189, 248, 0.12), transparent 40%),
    linear-gradient(180deg, #f8fbff, #f3f6fa);
}

.dialog-empty-card {
  position: relative;
  max-width: 320px;
  padding: 28px 24px;
  border: 1px solid #e4edf7;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 16px 30px rgba(21, 35, 61, 0.06);
  backdrop-filter: blur(8px);
}

.dialog-empty-icon {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  margin: 0 auto 14px;
  color: #2563eb;
  border: 1px solid #dbeafe;
  border-radius: 14px;
  background: linear-gradient(180deg, #eff6ff, #f8fbff);
}

.dialog-empty-card h3 {
  margin-bottom: 6px;
  font-size: 16px;
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
  animation: message-in 0.28s ease both;
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
  border-radius: 4px 16px 16px;
  background: #fff;
  box-shadow: 0 8px 16px rgba(28, 48, 78, 0.05);
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
  border-radius: 16px 4px 16px 16px;
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  box-shadow: 0 12px 20px rgba(37, 99, 235, 0.18);
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
  padding: 6px 12px;
  color: #7b8798;
  font-size: 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid #e8eef6;
  box-shadow: 0 4px 10px rgba(21, 35, 61, 0.04);
}

.message-composer {
  flex-shrink: 0;
  padding: 12px 16px 14px;
  border-top: 1px solid #eef3f8;
  background: linear-gradient(180deg, #ffffff, #f9fbfe);
}

.message-composer :deep(.el-textarea__inner) {
  border-radius: 14px;
  background: #f7faff;
  box-shadow: 0 0 0 1px #e4ecf6 inset;
}

.readonly-composer {
  display: grid;
  place-items: center;
  min-height: 64px;
  text-align: center;
  background: #f7faff;
}

.composer-footer {
  margin-top: 10px;
}

.visitor-panel {
  overflow-y: auto;
  border-left: 1px solid var(--wb-line);
}

.visitor-hero {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
  padding: 12px;
  border: 1px solid #e4ecf6;
  border-radius: 16px;
  background: linear-gradient(180deg, #fff, #f5f9ff);

  h3 {
    margin-bottom: 6px;
    font-size: 15px;
  }
}

.visitor-card {
  margin-bottom: 12px;
  padding: 12px;
  border: 1px solid #e4ecf6;
  border-radius: 14px;
  background: #fff;
}

.visitor-card-title {
  margin-bottom: 10px;
  color: var(--wb-ink);
  font-size: 13px;
  font-weight: 700;
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
  color: var(--wb-muted);
  font-size: 12px;
}

.visitor-panel dd {
  min-width: 0;
  margin: 0;
  color: var(--wb-ink);
  font-size: 13px;
  overflow-wrap: anywhere;
}

@keyframes message-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
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
    min-height: 64px;
  }

  .message-composer {
    padding: 10px 14px 12px;
  }
}

@media (max-width: 1250px) {
  .chat-workbench {
    grid-template-columns: 292px minmax(420px, 1fr);
  }

  .visitor-panel {
    display: none;
  }
}
</style>
