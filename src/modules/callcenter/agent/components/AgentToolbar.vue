<template>
  <div class="agent-phone-shell">
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
        <strong>{{ incomingCall ? '来电: ' + incomingNumber : callActive ? dialNumber : '坐席电话' }}</strong>
        <small>{{ incomingCall ? '点击接听' : callActive ? `通话中 · ${callDuration}` : signedIn ? statusLabels[agentStatus] : '未签入' }}</small>
      </div>
      <i :class="statusClass"></i>
    </button>

    <aside v-else class="agent-panel">
      <div class="panel-heading">
        <div><strong>坐席电话</strong><small>分机 1001</small></div>
        <div class="heading-actions">
          <el-dropdown trigger="click" @command="changeStatus">
            <button type="button" class="agent-status" :class="statusClass">
              <i></i>{{ signedIn ? statusLabels[agentStatus] : '未签入' }}<el-icon><ArrowDown /></el-icon>
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

      <template v-if="!callActive">
        <div class="dial-input">
          <el-icon><Phone /></el-icon>
          <input v-model="dialNumber" :disabled="!signedIn" maxlength="20" placeholder="输入号码在线拨打" @keyup.enter="makeCall" />
          <button v-if="dialNumber" type="button" class="clear-number" @click="dialNumber = ''">
            <el-icon><CloseBold /></el-icon>
          </button>
        </div>
        <div class="dial-pad">
          <button v-for="key in dialKeys" :key="key" type="button" :disabled="!signedIn" @click="appendNumber(key)">{{ key }}</button>
        </div>
        <button type="button" class="call-button" :disabled="!signedIn || !dialNumber" @click="makeCall">
          <el-icon><PhoneFilled /></el-icon>拨打电话
        </button>
      </template>

      <template v-else>
        <div class="active-call">
          <span class="call-pulse"
            ><el-icon><PhoneFilled /></el-icon
          ></span>
          <small>正在通话</small><strong>{{ dialNumber }}</strong
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
  </div>
</template>

<script setup lang="ts">
import { ArrowDown, CloseBold, Phone, PhoneFilled, Tickets, User } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';

type AgentStatus = 'idle' | 'busy' | 'afterCall';
type StatusCommand = AgentStatus | 'signIn' | 'signOut';

const panelOpen = ref(false);
const signedIn = ref(false);
const agentStatus = ref<AgentStatus>('idle');
const dialNumber = ref('');
const callActive = ref(false);
const callSeconds = ref(0);
const incomingCall = ref(false);
const incomingNumber = ref('');
let callTimer: ReturnType<typeof setInterval> | undefined;

const dialKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
const statusLabels: Record<AgentStatus, string> = { idle: '示闲', busy: '示忙', afterCall: '话后处理' };
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

const changeStatus = (command: StatusCommand) => {
  if (command === 'signIn') {
    signedIn.value = true;
    agentStatus.value = 'idle';
    ElMessage.success('坐席签入成功');
    return;
  }
  if (command === 'signOut') {
    signedIn.value = false;
    dialNumber.value = '';
    ElMessage.success('坐席已签出');
    return;
  }
  agentStatus.value = command;
  ElMessage.success(`坐席状态已切换为${statusLabels[command]}`);
};
const appendNumber = (value: string) => {
  if (dialNumber.value.length < 20) dialNumber.value += value;
};
const makeCall = () => {
  if (!signedIn.value || !dialNumber.value) return;
  callActive.value = true;
  callSeconds.value = 0;
  callTimer = setInterval(() => callSeconds.value++, 1000);
  ElMessage.info(`正在呼叫 ${dialNumber.value}，接入 SIP/WebRTC 后将发起真实呼叫`);
};
const hangup = () => {
  if (callTimer) clearInterval(callTimer);
  callTimer = undefined;
  callActive.value = false;
  agentStatus.value = 'afterCall';
  ElMessage.success('通话已结束，坐席进入话后处理');
};
const createCustomer = () => ElMessage.info('客户模块接入后，将携带当前通话号码打开新建客户页面');
const createTicket = () => ElMessage.info('工单模块接入后，将携带当前通话信息打开新建工单页面');

// 来电处理
const handleTriggerClick = () => {
  if (incomingCall.value) {
    acceptCall();
  } else {
    panelOpen.value = true;
  }
};
const acceptCall = () => {
  incomingCall.value = false;
  callActive.value = true;
  dialNumber.value = incomingNumber.value;
  callSeconds.value = 0;
  callTimer = setInterval(() => callSeconds.value++, 1000);
  ElMessage.success('已接听来电');
};
const rejectCall = () => {
  incomingCall.value = false;
  ElMessage.info('已拒接来电');
};
const simulateIncomingCall = () => {
  if (callActive.value || incomingCall.value) return;
  incomingCall.value = true;
  incomingNumber.value = '138' + Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
  panelOpen.value = false;
  ElMessage.info('模拟来电：' + incomingNumber.value);
};

// 暴露方法供外部调用
defineExpose({ simulateIncomingCall, acceptCall, rejectCall });
onBeforeUnmount(() => callTimer && clearInterval(callTimer));
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
  animation: incoming-pulse 1s ease-in-out infinite, incoming-shake 0.5s ease-in-out infinite;
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
@keyframes incoming-shake {
  0%,
  100% {
    transform: translateX(0);
  }
  10%,
  30%,
  50%,
  70%,
  90% {
    transform: translateX(-2px);
  }
  20%,
  40%,
  60%,
  80% {
    transform: translateX(2px);
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
  animation: icon-pulse 0.8s ease-in-out infinite;
}
@keyframes icon-pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.15);
  }
}
.agent-phone-shell {
  width: max-content;
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
.hangup-button {
  background: #df4d5b;
}
</style>
