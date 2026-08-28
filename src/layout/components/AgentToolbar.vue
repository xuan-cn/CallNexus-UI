<template>
  <div ref="phoneShellRef" class="agent-phone-shell is-embedded" :class="{ incoming: incomingCall, open: panelOpen, calling: callActive }">
    <div class="soft-bar" :class="{ 'is-in-call': callActive }">
      <!-- 空闲：状态提示 -->
      <div v-if="!callActive" class="soft-status" :class="softbarTone">
        <i class="soft-status-dot" aria-hidden="true"></i>
        <span class="soft-status-text">{{ softbarStatusText }}</span>
        <span v-if="softTimerText" class="soft-timer">{{ softTimerText }}</span>
      </div>

      <!-- 通话中：操作条（号码展示交给右侧电话框，避免重复） -->
      <div v-else class="soft-call-strip">
        <div class="soft-live-bar">
          <div class="soft-live-peer">
            <i class="soft-live-dot" aria-hidden="true"></i>
            <span class="soft-live-label">通话中</span>
            <em>{{ softTimerText || '00:00' }}</em>
          </div>
          <div class="soft-live-actions" aria-label="通话快捷操作">
            <button
              type="button"
              class="soft-live-btn is-primary"
              :class="{ 'is-active': callHeld }"
              :title="callHeld ? '恢复通话' : '保持通话'"
              :disabled="callActionLoading"
              @click="toggleHold"
            >
              <el-icon><VideoPause /></el-icon><span>{{ callHeld ? '恢复' : '保持' }}</span>
            </button>
            <button
              type="button"
              class="soft-live-btn is-primary"
              :class="{ 'is-active': callMuted }"
              :title="callMuted ? '取消静音' : '静音'"
              :disabled="callActionLoading"
              @click="toggleMute"
            >
              <el-icon><Microphone /></el-icon><span>{{ callMuted ? '取消静音' : '静音' }}</span>
            </button>
            <span class="soft-live-sep" aria-hidden="true"></span>
            <button
              type="button"
              class="soft-live-btn"
              :class="{ 'is-active': transferPanelOpen }"
              title="盲转"
              :disabled="callActionLoading || consultActive"
              @click="toggleSoftTransferPanel"
            >
              <el-icon><Switch /></el-icon><span>盲转</span>
            </button>
            <button
              type="button"
              class="soft-live-btn"
              :class="{ 'is-active': consultPanelOpen || consultActive }"
              title="咨询转接"
              :disabled="callActionLoading || callHeld"
              @click="toggleSoftConsultPanel"
            >
              <el-icon><ChatDotRound /></el-icon><span>咨询</span>
            </button>
            <button
              type="button"
              class="soft-live-btn"
              title="多方通话"
              :disabled="callActionLoading || callHeld || consultActive"
              @click="openConferenceDrawer"
            >
              <el-icon><Connection /></el-icon><span>多方</span>
            </button>
            <span class="soft-live-sep" aria-hidden="true"></span>
            <button type="button" class="soft-live-btn" title="打开工作台" @click="openScreenPop">
              <el-icon><Monitor /></el-icon><span>工作台</span>
            </button>
            <button
              type="button"
              class="soft-live-btn is-more"
              :class="{ 'is-active': morePanelOpen }"
              title="更多"
              :disabled="callActionLoading"
              @click="toggleSoftMorePanel"
            >
              <el-icon><MoreFilled /></el-icon><span>更多</span>
            </button>
          </div>
        </div>
      </div>

      <div class="soft-actions">
        <!-- 电话框：未通话可拨打；通话中显示号码 + 挂断（沿用原 soft-dial 形态） -->
        <div
          v-if="!(incomingCall && !callActive)"
          class="soft-dial"
          :class="{ 'is-live': callActive }"
        >
          <span class="soft-dial-lead" aria-hidden="true">
            <el-icon><Phone /></el-icon>
          </span>
          <input
            class="soft-dial-input"
            maxlength="20"
            :value="dialNumber"
            :disabled="incomingCall || callActive"
            :placeholder="callActive ? '' : '外呼号码'"
            @input="onSoftDialInput"
            @keyup.enter="makeCall"
          />
          <button
            v-if="callActive"
            type="button"
            class="soft-call-btn is-hangup"
            title="挂断"
            :disabled="callActionLoading"
            @click="hangup"
          >
            <el-icon><PhoneFilled /></el-icon>
          </button>
          <button
            v-else
            type="button"
            class="soft-call-btn"
            :class="{ 'is-ready': canDial }"
            :title="dialButtonTitle"
            @click="makeCall"
          >
            <el-icon><PhoneFilled /></el-icon>
          </button>
        </div>

        <!-- 来电：接听/挂断入口 -->
        <div v-else class="soft-dial soft-dial-incoming">
          <span class="soft-incoming-label">来电 {{ incomingNumber }}</span>
          <button
            v-if="webRtcIncoming"
            type="button"
            class="soft-call-btn is-answer"
            title="接听"
            :disabled="callActionLoading"
            @click="answerWebRtcCall"
          >
            <el-icon><PhoneFilled /></el-icon>
          </button>
          <button type="button" class="soft-call-btn is-hangup" title="挂断" @click="hangup">
            <el-icon><PhoneFilled /></el-icon>
          </button>
        </div>

        <div class="soft-tags">
          <el-dropdown trigger="click" @command="changeStatus">
            <button type="button" class="soft-tag status" :class="statusClass">
              <i></i>
              {{ signedIn ? currentStatusLabel : '未签入' }}
              <el-icon class="soft-caret"><ArrowDown /></el-icon>
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
          <span class="soft-tag agent" :title="currentAgent.agentName || currentAgent.agentCode">
            {{ currentAgent.agentCode || currentAgent.agentName || '坐席' }}
          </span>
          <button type="button" class="soft-more" :class="{ active: panelOpen }" title="打开拨号盘" @click="togglePanel">
            <el-icon><Operation /></el-icon>
          </button>
        </div>
      </div>
    </div>

    <aside v-show="panelOpen" class="agent-panel">
      <div class="panel-heading">
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
                <el-dropdown-item v-if="WEBRTC_MODE_ENABLED" command="WEBRTC">浏览器 WebRTC</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <button type="button" class="collapse-button" aria-label="收起坐席电话" @click="collapsePanel">
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
          <span v-if="incomingLocation" class="number-location">{{ incomingLocation }}</span>
          <span>等待接听</span>
        </div>
        <div class="call-actions">
          <button type="button" @click="openScreenPop">打开工作台</button>
          <button v-hasPermi="['callcenter:customer:create']" type="button" @click="createCustomer">
            <el-icon><User /></el-icon>新建客户
          </button>
          <button v-hasPermi="['callcenter:ticket:create']" type="button" @click="createTicket">
            <el-icon><Tickets /></el-icon>创建工单
          </button>
        </div>
        <!--        <p v-if="webRtcFirstLegWaiting" class="webrtc-first-leg-tip">正在自动接通浏览器软电话，接通后将继续呼叫目标号码。</p>-->
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
          <small>{{ callMuted ? '坐席已静音' : callPhaseLabel }}</small>
          <strong>{{ dialNumber }}</strong>
          <span v-if="activeNumberLocation" class="number-location">{{ activeNumberLocation }}</span>
          <span>{{ callDuration }}<em v-if="callHeld"> · 已保持</em><em v-if="callMuted"> · 已静音</em></span>
        </div>
        <button v-if="matchedCustomer" type="button" class="matched-customer-card" @click="openMatchedCustomerDetail">
          <span>已匹配客户</span>
          <strong>{{ matchedCustomer.customerName || matchedCustomer.primaryPhone }}</strong>
        </button>
        <div class="call-control-actions">
          <button type="button" :disabled="callActionLoading" @click="toggleHold">{{ callHeld ? '恢复通话' : '保持通话' }}</button>
          <button type="button" :disabled="callActionLoading" @click="toggleMute">{{ callMuted ? '取消静音' : '静音' }}</button>
          <button type="button" :disabled="callActionLoading || consultActive" @click="transferPanelOpen = !transferPanelOpen">盲转</button>
          <button type="button" :disabled="callActionLoading || callHeld" @click="consultPanelOpen = !consultPanelOpen">咨询转接</button>
          <button type="button" :disabled="callActionLoading || callHeld || consultActive" @click="openConferenceDrawer">多方通话</button>
          <button type="button" :disabled="callActionLoading || callHeld || consultActive" @click="toggleIvrTransferPanel">转 IVR</button>
          <button type="button" :disabled="callActionLoading" @click="morePanelOpen = !morePanelOpen">更多</button>
        </div>
        <div v-if="morePanelOpen" class="more-call-actions">
          <button type="button" @click="toggleDtmfPanel">DTMF 按键</button>
          <button type="button" @click="toggleNotePanel">通话备注</button>
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
        <div v-if="ivrTransferPanelOpen" v-loading="ivrTransferLoading" class="transfer-panel ivr-transfer-panel">
          <el-select v-model="ivrTransferFlowId" filterable clearable placeholder="选择已发布 IVR 流程">
            <el-option v-for="flow in ivrTransferFlows" :key="flow.id" :label="`${flow.flowName} (${flow.flowCode})`" :value="flow.id" />
          </el-select>
          <button type="button" :disabled="callActionLoading || !ivrTransferFlowId" @click="confirmIvrTransfer">确认转入</button>
          <button type="button" :disabled="callActionLoading" @click="cancelIvrTransfer">取消</button>
          <span v-if="!ivrTransferLoading && ivrTransferFlows.length === 0" class="ivr-transfer-empty">当前节点暂无已发布且启用的 IVR 流程</span>
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
          <button type="button" @click="openScreenPop">打开工作台</button>
          <button v-hasPermi="['callcenter:customer:create']" type="button" @click="createCustomer">
            <el-icon><User /></el-icon>新建客户
          </button>
          <button v-hasPermi="['callcenter:ticket:create']" type="button" @click="createTicket">
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
    <CallConferenceDrawer
      v-model="conferenceDrawerOpen"
      :call-id="activeCallId"
      :call-held="callHeld"
      :consult-active="consultActive"
      @owner-left="handleConferenceCallEnded"
      @conference-ended="handleConferenceCallEnded"
    />
    <audio ref="remoteAudioRef" autoplay playsinline></audio>
  </div>
</template>

<script setup lang="ts">
import {
  ArrowDown,
  ChatDotRound,
  CloseBold,
  Connection,
  Microphone,
  Monitor,
  MoreFilled,
  Operation,
  Phone,
  PhoneFilled,
  Switch,
  Tickets,
  User,
  VideoPause
} from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  changeCurrentAgentStatus,
  getCurrentAgent,
  getCurrentAgentWebRtcConfig,
  signInCurrentAgent,
  signOutCurrentAgent
} from '@/api/callcenter/agent';
import type { AgentCallOperation, AgentCallPhase, AgentPresenceStatus, CurrentAgentVO } from '@/api/callcenter/agent/types';
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
  transferCallToIvr,
  unmuteCall,
  unholdCall
} from '@/api/callcenter/call';
import { subscribeCallEvents } from '@/utils/websocket';
import { webRtcPhone } from '@/utils/webrtcPhone';
import { CustomerVO, getCustomerByPhone } from '@/api/callcenter/customer';
import CallConferenceDrawer from './CallConferenceDrawer.vue';
import DynamicBusinessFormDialog from './DynamicBusinessFormDialog.vue';
import { useAgentDialBus, type AgentDialRequest } from '@/composables/useAgentDial';
import { listIvrFlows } from '@/api/callcenter/ivr-flow';
import type { IvrFlowVO } from '@/api/callcenter/ivr-flow/types';
import { idleAgentCallState, reduceAgentCallState, type AgentCallState, type AgentCallTransition } from './agentCallState';

type AgentStatus = 'idle' | 'busy' | 'afterCall';
type StatusCommand = AgentStatus | 'signIn' | 'signOut';
type PhoneMode = 'EXTERNAL_SOFTPHONE' | 'WEBRTC';
const PHONE_MODE_STORAGE_KEY = 'callnexus_agent_phone_mode';
const WEBRTC_MODE_ENABLED =
  import.meta.env.DEV ||
  String(import.meta.env.VITE_APP_WEBRTC_ENABLED)
    .trim()
    .toLowerCase() === 'true';
const WEBRTC_MODE_DISABLED = !WEBRTC_MODE_ENABLED;
const router = useRouter();
const savedPhoneMode = localStorage.getItem(PHONE_MODE_STORAGE_KEY);
if (WEBRTC_MODE_DISABLED && savedPhoneMode === 'WEBRTC') {
  localStorage.setItem(PHONE_MODE_STORAGE_KEY, 'EXTERNAL_SOFTPHONE');
}

const panelOpen = ref(false);
const phoneShellRef = ref<HTMLElement>();
const remoteAudioRef = ref<HTMLAudioElement>();
const phonePosition = reactive({ left: 0, top: 0 });
const dockSide = ref<'left' | 'right'>('right');
const dockedPhoneHidden = ref(false);
const phoneShellWidth = ref(140);
const isDragging = ref(false);
const signedIn = ref(false);
const agentStatus = ref<AgentStatus>('idle');
const currentAgent = ref<CurrentAgentVO>({ configured: false, status: 'OFFLINE' });
const dialNumber = ref('');
const callActive = ref(false);
const onSoftDialInput = (event: Event) => {
  if (callActive.value) return;
  dialNumber.value = (event.target as HTMLInputElement).value;
};
const callHeld = ref(false);
const callMuted = ref(false);
const callActionLoading = ref(false);
const transferPanelOpen = ref(false);
const transferTarget = ref('');
const ivrTransferPanelOpen = ref(false);
const ivrTransferFlowId = ref<string | number>();
const ivrTransferFlows = ref<IvrFlowVO[]>([]);
const ivrTransferLoading = ref(false);
const consultPanelOpen = ref(false);
const consultTarget = ref('');
const consultActive = ref(false);
const consultCallId = ref('');
const conferenceDrawerOpen = ref(false);
const morePanelOpen = ref(false);
const dtmfPanelOpen = ref(false);
const dtmfDigits = ref('');
const notePanelOpen = ref(false);
const callNoteContent = ref('');
const noteSaving = ref(false);
const incomingCall = ref(false);
const incomingNumber = ref('');
const incomingLocation = ref('');
const activeNumberLocation = ref('');
const activeCallId = ref('');
// Agent leg UUID and business call ID are different identifiers. Agent assist
// subscriptions must always use the explicit business call ID from backend events.
const authoritativeBusinessCallId = ref('');
const callConnected = ref(false);
const callState = ref<AgentCallState>(idleAgentCallState());
const callPhase = computed(() => callState.value.phase);
const outboundDestination = ref('');
const callSeconds = ref(0);
const customerDialogVisible = ref(false);
const ticketDialogVisible = ref(false);
const matchedCustomer = ref<CustomerVO>();
const webRtcRegistered = ref(false);
const webRtcConnecting = ref(false);
const webRtcRegistrationError = ref('');
const webRtcIncoming = ref(false);
const webRtcFirstLegWaiting = ref(false);
const phoneRegistered = computed(() => signedIn.value && Boolean(currentAgent.value.extension));
const agentDialBus = useAgentDialBus();
const registrationSummary = computed(() => {
  if (!signedIn.value) return '未签入';
  if (webRtcRegistered.value) return 'WebRTC 已注册';
  if (webRtcConnecting.value) return 'WebRTC 注册中';
  return currentAgent.value.extension ? '外置软电话' : '未绑定分机';
});
let callTimer: ReturnType<typeof setInterval> | undefined;
let ringTimer: ReturnType<typeof setInterval> | undefined;
let ringStartToken = 0;
let ringAudioContext: AudioContext | undefined;
let presenceTimer: ReturnType<typeof setInterval> | undefined;
let matchedCustomerLookupTimer: ReturnType<typeof setTimeout> | undefined;
let unsubscribeCallEvents: (() => void) | undefined;
let syncingCallPresence = false;
let restoringIdleAfterHangup = false;
let webRtcFirstLegTimeout: ReturnType<typeof setTimeout> | undefined;
let webRtcOutboundFirstLegPending = false;
let dragOffsetX = 0;
let dragOffsetY = 0;
let dragStartX = 0;
let dragStartY = 0;
let suppressTriggerClick = false;
let dockedPhoneHideTimer: ReturnType<typeof setTimeout> | undefined;
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

const DOCK_EDGE_GAP = 8;
const DOCK_VISIBLE_WIDTH = 22;
const phonePositionStyle = computed(() => {
  let left = phonePosition.left;
  if (dockedPhoneHidden.value && !panelOpen.value && !incomingCall.value && !isDragging.value) {
    left = dockSide.value === 'left' ? DOCK_VISIBLE_WIDTH - phoneShellWidth.value : window.innerWidth - DOCK_VISIBLE_WIDTH;
  }
  return {
    left: `${left}px`,
    top: `${phonePosition.top}px`,
    transition: isDragging.value ? 'none' : 'left 0.22s ease, top 0.16s ease'
  };
});
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
const softbarWarn = computed(() => {
  if (incomingCall.value || callActive.value) return false;
  if (!currentAgent.value.configured) return true;
  if (!currentAgent.value.extension) return true;
  if (!signedIn.value) return true;
  if (webRtcPhoneEnabled.value && !webRtcRegistered.value) return true;
  return false;
});
const softbarTone = computed(() => {
  if (incomingCall.value || callActive.value) return 'live';
  if (softbarWarn.value) return 'warn';
  // 左侧只表示软电话是否就绪，坐席示闲/示忙颜色交给右侧标签，避免两边抢色
  return 'ready';
});
const softbarStatusText = computed(() => {
  if (incomingCall.value) return `来电振铃中 ${incomingNumber.value || ''}`.trim();
  if (callActive.value) {
    if (callHeld.value) return '通话已保持';
    if (callMuted.value) return '坐席已静音';
    return `通话中 ${dialNumber.value || ''}`.trim();
  }
  if (!currentAgent.value.configured) return '未配置坐席，请先绑定分机';
  if (!currentAgent.value.extension) return '分机未绑定，请先配置分机后再签入';
  if (!signedIn.value) {
    if (webRtcPhoneEnabled.value && !webRtcRegistered.value && !webRtcConnecting.value) {
      return '分机未注册，请先注册后再签入';
    }
    return '未签入，请先签入坐席';
  }
  if (webRtcPhoneEnabled.value && webRtcConnecting.value) return 'WebRTC 注册中';
  if (webRtcPhoneEnabled.value && !webRtcRegistered.value) return '分机未注册，请检查注册状态';
  if (webRtcPhoneEnabled.value && webRtcRegistered.value) return 'WebRTC 已就绪';
  return '外置软电话已就绪';
});
const softTimerText = computed(() => {
  if (!incomingCall.value && !callActive.value) return '';
  const total = callSeconds.value;
  const hours = Math.floor(total / 3600)
    .toString()
    .padStart(2, '0');
  const minutes = Math.floor((total % 3600) / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (total % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
});
const canDial = computed(() => phoneRegistered.value && !!dialNumber.value.trim());
const dialButtonTitle = computed(() => {
  if (!signedIn.value) return '请先签入坐席';
  if (!currentAgent.value.extension) return '请先配置分机';
  if (!dialNumber.value.trim()) return '请输入外呼号码';
  return '拨打';
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

const callPhaseLabels: Record<AgentCallPhase, string> = {
  IDLE: '空闲',
  INCOMING_RINGING: '来电振铃中',
  OUTBOUND_DIALING: '正在呼叫',
  CONNECTED: '通话中',
  HELD: '通话已保持',
  ENDING: '正在结束',
  ENDED: '已结束'
};
const callPhaseLabel = computed(() => callPhaseLabels[callPhase.value]);
const validCallPhases = new Set<AgentCallPhase>(Object.keys(callPhaseLabels) as AgentCallPhase[]);
const validCallOperations = new Set<AgentCallOperation>(['NONE', 'TRANSFERRING_IVR', 'CONSULTING', 'CONFERENCE', 'BLIND_TRANSFERRING']);

const normalizeCallPhase = (value: unknown, fallback: AgentCallPhase): AgentCallPhase => {
  const phase = String(value || '') as AgentCallPhase;
  return validCallPhases.has(phase) ? phase : fallback;
};

const normalizeCallOperation = (value: unknown): AgentCallOperation => {
  const operation = String(value || '') as AgentCallOperation;
  return validCallOperations.has(operation) ? operation : 'NONE';
};

const commitCallTransition = (transition: AgentCallTransition) => {
  const next = reduceAgentCallState(callState.value, transition);
  if (next === callState.value) return false;
  callState.value = next;
  incomingCall.value = next.phase === 'INCOMING_RINGING';
  callActive.value = next.phase === 'OUTBOUND_DIALING' || next.phase === 'CONNECTED' || next.phase === 'HELD' || next.phase === 'ENDING';
  callConnected.value = next.phase === 'CONNECTED' || next.phase === 'HELD';
  callHeld.value = next.phase === 'HELD';
  return true;
};

const commitEventCallState = (event: Record<string, unknown>, fallback: AgentCallPhase) => {
  const explicitBusinessCallId = String(event.businessCallId || '').trim();
  if (explicitBusinessCallId) {
    authoritativeBusinessCallId.value = explicitBusinessCallId;
  }
  return commitCallTransition({
    phase: normalizeCallPhase(event.callPhase, fallback),
    operation: normalizeCallOperation(event.callOperation),
    businessCallId: String(event.businessCallId || event.callId || ''),
    agentLegUuid: String(event.agentLegUuid || event.legUuid || ''),
    version: Number(event.stateVersion || 0)
  });
};

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
    const accepted = commitCallTransition({
      phase: normalizeCallPhase(agent.activeCallPhase, 'CONNECTED'),
      operation: normalizeCallOperation(agent.activeCallOperation),
      businessCallId: agent.activeCallId,
      agentLegUuid: agent.activeAgentLegUuid,
      version: Number(agent.activeCallStateVersion || 0)
    });
    if (!accepted && callState.value.businessCallId && callState.value.businessCallId !== agent.activeCallId) return;
    incomingCall.value = false;
    stopRingTone();
    activeCallId.value = agent.activeCallId;
    dialNumber.value = agent.activeCallNumber || dialNumber.value;
    agentStatus.value = 'busy';
    callActive.value = true;
    callConnected.value = true;
    if (!wasActive && webRtcPhoneEnabled.value) panelOpen.value = true;
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

let webRtcRegistrationTask: Promise<boolean> | undefined;

const registerWebRtcPhone = async () => {
  if (!webRtcPhoneEnabled.value) {
    await disconnectWebRtcPhone();
    return false;
  }
  if (!signedIn.value) {
    webRtcRegistrationError.value = '坐席尚未签入，请先签入坐席';
    return false;
  }
  if (!remoteAudioRef.value) {
    await nextTick();
  }
  const remoteAudio = remoteAudioRef.value;
  if (!remoteAudio) {
    webRtcRegistrationError.value = '远端音频组件尚未挂载，请刷新页面后重试';
    return false;
  }
  if (webRtcRegistrationTask) {
    return webRtcRegistrationTask;
  }
  webRtcRegistrationTask = performWebRtcRegistration(remoteAudio);
  try {
    return await webRtcRegistrationTask;
  } finally {
    webRtcRegistrationTask = undefined;
  }
};

const performWebRtcRegistration = async (remoteAudio: HTMLAudioElement) => {
  let registrationSucceeded = false;
  try {
    webRtcConnecting.value = true;
    webRtcRegistered.value = false;
    webRtcRegistrationError.value = '';
    const response = await getCurrentAgentWebRtcConfig();
    const config = response.data;
    if (window.location.protocol === 'https:' && config.wssUrl?.startsWith('ws://')) {
      throw new Error('当前页面使用 HTTPS，WebSocket 地址必须使用 wss://');
    }
    console.info('[WebRTC] registering', {
      extension: config.extension,
      authUsername: config.authUsername,
      sipDomain: config.sipDomain,
      wssUrl: config.wssUrl
    });
    webRtcPhone.configure({
      onIncoming: (number) => {
        webRtcIncoming.value = true;
        webRtcFirstLegWaiting.value = true;
        incomingNumber.value = webRtcOutboundFirstLegPending
          ? outboundDestination.value || dialNumber.value || '未知号码'
          : String(number || '').trim() || '未知号码';
        if (!webRtcOutboundFirstLegPending) {
          dialNumber.value = incomingNumber.value;
        }
        panelOpen.value = true;
        startWebRtcFirstLegTimeout();
        if (webRtcOutboundFirstLegPending) {
          commitCallTransition({
            phase: 'OUTBOUND_DIALING',
            businessCallId: activeCallId.value,
            agentLegUuid: callState.value.agentLegUuid
          });
          stopRingTone();
          void answerWebRtcOutboundFirstLeg();
          return;
        }
        commitCallTransition({
          phase: 'INCOMING_RINGING',
          businessCallId: activeCallId.value,
          agentLegUuid: callState.value.agentLegUuid
        });
        startRingTone();
        nextTick(constrainPosition);
      },
      onAnswered: () => {
        webRtcOutboundFirstLegPending = false;
        webRtcIncoming.value = false;
        stopWebRtcFirstLegWaiting();
        stopRingTone();
        commitCallTransition({
          phase: 'CONNECTED',
          businessCallId: activeCallId.value,
          agentLegUuid: callState.value.agentLegUuid
        });
        agentStatus.value = 'busy';
        startCallTimer();
        openScreenPop();
      },
      onHangup: () => {
        webRtcOutboundFirstLegPending = false;
        webRtcIncoming.value = false;
        stopWebRtcFirstLegWaiting();
        markCallEnded(activeCallId.value);
        clearActiveCallState();
        void restoreIdleAfterWebRtcHangup();
      },
      onHold: (held) => {
        callHeld.value = held;
        commitCallTransition({
          phase: held ? 'HELD' : 'CONNECTED',
          businessCallId: activeCallId.value,
          agentLegUuid: callState.value.agentLegUuid
        });
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
    await webRtcPhone.connect(config, remoteAudio);
    registrationSucceeded = true;
    webRtcRegistered.value = true;
    return true;
  } catch (error) {
    webRtcRegistered.value = false;
    webRtcRegistrationError.value = describeWebRtcRegistrationError(error);
    console.warn('[WebRTC] register failed, fallback to external softphone mode', error);
    await disconnectWebRtcPhone();
    return false;
  } finally {
    webRtcConnecting.value = false;
    webRtcRegistered.value = webRtcPhoneEnabled.value && (registrationSucceeded || webRtcPhone.isRegistered());
  }
};

const describeWebRtcRegistrationError = (error: unknown) => {
  if (error instanceof DOMException && error.name === 'NotAllowedError') {
    return '浏览器未授权麦克风权限';
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return '未知错误，请查看浏览器控制台和 Network/WS';
};

const disconnectWebRtcPhone = async () => {
  webRtcOutboundFirstLegPending = false;
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
    ElMessage.error(`WebRTC 注册失败：${webRtcRegistrationError.value || '请检查 WebSocket 和 SIP 鉴权配置'}`);
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
  if (!signedIn.value) {
    ElMessage.warning('请先签入坐席');
    return;
  }
  if (!currentAgent.value.extension) {
    ElMessage.warning('请先配置分机后再拨打');
    return;
  }
  if (!dialNumber.value.trim()) {
    ElMessage.warning('请输入外呼号码');
    return;
  }
  if (!phoneRegistered.value) {
    ElMessage.warning('坐席未就绪，请确认已签入并绑定分机');
    return;
  }
  if (webRtcPhoneEnabled.value && !webRtcRegistered.value) {
    ElMessage.warning('WebRTC 未注册，请检查 WSS 配置或切换为外置软电话模式');
    return;
  }
  try {
    outboundDestination.value = dialNumber.value.trim();
    suppressIncomingCallUntil = webRtcPhoneEnabled.value ? 0 : Date.now() + 15000;
    webRtcOutboundFirstLegPending = webRtcPhoneEnabled.value;
    if (webRtcPhoneEnabled.value) {
      webRtcFirstLegWaiting.value = true;
      panelOpen.value = true;
      startWebRtcFirstLegTimeout();
    }
    const response = await originateCall({ destination: dialNumber.value });
    activeCallId.value = response.data.callId;
    commitCallTransition({
      phase: 'OUTBOUND_DIALING',
      businessCallId: response.data.businessCallId || response.data.callId,
      agentLegUuid: callState.value.agentLegUuid
    });
    resetCallControls();
    const current = await getCurrentAgent();
    if (webRtcPhoneEnabled.value) {
      ElMessage.success('外呼命令已发送，浏览器软电话正在自动接通');
    } else {
      startCallTimer();
      applyCurrentAgent(current.data);
      ElMessage.success('外呼命令已发送，请在软电话接听');
    }
  } catch {
    outboundDestination.value = '';
    webRtcOutboundFirstLegPending = false;
    stopWebRtcFirstLegWaiting();
    // HTTP 错误由全局请求拦截器统一提示。
  }
};

const answerWebRtcOutboundFirstLeg = async () => {
  try {
    await webRtcPhone.answer();
  } catch (error) {
    webRtcOutboundFirstLegPending = false;
    commitCallTransition({
      phase: 'INCOMING_RINGING',
      businessCallId: activeCallId.value,
      agentLegUuid: callState.value.agentLegUuid
    });
    startRingTone();
    nextTick(constrainPosition);
    console.error('[WebRTC] 自动接听外呼第一腿失败', error);
    ElMessage.error('浏览器软电话自动接听失败，请手动接听或查看控制台错误');
  }
};

const handleAgentDialRequest = async (request: AgentDialRequest) => {
  const destination = request.destination.trim();
  if (!destination) return;
  if (!phoneRegistered.value) {
    ElMessage.warning('请先签入坐席并确认软电话已注册');
    return;
  }
  if (callActive.value || incomingCall.value || webRtcPhone.hasActiveCall() || webRtcIncoming.value) {
    ElMessage.warning('当前已有进行中的通话，无法发起新的外呼');
    return;
  }
  dialNumber.value = destination;
  revealDockedPhone();
  panelOpen.value = true;
  await nextTick();
  constrainPosition();
  await makeCall();
};

const hangup = async () => {
  if (!activeCallId.value && !webRtcPhone.hasActiveCall() && !webRtcIncoming.value) return;
  try {
    callActionLoading.value = true;
    if (webRtcIncoming.value && !callActive.value) {
      await webRtcPhone.decline();
      markCallEnded(activeCallId.value);
      clearActiveCallState();
      await restoreIdleAfterWebRtcHangup();
      return;
    }
    if (!activeCallId.value) {
      await webRtcPhone.hangup();
      markCallEnded(activeCallId.value);
      clearActiveCallState();
      await restoreIdleAfterWebRtcHangup();
      return;
    }
    await hangupCall(activeCallId.value);
    if (webRtcPhoneEnabled.value && webRtcPhone.hasActiveCall()) {
      try {
        await webRtcPhone.hangup();
      } catch (error) {
        console.debug('[WebRTC] backend hangup completed before local SIP session cleanup', error);
      }
    }
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
  if (!activeCallId.value) return;
  try {
    callActionLoading.value = true;
    if (callHeld.value) {
      await unholdCall(activeCallId.value);
      callHeld.value = false;
      commitCallTransition({
        phase: 'CONNECTED',
        operation: callState.value.operation,
        businessCallId: activeCallId.value,
        agentLegUuid: callState.value.agentLegUuid
      });
      ElMessage.success('通话已恢复');
    } else {
      await holdCall(activeCallId.value);
      callHeld.value = true;
      commitCallTransition({
        phase: 'HELD',
        operation: callState.value.operation,
        businessCallId: activeCallId.value,
        agentLegUuid: callState.value.agentLegUuid
      });
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

const loadTransferableIvrFlows = async () => {
  try {
    ivrTransferLoading.value = true;
    const response = await listIvrFlows();
    const nodeId = currentAgent.value.nodeId;
    ivrTransferFlows.value = (response.data || []).filter((flow) => {
      if (!flow.enabled || flow.publishStatus !== 'PUBLISHED') return false;
      if (!nodeId) return true;
      return (flow.nodeIds || []).some((id) => String(id) === String(nodeId));
    });
  } finally {
    ivrTransferLoading.value = false;
  }
};

const toggleIvrTransferPanel = async () => {
  if (!activeCallId.value || callHeld.value || consultActive.value) return;
  const open = !ivrTransferPanelOpen.value;
  transferPanelOpen.value = false;
  consultPanelOpen.value = false;
  morePanelOpen.value = false;
  ivrTransferPanelOpen.value = open;
  if (open) {
    await loadTransferableIvrFlows();
  }
};

const confirmIvrTransfer = async () => {
  if (!activeCallId.value || !ivrTransferFlowId.value) return;
  const selectedFlow = ivrTransferFlows.value.find((flow) => String(flow.id) === String(ivrTransferFlowId.value));
  try {
    await ElMessageBox.confirm(
      `确认将客户转入 IVR 流程“${selectedFlow?.flowName || ivrTransferFlowId.value}”吗？转入后坐席将退出当前通话。`,
      '转入 IVR',
      {
        confirmButtonText: '确认转入',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
  } catch {
    return;
  }

  try {
    callActionLoading.value = true;
    await transferCallToIvr(activeCallId.value, ivrTransferFlowId.value);
    ElMessage.success('客户已转入 IVR 流程');
    clearActiveCallState();
    const current = await getCurrentAgent();
    applyCurrentAgent(current.data);
  } finally {
    callActionLoading.value = false;
  }
};

const cancelIvrTransfer = () => {
  ivrTransferPanelOpen.value = false;
  ivrTransferFlowId.value = undefined;
};

const startConsult = async () => {
  if (!activeCallId.value || !consultTarget.value) return;
  try {
    callActionLoading.value = true;
    const response = await startConsultTransfer(activeCallId.value, consultTarget.value);
    consultCallId.value = response.data.callId;
    consultActive.value = true;
    callHeld.value = true;
    commitCallTransition({
      phase: 'HELD',
      operation: 'CONSULTING',
      businessCallId: activeCallId.value,
      agentLegUuid: callState.value.agentLegUuid
    });
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
    await cancelConsultTransfer(activeCallId.value);
    consultActive.value = false;
    consultCallId.value = '';
    consultPanelOpen.value = false;
    consultTarget.value = '';
    callHeld.value = false;
    commitCallTransition({
      phase: 'CONNECTED',
      operation: 'NONE',
      businessCallId: activeCallId.value,
      agentLegUuid: callState.value.agentLegUuid
    });
    ElMessage.success('咨询已取消，客户通话已恢复');
  } finally {
    callActionLoading.value = false;
  }
};

const completeConsult = async () => {
  if (!activeCallId.value) return;
  try {
    callActionLoading.value = true;
    await completeConsultTransfer(activeCallId.value);
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

const openConferenceDrawer = () => {
  if (!activeCallId.value || callHeld.value || consultActive.value) return;
  morePanelOpen.value = false;
  conferenceDrawerOpen.value = true;
};

/** 顶栏快捷操作：与小电话弹框同逻辑；需表单的操作会展开面板 */
const toggleSoftTransferPanel = () => {
  if (callActionLoading.value || consultActive.value) return;
  consultPanelOpen.value = false;
  ivrTransferPanelOpen.value = false;
  morePanelOpen.value = false;
  transferPanelOpen.value = !transferPanelOpen.value;
  if (transferPanelOpen.value) panelOpen.value = true;
};

const toggleSoftConsultPanel = () => {
  if (callActionLoading.value || callHeld.value) return;
  transferPanelOpen.value = false;
  ivrTransferPanelOpen.value = false;
  morePanelOpen.value = false;
  consultPanelOpen.value = !consultPanelOpen.value;
  if (consultPanelOpen.value) panelOpen.value = true;
};

const toggleSoftMorePanel = () => {
  if (callActionLoading.value) return;
  transferPanelOpen.value = false;
  consultPanelOpen.value = false;
  ivrTransferPanelOpen.value = false;
  morePanelOpen.value = !morePanelOpen.value;
  if (morePanelOpen.value) panelOpen.value = true;
};

const toggleDtmfPanel = () => {
  dtmfPanelOpen.value = !dtmfPanelOpen.value;
  notePanelOpen.value = false;
  morePanelOpen.value = false;
};

const toggleNotePanel = () => {
  notePanelOpen.value = !notePanelOpen.value;
  dtmfPanelOpen.value = false;
  morePanelOpen.value = false;
};

const handleConferenceCallEnded = () => {
  markCallEnded(activeCallId.value);
  clearActiveCallState();
  void loadCurrentAgent();
};

const resetCallControls = () => {
  callHeld.value = false;
  callMuted.value = false;
  callActionLoading.value = false;
  transferPanelOpen.value = false;
  transferTarget.value = '';
  ivrTransferPanelOpen.value = false;
  ivrTransferFlowId.value = undefined;
  ivrTransferLoading.value = false;
  consultPanelOpen.value = false;
  consultTarget.value = '';
  consultActive.value = false;
  consultCallId.value = '';
  conferenceDrawerOpen.value = false;
  morePanelOpen.value = false;
  dtmfPanelOpen.value = false;
  dtmfDigits.value = '';
  notePanelOpen.value = false;
  callNoteContent.value = '';
  noteSaving.value = false;
};

const createCustomer = () => {
  customerDialogVisible.value = true;
};

const openMatchedCustomerDetail = () => {
  if (!matchedCustomer.value?.id) return;
  void router.push({
    name: 'CustomerDetailWorkspace',
    params: { customerId: String(matchedCustomer.value.id) }
  });
};

const createTicket = () => {
  ticketDialogVisible.value = true;
};

const openScreenPop = () => {
  void router.push({
    name: 'AgentCallWorkspace',
    query: {
      callId: workspaceBusinessCallId.value,
      phone: incomingCall.value ? incomingNumber.value : dialNumber.value,
      location: incomingCall.value ? incomingLocation.value : activeNumberLocation.value,
      status: softbarStatusText.value,
      duration: softTimerText.value,
      incoming: String(incomingCall.value),
      active: String(callActive.value)
    }
  });
};

const simulateIncomingCall = () => {
  if (callActive.value || incomingCall.value) {
    openScreenPop();
    return;
  }
  const mockNumber = `138${Math.floor(Math.random() * 100000000)
    .toString()
    .padStart(8, '0')}`;
  showIncomingCall({
    businessCallId: `sim-${Date.now()}`,
    callerNumber: mockNumber,
    callerProvince: '模拟',
    callerCity: '来电'
  });
  ElMessage.info(`模拟来电：${mockNumber}`);
};

const handleTriggerClick = () => {
  if (suppressTriggerClick) return;
  void unlockRingAudio();
  panelOpen.value = true;
};

const togglePanel = () => {
  void unlockRingAudio();
  panelOpen.value = !panelOpen.value;
};

const collapsePanel = () => {
  panelOpen.value = false;
};

const handleDocumentPointerDown = (event: PointerEvent) => {
  if (!panelOpen.value || !phoneShellRef.value) return;
  const target = event.target as Node | null;
  if (!target) return;
  if (phoneShellRef.value.contains(target)) return;
  if ((target as HTMLElement).closest?.('.el-popper, .el-overlay, .el-message-box, .el-dialog')) return;
  if (incomingCall.value || callActive.value) return;
  panelOpen.value = false;
};

/** 顶栏嵌入后不再吸附边缘，保留空实现避免通话流程改动过大 */
const clearDockedPhoneHideTimer = () => {
  if (!dockedPhoneHideTimer) return;
  clearTimeout(dockedPhoneHideTimer);
  dockedPhoneHideTimer = undefined;
};
const revealDockedPhone = () => {
  clearDockedPhoneHideTimer();
  dockedPhoneHidden.value = false;
};
const scheduleDockedPhoneHide = () => {
  clearDockedPhoneHideTimer();
};
const persistPhonePosition = () => undefined;
const snapCollapsedPhoneToEdge = () => undefined;
const constrainPosition = () => undefined;

const startDrag = (event: PointerEvent) => {
  if ((event.target as HTMLElement).closest('button, .el-dropdown, input')) return;
  beginDrag(event);
};

const startCollapsedDrag = (event: PointerEvent) => {
  beginDrag(event);
};

const beginDrag = (event: PointerEvent) => {
  if (event.button !== 0) return;
  clearDockedPhoneHideTimer();
  const rect = phoneShellRef.value?.getBoundingClientRect();
  if (rect) {
    phoneShellWidth.value = rect.width;
    phonePosition.left =
      dockedPhoneHidden.value && !panelOpen.value
        ? dockSide.value === 'left'
          ? DOCK_EDGE_GAP
          : Math.max(DOCK_EDGE_GAP, window.innerWidth - rect.width - DOCK_EDGE_GAP)
        : rect.left;
    phonePosition.top = rect.top;
  }
  dockedPhoneHidden.value = false;
  isDragging.value = true;
  suppressTriggerClick = false;
  dragStartX = event.clientX;
  dragStartY = event.clientY;
  dragOffsetX = event.clientX - phonePosition.left;
  dragOffsetY = event.clientY - phonePosition.top;
  (event.currentTarget as HTMLElement | null)?.setPointerCapture?.(event.pointerId);
  window.addEventListener('pointermove', handleDrag);
  window.addEventListener('pointerup', stopDrag, { once: true });
};

const handleDrag = (event: PointerEvent) => {
  if (!isDragging.value) return;
  if (Math.hypot(event.clientX - dragStartX, event.clientY - dragStartY) > 4) {
    suppressTriggerClick = true;
  }
  phonePosition.left = event.clientX - dragOffsetX;
  phonePosition.top = event.clientY - dragOffsetY;
  constrainPosition();
};

const stopDrag = () => {
  if (!isDragging.value) return;
  isDragging.value = false;
  window.removeEventListener('pointermove', handleDrag);
  if (!panelOpen.value) {
    snapCollapsedPhoneToEdge();
    scheduleDockedPhoneHide();
  } else {
    persistPhonePosition();
  }
  setTimeout(() => {
    suppressTriggerClick = false;
  }, 0);
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
  const startToken = ++ringStartToken;
  void unlockRingAudio().then(() => {
    if (startToken !== ringStartToken || ringTimer) return;
    playRingPulse();
    ringTimer = setInterval(playRingPulse, 1200);
  });
};

const stopRingTone = () => {
  ringStartToken += 1;
  if (ringTimer) clearInterval(ringTimer);
  ringTimer = undefined;
};

const showIncomingCall = (event: Record<string, unknown>) => {
  if (Date.now() < suppressIncomingCallUntil) return;
  if (!commitEventCallState(event, 'INCOMING_RINGING')) return;
  const eventCallId = String(event.businessCallId || event.callId || '');
  const callerNumber = String(event.callerNumber || '');
  if (eventCallId) activeCallId.value = eventCallId;
  incomingNumber.value = callerNumber || '未知号码';
  incomingLocation.value = buildNumberLocation(event);
  dialNumber.value = incomingNumber.value;
  resetCallControls();
  stopCallTimer();
  // 外置软电话：振铃阶段只更新顶栏，接通后再打开工作台
  if (webRtcIncoming.value) {
    panelOpen.value = true;
  }
  startRingTone();
  nextTick(constrainPosition);
};

const isSourceConsultLegEvent = (eventCallId: string, callerNumber: string) =>
  consultActive.value && eventCallId === consultCallId.value && isCurrentAgentIdentity(callerNumber);

const showActiveCall = (event: Record<string, unknown>, fallbackPhase: AgentCallPhase = 'CONNECTED') => {
  if (isWebRtcLocalIdle()) return;
  const eventCallId = String(event.businessCallId || event.callId || '');
  const eventLegUuid = String(event.legUuid || event.callId || '');
  const callerNumber = String(event.callerNumber || '');
  const calledNumber = String(event.calledNumber || '');
  if (eventCallId && recentlyEndedCallIds.has(eventCallId)) return;
  if (isSourceConsultLegEvent(eventLegUuid, callerNumber)) return;
  if (!commitEventCallState(event, fallbackPhase)) return;
  if (eventCallId) activeCallId.value = eventCallId;
  const peerNumber = isCurrentAgentIdentity(callerNumber) ? outboundDestination.value || calledNumber : callerNumber;
  dialNumber.value = peerNumber;
  activeNumberLocation.value = isCurrentAgentIdentity(callerNumber) ? '' : buildNumberLocation(event);
  stopRingTone();
  callActive.value = true;
  // 通话中保留顶栏操作即可；面板已开则不动，未开不强制弹出
  startCallTimer();
  // 仅接通后自动打开工作台（振铃/外呼拨号中不跳转）
  if (fallbackPhase === 'CONNECTED') {
    openScreenPop();
  }
  nextTick(constrainPosition);
};

const handleCallEvent = (event: Record<string, unknown>) => {
  const type = String(event.type || '');
  const agentExtension = String(event.agentExtension || '');
  const callerNumber = String(event.callerNumber || '');
  const calledNumber = String(event.calledNumber || '');
  const eventLegUuid = String(event.legUuid || event.callId || '');
  const eventCallId = String(event.businessCallId || event.callId || '');
  const relatedToCurrentAgent =
    isCurrentAgentIdentity(agentExtension) || isCurrentAgentIdentity(callerNumber) || isCurrentAgentIdentity(calledNumber);
  if (import.meta.env.DEV) {
    console.debug('[CallNexus][AgentToolbar] 通话事件判断', {
      type,
      currentExtension: currentAgent.value.extension,
      currentAuthUsername: currentAgent.value.authUsername,
      agentExtension,
      callerNumber,
      calledNumber,
      eventLegUuid,
      eventCallId,
      relatedToCurrentAgent
    });
  }
  if (type === 'CALL_HANGUP_COMPLETE') {
    const matchedCurrentLeg = isCurrentAgentIdentity(callerNumber) || isCurrentAgentIdentity(calledNumber);
    const relatedToCurrentCall = activeCallId.value
      ? relatedToCurrentAgent && (eventCallId === activeCallId.value || matchedCurrentLeg)
      : relatedToCurrentAgent;
    if (!relatedToCurrentCall) return;
    if (!commitEventCallState(event, 'ENDED')) return;
    markCallEnded(eventCallId || activeCallId.value);
    clearActiveCallState();
    void loadCurrentAgent();
    return;
  }
  if (!relatedToCurrentAgent) return;
  // WebRTC 入呼以浏览器 SIP 会话为接听权威。FreeSWITCH 的关联腿可能先产生
  // ANSWER/BRIDGE/HOLD 事件，这些事件只能补充业务通话标识，不能替代用户接听。
  const pendingWebRtcAnswer = webRtcPhoneEnabled.value && webRtcIncoming.value;
  if (pendingWebRtcAnswer && (type === 'CALL_ANSWER' || type === 'CALL_BRIDGE' || type === 'CALL_HOLD' || type === 'CALL_UNHOLD')) {
    if (eventCallId) activeCallId.value = eventCallId;
    if (import.meta.env.DEV) {
      console.debug('[CallNexus][AgentToolbar] WebRTC 尚未接听，忽略后台接通状态推进', {
        type,
        eventCallId,
        eventLegUuid
      });
    }
    return;
  }
  if (type === 'CALL_HOLD') {
    if (commitEventCallState(event, 'HELD')) callHeld.value = true;
    return;
  }
  if (type === 'CALL_UNHOLD') {
    if (commitEventCallState(event, 'CONNECTED')) callHeld.value = false;
    return;
  }
  if (type === 'CALL_ANSWER' || type === 'CALL_BRIDGE') {
    if (isSourceConsultLegEvent(eventLegUuid, callerNumber)) return;
    showActiveCall(event, 'CONNECTED');
    return;
  }
  if (type === 'CALL_CREATE' || type === 'CALL_PROGRESS' || type === 'CALL_PROGRESS_MEDIA') {
    // FreeSWITCH may deliver a delayed queue ringing event after the agent leg has answered.
    // Once connected, no phone mode may regress to ringing until the current call ends.
    if (callConnected.value) {
      return;
    }
    const isIncomingToCurrentAgent = isCurrentAgentIdentity(agentExtension) && !isCurrentAgentIdentity(callerNumber) && calledNumber !== '';
    if (isIncomingToCurrentAgent) {
      showIncomingCall(event);
    } else {
      showActiveCall(event, 'OUTBOUND_DIALING');
    }
  }
};

const clearActiveCallState = () => {
  callState.value = idleAgentCallState();
  authoritativeBusinessCallId.value = '';
  incomingCall.value = false;
  incomingNumber.value = '';
  incomingLocation.value = '';
  activeNumberLocation.value = '';
  callActive.value = false;
  callConnected.value = false;
  activeCallId.value = '';
  outboundDestination.value = '';
  matchedCustomer.value = undefined;
  webRtcOutboundFirstLegPending = false;
  webRtcIncoming.value = false;
  stopWebRtcFirstLegWaiting();
  resetCallControls();
  stopCallTimer();
  stopRingTone();
  panelOpen.value = false;
};

const buildNumberLocation = (event: Record<string, unknown>) => {
  return [event.callerProvince, event.callerCity, event.callerCarrier]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join(' ');
};

const currentAgentIdentities = () =>
  [currentAgent.value.extension, currentAgent.value.authUsername].map((value) => String(value || '').trim()).filter(Boolean);

const isCurrentAgentIdentity = (identity: string) => {
  const normalizedIdentity = String(identity || '').trim();
  return Boolean(normalizedIdentity) && currentAgentIdentities().includes(normalizedIdentity);
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

const lookupMatchedCustomer = async () => {
  const number = (incomingCall.value ? incomingNumber.value : dialNumber.value).trim();
  if ((!callActive.value && !incomingCall.value) || !number) {
    matchedCustomer.value = undefined;
    return;
  }
  const queriedNumber = number;
  try {
    const response = await getCustomerByPhone(queriedNumber);
    const currentNumber = (incomingCall.value ? incomingNumber.value : dialNumber.value).trim();
    if (currentNumber === queriedNumber) {
      matchedCustomer.value = response.data || undefined;
    }
  } catch {
    matchedCustomer.value = undefined;
  }
};

watch([dialNumber, incomingNumber, callActive, incomingCall], () => {
  matchedCustomer.value = undefined;
  if (matchedCustomerLookupTimer) clearTimeout(matchedCustomerLookupTimer);
  matchedCustomerLookupTimer = setTimeout(() => void lookupMatchedCustomer(), 300);
});

watch(incomingCall, (incoming) => {
  if (!incoming) {
    scheduleDockedPhoneHide();
    return;
  }
  revealDockedPhone();
  // 仅 WebRTC 待接听时自动展开面板；外置软电话靠顶栏提示，接通后再打开工作台
  if (webRtcIncoming.value) {
    panelOpen.value = true;
  }
  nextTick(constrainPosition);
});

onMounted(async () => {
  agentDialBus.on(handleAgentDialRequest);
  unsubscribeCallEvents = subscribeCallEvents(handleCallEvent);
  await loadCurrentAgent();
  await nextTick();
  await registerWebRtcPhone();
  presenceTimer = setInterval(() => void syncActiveCallPresence(), 3000);
  document.addEventListener('pointerdown', handleDocumentPointerDown, true);
});

onBeforeUnmount(() => {
  agentDialBus.off(handleAgentDialRequest);
  unsubscribeCallEvents?.();
  void disconnectWebRtcPhone();
  stopCallTimer();
  stopRingTone();
  if (presenceTimer) clearInterval(presenceTimer);
  if (matchedCustomerLookupTimer) clearTimeout(matchedCustomerLookupTimer);
  clearDockedPhoneHideTimer();
  document.removeEventListener('pointerdown', handleDocumentPointerDown, true);
  window.removeEventListener('pointermove', handleDrag);
});

const workspaceBusinessCallId = computed(() => authoritativeBusinessCallId.value || callState.value.businessCallId || activeCallId.value);

const workspaceContext = computed(() => ({
  businessCallId: workspaceBusinessCallId.value,
  phoneNumber: incomingCall.value ? incomingNumber.value : dialNumber.value,
  numberLocation: incomingCall.value ? incomingLocation.value : activeNumberLocation.value,
  callStatusText: softbarStatusText.value,
  durationText: softTimerText.value,
  incoming: incomingCall.value,
  active: callActive.value
}));

defineExpose({
  simulateIncomingCall,
  openScreenPop,
  workspaceContext
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
  filter: drop-shadow(0 16px 28px rgba(16, 42, 92, 0.2));
  will-change: left, top;
}

.agent-phone-shell.is-embedded {
  position: relative;
  z-index: 20;
  flex: 1;
  min-width: 0;
  width: auto;
  max-width: none;
  filter: none;
  will-change: auto;
}

.agent-phone-shell.is-embedded.open {
  z-index: 1200;
}

.soft-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-width: 0;
  height: 42px;
  gap: 12px;
  padding: 0 2px 0 6px;
}

.soft-bar.is-in-call {
  gap: 10px;
}

.soft-call-strip {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.soft-live-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  max-width: 100%;
  height: 34px;
  padding: 3px 6px 3px 12px;
  border: 1px solid #e2eaf5;
  border-radius: 12px;
  background: linear-gradient(180deg, #ffffff 0%, #f5f8fc 100%);
  box-shadow:
    0 1px 2px rgba(28, 48, 78, 0.04),
    inset 0 1px 0 rgba(255, 255, 255, 0.95);
}

.soft-live-peer {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex: none;
  padding-right: 10px;
  border-right: 1px solid #e3ebf6;
  white-space: nowrap;

  .soft-live-label {
    font-size: 12px;
    font-weight: 700;
    color: #243552;
  }

  em {
    font-style: normal;
    font-size: 12px;
    font-weight: 600;
    color: #7b8ba5;
    font-variant-numeric: tabular-nums;
  }
}

.soft-live-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.16);
  animation: soft-dot-pulse 1.2s ease-in-out infinite;
}

.soft-live-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  flex: 1;
  overflow-x: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
}

.soft-live-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  flex: none;
  height: 26px;
  padding: 0 9px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: #405574;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease,
    box-shadow 0.15s ease;

  .el-icon {
    font-size: 14px;
    color: #6b7f9c;
  }

  &:hover:not(:disabled) {
    border-color: #d7e4f4;
    background: #fff;
    color: #1f4fb8;
    box-shadow: 0 1px 2px rgba(28, 48, 78, 0.06);

    .el-icon {
      color: #2f6bff;
    }
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  &.is-primary {
    border-color: #e2eaf8;
    background: #fff;
    color: #35507a;

    .el-icon {
      color: #3b82f6;
    }

    &:hover:not(:disabled) {
      border-color: #bfdbfe;
      background: #f5f9ff;
      color: #1d4ed8;
    }
  }

  &.is-more {
    color: #7b8ba5;

    .el-icon {
      color: #94a3b8;
    }
  }

  &.is-active {
    border-color: #93c5fd;
    background: #eff6ff;
    color: #1d4ed8;

    .el-icon {
      color: #2563eb;
    }
  }
}

.soft-call-btn:disabled {
  cursor: not-allowed;
  opacity: 0.55;
  filter: grayscale(0.2);
}

.soft-live-sep {
  flex: none;
  width: 1px;
  height: 14px;
  margin: 0 2px;
  background: #e3ebf6;
}

.soft-dial {
  display: flex;
  flex: none;
  align-items: stretch;
  width: 228px;
  height: 32px;
  overflow: hidden;
  border: 1px solid #d7e4f4;
  border-radius: 10px;
  background: #fff;
  box-shadow:
    0 1px 2px rgba(28, 48, 78, 0.04),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    width 0.2s ease;
}

.soft-dial.is-live {
  width: 210px;
  border-color: #bbf7d0;
  background: linear-gradient(180deg, #ffffff 0%, #f3fdf7 100%);
  box-shadow:
    0 1px 2px rgba(22, 163, 74, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.95);
}

.soft-dial-lead {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 34px;
  color: #7b8ba5;
  background: #f5f8fc;
  border-right: 1px solid #e8eef6;

  .el-icon {
    font-size: 14px;
  }
}

.soft-dial.is-live .soft-dial-lead {
  color: #16a34a;
  background: #ecfdf3;
  border-right-color: #bbf7d0;
}

.soft-dial:focus-within {
  border-color: #2f6bff;
  box-shadow: 0 0 0 3px rgba(47, 107, 255, 0.14);
}

.soft-dial.is-live:focus-within {
  border-color: #22c55e;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.14);
}

.soft-dial-input {
  min-width: 0;
  flex: 1;
  height: 100%;
  padding: 0 10px;
  color: #172033;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.02em;
  border: 0;
  outline: 0;
  background: transparent;

  &::placeholder {
    color: #9aabbc;
    font-weight: 500;
  }
}

.soft-dial-input:disabled {
  color: #243552;
  -webkit-text-fill-color: #243552;
  opacity: 1;
  cursor: default;
}

.soft-call-btn {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 100%;
  border: 0;
  border-left: 1px solid #d7e4f4;
  color: #fff;
  cursor: pointer;
  background: linear-gradient(135deg, #3b82f6 0%, #2f6bff 52%, #2459cf 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.22);
  transition:
    filter 0.2s ease,
    box-shadow 0.2s ease;

  .el-icon {
    font-size: 16px;
  }

  &:hover {
    filter: brightness(1.05);
  }

  &.is-ready {
    background: linear-gradient(135deg, #43d3ff 0%, #2f6bff 48%, #1e4fc7 100%);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.28),
      0 6px 14px rgba(36, 89, 207, 0.28);
  }

  &.is-answer {
    background: linear-gradient(135deg, #20bd8d 0%, #14b88b 100%);
  }

  &.is-hangup {
    border-left-color: #fecdd3;
    background: linear-gradient(135deg, #ff6b6b 0%, #e5484d 100%);
  }
}

.soft-dial-incoming {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 8px 0 12px;
  height: 32px;
  border: 1px solid #fecdd3;
  border-radius: 10px;
  background: #fff1f2;
}

.soft-incoming-label {
  font-size: 12px;
  font-weight: 700;
  color: #be123c;
  white-space: nowrap;
}

.soft-more.is-subtle {
  opacity: 0.55;

  &:hover,
  &.active {
    opacity: 1;
  }
}

.soft-status {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  max-width: 46%;
  gap: 8px;
  padding: 0 12px;
  height: 30px;
  overflow: hidden;
  border: 1px solid #e4ecf6;
  border-radius: 999px;
  background: #f4f8ff;
  color: #3b4f6b;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.soft-status-dot {
  flex: none;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #8aa0c2;
  box-shadow: 0 0 0 3px rgba(138, 160, 194, 0.2);
}

.soft-status.warn {
  border-color: #ffd0d0;
  background: #fff5f5;
  color: #d4380d;
}

.soft-status.warn .soft-status-dot {
  background: #f5222d;
  box-shadow: 0 0 0 3px rgba(245, 34, 45, 0.14);
}

.soft-status.ok,
.soft-status.ready,
.soft-status.idle {
  border-color: #c5d8ff;
  background: #eef4ff;
  color: #245dcc;
}

.soft-status.ok .soft-status-dot,
.soft-status.ready .soft-status-dot,
.soft-status.idle .soft-status-dot {
  background: #2f6bff;
  box-shadow: 0 0 0 3px rgba(47, 107, 255, 0.16);
}

.soft-status.busy {
  border-color: #fecdd3;
  background: #fff1f2;
  color: #e11d48;
}

.soft-status.busy .soft-status-dot {
  background: #e11d48;
  box-shadow: 0 0 0 3px rgba(225, 29, 72, 0.14);
}

.soft-status.afterCall {
  border-color: #fde68a;
  background: #fffbeb;
  color: #b45309;
}

.soft-status.afterCall .soft-status-dot {
  background: #f59e0b;
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.16);
}

.soft-status.live {
  border-color: #c5d8ff;
  background: #eef4ff;
  color: #245dcc;
}

.soft-status.live .soft-status-dot {
  background: #2f6bff;
  box-shadow: 0 0 0 3px rgba(47, 107, 255, 0.18);
  animation: soft-dot-pulse 1.2s ease-in-out infinite;
}

.soft-status-text {
  overflow: hidden;
  text-overflow: ellipsis;
}

.soft-timer {
  flex: none;
  padding-left: 6px;
  border-left: 1px solid rgba(47, 107, 255, 0.22);
  color: #2f6bff;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
}

.soft-actions {
  display: flex;
  flex: none;
  align-items: center;
  gap: 10px;
  margin-left: auto;
}

.soft-tags {
  display: flex;
  flex: none;
  align-items: center;
  gap: 6px;
  padding-left: 10px;
  border-left: 1px solid #e4ecf6;
}

.soft-tag {
  display: inline-flex;
  align-items: center;
  max-width: 108px;
  height: 26px;
  padding: 0 8px;
  overflow: hidden;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  line-height: 26px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.soft-tag.status {
  gap: 5px;
  cursor: pointer;
  border: 1px solid transparent;
}

.soft-tag.status i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.soft-caret {
  margin-left: 1px;
  font-size: 11px;
  opacity: 0.75;
}

.soft-tag.status.offline {
  background: #fff7ed;
  border-color: #fed7aa;
  color: #c2410c;
}

.soft-tag.status.busy {
  background: #fff1f2;
  border-color: #fecdd3;
  color: #e11d48;
}

.soft-tag.status.afterCall {
  background: #fffbeb;
  border-color: #fde68a;
  color: #b45309;
}

.soft-tag.status.idle {
  background: #ecfdf5;
  border-color: #a7f3d0;
  color: #0f766e;
}

.soft-tag.agent {
  background: #eef4ff;
  border: 1px solid #c5d8ff;
  color: #245dcc;
}

.soft-more {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  color: #5b6b82;
  cursor: pointer;
  border: 1px solid #d7e4f4;
  border-radius: 6px;
  background: #fff;
  transition: all 0.2s ease;
}

.soft-screen-pop {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 26px;
  padding: 0 10px;
  color: #245dcc;
  cursor: pointer;
  border: 1px solid #c5d8ff;
  border-radius: 6px;
  background: #eef4ff;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.soft-screen-pop:hover {
  color: #1d4faf;
  border-color: #9fc0ff;
  background: #e3edff;
}

.soft-more:hover,
.soft-more.active {
  color: #245dcc;
  border-color: #c5d8ff;
  background: #eef4ff;
}

@keyframes soft-dot-pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.15);
    opacity: 0.72;
  }
}

.agent-phone-shell.dragging {
  cursor: grabbing;
}

.agent-phone-shell.incoming {
  animation: shell-ring 0.55s ease-in-out infinite !important;
}

.agent-phone-shell.is-embedded.incoming {
  animation: none !important;
}

.toolbar-trigger {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 168px;
  height: 52px;
  padding: 6px 14px 6px 6px;
  color: #536176;
  cursor: grab;
  touch-action: none;
  user-select: none;
  border: 1px solid rgba(186, 210, 242, 0.9);
  border-radius: 16px;
  background: linear-gradient(180deg, #ffffff 0%, #f7fbff 100%);
  box-shadow:
    0 10px 24px rgba(28, 73, 158, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;

  div {
    display: grid;
    gap: 2px;
    min-width: 0;
    text-align: left;
  }

  strong {
    max-width: 128px;
    overflow: hidden;
    color: #1c2a44;
    font-size: 13px;
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  small {
    color: #8491a6;
    font-size: 10px;
  }

  > i {
    width: 8px;
    height: 8px;
    margin-left: 4px;
    border-radius: 50%;
    background: #a0a9b7;
    box-shadow: 0 0 0 3px rgba(160, 169, 183, 0.18);
  }

  > i.idle {
    background: #16b887;
    box-shadow: 0 0 0 3px rgba(22, 184, 135, 0.18);
  }

  > i.busy {
    background: #df4d5b;
    box-shadow: 0 0 0 3px rgba(223, 77, 91, 0.18);
  }

  > i.afterCall {
    background: #e99a23;
    box-shadow: 0 0 0 3px rgba(233, 154, 35, 0.18);
  }
}

.toolbar-trigger:hover {
  border-color: #9ec4f3;
  transform: translateY(-1px);
  box-shadow: 0 14px 28px rgba(28, 73, 158, 0.16);
}

.agent-phone-shell.is-embedded .toolbar-trigger {
  min-width: 156px;
  height: 40px;
  padding: 4px 12px 4px 4px;
  gap: 8px;
  cursor: pointer;
  border-radius: 12px;
  box-shadow: none;
}

.agent-phone-shell.is-embedded .toolbar-trigger:hover {
  transform: none;
  box-shadow: none;
  background: #f4f8ff;
}

.agent-phone-shell.is-embedded .trigger-icon {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  font-size: 15px;
  box-shadow: 0 4px 10px rgba(37, 99, 235, 0.28);
}

.agent-phone-shell.is-embedded .toolbar-trigger strong {
  max-width: 110px;
  font-size: 12px;
}

.agent-phone-shell.is-embedded .toolbar-trigger small {
  font-size: 10px;
}

.toolbar-trigger.calling {
  border-color: #93c5fd;
  background: linear-gradient(180deg, #f4f9ff, #eaf3ff);
}

.toolbar-trigger.incoming {
  border-color: #34d399;
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  animation: incoming-pulse 1s ease-in-out infinite !important;
}

.trigger-icon {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  font-size: 18px;
  color: #fff;
  border-radius: 14px;
  background: linear-gradient(145deg, #38bdf8 0%, #2563eb 62%, #1d4ed8 100%);
  box-shadow:
    0 8px 16px rgba(37, 99, 235, 0.32),
    inset 0 1px 0 rgba(255, 255, 255, 0.35);
}

.trigger-icon.incoming {
  background: #22c55e;
  animation:
    icon-ring 0.65s ease-in-out infinite,
    icon-pulse 1.1s ease-in-out infinite !important;
  transform-origin: center center;
}

.agent-panel {
  box-sizing: border-box;
  display: grid;
  width: 288px;
  max-width: calc(100vw - 24px);
  gap: 8px;
  padding: 12px;
  border: 1px solid #d7e4f4;
  border-radius: 12px;
  background: linear-gradient(180deg, #ffffff 0%, #f7fbff 100%);
  box-shadow:
    0 16px 32px rgba(16, 42, 86, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.agent-phone-shell.is-embedded .agent-panel {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  left: auto;
  z-index: 30;
}

.panel-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e8eef6;
  cursor: default;
  user-select: none;

  > div {
    display: grid;
    gap: 2px;
    min-width: 0;
    flex: 1;
  }

  strong {
    overflow: hidden;
    color: #1c2a44;
    font-size: 13px;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  small {
    color: #8b97aa;
    font-size: 11px;
  }
}

.heading-actions {
  display: flex !important;
  align-items: center;
  flex: none;
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
  width: 26px;
  height: 26px;
  border: 1px solid #e1e7f0;
  border-radius: 7px;
  background: #fff;
}

.collapse-button:hover {
  color: #1d4ed8;
  border-color: #bfd4f4;
  background: #f4f8ff;
}

.phone-mode-button {
  display: flex;
  align-items: center;
  gap: 3px;
  height: 26px;
  padding: 0 7px;
  color: #053b70;
  font-size: 11px;
  cursor: pointer;
  border: 1px solid #d5e1ef;
  border-radius: 7px;
  background: #f7fbff;
}

.agent-status {
  display: flex;
  align-items: center;
  gap: 5px;
  height: 28px;
  padding: 0 8px;
  color: #667287;
  font-size: 10px;
  cursor: pointer;
  border: 1px solid #e1e7f0;
  border-radius: 8px;
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
  color: #be123c;
  background: #fff1f2;
  border-color: #fecdd3;

  i {
    background: #e11d48;
    box-shadow: 0 0 0 3px rgba(225, 29, 72, 0.16);
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
  color: #6b8ab0;
  border: 1px solid #d7e4f3;
  border-radius: 9px;
  background: #f8fbff;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;

  &:focus-within {
    border-color: #7dd3fc;
    background: #fff;
    box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.16);
  }

  .el-icon {
    flex: none;
    font-size: 14px;
  }

  input {
    min-width: 0;
    flex: 1;
    padding: 0 8px;
    color: #1c2a44;
    font-size: 13px;
    letter-spacing: 0.2px;
    border: 0;
    outline: 0;
    background: transparent;
  }
}

.clear-number {
  width: 28px;
  height: 28px;
}

.dial-pad {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 7px;

  button {
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-width: 0;
    height: 36px;
    color: #1c2a44;
    font-size: 16px;
    font-weight: 600;
    line-height: 1;
    cursor: pointer;
    border: 1px solid #dce5f1;
    border-radius: 9px;
    background: linear-gradient(180deg, #ffffff, #f5f8fc);
    box-shadow: 0 1px 0 rgba(255, 255, 255, 0.85);
    transition:
      transform 0.12s ease,
      border-color 0.12s ease,
      background 0.12s ease,
      color 0.12s ease;
  }

  button:hover:not(:disabled) {
    color: #1d4ed8;
    border-color: #bdd4f8;
    background: #f3f8ff;
  }

  button:active:not(:disabled) {
    transform: scale(0.97);
    background: #eaf2ff;
  }

  button:disabled {
    color: #64748b;
    cursor: not-allowed;
    opacity: 0.72;
  }
}

.call-button,
.hangup-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 36px;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.2px;
  cursor: pointer;
  border: 0;
  border-radius: 9px;
  background: linear-gradient(90deg, #34d399 0%, #10b981 48%, #059669 100%);
  box-shadow: 0 6px 12px rgba(16, 185, 129, 0.22);
  transition:
    transform 0.16s ease,
    box-shadow 0.16s ease,
    filter 0.16s ease;
}

.call-button:hover:not(:disabled) {
  transform: translateY(-1px);
  filter: brightness(1.04);
  box-shadow: 0 14px 22px rgba(16, 185, 129, 0.34);
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
  position: relative;
  display: flex;
  align-items: center;
  flex-direction: column;
  justify-content: center;
  overflow: hidden;
  gap: 5px;
  min-height: 108px;
  padding: 12px 10px 10px;
  border: 1px solid #d7e8fb;
  border-radius: 11px;
  background:
    radial-gradient(circle at 50% 18%, rgba(45, 212, 191, 0.2), transparent 42%),
    radial-gradient(circle at 80% 100%, rgba(59, 130, 246, 0.12), transparent 46%), linear-gradient(180deg, #f8fcff 0%, #eef5ff 100%);

  small {
    color: #2563eb;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.4px;
  }

  strong {
    color: #12203a;
    font-size: 18px;
    font-weight: 600;
    letter-spacing: 0.3px;
    font-variant-numeric: tabular-nums;
  }

  > span:last-child {
    min-width: 52px;
    padding: 2px 8px;
    color: #4b6280;
    font-size: 11px;
    font-variant-numeric: tabular-nums;
    text-align: center;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.72);
    border: 1px solid #dbe7f5;
  }

  .number-location {
    color: #0f9f78;
    font-size: 10px;
  }

  em {
    color: #d97706;
    font-style: normal;
  }
}

.active-call.incoming-call {
  border: 1px solid #86efac;
  background: radial-gradient(circle at 50% 18%, rgba(74, 222, 128, 0.22), transparent 44%), linear-gradient(180deg, #f0fdf4, #dcffe8);
  animation: incoming-pulse 1s ease-in-out infinite;

  small {
    color: #15803d;
  }

  .call-pulse {
    animation: icon-ring 0.65s ease-in-out infinite;
  }
}

.call-pulse {
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  color: #fff;
  border-radius: 50%;
  background: linear-gradient(145deg, #5eead4 0%, #10b981 48%, #059669 100%);
  box-shadow:
    0 6px 12px rgba(16, 185, 129, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.35);
}

.call-pulse::before,
.call-pulse::after {
  position: absolute;
  inset: -7px;
  content: '';
  pointer-events: none;
  border: 1px solid rgba(16, 185, 129, 0.28);
  border-radius: 50%;
  animation: call-ripple 2.2s ease-out infinite;
}

.call-pulse::after {
  inset: -12px;
  animation-delay: 0.75s;
}

.matched-customer-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 40px;
  padding: 8px 12px;
  color: #053b70;
  cursor: pointer;
  border: 1px solid #c9d9ef;
  border-radius: 12px;
  background: linear-gradient(180deg, #ffffff, #f4f9ff);
  transition:
    border-color 0.16s ease,
    box-shadow 0.16s ease;

  span {
    color: #7b8798;
    font-size: 10px;
  }

  strong {
    min-width: 0;
    overflow: hidden;
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.matched-customer-card:hover {
  border-color: #93c5fd;
  box-shadow: 0 8px 16px rgba(37, 99, 235, 0.08);
}

.call-actions,
.call-control-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;

  button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    min-height: 32px;
    padding: 0 6px;
    color: #3f5270;
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    border: 1px solid #dce5f1;
    border-radius: 8px;
    background: linear-gradient(180deg, #ffffff, #f6f9fd);
    box-shadow: 0 1px 0 rgba(255, 255, 255, 0.9);
    transition:
      transform 0.14s ease,
      border-color 0.14s ease,
      color 0.14s ease,
      box-shadow 0.14s ease;
  }

  button:hover:not(:disabled) {
    color: #1d4ed8;
    border-color: #b7d4fb;
    background: #f4f8ff;
    transform: translateY(-1px);
    box-shadow: 0 5px 10px rgba(29, 78, 216, 0.08);
  }

  button:active:not(:disabled) {
    transform: scale(0.98);
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }
}

.call-control-actions {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.more-call-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  padding: 7px;
  border: 1px solid #e2e9f2;
  border-radius: 9px;
  background: linear-gradient(180deg, #f8fbff, #f3f7fc);

  button {
    height: 30px;
    color: #40546f;
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    border: 1px solid #d8e3f0;
    border-radius: 8px;
    background: #fff;
  }

  button:hover {
    color: #1d4ed8;
    border-color: #b7d4fb;
    background: #f4f8ff;
  }
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

.ivr-transfer-panel {
  align-items: center;

  :deep(.el-select) {
    min-width: 0;
  }
}

.ivr-transfer-empty {
  grid-column: 1 / -1;
  color: #8996a9;
  font-size: 10px;
  line-height: 1.5;
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
  background: linear-gradient(90deg, #fb7185, #ef4444 52%, #dc2626);
  box-shadow: 0 10px 18px rgba(239, 68, 68, 0.26);
}

.hangup-button:hover:not(:disabled) {
  transform: translateY(-1px);
  filter: brightness(1.04);
  box-shadow: 0 14px 22px rgba(239, 68, 68, 0.32);
}

@keyframes call-ripple {
  0% {
    opacity: 0.55;
    transform: scale(0.86);
  }

  100% {
    opacity: 0;
    transform: scale(1.18);
  }
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
</style>
