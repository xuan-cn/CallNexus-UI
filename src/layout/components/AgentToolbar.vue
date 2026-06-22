<template>
  <div ref="phoneShellRef" class="agent-phone-shell" :class="{ incoming: incomingCall }" :style="phonePositionStyle">
    <button
      v-if="!panelOpen"
      type="button"
      class="toolbar-trigger"
      :class="{ calling: callActive, incoming: incomingCall }"
      @click="handleTriggerClick"
    >
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
          <strong>{{ currentAgent.agentName || '坐席电话' }}</strong>
          <small>{{ extensionSummary }} · {{ displayedRegistrationSummary }}</small>
        </div>
        <div class="heading-actions">
          <el-dropdown trigger="click" popper-class="agent-phone-mode-dropdown" @command="changePhoneMode">
            <button type="button" class="phone-mode-button">
              {{ phoneModeLabel }}<el-icon><ArrowDown /></el-icon>
            </button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="EXTERNAL_SOFTPHONE">外置软电话</el-dropdown-item>
                <el-dropdown-item command="WEBRTC">浏览器 WebRTC</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
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
          <small>来电振铃中，请在软电话接听</small>
          <strong>{{ incomingNumber }}</strong>
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
        <p v-if="webRtcFirstLegWaiting" class="webrtc-first-leg-tip">请在 30 秒内接听浏览器软电话，接听后才会继续呼叫客户。</p>
        <button v-if="webRtcIncoming" type="button" class="call-button" :disabled="callActionLoading" @click="answerWebRtcCall">
          <el-icon><PhoneFilled /></el-icon>接听电话
        </button>
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
          <small>{{ callHeld ? '通话已保持' : callMuted ? '坐席已静音' : '软电话正在呼叫' }}</small>
          <strong>{{ dialNumber }}</strong>
          <span>{{ callDuration }}<em v-if="callHeld"> · 已保持</em><em v-if="callMuted"> · 已静音</em></span>
        </div>
        <div class="call-control-actions">
          <button type="button" :disabled="callActionLoading" @click="toggleHold">{{ callHeld ? '恢复通话' : '保持通话' }}</button>
          <button type="button" :disabled="callActionLoading" @click="toggleMute">{{ callMuted ? '取消静音' : '静音' }}</button>
          <button type="button" :disabled="callActionLoading || consultActive" @click="transferPanelOpen = !transferPanelOpen">盲转</button>
          <button type="button" :disabled="callActionLoading || callHeld" @click="consultPanelOpen = !consultPanelOpen">咨询转接</button>
          <button type="button" :disabled="callActionLoading" @click="dtmfPanelOpen = !dtmfPanelOpen">DTMF</button>
          <button type="button" :disabled="callActionLoading" @click="notePanelOpen = !notePanelOpen">通话备注</button>
        </div>
        <div v-if="dtmfPanelOpen" class="dtmf-panel">
          <div class="dtmf-input">
            <input v-model="dtmfDigits" maxlength="32" placeholder="输入或点击按键，例如 1#" @keyup.enter="sendDtmf" />
            <button type="button" :disabled="callActionLoading || !dtmfDigits" @click="sendDtmf">发送</button>
          </div>
          <div class="dtmf-pad">
            <button v-for="key in dialKeys" :key="`dtmf-${key}`" type="button" :disabled="callActionLoading" @click="appendDtmfDigit(key)">
              {{ key }}
            </button>
            <button type="button" :disabled="callActionLoading || !dtmfDigits" @click="dtmfDigits = dtmfDigits.slice(0, -1)">退格</button>
            <button type="button" :disabled="callActionLoading || !dtmfDigits" @click="dtmfDigits = ''">清空</button>
          </div>
        </div>
        <div v-if="notePanelOpen" class="note-panel">
          <textarea v-model="callNoteContent" maxlength="1000" placeholder="记录本次通话备注，保存后写入通话事件时间线"></textarea>
          <div>
            <span>{{ callNoteContent.length }} / 1000</span>
            <button type="button" :disabled="noteSaving || !callNoteContent.trim()" @click="saveNote">保存备注</button>
          </div>
        </div>
        <div v-if="transferPanelOpen" class="transfer-panel">
          <input v-model="transferTarget" maxlength="20" placeholder="输入目标分机" @keyup.enter="confirmTransfer" />
          <button type="button" :disabled="callActionLoading || !transferTarget" @click="confirmTransfer">确认转接</button>
          <button type="button" :disabled="callActionLoading" @click="cancelTransfer">取消</button>
        </div>
        <div v-if="consultPanelOpen" class="transfer-panel consult-panel">
          <template v-if="!consultActive">
            <input v-model="consultTarget" maxlength="20" placeholder="输入咨询目标分机" @keyup.enter="startConsult" />
            <button type="button" :disabled="callActionLoading || !consultTarget" @click="startConsult">开始咨询</button>
            <button type="button" :disabled="callActionLoading" @click="cancelConsultPanel">取消</button>
          </template>
          <template v-else>
            <span class="consult-tip">客户已保持，正在咨询 {{ consultTarget }}</span>
            <button type="button" :disabled="callActionLoading" @click="completeConsult">完成转接</button>
            <button type="button" :disabled="callActionLoading" @click="cancelConsult">取消咨询</button>
          </template>
        </div>
        <div class="call-actions">
          <button type="button" @click="createCustomer">
            <el-icon><User /></el-icon>新建客户
          </button>
          <button type="button" @click="createTicket">
            <el-icon><Tickets /></el-icon>创建工单
          </button>
        </div>
        <button type="button" class="hangup-button" :disabled="callActionLoading" @click="hangup">
          <el-icon><CloseBold /></el-icon>挂断电话
        </button>
      </template>
    </aside>

    <dynamic-business-form-dialog v-model="customerDialogVisible" business-type="CUSTOMER" :phone-number="dialNumber" :call-id="activeCallId" />
    <dynamic-business-form-dialog v-model="ticketDialogVisible" business-type="TICKET" :phone-number="dialNumber" :call-id="activeCallId" />
    <audio ref="remoteAudioRef" autoplay playsinline></audio>
  </div>
</template>

<script setup lang="ts">
import { ArrowDown, CloseBold, Phone, PhoneFilled, Tickets, User } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import {
  changeCurrentAgentStatus,
  getCurrentAgent,
  getCurrentAgentWebRtcConfig,
  signInCurrentAgent,
  signOutCurrentAgent
} from '@/api/callcenter/agent';
import { AgentPresenceStatus, CurrentAgentVO } from '@/api/callcenter/agent/types';
import {
  cancelConsultTransfer,
  completeConsultTransfer,
  hangupCall,
  holdCall,
  muteCall,
  originateCall,
  saveCallNote,
  sendCallDtmf,
  startConsultTransfer,
  transferCall,
  unmuteCall,
  unholdCall
} from '@/api/callcenter/call';
import { subscribeCallEvents } from '@/utils/websocket';
import { webRtcPhone } from '@/utils/webrtcPhone';
import DynamicBusinessFormDialog from './DynamicBusinessFormDialog.vue';

type AgentStatus = 'idle' | 'busy' | 'afterCall';
type StatusCommand = AgentStatus | 'signIn' | 'signOut';
type PhoneMode = 'EXTERNAL_SOFTPHONE' | 'WEBRTC';
const PHONE_MODE_STORAGE_KEY = 'callnexus_agent_phone_mode';
const WEBRTC_MODE_DISABLED = true;
const savedPhoneMode = localStorage.getItem(PHONE_MODE_STORAGE_KEY);
if (WEBRTC_MODE_DISABLED && savedPhoneMode === 'WEBRTC') {
  localStorage.setItem(PHONE_MODE_STORAGE_KEY, 'EXTERNAL_SOFTPHONE');
}

const panelOpen = ref(false);
const phoneShellRef = ref<HTMLElement>();
const remoteAudioRef = ref<HTMLAudioElement>();
const phonePosition = reactive({ left: 0, top: 0 });
const signedIn = ref(false);
const agentStatus = ref<AgentStatus>('idle');
const currentAgent = ref<CurrentAgentVO>({ configured: false, status: 'OFFLINE' });
const dialNumber = ref('');
const callActive = ref(false);
const callHeld = ref(false);
const callMuted = ref(false);
const callActionLoading = ref(false);
const transferPanelOpen = ref(false);
const transferTarget = ref('');
const consultPanelOpen = ref(false);
const consultTarget = ref('');
const consultActive = ref(false);
const consultCallId = ref('');
const dtmfPanelOpen = ref(false);
const dtmfDigits = ref('');
const notePanelOpen = ref(false);
const callNoteContent = ref('');
const noteSaving = ref(false);
const incomingCall = ref(false);
const incomingNumber = ref('');
const activeCallId = ref('');
const callSeconds = ref(0);
const customerDialogVisible = ref(false);
const ticketDialogVisible = ref(false);
const webRtcRegistered = ref(false);
const webRtcConnecting = ref(false);
const webRtcIncoming = ref(false);
const webRtcFirstLegWaiting = ref(false);
const phoneRegistered = computed(() => signedIn.value && Boolean(currentAgent.value.extension));
const registrationSummary = computed(() => {
  if (!signedIn.value) return '未签入';
  if (webRtcRegistered.value) return 'WebRTC 已注册';
  if (webRtcConnecting.value) return 'WebRTC 注册中';
  return currentAgent.value.extension ? '外置软电话' : '未绑定分机';
});
let callTimer: ReturnType<typeof setInterval> | undefined;
let ringTimer: ReturnType<typeof setInterval> | undefined;
let ringAudioContext: AudioContext | undefined;
let presenceTimer: ReturnType<typeof setInterval> | undefined;
let unsubscribeCallEvents: (() => void) | undefined;
let syncingCallPresence = false;
let restoringIdleAfterHangup = false;
let webRtcFirstLegTimeout: ReturnType<typeof setTimeout> | undefined;
let dragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;
let suppressActiveCallUntil = 0;
let suppressIncomingCallUntil = 0;
const recentlyEndedCallIds = new Map<string, number>();
const WEBRTC_ENDED_CALL_SUPPRESS_MS = 120000;
const WEBRTC_FIRST_LEG_ANSWER_TIMEOUT_MS = 30000;
const phoneMode = ref<PhoneMode>(!WEBRTC_MODE_DISABLED && savedPhoneMode === 'WEBRTC' ? 'WEBRTC' : 'EXTERNAL_SOFTPHONE');
const webRtcPhoneEnabled = computed(() => phoneMode.value === 'WEBRTC');
const phoneModeLabel = computed(() => (phoneMode.value === 'WEBRTC' ? 'WebRTC' : '外置软电话'));
const displayedRegistrationSummary = computed(() => {
  if (!signedIn.value) return '未签入';
  if (!currentAgent.value.extension) return '未绑定分机';
  if (!webRtcPhoneEnabled.value) return '外置软电话';
  if (webRtcRegistered.value) return 'WebRTC 已注册';
  if (webRtcConnecting.value) return 'WebRTC 注册中';
  return 'WebRTC 未注册';
});

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
const clearWebRtcFirstLegTimeout = () => {
  if (!webRtcFirstLegTimeout) return;
  clearTimeout(webRtcFirstLegTimeout);
  webRtcFirstLegTimeout = undefined;
};
const stopWebRtcFirstLegWaiting = () => {
  webRtcFirstLegWaiting.value = false;
  clearWebRtcFirstLegTimeout();
};
const startWebRtcFirstLegTimeout = () => {
  clearWebRtcFirstLegTimeout();
  webRtcFirstLegTimeout = setTimeout(() => {
    if (!webRtcFirstLegWaiting.value || callActive.value) return;
    ElMessage.warning('WebRTC 来电未接听，本次外呼已取消');
    void hangup();
  }, WEBRTC_FIRST_LEG_ANSWER_TIMEOUT_MS);
};
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
    if (webRtcIncoming.value) {
      activeCallId.value = agent.activeCallId;
      dialNumber.value = agent.activeCallNumber || dialNumber.value;
      panelOpen.value = true;
      nextTick(constrainPosition);
      return;
    }
    if (isWebRtcLocalIdle()) {
      return;
    }
    const activeCallEndedAt = recentlyEndedCallIds.get(String(agent.activeCallId));
    if (Date.now() < suppressActiveCallUntil || (activeCallEndedAt && Date.now() - activeCallEndedAt < 8000)) {
      return;
    }
    incomingCall.value = false;
    stopRingTone();
    activeCallId.value = agent.activeCallId;
    dialNumber.value = agent.activeCallNumber || dialNumber.value;
    agentStatus.value = 'busy';
    callActive.value = true;
    if (!wasActive) panelOpen.value = true;
    startCallTimer();
    nextTick(constrainPosition);
  } else if (callActive.value && !webRtcPhone.hasActiveCall()) {
    clearActiveCallState();
  }
};

const loadCurrentAgent = async () => {
  const res = await getCurrentAgent();
  applyCurrentAgent(res.data);
};

const registerWebRtcPhone = async () => {
  if (!webRtcPhoneEnabled.value) {
    await disconnectWebRtcPhone();
    return false;
  }
  if (!signedIn.value || !remoteAudioRef.value || webRtcConnecting.value) return false;
  let registrationSucceeded = false;
  try {
    webRtcConnecting.value = true;
    webRtcRegistered.value = false;
    const response = await getCurrentAgentWebRtcConfig();
    webRtcPhone.configure({
      onIncoming: () => {
        webRtcIncoming.value = true;
        webRtcFirstLegWaiting.value = true;
        incomingCall.value = true;
        incomingNumber.value = dialNumber.value || '未知号码';
        panelOpen.value = true;
        startWebRtcFirstLegTimeout();
        startRingTone();
        nextTick(constrainPosition);
      },
      onAnswered: () => {
        webRtcIncoming.value = false;
        incomingCall.value = false;
        stopWebRtcFirstLegWaiting();
        stopRingTone();
        callActive.value = true;
        agentStatus.value = 'busy';
        startCallTimer();
      },
      onHangup: () => {
        webRtcIncoming.value = false;
        stopWebRtcFirstLegWaiting();
        markCallEnded(activeCallId.value);
        clearActiveCallState();
        void restoreIdleAfterWebRtcHangup();
      },
      onHold: (held) => {
        callHeld.value = held;
      },
      onRegistered: () => {
        webRtcRegistered.value = true;
      },
      onUnregistered: () => {
        webRtcRegistered.value = false;
      },
      onServerDisconnect: () => {
        webRtcRegistered.value = false;
      }
    });
    await webRtcPhone.connect(response.data, remoteAudioRef.value);
    registrationSucceeded = true;
    webRtcRegistered.value = true;
    return true;
  } catch (error) {
    webRtcRegistered.value = false;
    console.warn('[WebRTC] register failed, fallback to external softphone mode', error);
    await disconnectWebRtcPhone();
    return false;
    console.warn('[WebRTC] 注册失败，保留外置软电话模式', error);
  } finally {
    webRtcConnecting.value = false;
    webRtcRegistered.value = webRtcPhoneEnabled.value && (registrationSucceeded || webRtcPhone.isRegistered());
  }
};

const disconnectWebRtcPhone = async () => {
  webRtcIncoming.value = false;
  stopWebRtcFirstLegWaiting();
  webRtcRegistered.value = false;
  webRtcConnecting.value = false;
  await webRtcPhone.disconnect();
};

const changePhoneMode = async (mode: PhoneMode) => {
  if (mode !== 'EXTERNAL_SOFTPHONE' && mode !== 'WEBRTC') return;
  if (mode === 'WEBRTC' && WEBRTC_MODE_DISABLED) {
    ElMessage.warning('WebRTC 软电话暂未开放，请使用外置软电话模式');
    return;
  }
  if (callActive.value || incomingCall.value) {
    ElMessage.warning('通话中不能切换电话模式');
    return;
  }
  phoneMode.value = mode;
  localStorage.setItem(PHONE_MODE_STORAGE_KEY, mode);
  if (mode === 'EXTERNAL_SOFTPHONE') {
    await disconnectWebRtcPhone();
    ElMessage.success('已切换为外置软电话模式');
    return;
  }
  const registered = await registerWebRtcPhone();
  if (!registered) {
    ElMessage.warning('WebRTC 注册失败，请检查 WSS 配置');
    return;
  }
  ElMessage.success(webRtcRegistered.value ? '已切换为 WebRTC 模式' : 'WebRTC 注册失败，请检查 WSS 配置');
};

const changeStatus = async (command: StatusCommand) => {
  void unlockRingAudio();
  if (command === 'signIn') {
    try {
      const res = await signInCurrentAgent();
      applyCurrentAgent(res.data);
      await registerWebRtcPhone();
      ElMessage.success(webRtcRegistered.value ? '坐席签入成功，WebRTC 软电话已注册' : '坐席签入成功，请保持外置软电话在线');
    } catch {
      // HTTP 错误由全局请求拦截器统一提示。
    }
    return;
  }
  if (command === 'signOut') {
    if (callActive.value) await hangup();
    await disconnectWebRtcPhone();
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

const appendDtmfDigit = (value: string) => {
  if (dtmfDigits.value.length < 32) dtmfDigits.value += value;
};

const sendDtmf = async () => {
  const digits = dtmfDigits.value.trim();
  if (!activeCallId.value || !digits) return;
  try {
    callActionLoading.value = true;
    await sendCallDtmf(activeCallId.value, { digits });
    dtmfDigits.value = '';
    ElMessage.success('DTMF 已发送');
  } finally {
    callActionLoading.value = false;
  }
};

const saveNote = async () => {
  const content = callNoteContent.value.trim();
  if (!activeCallId.value || !content) return;
  try {
    noteSaving.value = true;
    await saveCallNote(activeCallId.value, { content });
    callNoteContent.value = '';
    notePanelOpen.value = false;
    ElMessage.success('通话备注已保存');
  } finally {
    noteSaving.value = false;
  }
};

const makeCall = async () => {
  void unlockRingAudio();
  if (!phoneRegistered.value || !dialNumber.value) return;
  if (webRtcPhoneEnabled.value && !webRtcRegistered.value) {
    ElMessage.warning('WebRTC 未注册，请检查 WSS 配置或切换为外置软电话模式');
    return;
  }
  try {
    suppressIncomingCallUntil = webRtcPhoneEnabled.value ? 0 : Date.now() + 15000;
    const response = await originateCall({ destination: dialNumber.value });
    activeCallId.value = response.data.callId;
    resetCallControls();
    const current = await getCurrentAgent();
    if (webRtcPhoneEnabled.value) {
      webRtcFirstLegWaiting.value = true;
      panelOpen.value = true;
      startWebRtcFirstLegTimeout();
      ElMessage.success('外呼命令已发送，请在浏览器软电话接听来电');
    } else {
      callActive.value = true;
      startCallTimer();
      applyCurrentAgent(current.data);
      ElMessage.success('外呼命令已发送，请在软电话接听');
    }
  } catch {
    // HTTP 错误由全局请求拦截器统一提示。
  }
};

const hangup = async () => {
  if (!activeCallId.value && !webRtcPhone.hasActiveCall() && !webRtcIncoming.value) return;
  try {
    callActionLoading.value = true;
    if (webRtcRegistered.value && (webRtcPhone.hasActiveCall() || webRtcIncoming.value)) {
      if (webRtcIncoming.value && !callActive.value) {
        await webRtcPhone.decline();
      } else {
        await webRtcPhone.hangup();
      }
      markCallEnded(activeCallId.value);
      clearActiveCallState();
      await restoreIdleAfterWebRtcHangup();
      return;
    }
    await hangupCall(activeCallId.value);
    markCallEnded(activeCallId.value);
    clearActiveCallState();
    const current = await getCurrentAgent();
    applyCurrentAgent(current.data);
  } catch {
    // HTTP 错误由全局请求拦截器统一提示。
  } finally {
    callActionLoading.value = false;
  }
};

const toggleHold = async () => {
  if (!activeCallId.value && !webRtcPhone.hasActiveCall()) return;
  try {
    callActionLoading.value = true;
    if (callHeld.value) {
      if (webRtcRegistered.value && webRtcPhone.hasActiveCall()) {
        await webRtcPhone.unhold();
      } else {
        await unholdCall(activeCallId.value);
      }
      callHeld.value = false;
      ElMessage.success('通话已恢复');
    } else {
      if (webRtcRegistered.value && webRtcPhone.hasActiveCall()) {
        await webRtcPhone.hold();
      } else {
        await holdCall(activeCallId.value);
      }
      callHeld.value = true;
      ElMessage.success('通话已保持');
    }
  } finally {
    callActionLoading.value = false;
  }
};

const toggleMute = async () => {
  if (!activeCallId.value) return;
  try {
    callActionLoading.value = true;
    if (callMuted.value) {
      await unmuteCall(activeCallId.value);
      callMuted.value = false;
      ElMessage.success('已取消静音');
    } else {
      await muteCall(activeCallId.value);
      callMuted.value = true;
      ElMessage.success('已静音，客户将听不到坐席声音');
    }
  } finally {
    callActionLoading.value = false;
  }
};

const answerWebRtcCall = async () => {
  if (!webRtcIncoming.value || !webRtcRegistered.value) return;
  try {
    callActionLoading.value = true;
    await webRtcPhone.answer();
  } catch (error) {
    console.error('[WebRTC] answer failed', error);
    ElMessage.error('WebRTC 接听失败，请查看浏览器控制台错误');
  } finally {
    callActionLoading.value = false;
  }
};

const confirmTransfer = async () => {
  if (!activeCallId.value || !transferTarget.value) return;
  try {
    callActionLoading.value = true;
    await transferCall(activeCallId.value, transferTarget.value);
    ElMessage.success('通话已转接');
    clearActiveCallState();
    const current = await getCurrentAgent();
    applyCurrentAgent(current.data);
  } finally {
    callActionLoading.value = false;
  }
};

const cancelTransfer = () => {
  transferPanelOpen.value = false;
  transferTarget.value = '';
};

const startConsult = async () => {
  if (!activeCallId.value || !consultTarget.value) return;
  try {
    callActionLoading.value = true;
    const response = await startConsultTransfer(activeCallId.value, consultTarget.value, phoneMode.value);
    consultCallId.value = response.data.callId;
    consultActive.value = true;
    callHeld.value = true;
    transferPanelOpen.value = false;
    ElMessage.success('客户通话已保持，正在呼叫咨询目标分机');
  } finally {
    callActionLoading.value = false;
  }
};

const cancelConsult = async () => {
  if (!activeCallId.value) return;
  try {
    callActionLoading.value = true;
    await cancelConsultTransfer(activeCallId.value, phoneMode.value);
    consultActive.value = false;
    consultCallId.value = '';
    consultPanelOpen.value = false;
    consultTarget.value = '';
    callHeld.value = false;
    ElMessage.success('咨询已取消，客户通话已恢复');
  } finally {
    callActionLoading.value = false;
  }
};

const completeConsult = async () => {
  if (!activeCallId.value) return;
  try {
    callActionLoading.value = true;
    await completeConsultTransfer(activeCallId.value, phoneMode.value);
    ElMessage.success('咨询转接已完成');
    clearActiveCallState();
    const current = await getCurrentAgent();
    applyCurrentAgent(current.data);
  } finally {
    callActionLoading.value = false;
  }
};

const cancelConsultPanel = () => {
  if (consultActive.value) return;
  consultPanelOpen.value = false;
  consultTarget.value = '';
};

const resetCallControls = () => {
  callHeld.value = false;
  callMuted.value = false;
  callActionLoading.value = false;
  transferPanelOpen.value = false;
  transferTarget.value = '';
  consultPanelOpen.value = false;
  consultTarget.value = '';
  consultActive.value = false;
  consultCallId.value = '';
  dtmfPanelOpen.value = false;
  dtmfDigits.value = '';
  notePanelOpen.value = false;
  callNoteContent.value = '';
  noteSaving.value = false;
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
  if ((event.target as HTMLElement).closest('button, .el-dropdown, input')) return;
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
  if (Date.now() < suppressIncomingCallUntil) return;
  if (isWebRtcLocalIdle()) return;
  const eventCallId = String(event.callId || '');
  const callerNumber = String(event.callerNumber || '');
  if (eventCallId) activeCallId.value = eventCallId;
  incomingNumber.value = callerNumber || '未知号码';
  dialNumber.value = incomingNumber.value;
  incomingCall.value = true;
  callActive.value = false;
  resetCallControls();
  stopCallTimer();
  panelOpen.value = true;
  startRingTone();
  nextTick(constrainPosition);
};

const isSourceConsultLegEvent = (eventCallId: string, callerNumber: string) =>
  consultActive.value && eventCallId === consultCallId.value && callerNumber === currentAgent.value.extension;

const showActiveCall = (event: Record<string, unknown>) => {
  if (isWebRtcLocalIdle()) return;
  const eventCallId = String(event.callId || '');
  const callerNumber = String(event.callerNumber || '');
  const calledNumber = String(event.calledNumber || '');
  if (eventCallId && recentlyEndedCallIds.has(eventCallId)) return;
  if (isSourceConsultLegEvent(eventCallId, callerNumber)) return;
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
    const extension = currentAgent.value.extension || '';
    const matchedCurrentLeg = callerNumber === extension || calledNumber === extension;
    const relatedToCurrentCall = activeCallId.value
      ? relatedToCurrentAgent && (eventCallId === activeCallId.value || matchedCurrentLeg)
      : relatedToCurrentAgent;
    if (!relatedToCurrentCall) return;
    markCallEnded(eventCallId || activeCallId.value);
    clearActiveCallState();
    void loadCurrentAgent();
    return;
  }
  if (!relatedToCurrentAgent) return;
  if (type === 'CALL_HOLD') {
    callHeld.value = true;
    return;
  }
  if (type === 'CALL_UNHOLD') {
    callHeld.value = false;
    return;
  }
  if (type === 'CALL_ANSWER' || type === 'CALL_BRIDGE') {
    if (isSourceConsultLegEvent(eventCallId, callerNumber)) return;
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
  }
};

const clearActiveCallState = () => {
  incomingCall.value = false;
  incomingNumber.value = '';
  callActive.value = false;
  activeCallId.value = '';
  webRtcIncoming.value = false;
  stopWebRtcFirstLegWaiting();
  resetCallControls();
  stopCallTimer();
  stopRingTone();
  panelOpen.value = false;
};

const markCallEnded = (callId?: string) => {
  suppressActiveCallUntil = Date.now() + WEBRTC_ENDED_CALL_SUPPRESS_MS;
  if (callId) recentlyEndedCallIds.set(callId, Date.now());
  for (const [endedCallId, endedAt] of recentlyEndedCallIds.entries()) {
    if (Date.now() - endedAt > WEBRTC_ENDED_CALL_SUPPRESS_MS) {
      recentlyEndedCallIds.delete(endedCallId);
    }
  }
};

const isWebRtcLocalIdle = () => webRtcPhoneEnabled.value && !webRtcIncoming.value && !webRtcPhone.hasActiveCall();

const restoreIdleAfterWebRtcHangup = async () => {
  if (!signedIn.value || agentStatus.value === 'idle' || restoringIdleAfterHangup) return;
  restoringIdleAfterHangup = true;
  try {
    const response = await changeCurrentAgentStatus('IDLE');
    applyCurrentAgent(response.data);
  } catch (error) {
    console.warn('[WebRTC] 挂断后自动示闲失败', error);
  } finally {
    restoringIdleAfterHangup = false;
  }
};

const syncActiveCallPresence = async () => {
  if (!signedIn.value || syncingCallPresence) return;
  if (webRtcPhone.hasActiveCall() && !activeCallId.value) return;
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
  await registerWebRtcPhone();
  initializePosition();
  presenceTimer = setInterval(() => void syncActiveCallPresence(), 3000);
  window.addEventListener('resize', constrainPosition);
});

onBeforeUnmount(() => {
  unsubscribeCallEvents?.();
  void disconnectWebRtcPhone();
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

.agent-phone-shell {
  position: fixed;
  z-index: 1001;
  width: max-content;
  filter: drop-shadow(0 10px 20px rgba(26, 48, 82, 0.18));
}

.agent-phone-shell.incoming {
  animation: shell-ring 0.55s ease-in-out infinite !important;
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

.toolbar-trigger.calling {
  border-color: #b7d4ff;
  background: #f2f7ff;
}

.toolbar-trigger.incoming {
  border-color: #22c55e;
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  animation: incoming-pulse 1s ease-in-out infinite !important;
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

.agent-panel {
  display: grid;
  width: 380px;
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

.collapse-button,
.clear-number {
  display: grid;
  place-items: center;
  color: #8c97a8;
  cursor: pointer;
  border: 0;
  background: transparent;
}

.collapse-button {
  width: 27px;
  height: 27px;
  border: 1px solid #e1e7f0;
  border-radius: 7px;
  background: #fff;
}

.phone-mode-button {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 27px;
  padding: 0 8px;
  color: #053b70;
  font-size: 9px;
  cursor: pointer;
  border: 1px solid #d5e1ef;
  border-radius: 7px;
  background: #f7fbff;
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
  width: 30px;
  height: 30px;
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

.call-button:disabled,
.hangup-button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.webrtc-first-leg-tip {
  margin: -2px 0 0;
  padding: 8px 10px;
  color: #8a5a00;
  font-size: 11px;
  line-height: 1.5;
  border: 1px solid #ffe3a3;
  border-radius: 8px;
  background: #fff8e6;
}

.active-call {
  display: flex;
  align-items: center;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  min-height: 120px;
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

  em {
    color: #e99a23;
    font-style: normal;
  }
}

.active-call.incoming-call {
  border: 1px solid #bbf7d0;
  background: #f0fdf4;
  animation: incoming-pulse 1s ease-in-out infinite;

  small {
    color: #15803d;
  }

  .call-pulse {
    animation: icon-ring 0.65s ease-in-out infinite;
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

.call-actions,
.call-control-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
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

  button:hover:not(:disabled) {
    color: #053b70;
    border-color: #9bb9dc;
    background: #f5f9ff;
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }
}

.call-control-actions {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.transfer-panel {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 78px 52px;
  gap: 7px;

  input {
    min-width: 0;
    height: 34px;
    padding: 0 10px;
    color: #253149;
    font-size: 11px;
    border: 1px solid #dce5f1;
    border-radius: 7px;
    outline: 0;
  }

  button {
    height: 34px;
    color: #053b70;
    font-size: 9px;
    cursor: pointer;
    border: 1px solid #b7cbe3;
    border-radius: 7px;
    background: #fff;
  }
}

.dtmf-panel,
.note-panel {
  display: grid;
  gap: 8px;
  padding: 10px;
  border: 1px solid #dce5f1;
  border-radius: 10px;
  background: #f8fbff;
}

.dtmf-input {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 64px;
  gap: 7px;

  input {
    min-width: 0;
    height: 32px;
    padding: 0 10px;
    color: #253149;
    font-size: 11px;
    border: 1px solid #dce5f1;
    border-radius: 7px;
    outline: 0;
    background: #fff;
  }

  button {
    height: 32px;
    color: #fff;
    font-size: 9px;
    cursor: pointer;
    border: 0;
    border-radius: 7px;
    background: #053b70;
  }
}

.dtmf-pad {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;

  button {
    height: 30px;
    color: #344057;
    font-size: 10px;
    cursor: pointer;
    border: 1px solid #e1e7f0;
    border-radius: 7px;
    background: #fff;
  }

  button:hover:not(:disabled) {
    color: #053b70;
    border-color: #9bb9dc;
  }
}

.note-panel {
  textarea {
    min-height: 72px;
    padding: 9px 10px;
    resize: vertical;
    color: #253149;
    font-size: 11px;
    line-height: 1.5;
    border: 1px solid #dce5f1;
    border-radius: 8px;
    outline: 0;
    background: #fff;
  }

  > div {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  span {
    color: #8b96a8;
    font-size: 10px;
  }

  button {
    height: 30px;
    padding: 0 12px;
    color: #fff;
    font-size: 9px;
    cursor: pointer;
    border: 0;
    border-radius: 7px;
    background: #053b70;
  }
}

.consult-panel {
  grid-template-columns: minmax(0, 1fr) 78px 62px;

  .consult-tip {
    display: flex;
    align-items: center;
    min-width: 0;
    height: 34px;
    padding: 0 10px;
    overflow: hidden;
    color: #5c6b82;
    font-size: 11px;
    white-space: nowrap;
    text-overflow: ellipsis;
    border: 1px solid #dce5f1;
    border-radius: 7px;
    background: #f8fbff;
  }
}

.hangup-button {
  background: #df4d5b;
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

@keyframes shell-ring {
  0%,
  100% {
    transform: translateX(0);
  }

  20% {
    transform: translateX(-3px);
  }

  40% {
    transform: translateX(3px);
  }

  60% {
    transform: translateX(-2px);
  }

  80% {
    transform: translateX(2px);
  }
}

:global(.agent-phone-mode-dropdown .el-dropdown-menu__item:nth-child(2)) {
  color: #a8abb2;
  cursor: not-allowed;
  pointer-events: none;
}
</style>
