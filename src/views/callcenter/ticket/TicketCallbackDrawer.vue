<template>
  <el-drawer v-model="visible" title="工单回访" size="min(850px, 100%)" append-to-body>
    <div v-if="callbackMode" class="mb-4 flex items-center gap-2 border-b pb-3">
      <strong>当前回访方式</strong>
      <el-tag size="small" effect="plain" type="info">{{ modeLabels[callbackMode] }}</el-tag>
      <span class="app-hint">在表单模板中统一配置</span>
    </div>
    <el-form v-if="options?.mode === 'AUTO'" label-position="top" class="mb-4 border-b pb-4">
      <el-form-item label="自动回访号码">
        <el-select v-model="automaticPhone" class="w-full" placeholder="请选择已向客户核实的回访号码">
          <el-option v-for="item in options.automaticPhones" :key="item.phone" :label="`${item.phone} · ${item.source}`" :value="item.phone" />
        </el-select>
      </el-form-item>
      <p class="app-hint">
        {{ automaticPhoneHint }}
        <span v-if="!options.automaticPhones.length">
          {{ options.allowInboundCaller ? '没有可用的原来电号码。' : '' }}请在工单中填写「回访联系电话」或「回访电话」。
        </span>
      </p>
      <el-button :loading="savingContact" :disabled="!automaticPhone || automaticPhone === options.confirmedPhone" @click="saveContact(true)">
        确认用于自动回访
      </el-button>
      <el-button v-if="options.confirmedPhone" :loading="savingContact" @click="saveContact(false)">撤销确认</el-button>
    </el-form>
    <el-form v-if="canStart && options && options.mode !== 'OFF'" v-loading="loading" label-position="top">
      <el-form-item label="回访号码">
        <el-select v-model="phone" class="w-full" placeholder="请选择并核对回访号码" @change="confirmed = false">
          <el-option v-for="item in options?.phones || []" :key="item.phone" :label="`${item.phone} · ${item.source}`" :value="item.phone" />
        </el-select>
      </el-form-item>
      <el-form-item label="回访任务">
        <el-select v-model="taskId" class="w-full" filterable placeholder="请选择专用 AI 自动外呼任务">
          <el-option v-for="item in options?.tasks || []" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
      </el-form-item>
      <p v-if="options && !options.phones.length" class="app-hint">没有有效的工单或关联号码，暂不能发起。</p>
      <p v-if="options && !options.tasks.length" class="app-hint">请先配置不含普通名单的 AI 自动外呼任务，绑定已发布的回访流程。</p>
      <el-checkbox v-model="confirmed" :disabled="!phone">已核对该号码可用于本工单回访</el-checkbox>
      <div class="mb-4">
        <el-button type="primary" :loading="submitting" :disabled="!confirmed || !phone || !taskId" @click="submit">加入回访队列</el-button>
      </div>
    </el-form>
    <div class="mb-2 flex items-center justify-between">
      <strong>回访记录</strong><el-button link type="primary" :loading="loading" @click="reloadHistory">刷新</el-button>
    </div>
    <el-table :data="history" empty-text="暂无回访记录">
      <el-table-column label="号码" prop="phone" width="135" />
      <el-table-column label="发起方式" width="90">
        <template #default="{ row }">{{ row.automatic ? '自动' : '手动' }}</template>
      </el-table-column>
      <el-table-column label="状态" width="105">
        <template #default="{ row }">{{ statusLabels[row.status] || row.status }}</template>
      </el-table-column>
      <el-table-column label="回访结果" min-width="145">
        <template #default="{ row }">
          <el-tag v-if="['TICKET_DISSATISFIED', 'TICKET_UNRESOLVED'].includes(row.resultCode)" type="danger">
            {{ resultLabels[row.resultCode] }}
          </el-tag>
          <span v-else>{{ resultLabels[row.resultCode] || row.resultCode || '未记录' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="拨打次数" prop="attemptCount" width="90" />
      <el-table-column label="关联通话 ID" prop="businessCallId" min-width="135" show-overflow-tooltip />
      <el-table-column label="说明" prop="remark" min-width="125" show-overflow-tooltip />
    </el-table>
  </el-drawer>
</template>

<script setup lang="ts">
import request from '@/utils/request';
import { checkPermi } from '@/utils/permission';
import { ElMessage } from 'element-plus';
import type { TicketCallbackMode } from '@/api/callcenter/form-template/types';

type Id = string | number;
type Phone = { phone: string; source: string };
type Task = { id: string; name: string; status: string };
type Options = {
  phones: Phone[];
  tasks: Task[];
  automaticPhones: Phone[];
  confirmedPhone?: string;
  mode: TicketCallbackMode;
  allowInboundCaller: boolean;
};
type History = {
  id: Id; phone: string; status: string; resultCode?: string; businessCallId?: string; attemptCount: number; remark?: string; automatic: boolean;
};
const visible = ref(false);
const loading = ref(false);
const submitting = ref(false);
const canStart = ref(false);
const canExecute = checkPermi(['callcenter:auto-outbound-task:execute']);
const ticketId = ref<Id>();
const options = ref<Options>();
const history = ref<History[]>([]);
const phone = ref<string>();
const taskId = ref<string>();
const confirmed = ref(false);
const readOnlyMode = ref<TicketCallbackMode>();
const callbackMode = computed(() => options.value?.mode ?? readOnlyMode.value);
const modeLabels: Record<TicketCallbackMode, string> = { OFF: '关闭', MANUAL: '仅手动', AUTO: '办结后自动' };
const automaticPhone = ref<string>();
const automaticPhoneHint = computed(() => {
  const number = options.value?.confirmedPhone;
  if (!number) return '尚未确认，不会自动拨打。';
  return options.value?.automaticPhones.some((item) => item.phone === number)
    ? `当前已确认：${number}`
    : `此前确认的号码 ${number} 已不可用，不会自动拨打。`;
});
const savingContact = ref(false);
const root = (id: Id) => `/api/v1/tickets/${id}/callbacks`;
const statusLabels: Record<string, string> = {
  PENDING: '待拨', SCHEDULED: '已调度', CLAIMED: '准备拨打', DIALING: '拨打中', RETRY: '等待重拨',
  COMPLETED: '已结束', BLOCKED: '已拦截', FAILED: '失败', CANCELLED: '已取消', SKIPPED: '未拨打'
};
const resultLabels: Record<string, string> = {
  TICKET_SATISFIED: '已解决、满意', TICKET_ACCEPTABLE: '已解决、基本满意',
  TICKET_DISSATISFIED: '已解决、不满意', TICKET_UNRESOLVED: '未解决', TICKET_UNCLEAR: '待确认',
  TICKET_DECLINED: '拒绝评价', NO_ANSWER: '未接通', BUSY: '忙线', DO_NOT_CALL: '拒绝联系',
  CONNECTED: '已接通，未记录评价', FAILED: '呼叫失败', OTHER: '其他结果',
  NO_INPUT: '无回答', ASR_UNRECOGNIZED: '未识别', PENDING_REVIEW: '待确认', WORKFLOW_FAILED: '流程失败'
};
const reloadHistory = async () => {
  const id = ticketId.value;
  if (id == null) return;
  loading.value = true;
  try {
    const response = await request<History[]>({ url: root(id), method: 'get' });
    if (ticketId.value === id) history.value = response.data || [];
  } finally {
    loading.value = false;
  }
};
const open = async (id: Id, resolved: boolean) => {
  ticketId.value = id;
  history.value = [];
  options.value = undefined;
  phone.value = undefined;
  taskId.value = undefined;
  confirmed.value = false;
  readOnlyMode.value = undefined;
  automaticPhone.value = undefined;
  canStart.value = resolved;
  visible.value = true;
  await Promise.all([reloadHistory(), canExecute ? reloadOptions(id) : loadMode(id)]);
};
const reloadOptions = async (id: Id) => {
  if (!canExecute) return;
  const response = await request<Options>({ url: `${root(id)}/options`, method: 'get' });
  if (ticketId.value === id) {
    options.value = response.data;
    phone.value ??= response.data?.phones[0]?.phone;
    automaticPhone.value = response.data?.automaticPhones.find(item => item.phone === response.data?.confirmedPhone)?.phone;
  }
};
const loadMode = async (id: Id) => {
  const { data } = await request<{ mode: TicketCallbackMode }>({ url: `${root(id)}/mode`, method: 'get' });
  if (ticketId.value === id) readOnlyMode.value = data?.mode;
};
const saveContact = async (confirmed: boolean) => {
  const id = ticketId.value;
  if (id == null || (confirmed && !automaticPhone.value)) return;
  savingContact.value = true;
  try {
    await request({ url: `${root(id)}/contact`, method: 'put', data: { phone: automaticPhone.value, confirmed } });
    ElMessage.success(confirmed ? '已确认工单回访号码' : '已撤销回访号码确认');
    await reloadOptions(id);
  } finally {
    savingContact.value = false;
  }
};
const submit = async () => {
  const id = ticketId.value;
  if (id == null || !confirmed.value || !phone.value || !taskId.value || submitting.value) return;
  submitting.value = true;
  try {
    await request({ url: root(id), method: 'post', data: { taskId: taskId.value, phone: phone.value, confirmed: true } });
    confirmed.value = false;
    ElMessage.success('已加入回访队列，将按外呼任务时段拨打');
    await reloadHistory();
  } finally {
    submitting.value = false;
  }
};
defineExpose({ open });
</script>
