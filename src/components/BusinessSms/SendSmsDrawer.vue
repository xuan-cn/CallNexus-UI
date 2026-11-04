<template>
  <el-drawer
    v-model="visible"
    :title="testChannelId ? '测试发送短信（实际计费）' : '客户短信'"
    size="680px"
    append-to-body
    :close-on-click-modal="false"
    :close-on-press-escape="!sending"
    :show-close="!sending"
    @closed="clear"
  >
    <div v-loading="loading">
      <el-alert
        type="info"
        :closable="false"
        show-icon
        title="仅支持中国大陆手机号和已审核的服务商模板。服务商受理不等于送达；结果未知时请先核实，勿重复发送。"
        class="mb-4"
      />
      <el-tabs v-model="tab" @tab-change="loadHistory">
        <el-tab-pane label="发送短信" name="compose">
          <el-form label-width="95px" :disabled="sending || !!submittedId">
            <el-form-item label="接收号码">
              <el-input v-if="testChannelId" v-model="form.phone" maxlength="11" placeholder="输入测试手机号，真实发送并计费" />
              <el-select v-else v-model="form.phone" style="width: 100%" placeholder="选择客户已启用的手机号"
                ><el-option v-for="phone in phones" :key="phone" :label="phone" :value="phone"
              /></el-select>
            </el-form-item>
            <el-form-item label="短信模板"
              ><el-select v-model="form.templateId" style="width: 100%" placeholder="请选择模板" @change="resetParameters"
                ><el-option v-for="template in templates" :key="template.id" :label="template.templateName" :value="template.id!" /></el-select
            ></el-form-item>
            <el-form-item v-for="variable in editableVariables" :key="variable.key" :label="`变量 ${variable.key}`"
              ><el-input v-model="form.parameters[variable.key]" maxlength="200" placeholder="输入模板变量值"
            /></el-form-item>
            <el-form-item v-if="selected" label="模板正文"
              ><div class="sms-text">{{ selected.content }}</div></el-form-item
            >
            <el-form-item v-if="!testChannelId && selected?.variables.some((v) => v.source !== 'MANUAL')" label="自动变量"
              ><span class="text-gray-500 app-hint">客户姓名和主号码由后端读取，不允许手动覆盖。</span></el-form-item
            >
            <el-form-item v-if="preview" label="发送预览"
              ><div class="sms-text">{{ preview }}</div></el-form-item
            >
          </el-form>
          <el-alert
            v-if="submittedId"
            type="success"
            :closable="false"
            :title="`已进入发送队列，记录编号：${submittedId}。请刷新发送记录查看结果。`"
          />
          <div class="sms-actions">
            <el-button :disabled="!canSend || !!submittedId" :loading="previewing" @click="showPreview">预览短信</el-button>
            <el-button type="primary" :disabled="!canSend || !!submittedId || !preview" :loading="sending" @click="send">确认发送</el-button>
            <el-button v-if="submittedId" @click="newMessage">新建短信</el-button>
          </div>
        </el-tab-pane>
        <el-tab-pane v-if="customerId" label="发送记录" name="history">
          <el-button class="mb-3" :loading="historyLoading" icon="Refresh" @click="loadHistory">刷新记录</el-button>
          <SmsRecordTable v-loading="historyLoading" :records="records" />
          <pagination v-show="total > 0" v-model:page="page.pageNum" v-model:limit="page.pageSize" :total="total" @pagination="loadHistory" />
        </el-tab-pane>
      </el-tabs>
    </div>
  </el-drawer>
</template>
<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  newSmsRequestId,
  previewCustomerSms,
  previewTestSms,
  sendCustomerSms,
  sendTestSms,
  smsCustomerContext,
  smsCustomerRecords,
  smsTestTemplates,
  type SmsTemplate,
  type SmsSend,
  type SmsRecord
} from '@/api/callcenter/sms';
import SmsRecordTable from './SmsRecordTable.vue';
const visible = defineModel<boolean>({ required: true });
const props = defineProps<{ customerId?: string | number; testChannelId?: string | number }>();
const emit = defineEmits<{ submitted: [] }>();
const loading = ref(false);
const previewing = ref(false);
const sending = ref(false);
const tab = ref('compose');
const templates = ref<SmsTemplate[]>([]);
const phones = ref<string[]>([]);
const form = reactive<SmsSend>({ phone: '', templateId: undefined, parameters: {}, requestId: newSmsRequestId() });
const preview = ref('');
const submittedId = ref<string | number>();
const historyLoading = ref(false);
const records = ref<SmsRecord[]>([]);
const total = ref(0);
const page = reactive({ pageNum: 1, pageSize: 10 });
const selected = computed(() => templates.value.find((template) => template.id === form.templateId));
const editableVariables = computed(() => selected.value?.variables.filter((v) => props.testChannelId || v.source === 'MANUAL') || []);
const canSend = computed(
  () => !!selected.value && /^1[3-9]\d{9}$/.test(form.phone) && editableVariables.value.every((variable) => form.parameters[variable.key]?.trim())
);
let generation = 0;
let historyRequest = 0;
watch(
  () => [visible.value, props.customerId, props.testChannelId],
  async () => {
    const current = ++generation;
    if (!visible.value) return;
    clear();
    loading.value = true;
    try {
      if (props.testChannelId) {
        const res = await smsTestTemplates(props.testChannelId);
        if (current !== generation) return;
        templates.value = res.data;
      } else if (props.customerId) {
        const res = await smsCustomerContext(props.customerId);
        if (current !== generation) return;
        templates.value = res.data.templates;
        const list = res.data.phones.length
          ? res.data.phones.filter((p) => p.enabled).map((p) => p.normalizedPhone || p.phoneNumber)
          : [res.data.primaryPhone];
        phones.value = [...new Set(list.filter((phone) => /^1[3-9]\d{9}$/.test(phone)))];
        form.phone = phones.value[0] || '';
      }
    } finally {
      if (current === generation) loading.value = false;
    }
  },
  { immediate: true }
);
watch(
  () => [form.phone, form.templateId, JSON.stringify(form.parameters)],
  () => {
    preview.value = '';
    if (!submittedId.value) form.requestId = newSmsRequestId();
  }
);
function resetParameters() {
  form.parameters = {};
}
async function showPreview() {
  if ((!props.customerId && !props.testChannelId) || !canSend.value) return;
  previewing.value = true;
  const snapshot = JSON.stringify(form);
  const current = generation;
  try {
    const payload = { ...form, parameters: { ...form.parameters } };
    const res = props.testChannelId ? await previewTestSms(props.testChannelId, payload) : await previewCustomerSms(props.customerId!, payload);
    if (current === generation && snapshot === JSON.stringify(form)) preview.value = res.data.content;
  } finally {
    previewing.value = false;
  }
}
async function send() {
  if (!canSend.value || sending.value || submittedId.value) return;
  sending.value = true;
  const current = generation;
  const customerId = props.customerId;
  const channelId = props.testChannelId;
  try {
    const payload = { ...form, parameters: { ...form.parameters } };
    await ElMessageBox.confirm(`将向 ${payload.phone} 发送短信，可能产生短信费用，确认提交吗？`, '确认发送', {
      type: 'warning',
      confirmButtonText: '确认发送',
      cancelButtonText: '取消'
    });
    if (current !== generation || !visible.value) return;
    const res = channelId ? await sendTestSms(channelId, payload) : await sendCustomerSms(customerId!, payload);
    if (current !== generation || !visible.value) return;
    submittedId.value = res.data;
    ElMessage.success('已进入短信发送队列，请查看发送记录');
    emit('submitted');
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') throw error;
  } finally {
    sending.value = false;
  }
}
async function loadHistory() {
  if (tab.value !== 'history' || !props.customerId) return;
  historyLoading.value = true;
  const current = generation;
  const request = ++historyRequest;
  try {
    const res = await smsCustomerRecords(props.customerId, { ...page });
    if (current !== generation || request !== historyRequest) return;
    records.value = res.rows;
    total.value = res.total;
  } finally {
    if (current === generation && request === historyRequest) historyLoading.value = false;
  }
}
function newMessage() {
  submittedId.value = undefined;
  form.requestId = newSmsRequestId();
  preview.value = '';
}
function clear() {
  ++historyRequest;
  historyLoading.value = false;
  tab.value = 'compose';
  templates.value = [];
  phones.value = [];
  records.value = [];
  total.value = 0;
  page.pageNum = 1;
  form.phone = '';
  form.templateId = undefined;
  form.parameters = {};
  newMessage();
}
</script>
<style scoped>
.sms-text {
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.7;
}
.sms-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}
</style>
