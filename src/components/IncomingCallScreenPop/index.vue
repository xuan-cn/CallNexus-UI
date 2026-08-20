<template>
  <el-dialog
    v-model="visible"
    class="incoming-screen-pop"
    width="min(1280px, 96vw)"
    top="3vh"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @closed="handleClosed"
  >
    <template #header>
      <div class="pop-header">
        <div class="pop-header-main">
          <span class="pop-badge" :class="callTone">{{ callStatusText }}</span>
          <strong>来电弹屏</strong>
          <span class="pop-phone">{{ phone || '未知号码' }}</span>
          <span v-if="numberLocation" class="pop-location">{{ numberLocation }}</span>
          <span v-if="durationText" class="pop-duration">{{ durationText }}</span>
        </div>
        <div class="pop-header-sub">
          <el-tag v-if="customer?.id" type="success" effect="plain" round>已识别客户</el-tag>
          <el-tag v-else type="warning" effect="plain" round>未知客户 · 可新建</el-tag>
          <el-tag v-if="callId" effect="plain" round>通话ID {{ callId }}</el-tag>
        </div>
      </div>
    </template>

    <div v-loading="booting" class="pop-body">
      <aside class="pop-side">
        <div class="side-card">
          <div class="side-title">本次来电</div>
          <div class="side-row"><span class="side-label">主叫</span><strong>{{ phone || '-' }}</strong></div>
          <div class="side-row"><span class="side-label">归属地</span><strong>{{ numberLocation || '未知' }}</strong></div>
          <div class="side-row"><span class="side-label">状态</span><strong>{{ sideStatusText }}</strong></div>
          <div class="side-row"><span class="side-label">时长</span><strong>{{ durationText || '00:00' }}</strong></div>
        </div>
        <div class="side-card tip-card">
          <div class="side-title">坐席提示</div>
          <p>先核对客户信息，再补工单要点。挂断后仍可保存客户与提交工单。</p>
          <ul>
            <li>已匹配客户会自动带入模板字段</li>
            <li>「保存信息」只更新客户资料</li>
            <li>「提交工单」创建草稿并提交流程</li>
            <li>「直接办理」创建后立即提交办理</li>
          </ul>
        </div>
      </aside>

      <section class="pop-main">
        <div class="customer-hero">
          <div class="avatar">{{ avatarText }}</div>
          <div class="hero-copy">
            <div class="hero-name-row">
              <el-input v-model="customerName" class="name-input" placeholder="客户姓名（未知可留空）" />
              <el-tag v-if="customer?.customerType" effect="plain" round>{{ customer.customerType }}</el-tag>
            </div>
            <div class="hero-phone-row">
              <el-icon><Phone /></el-icon>
              <span>{{ phone || '-' }}</span>
            </div>
          </div>
        </div>

        <div class="section-block">
          <div class="section-head">
            <strong>客户信息</strong>
            <el-select v-model="customerTemplateId" clearable placeholder="客户模板" style="width: 220px">
              <el-option
                v-for="item in customerTemplates"
                :key="String(item.id)"
                :label="item.templateName"
                :value="item.id"
                :disabled="!item.enabled"
              />
            </el-select>
          </div>
          <el-form label-position="top" class="section-form">
            <el-row :gutter="14">
              <el-col :span="12">
                <el-form-item label="联系电话" required>
                  <el-input :model-value="phone" disabled />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="客户姓名">
                  <el-input v-model="customerName" placeholder="可选" />
                </el-form-item>
              </el-col>
              <el-col v-for="field in selectedCustomerTemplate?.fields || []" :key="`c-${field.fieldCode}`" :span="field.layoutSpan || 12">
                <el-form-item :label="field.fieldName" :required="field.required">
                  <el-input
                    v-if="field.fieldType === 'INPUT'"
                    v-model="customerFormData[field.fieldCode]"
                    :placeholder="field.placeholder"
                  />
                  <el-input
                    v-else-if="field.fieldType === 'TEXTAREA'"
                    v-model="customerFormData[field.fieldCode]"
                    type="textarea"
                    :rows="3"
                    :placeholder="field.placeholder"
                  />
                  <el-input-number v-else-if="field.fieldType === 'NUMBER'" v-model="customerFormData[field.fieldCode]" style="width: 100%" />
                  <el-date-picker
                    v-else-if="field.fieldType === 'DATE' || field.fieldType === 'DATETIME'"
                    v-model="customerFormData[field.fieldCode]"
                    :type="field.fieldType === 'DATE' ? 'date' : 'datetime'"
                    value-format="YYYY-MM-DD HH:mm:ss"
                    style="width: 100%"
                  />
                  <el-radio-group v-else-if="field.fieldType === 'RADIO'" v-model="customerFormData[field.fieldCode]">
                    <el-radio v-for="option in field.options" :key="option.value" :value="option.value">{{ option.label }}</el-radio>
                  </el-radio-group>
                  <el-checkbox-group v-else-if="field.fieldType === 'CHECKBOX'" v-model="customerFormData[field.fieldCode]">
                    <el-checkbox v-for="option in field.options" :key="option.value" :value="option.value">{{ option.label }}</el-checkbox>
                  </el-checkbox-group>
                  <el-select
                    v-else
                    v-model="customerFormData[field.fieldCode]"
                    :multiple="field.fieldType === 'MULTI_SELECT'"
                    clearable
                    style="width: 100%"
                  >
                    <el-option v-for="option in field.options" :key="option.value" :label="option.label" :value="option.value" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>
        </div>

        <div class="section-block">
          <div class="section-head">
            <strong>工单信息</strong>
            <el-select v-model="ticketTemplateId" clearable placeholder="工单模板" style="width: 220px">
              <el-option
                v-for="item in ticketTemplates"
                :key="String(item.id)"
                :label="item.templateName"
                :value="item.id"
                :disabled="!item.enabled"
              />
            </el-select>
          </div>
          <el-form label-position="top" class="section-form">
            <el-row :gutter="14">
              <el-col :span="12">
                <el-form-item label="来电号码">
                  <el-input :model-value="phone" disabled />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="关联客户">
                  <el-input :model-value="customer?.customerName || customerName || (customer?.id ? `客户#${customer.id}` : '保存后自动关联')" disabled />
                </el-form-item>
              </el-col>
              <el-col v-for="field in selectedTicketTemplate?.fields || []" :key="`t-${field.fieldCode}`" :span="field.layoutSpan || 12">
                <el-form-item :label="field.fieldName" :required="field.required">
                  <el-input
                    v-if="field.fieldType === 'INPUT'"
                    v-model="ticketFormData[field.fieldCode]"
                    :placeholder="field.placeholder"
                  />
                  <el-input
                    v-else-if="field.fieldType === 'TEXTAREA'"
                    v-model="ticketFormData[field.fieldCode]"
                    type="textarea"
                    :rows="3"
                    :placeholder="field.placeholder"
                  />
                  <el-input-number v-else-if="field.fieldType === 'NUMBER'" v-model="ticketFormData[field.fieldCode]" style="width: 100%" />
                  <el-date-picker
                    v-else-if="field.fieldType === 'DATE' || field.fieldType === 'DATETIME'"
                    v-model="ticketFormData[field.fieldCode]"
                    :type="field.fieldType === 'DATE' ? 'date' : 'datetime'"
                    value-format="YYYY-MM-DD HH:mm:ss"
                    style="width: 100%"
                  />
                  <el-radio-group v-else-if="field.fieldType === 'RADIO'" v-model="ticketFormData[field.fieldCode]">
                    <el-radio v-for="option in field.options" :key="option.value" :value="option.value">{{ option.label }}</el-radio>
                  </el-radio-group>
                  <el-checkbox-group v-else-if="field.fieldType === 'CHECKBOX'" v-model="ticketFormData[field.fieldCode]">
                    <el-checkbox v-for="option in field.options" :key="option.value" :value="option.value">{{ option.label }}</el-checkbox>
                  </el-checkbox-group>
                  <el-select
                    v-else
                    v-model="ticketFormData[field.fieldCode]"
                    :multiple="field.fieldType === 'MULTI_SELECT'"
                    clearable
                    style="width: 100%"
                  >
                    <el-option v-for="option in field.options" :key="option.value" :label="option.label" :value="option.value" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>
        </div>

        <div class="action-bar">
          <el-button type="primary" :loading="savingCustomer" @click="saveCustomerInfo">保存信息</el-button>
          <el-button type="success" :loading="savingTicket" @click="submitWorkOrder(false)">提交工单</el-button>
          <el-button type="warning" :loading="savingTicket" @click="submitWorkOrder(true)">直接办理</el-button>
        </div>

        <div class="history-block">
          <el-tabs v-model="historyTab">
            <el-tab-pane label="通话记录" name="calls">
              <div v-if="callRecords.length" class="history-list">
                <div v-for="item in callRecords" :key="String(item.id)" class="history-item">
                  <div class="history-item-head">
                    <el-tag size="small" :type="item.direction === 'INBOUND' ? 'success' : 'primary'">
                      {{ item.direction === 'INBOUND' ? '呼入' : item.direction === 'OUTBOUND' ? '呼出' : item.direction }}
                    </el-tag>
                    <span>{{ item.startedAt || '-' }}</span>
                  </div>
                  <div>{{ item.callerNumber || '-' }} → {{ item.calledNumber || '-' }}</div>
                  <div class="history-meta">时长 {{ formatDuration(item.billableSeconds) }} · {{ item.hangupCause || '-' }}</div>
                </div>
              </div>
              <el-empty v-else description="暂无通话记录" :image-size="64" />
            </el-tab-pane>
            <el-tab-pane label="历史工单" name="tickets">
              <div v-if="tickets.length" class="history-list">
                <div v-for="item in tickets" :key="String(item.id)" class="history-item">
                  <div class="history-item-head">
                    <strong>{{ item.ticketNo }}</strong>
                    <el-tag size="small">{{ item.ticketStatus }}</el-tag>
                  </div>
                  <div class="history-meta">{{ item.createTime }} · {{ item.currentNodeName || item.processStatus || '-' }}</div>
                </div>
              </div>
              <el-empty v-else description="暂无历史工单" :image-size="64" />
            </el-tab-pane>
            <el-tab-pane label="跟进记录" name="followUps">
              <div v-if="customer?.id" class="follow-editor">
                <el-input v-model="followUpContent" type="textarea" :rows="2" maxlength="2000" show-word-limit placeholder="补充本次跟进" />
                <el-button type="primary" plain :loading="savingFollowUp" :disabled="!followUpContent.trim()" @click="addFollowUp">
                  添加跟进
                </el-button>
              </div>
              <div v-if="followUps.length" class="history-list">
                <div v-for="item in followUps" :key="String(item.id)" class="history-item">
                  <div class="history-item-head">
                    <strong>{{ item.followUpByName || item.followUpBy || '跟进人' }}</strong>
                    <span>{{ item.followUpTime }}</span>
                  </div>
                  <div>{{ item.content }}</div>
                </div>
              </div>
              <el-empty v-else description="暂无跟进记录" :image-size="64" />
            </el-tab-pane>
          </el-tabs>
        </div>
      </section>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { Phone } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import {
  addCustomerFollowUp,
  createCustomer,
  CustomerFollowUpVO,
  CustomerVO,
  getCustomerByPhone,
  listCustomerFollowUps,
  updateCustomer
} from '@/api/callcenter/customer';
import { listCallRecords } from '@/api/callcenter/call-record';
import type { CallRecordVO } from '@/api/callcenter/call-record/types';
import { listFormTemplates } from '@/api/callcenter/form-template';
import type { FormTemplate } from '@/api/callcenter/form-template/types';
import { createTicket, listTickets, submitTicket, TicketVO } from '@/api/callcenter/ticket';

const props = withDefaults(
  defineProps<{
    phoneNumber?: string;
    callId?: string;
    numberLocation?: string;
    callStatusText?: string;
    durationText?: string;
    incoming?: boolean;
    active?: boolean;
  }>(),
  {
    phoneNumber: '',
    callId: '',
    numberLocation: '',
    callStatusText: '来电中',
    durationText: '',
    incoming: false,
    active: false
  }
);

const emit = defineEmits<{ saved: []; closed: [] }>();
const visible = defineModel<boolean>({ default: false });

const booting = ref(false);
const phone = ref('');
const customerName = ref('');
const customer = ref<CustomerVO>();
const customerTemplates = ref<FormTemplate[]>([]);
const ticketTemplates = ref<FormTemplate[]>([]);
const customerTemplateId = ref<string | number>();
const ticketTemplateId = ref<string | number>();
const customerFormData = reactive<Record<string, any>>({});
const ticketFormData = reactive<Record<string, any>>({});
const savingCustomer = ref(false);
const savingTicket = ref(false);
const savingFollowUp = ref(false);
const followUpContent = ref('');
const historyTab = ref('calls');
const callRecords = ref<CallRecordVO[]>([]);
const tickets = ref<TicketVO[]>([]);
const followUps = ref<CustomerFollowUpVO[]>([]);

const selectedCustomerTemplate = computed(() =>
  customerTemplates.value.find((item) => String(item.id) === String(customerTemplateId.value))
);
const selectedTicketTemplate = computed(() => ticketTemplates.value.find((item) => String(item.id) === String(ticketTemplateId.value)));
const avatarText = computed(() => (customerName.value || customer.value?.customerName || phone.value || '客').slice(0, 1));
const callTone = computed(() => (props.incoming ? 'incoming' : props.active ? 'active' : 'idle'));
/** 侧栏状态不重复号码，避免窄列把左侧标签挤折行 */
const sideStatusText = computed(() => {
  if (props.incoming) return '来电振铃中';
  if (props.active) {
    const text = props.callStatusText || '';
    if (text.includes('保持')) return '通话已保持';
    if (text.includes('静音')) return '坐席已静音';
    return '通话中';
  }
  return props.callStatusText || '-';
});

const populateFormData = (target: Record<string, any>, template?: FormTemplate, source?: Record<string, unknown>) => {
  Object.keys(target).forEach((key) => delete target[key]);
  template?.fields.forEach((field) => {
    const existingValue = source?.[field.fieldCode];
    target[field.fieldCode] =
      existingValue ?? (field.fieldType === 'CHECKBOX' || field.fieldType === 'MULTI_SELECT' ? [] : field.defaultValue || '');
  });
};

const formatDuration = (seconds?: number) => {
  const total = Math.max(0, Number(seconds || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const loadHistory = async () => {
  const number = phone.value.trim();
  const [callRes, ticketRes] = await Promise.all([
    number
      ? listCallRecords({ pageNum: 1, pageSize: 20, participantNumber: number })
      : Promise.resolve({ rows: [] as CallRecordVO[] }),
    number ? listTickets({ pageNum: 1, pageSize: 20, callerNumber: number }) : Promise.resolve({ rows: [] as TicketVO[] })
  ]);
  callRecords.value = callRes.rows || [];
  tickets.value = ticketRes.rows || [];
  if (customer.value?.id) {
    followUps.value = (await listCustomerFollowUps(customer.value.id)).data || [];
  } else {
    followUps.value = [];
  }
};

const bootstrap = async () => {
  booting.value = true;
  try {
    phone.value = props.phoneNumber.trim();
    customerName.value = '';
    customer.value = undefined;
    followUpContent.value = '';
    historyTab.value = 'calls';
    const [customerTplRes, ticketTplRes] = await Promise.all([listFormTemplates('CUSTOMER'), listFormTemplates('TICKET')]);
    customerTemplates.value = customerTplRes.data || [];
    ticketTemplates.value = ticketTplRes.data || [];
    const enabledCustomer = customerTemplates.value.filter((item) => item.enabled);
    const enabledTicket = ticketTemplates.value.filter((item) => item.enabled);
    customerTemplateId.value = enabledCustomer.length === 1 ? enabledCustomer[0].id : undefined;
    ticketTemplateId.value = enabledTicket.length === 1 ? enabledTicket[0].id : undefined;

    if (phone.value) {
      const matched = (await getCustomerByPhone(phone.value)).data || undefined;
      customer.value = matched;
      if (matched) {
        customerName.value = matched.customerName || '';
        customerTemplateId.value = matched.templateId || customerTemplateId.value;
      }
    }
    populateFormData(customerFormData, selectedCustomerTemplate.value, customer.value?.formData);
    populateFormData(ticketFormData, selectedTicketTemplate.value);
    await loadHistory();
  } finally {
    booting.value = false;
  }
};

watch(visible, async (opened) => {
  if (opened) await bootstrap();
});

watch(selectedCustomerTemplate, (template) => {
  populateFormData(customerFormData, template, customer.value?.formData);
});

watch(selectedTicketTemplate, (template) => {
  populateFormData(ticketFormData, template);
});

watch(
  () => props.phoneNumber,
  async (value) => {
    if (!visible.value) return;
    if (value.trim() === phone.value.trim()) return;
    phone.value = value.trim();
    await bootstrap();
  }
);

const ensureCustomerSaved = async () => {
  if (!phone.value.trim()) {
    ElMessage.warning('来电号码为空，无法保存客户');
    return undefined;
  }
  if (customer.value?.id) {
    await updateCustomer(customer.value.id, {
      customerName: customerName.value || undefined,
      sourceCallId: props.callId || customer.value.sourceCallId,
      templateId: customerTemplateId.value,
      formData: customerFormData
    });
    customer.value = {
      ...customer.value,
      customerName: customerName.value,
      templateId: customerTemplateId.value,
      formData: { ...customerFormData }
    };
    return customer.value;
  }
  const created = await createCustomer({
    primaryPhone: phone.value,
    customerName: customerName.value || undefined,
    templateId: customerTemplateId.value,
    sourceCallId: props.callId || undefined,
    formData: customerFormData
  });
  const matched = (await getCustomerByPhone(phone.value)).data || undefined;
  customer.value = matched || ({ id: created.data, primaryPhone: phone.value, customerName: customerName.value, createTime: '' } as CustomerVO);
  return customer.value;
};

const saveCustomerInfo = async () => {
  savingCustomer.value = true;
  try {
    await ensureCustomerSaved();
    ElMessage.success(customer.value?.id ? '客户信息已保存' : '客户已创建');
    await loadHistory();
    emit('saved');
  } finally {
    savingCustomer.value = false;
  }
};

const submitWorkOrder = async (directHandle: boolean) => {
  savingTicket.value = true;
  try {
    const savedCustomer = await ensureCustomerSaved();
    const created = await createTicket({
      customerId: savedCustomer?.id,
      callerNumber: phone.value,
      templateId: ticketTemplateId.value,
      sourceCallId: props.callId || undefined,
      formData: ticketFormData
    });
    const ticketId = created.data;
    if (directHandle && ticketId) {
      await submitTicket(ticketId);
      ElMessage.success('工单已创建并提交办理');
    } else {
      ElMessage.success('工单已创建');
    }
    await loadHistory();
    historyTab.value = 'tickets';
    emit('saved');
  } finally {
    savingTicket.value = false;
  }
};

const addFollowUp = async () => {
  if (!customer.value?.id || !followUpContent.value.trim()) return;
  savingFollowUp.value = true;
  try {
    await addCustomerFollowUp(customer.value.id, followUpContent.value.trim());
    followUpContent.value = '';
    followUps.value = (await listCustomerFollowUps(customer.value.id)).data || [];
    ElMessage.success('跟进已添加');
  } finally {
    savingFollowUp.value = false;
  }
};

const handleClosed = () => emit('closed');
</script>

<style scoped lang="scss">
.pop-header {
  display: grid;
  gap: 6px;
  padding-right: 28px;
}

.pop-header-main {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.pop-header-main strong {
  font-size: 16px;
  color: #15233d;
}

.pop-badge {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.pop-badge.incoming {
  background: #fee2e2;
  color: #dc2626;
}

.pop-badge.active {
  background: #dcfce7;
  color: #15803d;
}

.pop-badge.idle {
  background: #e8eef8;
  color: #3b587c;
}

.pop-phone {
  color: #2459cf;
  font-weight: 700;
}

.pop-location,
.pop-duration {
  color: #64748b;
  font-size: 13px;
}

.pop-header-sub {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pop-body {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  gap: 16px;
  min-height: 70vh;
  max-height: calc(92vh - 96px);
}

.pop-side {
  display: grid;
  gap: 12px;
  align-content: start;
}

.side-card {
  padding: 14px;
  border: 1px solid #e4ecf6;
  border-radius: 12px;
  background: #f8fbff;
}

.side-title {
  margin-bottom: 10px;
  font-weight: 700;
  color: #1f3354;
}

.side-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 0;
  color: #64748b;
  font-size: 13px;
}

.side-label {
  flex: 0 0 auto;
  white-space: nowrap;
  line-height: 1.5;
}

.side-row strong {
  flex: 1;
  min-width: 0;
  color: #1f3354;
  text-align: right;
  line-height: 1.5;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.tip-card p,
.tip-card li {
  color: #5b6b82;
  font-size: 12px;
  line-height: 1.6;
}

.tip-card ul {
  margin: 8px 0 0;
  padding-left: 18px;
}

.pop-main {
  min-width: 0;
  overflow: auto;
  padding-right: 4px;
}

.customer-hero {
  display: flex;
  gap: 14px;
  align-items: center;
  margin-bottom: 14px;
  padding: 14px 16px;
  border: 1px solid #e4ecf6;
  border-radius: 14px;
  background: linear-gradient(135deg, #f7faff 0%, #eef5ff 100%);
}

.avatar {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: #2f6bff;
  color: #fff;
  font-size: 20px;
  font-weight: 700;
}

.hero-copy {
  flex: 1;
  min-width: 0;
  display: grid;
  gap: 8px;
}

.hero-name-row {
  display: flex;
  gap: 10px;
  align-items: center;
}

.name-input :deep(.el-input__wrapper) {
  box-shadow: none;
  background: transparent;
  font-size: 18px;
  font-weight: 700;
}

.hero-phone-row {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #2459cf;
  font-weight: 600;
}

.section-block {
  margin-bottom: 14px;
  padding: 14px 16px 4px;
  border: 1px solid #e4ecf6;
  border-radius: 12px;
  background: #fff;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.section-head strong {
  color: #15233d;
  font-size: 15px;
}

.section-form {
  margin-top: 4px;
}

.action-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 4px 0 16px;
}

.history-block {
  padding: 8px 14px 14px;
  border: 1px solid #e4ecf6;
  border-radius: 12px;
  background: #fff;
}

.history-list {
  display: grid;
  gap: 10px;
}

.history-item {
  padding: 10px 12px;
  border: 1px solid #edf2f8;
  border-radius: 10px;
  background: #fafcff;
}

.history-item-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 6px;
  color: #334155;
}

.history-meta {
  margin-top: 4px;
  color: #94a3b8;
  font-size: 12px;
}

.follow-editor {
  display: grid;
  gap: 8px;
  margin-bottom: 12px;
}

@media (max-width: 960px) {
  .pop-body {
    grid-template-columns: 1fr;
    max-height: none;
  }
}
</style>

<style>
.incoming-screen-pop.el-dialog {
  border-radius: 14px;
  overflow: hidden;
}

.incoming-screen-pop .el-dialog__header {
  margin-right: 0;
  padding: 16px 20px 10px;
  border-bottom: 1px solid #e8eef6;
}

.incoming-screen-pop .el-dialog__body {
  padding: 14px 18px 18px;
}
</style>
