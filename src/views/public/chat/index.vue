<template>
  <div class="visitor-chat">
    <div class="chat-shell">
      <header class="chat-header">
        <span class="service-avatar"><el-icon><ChatDotRound /></el-icon></span>
        <div>
          <strong>{{ bootstrap?.channelName || '在线客服' }}</strong>
          <small><i></i> 客服服务中</small>
        </div>
      </header>

      <template v-if="!session.conversationId">
        <main class="start-panel">
          <h2>开始在线咨询</h2>
          <p>{{ bootstrap?.welcomeMessage || '请留下基本信息，我们将尽快为您接入客服。' }}</p>
          <el-form label-position="top">
            <el-form-item label="您的称呼"><el-input v-model="visitor.visitorName" maxlength="128" placeholder="访客" /></el-form-item>
            <el-form-item label="联系电话（选填）"><el-input v-model="visitor.phone" maxlength="64" /></el-form-item>
            <el-form-item label="咨询内容">
              <el-input v-model="visitor.initialMessage" type="textarea" :rows="4" maxlength="1000" show-word-limit />
            </el-form-item>
            <el-button type="primary" size="large" :loading="starting" class="start-button" @click="startConversation">开始咨询</el-button>
          </el-form>
        </main>
      </template>

      <template v-else>
        <main ref="messageScroller" class="visitor-messages">
          <div v-for="message in messages" :key="message.id" class="visitor-message" :class="message.senderType.toLowerCase()">
            <div v-if="message.senderType === 'SYSTEM'" class="system-tip">{{ message.content }}</div>
            <template v-else>
              <small>{{ message.senderType === 'VISITOR' ? '我' : message.senderName || '客服' }}</small>
              <div class="bubble">{{ message.content }}</div>
            </template>
          </div>
          <div v-if="!messages.length" class="waiting">正在为您接入客服…</div>
        </main>
        <footer v-if="!conversationClosed" class="visitor-composer">
          <el-input
            v-model="draft"
            type="textarea"
            :rows="3"
            resize="none"
            maxlength="4000"
            placeholder="请输入消息"
            @keydown.ctrl.enter.prevent="send"
          />
          <div>
            <small>Ctrl + Enter 发送</small>
            <el-button type="primary" :disabled="!draft.trim()" :loading="sending" @click="send">发送</el-button>
          </div>
        </footer>
        <footer v-else class="closed-panel">
          <span>本次咨询已经结束</span>
          <el-button type="primary" plain @click="resetConversation">发起新咨询</el-button>
        </footer>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ChatMessageVO,
  PublicChatBootstrap,
  createPublicChatConversation,
  getPublicChatBootstrap,
  listPublicChatMessages,
  sendPublicChatMessage
} from '@/api/callcenter/chat';

const route = useRoute();
const channelKey = computed(() => String(route.params.channelKey || ''));
const bootstrap = ref<PublicChatBootstrap>();
const messages = ref<ChatMessageVO[]>([]);
const starting = ref(false);
const sending = ref(false);
const draft = ref('');
const messageScroller = ref<HTMLElement>();
const visitor = reactive({ visitorName: '', phone: '', initialMessage: '' });
const session = reactive<{ conversationId?: string | number; visitorToken?: string }>({});
const conversationClosed = computed(() =>
  messages.value.some((message) => message.senderType === 'SYSTEM' && message.content === '本次会话已结束')
);
let pollTimer: number | undefined;
let polling = false;

const storageKey = computed(() => `callnexus-chat:${channelKey.value}`);
const persistSession = () => sessionStorage.setItem(storageKey.value, JSON.stringify(session));
const resetConversation = () => {
  session.conversationId = undefined;
  session.visitorToken = undefined;
  messages.value = [];
  draft.value = '';
  sessionStorage.removeItem(storageKey.value);
};
const restoreSession = () => {
  try {
    Object.assign(session, JSON.parse(sessionStorage.getItem(storageKey.value) || '{}'));
  } catch {
    sessionStorage.removeItem(storageKey.value);
  }
};
const scrollToBottom = async () => {
  await nextTick();
  if (messageScroller.value) messageScroller.value.scrollTop = messageScroller.value.scrollHeight;
};
const loadMessages = async () => {
  if (!session.conversationId || !session.visitorToken || polling) return;
  polling = true;
  try {
    const afterId = messages.value.at(-1)?.id;
    const incoming = (await listPublicChatMessages(session.conversationId, session.visitorToken, afterId)).data || [];
    if (incoming.length) {
      messages.value.push(...incoming);
      await scrollToBottom();
    }
  } finally {
    polling = false;
  }
};
const startConversation = async () => {
  starting.value = true;
  try {
    const created = (
      await createPublicChatConversation(channelKey.value, {
        visitorName: visitor.visitorName || undefined,
        phone: visitor.phone || undefined,
        initialMessage: visitor.initialMessage || undefined
      })
    ).data;
    session.conversationId = created.conversationId;
    session.visitorToken = created.visitorToken;
    persistSession();
    await loadMessages();
  } finally {
    starting.value = false;
  }
};
const send = async () => {
  if (!session.conversationId || !session.visitorToken || !draft.value.trim()) return;
  sending.value = true;
  try {
    await sendPublicChatMessage(session.conversationId, session.visitorToken, draft.value.trim(), crypto.randomUUID());
    draft.value = '';
    await loadMessages();
  } finally {
    sending.value = false;
  }
};

onMounted(async () => {
  bootstrap.value = (await getPublicChatBootstrap(channelKey.value)).data;
  restoreSession();
  await loadMessages();
  pollTimer = window.setInterval(loadMessages, 1200);
});
onBeforeUnmount(() => {
  if (pollTimer) window.clearInterval(pollTimer);
});
</script>

<style scoped>
.visitor-chat {
  display: grid;
  min-height: 100vh;
  place-items: center;
  padding: 0;
  background: #eef3f8;
}
.chat-shell {
  display: flex;
  width: min(100%, 460px);
  height: min(100vh, 720px);
  min-height: 520px;
  flex-direction: column;
  overflow: hidden;
  background: white;
  box-shadow: 0 18px 50px rgb(25 55 88 / 14%);
}
.chat-header {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 76px;
  padding: 0 20px;
  color: white;
  background: linear-gradient(135deg, #0c4a82, #1267ad);
}
.service-avatar {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  font-size: 22px;
  border-radius: 50%;
  background: rgb(255 255 255 / 18%);
}
.chat-header div {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.chat-header small {
  opacity: 0.85;
}
.chat-header i {
  display: inline-block;
  width: 7px;
  height: 7px;
  margin-right: 4px;
  border-radius: 50%;
  background: #4ade80;
}
.start-panel {
  padding: 34px 28px;
}
.start-panel h2 {
  margin: 0 0 8px;
}
.start-panel p {
  margin: 0 0 26px;
  color: var(--el-text-color-secondary);
  line-height: 1.7;
}
.start-button {
  width: 100%;
}
.visitor-messages {
  flex: 1;
  min-height: 0;
  padding: 20px;
  overflow-y: auto;
  background: #f5f7fa;
}
.visitor-message {
  display: flex;
  margin-bottom: 16px;
  flex-direction: column;
  align-items: flex-start;
}
.visitor-message.visitor {
  align-items: flex-end;
}
.visitor-message small {
  margin: 0 6px 5px;
  color: var(--el-text-color-secondary);
}
.bubble {
  max-width: 82%;
  padding: 10px 13px;
  line-height: 1.65;
  white-space: pre-wrap;
  border-radius: 4px 14px 14px;
  background: white;
}
.visitor-message.visitor .bubble {
  color: white;
  border-radius: 14px 4px 14px 14px;
  background: #0c568f;
}
.system-tip,
.waiting {
  align-self: center;
  padding: 5px 12px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  border-radius: 14px;
  background: #e8edf3;
}
.waiting {
  margin: 40px auto;
}
.visitor-composer {
  padding: 12px 14px 14px;
  border-top: 1px solid var(--el-border-color-light);
}
.visitor-composer > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
}
.visitor-composer small {
  color: var(--el-text-color-secondary);
}
.closed-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px;
  color: var(--el-text-color-secondary);
  border-top: 1px solid var(--el-border-color-light);
}
@media (max-width: 520px) {
  .visitor-chat {
    display: block;
  }
  .chat-shell {
    width: 100%;
    height: 100vh;
  }
}
</style>
