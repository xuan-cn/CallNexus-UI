<template>
  <div ref="phoneShellRef" class="agent-phone-shell" :class="{ incoming: incomingCall }" :style="phonePositionStyle">
    <button v-if="!panelOpen" type="button" class="toolbar-trigger" :class="{ calling: callActive, incoming: incomingCall }" @click="handleTriggerClick">
      <span class="trigger-icon" :class="{ incoming: incomingCall }">
        <el-icon><PhoneFilled /></el-icon>
      </span>
      <div>
        <strong>{{ incomingCall ? incomingNumber : callActive ? dialNumber : currentAgent.agentName || '坐席电话' }}</strong>
        <small>{{ incomingCall ? '来电振铃中' : callActive ? `通话中 · ${callDuration}` : agentSummary }}</small>
      </div>
      <i :class="statusClass"></i>
    </button>

    <aside v-else class="agent-panel">
      <div class="panel-heading" @pointerdown="startDrag">
        <div>
          <strong>{{ currentAgent.agentName || '坐席电话' }}</strong
          ><small>{{ extensionSummary }} · {{ registrationSummary }}</small>
        </div>
        <div class="heading-actions">
          <el-dropdown trigger="click" @command="changeStatus">
            <button type="button" class="agent-status" :class="statusClass">
              <i></i>{{ signedIn ? currentStatusLabel : '未签入' }}<el-icon><ArrowDown /></el-icon>
            </button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item v-if="!signedIn" command="signIn">签入坐席</el-dropdown-item>
                <template v-else>
                  <el-dropdown-item command="idle">示闲</el-dropdown-item>
                  <el-dropdown-item command="busy">示忙</el-dropdown-item>
                  <el-dropdown-item command="afterCall">话后处理</el-dropdown-item>
                  <el-dropdown-item divided command="signOut">签出坐席</el-dropdown-item>
                </template>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <button type="button" class="collapse-button" aria-label="收起坐席电话" @click="panelOpen = false">
            <el-icon><CloseBold /></el-icon>
          </button>
        </div>
      </div>

      <template v-if="incomingCall">
        <div class="active-call incoming-call">
          <span class="call-pulse"
            ><el-icon><PhoneFilled /></el-icon
          ></span>
          <small>来电振铃中，请在软电话接听</small><strong>{{ incomingNumber }}</strong>
          <span>等待接听</span>
        </div>
        <div class="call-actions">
          <button type="button" @click="createCustomer">
            <el-icon><User /></el-icon>新建客户
          </button>
          <button type="button" @click="createTicket">
            <el-icon><Tickets /></el-icon>创建工单
          </button>
        </div>
        <button type="button" class="hangup-button" @click="hangup">
          <el-icon><CloseBold /></el-icon>挂断电话
        </button>
      </template>

      <template v-else-if="!callActive">
        <div class="dial-input">
          <el-icon><Phone /></el-icon>
          <input v-model="dialNumber" :disabled="!phoneRegistered" maxlength="20" placeholder="输入号码在线拨打" @keyup.enter="makeCall" />
          <button v-if="dialNumber" type="button" class="clear-number" @click="dialNumber = ''">
            <el-icon><CloseBold /></el-icon>
          </button>
        </div>
        <div class="dial-pad">
          <button v-for="key in dialKeys" :key="key" type="button" :disabled="!phoneRegistered" @click="appendNumber(key)">{{ key }}</button>
        </div>
        <button type="button" class="call-button" :disabled="!phoneRegistered || !dialNumber" @click="makeCall">
          <el-icon><PhoneFilled /></el-icon>拨打电话
        </button>
      </template>

      <template v-else>
        <div class="active-call">
          <span class="call-pulse"
            ><el-icon><PhoneFilled /></el-icon
          ></span>
          <small>软电话正在呼叫</small><strong>{{ dialNumber }}</strong
          ><span>{{ callDuration }}</span>
        </div>
        <div class="call-actions">
          <button type="button" @click="createCustomer">
            <el-icon><User /></el-icon>新建客户
          </button>
          <button type="button" @click="createTicket">
            <el-icon><Tickets /></el-icon>创建工单
          </button>
        </div>
        <button type="button" class="hangup-button" @click="hangup">
          <el-icon><CloseBold /></el-icon>挂断电话
        </button>
      </template>
    </aside>
    <dynamic-business-form-dialog v-model="customerDialogVisible" business-type="CUSTOMER" :phone-number="dialNumber" :call-id="activeCallId" />
    <dynamic-business-form-dialog v-model="ticketDialogVisible" business-type="TICKET" :phone-number="dialNumber" :call-id="activeCallId" />
  </div>
</template>

<script setup lang="ts">
import { ArrowDown, CloseBold, Phone, PhoneFilled, Tickets, User } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { changeCurrentAgentStatus, getCurrentAgent, signInCurrentAgent, signOutCurrentAgent } from '@/api/callcenter/agent';
import { AgentPresenceStatus, CurrentAgentVO } from '@/api/callcenter/agent/types';
import { hangupCall, originateCall } from '@/api/callcenter/call';
import { subscribeCallEvents } from '@/utils/websocket';
import DynamicBusinessFormDialog from './DynamicBusinessFormDialog.vue';

type AgentStatus = 'idle' | 'busy' | 'afterCall';
type StatusCommand = AgentStatus | 'signIn' | 'signOut';

const panelOpen = ref(false);
const phoneShellRef = ref<HTMLElement>();
const phonePosition = reactive({ left: 0, top: 0 });
const signedIn = ref(false);
const agentStatus = ref<AgentStatus>('idle');
const currentAgent = ref<CurrentAgentVO>({ configured: false, status: 'OFFLINE' });
const dialNumber = ref('');
const callActive = ref(false);
const incomingCall = ref(false);
const incomingNumber = ref('');
const activeCallId = ref('');
const callSeconds = ref(0);
const customerDialogVisible = ref(false);
const ticketDialogVisible = ref(false);
const phoneRegistered = computed(() => signedIn.value && Boolean(currentAgent.value.extension));
const registrationSummary = computed(() => {
  if (!signedIn.value) return '未签入';
  return currentAgent.value.extension ? '外置软电话' : '未绑定分机';
});
let callTimer: ReturnType<typeof setInterval> | undefined;
let ringTimer: ReturnType<typeof setInterval> | undefined;
let ringAudioContext: AudioContext | undefined;
let presenceTimer: ReturnType<typeof setInterval> | undefined;
let unsubscribeCallEvents: (() => void) | undefined;
let syncingCallPresence = false;
let dragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;

const phonePositionStyle = computed(() => ({ left: `${phonePosition.left}px`, top: `${phonePosition.top}px` }));

const dialKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
const statusLabels: Record<AgentStatus, string> = { idle: '示闲', busy: '示忙', afterCall: '话后处理' };
const statusToApi: Record<AgentStatus, AgentPresenceStatus> = { idle: 'IDLE', busy: 'BUSY', afterCall: 'AFTER_CALL' };
const statusFromApi: Record<Exclude<AgentPresenceStatus, 'OFFLINE'>, AgentStatus> = { IDLE: 'idle', BUSY: 'busy', AFTER_CALL: 'afterCall' };
const extensionSummary = computed(() => (currentAgent.value.extension ? `分机 ${currentAgent.value.extension}` : '未绑定分机'));
const currentStatusLabel = computed(() => {
  if (agentStatus.value !== 'afterCall') return statusLabels[agentStatus.value];
  const remaining = currentAgent.value.afterCallRemainingSeconds;
  return remaining == null ? statusLabels.afterCall : `话后处理 ${remaining}秒`;
});
const agentSummary = computed(() => {
  if (!currentAgent.value.configured) return '未配置坐席';
  return signedIn.value ? currentStatusLabel.value : '未签入';
});
const statusClass = computed(() => ({
  offline: !signedIn.value,
  idle: signedIn.value && agentStatus.value === 'idle',
  busy: signedIn.value && agentStatus.value === 'busy',
  afterCall: signedIn.value && agentStatus.value === 'afterCall'
}));
const callDuration = computed(() => {
  const minutes = Math.floor(callSeconds.value / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (callSeconds.value % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
});

const applyCurrentAgent = (agent: CurrentAgentVO) => {
  const wasActive = callActive.value;
  currentAgent.value = agent;
  signedIn.value = agent.status !== 'OFFLINE';
  if (agent.status !== 'OFFLINE') agentStatus.value = statusFromApi[agent.status];
  if (agent.activeCallId) {
    incomingCall.value = false;
    stopRingTone();
    activeCallId.value = agent.activeCallId;
    dialNumber.value = agent.activeCallNumber || dialNumber.value;
    callActive.value = true;
    if (!wasActive) panelOpen.value = true;
    startCallTimer();
    nextTick(constrainPosition);
  } else if (callActive.value) {
    clearActiveCallState();
  }
};
const loadCurrentAgent = async () => {
  const res = await getCurrentAgent();
  applyCurrentAgent(res.data);
};
const changeStatus = async (command: StatusCommand) => {
  void unlockRingAudio();
  if (command === 'signIn') {
    try {
      const res = await signInCurrentAgent();
      applyCurrentAgent(res.data);
      ElMessage.success('坐席签入成功，请保持外置软电话在线');
    } catch {
      // HTTP 错误由全局请求拦截器统一提示。
    }
    return;
  }
  if (command === 'signOut') {
    if (callActive.value) await hangup();
    await signOutCurrentAgent();
    applyCurrentAgent({ ...currentAgent.value, status: 'OFFLINE' });
    dialNumber.value = '';
    ElMessage.success('坐席已签出');
    return;
  }
  const res = await changeCurrentAgentStatus(statusToApi[command]);
  applyCurrentAgent(res.data);
  ElMessage.success(`坐席状态已切换为${statusLabels[command]}`);
};
const appendNumber = (value: string) => {
  void unlockRingAudio();
  if (dialNumber.value.length < 20) dialNumber.value += value;
};
const makeCall = async () => {
  void unlockRingAudio();
  if (!phoneRegistered.value || !dialNumber.value) return;
  try {
    const response = await originateCall({ destination: dialNumber.value });
    activeCallId.value = response.data.callId;
    callActive.value = true;
    startCallTimer();
    const current = await getCurrentAgent();
    applyCurrentAgent(current.data);
    ElMessage.success('外呼命令已发送，请在软电话接听');
  } catch {
    // HTTP 错误由全局请求拦截器统一提示。
  }
};
const hangup = async () => {
  if (!activeCallId.value) return;
  try {
    await hangupCall(activeCallId.value);
    clearActiveCallState();
    const current = await getCurrentAgent();
    applyCurrentAgent(current.data);
  } catch {
    // HTTP 错误由全局请求拦截器统一提示。
  }
};
const createCustomer = () => {
  customerDialogVisible.value = true;
};
const createTicket = () => {
  ticketDialogVisible.value = true;
};

const handleTriggerClick = () => {
  void unlockRingAudio();
  panelOpen.value = true;
  nextTick(constrainPosition);
};
const startDrag = (event: PointerEvent) => {
  if ((event.target as HTMLElement).closest('button, .el-dropdown')) return;
  dragging = true;
  dragOffsetX = event.clientX - phonePosition.left;
  dragOffsetY = event.clientY - phonePosition.top;
  window.addEventListener('pointermove', handleDrag);
  window.addEventListener('pointerup', stopDrag, { once: true });
};
const handleDrag = (event: PointerEvent) => {
  if (!dragging) return;
  phonePosition.left = event.clientX - dragOffsetX;
  phonePosition.top = event.clientY - dragOffsetY;
  constrainPosition();
};
const stopDrag = () => {
  dragging = false;
  window.removeEventListener('pointermove', handleDrag);
  sessionStorage.setItem('callnexus-agent-phone-position', JSON.stringify(phonePosition));
};
const constrainPosition = () => {
  const rect = phoneShellRef.value?.getBoundingClientRect();
  const width = rect?.width || 140;
  const height = rect?.height || 46;
  phonePosition.left = Math.min(Math.max(8, phonePosition.left), Math.max(8, window.innerWidth - width - 8));
  phonePosition.top = Math.min(Math.max(8, phonePosition.top), Math.max(8, window.innerHeight - height - 8));
};
const initializePosition = () => {
  const saved = sessionStorage.getItem('callnexus-agent-phone-position');
  if (saved) {
    try {
      Object.assign(phonePosition, JSON.parse(saved));
      constrainPosition();
      return;
    } catch {
      sessionStorage.removeItem('callnexus-agent-phone-position');
    }
  }
  const width = phoneShellRef.value?.offsetWidth || 140;
  const height = phoneShellRef.value?.offsetHeight || 46;
  phonePosition.left = window.innerWidth - width - 18;
  phonePosition.top = (window.innerHeight - height) / 2;
};
const startCallTimer = () => {
  if (callTimer) return;
  callSeconds.value = 0;
  callTimer = setInterval(() => {
    callSeconds.value++;
    if (callSeconds.value % 3 === 0) void syncActiveCallPresence();
  }, 1000);
};
const stopCallTimer = () => {
  if (callTimer) clearInterval(callTimer);
  callTimer = undefined;
};
const unlockRingAudio = async () => {
  const AudioContextConstructor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextConstructor) return;
  if (!ringAudioContext) ringAudioContext = new AudioContextConstructor();
  if (ringAudioContext.state === 'suspended') {
    await ringAudioContext.resume().catch(() => undefined);
  }
};
const playRingPulse = () => {
  if (!ringAudioContext || ringAudioContext.state !== 'running') return;
  const startAt = ringAudioContext.currentTime;
  const oscillator = ringAudioContext.createOscillator();
  const gain = ringAudioContext.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(880, startAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(0.3, startAt + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.45);
  oscillator.connect(gain);
  gain.connect(ringAudioContext.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + 0.5);
};
const startRingTone = () => {
  if (ringTimer) return;
  void unlockRingAudio().then(() => {
    playRingPulse();
    ringTimer = setInterval(playRingPulse, 1200);
  });
};
const stopRingTone = () => {
  if (ringTimer) clearInterval(ringTimer);
  ringTimer = undefined;
};
const showIncomingCall = (event: Record<string, unknown>) => {
  const eventCallId = String(event.callId || '');
  const callerNumber = String(event.callerNumber || '');
  if (eventCallId) activeCallId.value = eventCallId;
  incomingNumber.value = callerNumber || '未知号码';
  dialNumber.value = incomingNumber.value;
  incomingCall.value = true;
  callActive.value = false;
  stopCallTimer();
  panelOpen.value = false;
  startRingTone();
  nextTick(constrainPosition);
};
const showActiveCall = (event: Record<string, unknown>) => {
  const eventCallId = String(event.callId || '');
  const callerNumber = String(event.callerNumber || '');
  const calledNumber = String(event.calledNumber || '');
  if (eventCallId) activeCallId.value = eventCallId;
  dialNumber.value = callerNumber === currentAgent.value.extension ? calledNumber : callerNumber;
  incomingCall.value = false;
  stopRingTone();
  callActive.value = true;
  panelOpen.value = true;
  startCallTimer();
  nextTick(constrainPosition);
};
const handleCallEvent = (event: Record<string, unknown>) => {
  const type = String(event.type || '');
  const agentExtension = String(event.agentExtension || '');
  const callerNumber = String(event.callerNumber || '');
  const calledNumber = String(event.calledNumber || '');
  const eventCallId = String(event.callId || '');
  const relatedToCurrentAgent =
    agentExtension === currentAgent.value.extension || callerNumber === currentAgent.value.extension || calledNumber === currentAgent.value.extension;
  if (import.meta.env.DEV) {
    console.debug('[CallNexus][AgentToolbar] 通话事件判断', {
      type,
      currentExtension: currentAgent.value.extension,
      agentExtension,
      callerNumber,
      calledNumber,
      eventCallId,
      relatedToCurrentAgent
    });
  }
  if (type === 'CALL_HANGUP_COMPLETE') {
    const relatedToCurrentCall = !activeCallId.value || eventCallId === activeCallId.value || relatedToCurrentAgent;
    if (!relatedToCurrentCall) return;
    clearActiveCallState();
    void loadCurrentAgent();
    return;
  }
  if (!relatedToCurrentAgent) return;
  if (type === 'CALL_ANSWER' || type === 'CALL_BRIDGE') {
    showActiveCall(event);
    return;
  }
  if (type === 'CALL_CREATE' || type === 'CALL_PROGRESS' || type === 'CALL_PROGRESS_MEDIA') {
    const isIncomingToCurrentAgent =
      agentExtension === currentAgent.value.extension && callerNumber !== currentAgent.value.extension && calledNumber !== '';
    if (isIncomingToCurrentAgent) {
      showIncomingCall(event);
    } else {
      showActiveCall(event);
    }
    return;
  }
};
const clearActiveCallState = () => {
  incomingCall.value = false;
  incomingNumber.value = '';
  callActive.value = false;
  activeCallId.value = '';
  stopCallTimer();
  stopRingTone();
  panelOpen.value = false;
};
const syncActiveCallPresence = async () => {
  if (!signedIn.value || syncingCallPresence) return;
  syncingCallPresence = true;
  try {
    const current = await getCurrentAgent();
    applyCurrentAgent(current.data);
  } finally {
    syncingCallPresence = false;
  }
};
onMounted(async () => {
  unsubscribeCallEvents = subscribeCallEvents(handleCallEvent);
  await loadCurrentAgent();
  await nextTick();
  initializePosition();
  presenceTimer = setInterval(() => void syncActiveCallPresence(), 3000);
  window.addEventListener('resize', constrainPosition);
});
onBeforeUnmount(() => {
  unsubscribeCallEvents?.();
  stopCallTimer();
  stopRingTone();
  if (presenceTimer) clearInterval(presenceTimer);
  window.removeEventListener('resize', constrainPosition);
  window.removeEventListener('pointermove', handleDrag);
});
</script>

<style lang="scss" scoped>
button {
  font: inherit;
}
.toolbar-trigger {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 140px;
  height: 46px;
  padding: 6px 12px 6px 6px;
  color: #536176;
  cursor: pointer;
  border: 1px solid #e1e7f0;
  border-radius: 12px;
  background: #fff;
  transition: all 0.2s ease;
  div {
    display: grid;
    gap: 2px;
    min-width: 0;
    text-align: left;
  }
  strong {
    max-width: 120px;
    overflow: hidden;
    color: #29364d;
    font-size: 13px;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  small {
    color: #8b96a8;
    font-size: 10px;
  }
  > i {
    width: 8px;
    height: 8px;
    margin-left: 4px;
    border-radius: 50%;
    background: #a0a9b7;
  }
  > i.idle {
    background: #16b887;
  }
  > i.busy {
    background: #df4d5b;
  }
  > i.afterCall {
    background: #e99a23;
  }
}
.toolbar-trigger:hover {
  border-color: #bfd1ef;
  box-shadow: 0 2px 8px rgba(40, 105, 216, 0.15);
}
.toolbar-trigger:active {
  transform: scale(0.98);
}
.toolbar-trigger.calling {
  border-color: #b7d4ff;
  background: #f2f7ff;
}
.toolbar-trigger.incoming {
  border-color: #22c55e;
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  animation: incoming-pulse 1s ease-in-out infinite !important;
}
@keyframes incoming-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(34, 197, 94, 0);
  }
}
.trigger-icon {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  font-size: 18px;
  color: #fff;
  border-radius: 10px;
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
}
.trigger-icon.incoming {
  background: #22c55e;
  animation:
    icon-ring 0.65s ease-in-out infinite,
    icon-pulse 1.1s ease-in-out infinite !important;
  transform-origin: center center;
}
@keyframes icon-ring {
  0%,
  100% {
    transform: rotate(0deg) scale(1);
  }
  15% {
    transform: rotate(-14deg) scale(1.08);
  }
  30% {
    transform: rotate(12deg) scale(1.08);
  }
  45% {
    transform: rotate(-10deg) scale(1.08);
  }
  60% {
    transform: rotate(8deg) scale(1.05);
  }
  75% {
    transform: rotate(-4deg) scale(1.02);
  }
}
@keyframes icon-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.45);
  }
  50% {
    box-shadow: 0 0 0 10px rgba(34, 197, 94, 0);
  }
}
.agent-phone-shell {
  position: fixed;
  z-index: 1001;
  width: max-content;
  filter: drop-shadow(0 10px 20px rgba(26, 48, 82, 0.18));
}
.agent-phone-shell.incoming {
  animation: shell-ring 0.55s ease-in-out infinite !important;
}
@keyframes shell-ring {
  0%,
  100% {
    translate: 0 0;
  }
  20% {
    translate: -3px 0;
  }
  40% {
    translate: 3px 0;
  }
  60% {
    translate: -2px 0;
  }
  80% {
    translate: 2px 0;
  }
}
.agent-panel {
  display: grid;
  width: 360px;
  gap: 13px;
  padding: 15px;
  border: 1px solid #dfe6f1;
  border-radius: 15px;
  background: #fff;
  box-shadow: 0 18px 45px rgba(25, 46, 79, 0.2);
}
.panel-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 11px;
  border-bottom: 1px solid #edf1f6;
  cursor: move;
  user-select: none;
  > div {
    display: grid;
    gap: 2px;
  }
  strong {
    color: #24314a;
    font-size: 13px;
  }
  small {
    color: #929cad;
    font-size: 9px;
  }
}
.heading-actions {
  display: flex !important;
  align-items: center;
  gap: 6px !important;
}
.collapse-button {
  display: grid;
  place-items: center;
  width: 27px;
  height: 27px;
  color: #8c97a8;
  cursor: pointer;
  border: 1px solid #e1e7f0;
  border-radius: 7px;
  background: #fff;
}
.agent-status {
  display: flex;
  align-items: center;
  gap: 5px;
  height: 27px;
  padding: 0 8px;
  color: #667287;
  font-size: 9px;
  cursor: pointer;
  border: 1px solid #e1e7f0;
  border-radius: 7px;
  background: #fff;
  i {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #9ba5b5;
  }
}
.agent-status.idle {
  color: #087e60;
  i {
    background: #16b887;
  }
}
.agent-status.busy {
  color: #c73e4c;
  background: #fff0f2;
  i {
    background: #df4d5b;
  }
}
.agent-status.afterCall {
  color: #a96d12;
  background: #fff7e8;
  i {
    background: #e99a23;
  }
}
.dial-input {
  display: flex;
  align-items: center;
  height: 36px;
  padding-left: 10px;
  color: #8994a6;
  border: 1px solid #e3e8f1;
  border-radius: 8px;
  background: #fff;
  input {
    min-width: 0;
    flex: 1;
    padding: 0 8px;
    color: #253149;
    font-size: 11px;
    border: 0;
    outline: 0;
    background: transparent;
  }
}
.clear-number {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  color: #9aa4b4;
  cursor: pointer;
  border: 0;
  background: transparent;
}
.dial-pad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 7px;
  button {
    height: 42px;
    color: #344057;
    cursor: pointer;
    border: 1px solid #e7ebf2;
    border-radius: 8px;
    background: #f8fafc;
  }
  button:hover:not(:disabled) {
    color: #245dcc;
    border-color: #cddcff;
    background: #f0f5ff;
  }
  button:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }
}
.call-button,
.hangup-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  height: 34px;
  color: #fff;
  font-size: 10px;
  cursor: pointer;
  border: 0;
  border-radius: 7px;
  background: #19ad80;
}
.call-button:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}
.active-call {
  display: flex;
  align-items: center;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  min-height: 125px;
  border-radius: 12px;
  background: #f5f9ff;
  small {
    color: #2870d7;
    font-size: 8px;
  }
  strong {
    color: #21304b;
    font-size: 19px;
  }
  > span:last-child {
    color: #6e7c91;
    font-size: 11px;
  }
}
.active-call.incoming-call {
  border: 1px solid #bbf7d0;
  background: #f0fdf4;
  small {
    color: #15803d;
  }
}
.call-pulse {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  color: #fff;
  border-radius: 50%;
  background: #20b68b;
  box-shadow: 0 0 0 5px rgba(32, 182, 139, 0.13);
}
.call-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 7px;
  button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    height: 34px;
    color: #4d5d76;
    font-size: 9px;
    cursor: pointer;
    border: 1px solid #dce5f1;
    border-radius: 7px;
    background: #fff;
  }
}
.call-actions .accept-button {
  color: #087e60;
  border-color: #b8eadb;
  background: #effbf7;
}
.call-actions .reject-button {
  color: #c73e4c;
  border-color: #f2c7cc;
  background: #fff5f6;
}
.incoming-card {
  background: #f0fdf4;
}
.hangup-button {
  background: #df4d5b;
}
</style>
