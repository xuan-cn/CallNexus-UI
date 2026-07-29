<template>
  <el-drawer v-model="visible" title="多方通话" size="520px" append-to-body destroy-on-close @closed="stopPolling">
    <div v-loading="loading" class="conference-drawer">
      <template v-if="!conference">
        <div class="conference-empty">
          <div class="conference-empty__icon">
            <el-icon><PhoneFilled /></el-icon>
          </div>
          <h3>将当前双方通话升级为会议</h3>
          <p>客户与当前坐席会进入同一会议房间，之后可以继续邀请其他 SIP 分机加入。</p>
          <el-alert v-if="blockedReason" :title="blockedReason" type="warning" :closable="false" show-icon />
          <el-button type="primary" :disabled="Boolean(blockedReason)" :loading="actionLoading" @click="createConference"> 开始多方通话 </el-button>
        </div>
      </template>

      <template v-else>
        <section class="conference-summary">
          <div>
            <span class="conference-status-dot"></span>
            <strong>会议进行中</strong>
            <span>{{ joinedCount }} 人在线</span>
          </div>
          <el-button text :icon="Refresh" :loading="loading" @click="loadConference">刷新</el-button>
        </section>

        <section class="conference-invite">
          <div class="section-title">邀请分机</div>
          <div class="invite-row">
            <el-input v-model.trim="targetExtension" maxlength="20" clearable placeholder="输入 SIP 分机号" @keyup.enter="inviteMember" />
            <el-button type="primary" :disabled="!targetExtension || Boolean(blockedReason)" :loading="actionLoading" @click="inviteMember">
              邀请
            </el-button>
          </div>
          <div v-if="blockedReason" class="conference-tip">{{ blockedReason }}</div>
        </section>

        <section class="conference-members">
          <div class="section-title">会议成员</div>
          <div v-for="member in conference.members" :key="member.id" class="conference-member">
            <div class="member-avatar">{{ memberInitial(member) }}</div>
            <div class="member-main">
              <div class="member-name">
                <strong>{{ memberName(member) }}</strong>
                <el-tag v-if="member.memberRole === 'OWNER_AGENT'" size="small" effect="plain">主持坐席</el-tag>
                <el-tag v-else-if="member.memberRole === 'CUSTOMER'" size="small" type="success" effect="plain">客户</el-tag>
                <el-tag v-else-if="member.memberRole === 'INVITED_EXTENSION'" size="small" type="info" effect="plain">受邀分机</el-tag>
              </div>
              <div class="member-meta">
                <span :class="['member-state', `is-${member.memberState.toLowerCase()}`]">
                  {{ memberStateLabel(member.memberState) }}
                </span>
                <span v-if="member.muted">已静音</span>
              </div>
            </div>
            <div v-if="member.memberState === 'JOINED' && member.memberRole !== 'OWNER_AGENT'" class="member-actions">
              <el-button text size="small" :loading="actionLoading" @click="toggleMemberMute(member)">
                {{ member.muted ? '取消静音' : '静音' }}
              </el-button>
              <el-button
                v-if="member.memberRole === 'INVITED_EXTENSION'"
                text
                size="small"
                type="danger"
                :loading="actionLoading"
                @click="removeMember(member)"
              >
                移除
              </el-button>
            </div>
          </div>
        </section>

        <footer class="conference-footer">
          <el-button :loading="actionLoading" @click="leaveConference">离开会议</el-button>
          <el-button type="danger" :loading="actionLoading" @click="endConference">结束会议</el-button>
        </footer>
      </template>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { PhoneFilled, Refresh } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  createCallConference,
  endCallConference,
  getCallConference,
  inviteCallConferenceMember,
  leaveCallConference,
  muteCallConferenceMember,
  removeCallConferenceMember
} from '@/api/callcenter/call';
import type { CallConferenceMemberVO, CallConferenceVO } from '@/api/callcenter/call/types';

const props = defineProps<{
  modelValue: boolean;
  callId: string;
  callHeld: boolean;
  consultActive: boolean;
}>();

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void;
  (event: 'owner-left'): void;
  (event: 'conference-ended'): void;
}>();

const visible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
});
const conference = ref<CallConferenceVO | null>(null);
const targetExtension = ref('');
const loading = ref(false);
const actionLoading = ref(false);
let pollingTimer: ReturnType<typeof setInterval> | undefined;

const joinedCount = computed(() => conference.value?.members.filter((member) => member.memberState === 'JOINED').length ?? 0);
const blockedReason = computed(() => {
  if (!props.callId) return '当前没有进行中的通话';
  if (props.consultActive) return '咨询转接期间不能发起或邀请多方通话';
  if (props.callHeld) return '请先恢复当前通话，再操作多方通话';
  return '';
});

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      void loadConference();
      startPolling();
    } else {
      stopPolling();
    }
  },
  { immediate: true }
);

watch(
  () => props.callId,
  () => {
    conference.value = null;
    targetExtension.value = '';
    if (props.modelValue) void loadConference();
  }
);

async function loadConference() {
  if (!props.callId) {
    conference.value = null;
    return;
  }
  try {
    loading.value = true;
    const response = await getCallConference(props.callId);
    conference.value = response.data ?? null;
  } finally {
    loading.value = false;
  }
}

const createConference = async () => {
  if (blockedReason.value) return;
  try {
    actionLoading.value = true;
    const response = await createCallConference(props.callId);
    conference.value = response.data;
    ElMessage.success('当前通话已升级为多方通话');
  } finally {
    actionLoading.value = false;
  }
};

const inviteMember = async () => {
  const extension = targetExtension.value.trim();
  if (!extension || blockedReason.value) return;
  try {
    actionLoading.value = true;
    const response = await inviteCallConferenceMember(props.callId, { targetExtension: extension });
    conference.value = response.data;
    targetExtension.value = '';
    ElMessage.success(`已邀请分机 ${extension}`);
  } finally {
    actionLoading.value = false;
  }
};

const toggleMemberMute = async (member: CallConferenceMemberVO) => {
  try {
    actionLoading.value = true;
    const response = await muteCallConferenceMember(props.callId, member.id, { muted: !member.muted });
    conference.value = response.data;
  } finally {
    actionLoading.value = false;
  }
};

const removeMember = async (member: CallConferenceMemberVO) => {
  await ElMessageBox.confirm(`确认将 ${memberName(member)} 移出会议？`, '移除会议成员', { type: 'warning' });
  try {
    actionLoading.value = true;
    const response = await removeCallConferenceMember(props.callId, member.id);
    conference.value = response.data;
    ElMessage.success('会议成员已移除');
  } finally {
    actionLoading.value = false;
  }
};

const leaveConference = async () => {
  await ElMessageBox.confirm('离开后，至少还有两名成员时会议继续；否则系统将结束会议并挂断剩余通话。确认离开？', '离开会议', { type: 'warning' });
  try {
    actionLoading.value = true;
    await leaveCallConference(props.callId);
    visible.value = false;
    emit('owner-left');
  } finally {
    actionLoading.value = false;
  }
};

const endConference = async () => {
  await ElMessageBox.confirm('结束会议将挂断全部会议成员，确认继续？', '结束会议', { type: 'error' });
  try {
    actionLoading.value = true;
    await endCallConference(props.callId);
    visible.value = false;
    emit('conference-ended');
  } finally {
    actionLoading.value = false;
  }
};

function startPolling() {
  stopPolling();
  pollingTimer = setInterval(() => {
    if (props.modelValue && conference.value?.conferenceState === 'ACTIVE') {
      void loadConference();
    }
  }, 2500);
}

function stopPolling() {
  if (pollingTimer) clearInterval(pollingTimer);
  pollingTimer = undefined;
}

const memberName = (member: CallConferenceMemberVO) =>
  member.displayName || (member.extension ? `分机 ${member.extension}` : member.memberRole === 'CUSTOMER' ? '客户' : '会议成员');
const memberInitial = (member: CallConferenceMemberVO) => (member.extension || memberName(member)).slice(-2);
const memberStateLabel = (state: CallConferenceMemberVO['memberState']) =>
  ({ JOINING: '正在加入', JOINED: '通话中', LEFT: '已离开', FAILED: '加入失败' })[state];

onBeforeUnmount(stopPolling);
</script>

<style scoped>
.conference-drawer {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  color: #1f2d3d;
}

.conference-empty {
  min-height: 480px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  text-align: center;
}

.conference-empty__icon {
  width: 68px;
  height: 68px;
  border-radius: 22px;
  display: grid;
  place-items: center;
  color: #fff;
  font-size: 30px;
  background: linear-gradient(135deg, #1769d2, #0b4b88);
  box-shadow: 0 12px 28px rgba(23, 105, 210, 0.22);
}

.conference-empty h3,
.conference-empty p {
  margin: 0;
}

.conference-empty p {
  max-width: 380px;
  color: #78889b;
  line-height: 1.7;
}

.conference-empty .el-alert {
  max-width: 420px;
  text-align: left;
}

.conference-summary,
.conference-invite,
.conference-members {
  border: 1px solid #e5ebf2;
  border-radius: 14px;
  background: #fff;
}

.conference-summary {
  padding: 14px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.conference-summary > div {
  display: flex;
  align-items: center;
  gap: 9px;
}

.conference-summary span:last-child {
  color: #7c8b9c;
  font-size: 13px;
}

.conference-status-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #12b981;
  box-shadow: 0 0 0 5px rgba(18, 185, 129, 0.1);
}

.conference-invite,
.conference-members {
  margin-top: 14px;
  padding: 16px;
}

.section-title {
  margin-bottom: 12px;
  color: #34465b;
  font-weight: 700;
}

.invite-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 82px;
  gap: 10px;
}

.conference-tip {
  margin-top: 8px;
  color: #d28b22;
  font-size: 12px;
}

.conference-member {
  min-height: 66px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-top: 1px solid #edf1f5;
}

.conference-member:first-of-type {
  border-top: 0;
}

.member-avatar {
  width: 38px;
  height: 38px;
  flex: 0 0 38px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  color: #0e5da9;
  font-weight: 700;
  background: #eaf4ff;
}

.member-main {
  min-width: 0;
  flex: 1;
}

.member-name,
.member-meta {
  display: flex;
  align-items: center;
  gap: 7px;
}

.member-name strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.member-meta {
  margin-top: 5px;
  color: #8b98a8;
  font-size: 12px;
}

.member-state.is-joined {
  color: #0d9f71;
}

.member-state.is-failed {
  color: #d84b4b;
}

.member-actions {
  display: flex;
  align-items: center;
}

.conference-footer {
  margin-top: auto;
  padding-top: 20px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
