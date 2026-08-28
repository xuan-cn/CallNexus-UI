<template>
  <div class="incoming-screen-pop incoming-call-workspace" :class="{ 'customer-view-mode': props.customerView }">
    <header class="workspace-header">
      <div class="pop-header">
        <div class="pop-header-main">
          <span class="pop-badge" :class="callTone">{{ props.customerView ? '客户资料' : callStatusText }}</span>
          <span class="pop-phone">{{ phone || '未知号码' }}</span>
          <span v-if="!props.customerView && numberLocation" class="pop-location">{{ numberLocation }}</span>
          <span v-if="!props.customerView && durationText" class="pop-duration">{{ durationText }}</span>
        </div>
      </div>
      <el-button plain @click="handleClosed">返回</el-button>
    </header>

    <div v-loading="booting" class="pop-body" :class="{ 'without-assist': !showAssist }">
      <aside v-if="showAssist" class="pop-side">
        <AgentAssistPanel class="screen-assist-panel" :business-call-id="props.callId" />
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
                  <el-input v-if="field.fieldType === 'INPUT'" v-model="customerFormData[field.fieldCode]" :placeholder="field.placeholder" />
                  <el-input
                    v-else-if="field.fieldType === 'TEXTAREA'"
                    v-model="customerFormData[field.fieldCode]"
                    type="textarea"
                    :rows="3"
                    :placeholder="field.placeholder"
                  />
                  <el-input-number v-else-if="field.fieldType === 'NUMBER'" v-model="customerFormData[field.fieldCode]" style="width: 100%" />
                  <file-upload v-else-if="field.fieldType === 'FILE'" v-model="customerFormData[field.fieldCode]" :limit="5" :file-size="20" />
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

        <div class="section-block ticket-section" :class="{ collapsed: !ticketSectionExpanded }">
          <div class="section-head">
            <strong>工单信息</strong>
            <div class="ticket-section-actions">
              <el-select v-if="ticketSectionExpanded" v-model="ticketTemplateId" clearable placeholder="工单模板" style="width: 220px">
                <el-option
                  v-for="item in ticketTemplates"
                  :key="String(item.id)"
                  :label="item.templateName"
                  :value="item.id"
                  :disabled="!item.enabled"
                />
              </el-select>
              <el-button link type="primary" @click="ticketSectionExpanded = !ticketSectionExpanded">
                {{ ticketSectionExpanded ? '收起' : '展开' }}
                <el-icon class="ticket-toggle-icon" :class="{ expanded: ticketSectionExpanded }"><ArrowDown /></el-icon>
              </el-button>
            </div>
          </div>
          <el-collapse-transition>
            <div v-show="ticketSectionExpanded">
              <el-form label-position="top" class="section-form">
                <el-row :gutter="14">
                  <el-col :span="12">
                    <el-form-item label="来电号码">
                      <el-input :model-value="phone" disabled />
                    </el-form-item>
                  </el-col>
                  <el-col :span="12">
                    <el-form-item label="关联客户">
                      <el-input
                        :model-value="customer?.customerName || customerName || (customer?.id ? `客户#${customer.id}` : '保存后自动关联')"
                        disabled
                      />
                    </el-form-item>
                  </el-col>
                  <el-col v-for="field in selectedTicketTemplate?.fields || []" :key="`t-${field.fieldCode}`" :span="field.layoutSpan || 12">
                    <el-form-item :label="field.fieldName" :required="field.required">
                      <el-input v-if="field.fieldType === 'INPUT'" v-model="ticketFormData[field.fieldCode]" :placeholder="field.placeholder" />
                      <el-input
                        v-else-if="field.fieldType === 'TEXTAREA'"
                        v-model="ticketFormData[field.fieldCode]"
                        type="textarea"
                        :rows="3"
                        :placeholder="field.placeholder"
                      />
                      <el-input-number v-else-if="field.fieldType === 'NUMBER'" v-model="ticketFormData[field.fieldCode]" style="width: 100%" />
                      <file-upload v-else-if="field.fieldType === 'FILE'" v-model="ticketFormData[field.fieldCode]" :limit="5" :file-size="20" />
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
              <div class="ticket-submit-actions">
                <el-button type="success" :loading="savingTicket" @click="submitWorkOrder(false)">提交工单</el-button>
                <el-button type="warning" :loading="savingTicket" @click="submitWorkOrder(true)">直接办结</el-button>
              </div>
            </div>
          </el-collapse-transition>
        </div>

        <div class="action-bar">
          <el-button type="primary" :loading="savingCustomer" @click="saveCustomerInfo">保存信息</el-button>
        </div>

        <div class="history-block">
          <el-tabs v-model="historyTab">
            <el-tab-pane label="通话记录" name="calls">
              <el-table v-loading="callHistoryLoading" :data="callRecords" class="compact-history-table" size="small" empty-text="暂无通话记录">
                <el-table-column label="方向" width="72">
                  <template #default="{ row }">
                    <el-tag size="small" :type="row.direction === 'INBOUND' ? 'success' : 'primary'">
                      {{ row.direction === 'INBOUND' ? '呼入' : row.direction === 'OUTBOUND' ? '呼出' : row.direction }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="callerNumber" label="主叫" min-width="110" show-overflow-tooltip />
                <el-table-column prop="calledNumber" label="被叫" min-width="110" show-overflow-tooltip />
                <el-table-column label="通话时长" width="90">
                  <template #default="{ row }">{{ formatDuration(row.billableSeconds) }}</template>
                </el-table-column>
                <el-table-column prop="hangupCause" label="挂断原因" min-width="120" show-overflow-tooltip />
                <el-table-column prop="startedAt" label="开始时间" width="150" />
              </el-table>
              <el-pagination
                v-if="callTotal > 0"
                v-model:current-page="callPageNum"
                v-model:page-size="callPageSize"
                class="history-pagination"
                small
                background
                layout="total, sizes, prev, pager, next"
                :page-sizes="[5, 10, 20]"
                :total="callTotal"
                @current-change="loadCallHistory"
                @size-change="handleCallPageSizeChange"
              />
            </el-tab-pane>
            <el-tab-pane label="历史工单" name="tickets">
              <el-table v-loading="ticketHistoryLoading" :data="tickets" class="compact-history-table" size="small" empty-text="暂无历史工单">
                <el-table-column prop="ticketNo" label="工单编号" min-width="150" show-overflow-tooltip />
                <el-table-column prop="ticketStatus" label="状态" width="90" />
                <el-table-column label="当前节点" min-width="130" show-overflow-tooltip>
                  <template #default="{ row }">{{ row.currentNodeName || row.processStatus || '-' }}</template>
                </el-table-column>
                <el-table-column prop="createTime" label="创建时间" width="150" />
              </el-table>
              <el-pagination
                v-if="ticketTotal > 0"
                v-model:current-page="ticketPageNum"
                v-model:page-size="ticketPageSize"
                class="history-pagination"
                small
                background
                layout="total, sizes, prev, pager, next"
                :page-sizes="[5, 10, 20]"
                :total="ticketTotal"
                @current-change="loadTicketHistory"
                @size-change="handleTicketPageSizeChange"
              />
            </el-tab-pane>
            <el-tab-pane label="跟进记录" name="followUps">
              <div v-if="customer?.id" class="follow-editor">
                <el-input v-model="followUpContent" type="textarea" :rows="2" maxlength="2000" show-word-limit placeholder="补充本次跟进" />
                <el-button type="primary" plain :loading="savingFollowUp" :disabled="!followUpContent.trim()" @click="addFollowUp">
                  添加跟进
                </el-button>
              </div>
              <el-table v-loading="followUpHistoryLoading" :data="followUps" class="compact-history-table" size="small" empty-text="暂无跟进记录">
                <el-table-column label="跟进人" width="110">
                  <template #default="{ row }">{{ row.followUpByName || row.followUpBy || '跟进人' }}</template>
                </el-table-column>
                <el-table-column prop="content" label="跟进内容" min-width="240" show-overflow-tooltip />
                <el-table-column prop="followUpTime" label="跟进时间" width="150" />
              </el-table>
              <el-pagination
                v-if="followUpTotal > 0"
                v-model:current-page="followUpPageNum"
                v-model:page-size="followUpPageSize"
                class="history-pagination"
                small
                background
                layout="total, sizes, prev, pager, next"
                :page-sizes="[5, 10, 20]"
                :total="followUpTotal"
                @current-change="loadFollowUpHistory"
                @size-change="handleFollowUpPageSizeChange"
              />
            </el-tab-pane>
          </el-tabs>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ArrowDown, Phone } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import AgentAssistPanel from '@/components/AgentAssistPanel/index.vue';
import {
  addCustomerFollowUp,
  claimCustomerForCurrentAgent,
  createCustomer,
  CustomerFollowUpVO,
  CustomerVO,
  getCustomer,
  getCustomerByPhone,
  pageCustomerFollowUps,
  updateCustomer
} from '@/api/callcenter/customer';
import { listCallRecords } from '@/api/callcenter/call-record';
import type { CallRecordVO } from '@/api/callcenter/call-record/types';
import { listFormTemplates } from '@/api/callcenter/form-template';
import type { FormTemplate } from '@/api/callcenter/form-template/types';
import { createTicket, listTickets, resolveTicketDirectly, TicketVO } from '@/api/callcenter/ticket';

const props = withDefaults(
  defineProps<{
    phoneNumber?: string;
    callId?: string;
    numberLocation?: string;
    callStatusText?: string;
    durationText?: string;
    incoming?: boolean;
    active?: boolean;
    customerId?: string | number;
    customerView?: boolean;
  }>(),
  {
    phoneNumber: '',
    callId: '',
    numberLocation: '',
    callStatusText: '来电中',
    durationText: '',
    incoming: false,
    active: false,
    customerId: '',
    customerView: false
  }
);

const emit = defineEmits<{ saved: []; closed: [] }>();

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
const ticketSectionExpanded = ref(!props.customerView);
const savingFollowUp = ref(false);
const followUpContent = ref('');
const historyTab = ref('calls');
const callRecords = ref<CallRecordVO[]>([]);
const tickets = ref<TicketVO[]>([]);
const followUps = ref<CustomerFollowUpVO[]>([]);
const callHistoryLoading = ref(false);
const ticketHistoryLoading = ref(false);
const followUpHistoryLoading = ref(false);
const callPageNum = ref(1);
const callPageSize = ref(5);
const callTotal = ref(0);
const ticketPageNum = ref(1);
const ticketPageSize = ref(5);
const ticketTotal = ref(0);
const followUpPageNum = ref(1);
const followUpPageSize = ref(5);
const followUpTotal = ref(0);

const selectedCustomerTemplate = computed(() => customerTemplates.value.find((item) => String(item.id) === String(customerTemplateId.value)));
const selectedTicketTemplate = computed(() => ticketTemplates.value.find((item) => String(item.id) === String(ticketTemplateId.value)));
const avatarText = computed(() => (customerName.value || customer.value?.customerName || phone.value || '客').slice(0, 1));
const callTone = computed(() => (props.incoming ? 'incoming' : props.active ? 'active' : 'idle'));
const showAssist = computed(() => Boolean(props.callId) && !props.customerView);

const populateFormData = (target: Record<string, any>, template?: FormTemplate, source?: Record<string, unknown>) => {
  Object.keys(target).forEach((key) => delete target[key]);
  template?.fields.forEach((field) => {
    const existingValue = source?.[field.fieldCode];
    target[field.fieldCode] = existingValue ?? (field.fieldType === 'CHECKBOX' || field.fieldType === 'MULTI_SELECT' ? [] : field.defaultValue || '');
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

const loadCallHistory = async () => {
  const number = phone.value.trim();
  if (!number) {
    callRecords.value = [];
    callTotal.value = 0;
    return;
  }
  callHistoryLoading.value = true;
  try {
    const response = await listCallRecords({ pageNum: callPageNum.value, pageSize: callPageSize.value, participantNumber: number });
    callRecords.value = response.rows || [];
    callTotal.value = Number(response.total || 0);
  } finally {
    callHistoryLoading.value = false;
  }
};

const loadTicketHistory = async () => {
  const number = phone.value.trim();
  if (!number) {
    tickets.value = [];
    ticketTotal.value = 0;
    return;
  }
  ticketHistoryLoading.value = true;
  try {
    const response = await listTickets({ pageNum: ticketPageNum.value, pageSize: ticketPageSize.value, callerNumber: number });
    tickets.value = response.rows || [];
    ticketTotal.value = Number(response.total || 0);
  } finally {
    ticketHistoryLoading.value = false;
  }
};

const loadFollowUpHistory = async () => {
  if (!customer.value?.id) {
    followUps.value = [];
    followUpTotal.value = 0;
    return;
  }
  followUpHistoryLoading.value = true;
  try {
    const response = await pageCustomerFollowUps(customer.value.id, {
      pageNum: followUpPageNum.value,
      pageSize: followUpPageSize.value
    });
    followUps.value = response.rows || [];
    followUpTotal.value = Number(response.total || 0);
  } finally {
    followUpHistoryLoading.value = false;
  }
};

const loadHistory = async () => {
  await Promise.all([loadCallHistory(), loadTicketHistory(), loadFollowUpHistory()]);
};

const handleCallPageSizeChange = () => {
  callPageNum.value = 1;
  void loadCallHistory();
};

const handleTicketPageSizeChange = () => {
  ticketPageNum.value = 1;
  void loadTicketHistory();
};

const handleFollowUpPageSizeChange = () => {
  followUpPageNum.value = 1;
  void loadFollowUpHistory();
};

const bootstrap = async () => {
  booting.value = true;
  try {
    phone.value = props.phoneNumber.trim();
    customerName.value = '';
    customer.value = undefined;
    followUpContent.value = '';
    ticketSectionExpanded.value = !props.customerView;
    historyTab.value = 'calls';
    callPageNum.value = 1;
    ticketPageNum.value = 1;
    followUpPageNum.value = 1;
    const [customerTplRes, ticketTplRes] = await Promise.all([listFormTemplates('CUSTOMER'), listFormTemplates('TICKET')]);
    customerTemplates.value = customerTplRes.data || [];
    ticketTemplates.value = ticketTplRes.data || [];
    const enabledCustomer = customerTemplates.value.filter((item) => item.enabled);
    const enabledTicket = ticketTemplates.value.filter((item) => item.enabled);
    customerTemplateId.value = enabledCustomer.length === 1 ? enabledCustomer[0].id : undefined;
    ticketTemplateId.value = enabledTicket.length === 1 ? enabledTicket[0].id : undefined;

    if (props.customerId) {
      const matched = (await getCustomer(props.customerId)).data || undefined;
      customer.value = matched;
      if (matched) {
        phone.value = matched.primaryPhone || phone.value;
        customerName.value = matched.customerName || '';
        customerTemplateId.value = matched.templateId || customerTemplateId.value;
      }
    } else if (phone.value) {
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

watch(selectedCustomerTemplate, (template) => {
  populateFormData(customerFormData, template, customer.value?.formData);
});

watch(selectedTicketTemplate, (template) => {
  populateFormData(ticketFormData, template);
});

watch([() => props.customerId, () => props.phoneNumber], () => void bootstrap());

onMounted(() => void bootstrap());

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

const claimSavedCustomer = async (savedCustomer?: CustomerVO) => {
  if (!props.active || !props.callId || !savedCustomer?.id) return;
  await claimCustomerForCurrentAgent(savedCustomer.id, props.callId);
  customer.value = (await getCustomer(savedCustomer.id)).data;
};

const saveCustomerInfo = async () => {
  savingCustomer.value = true;
  try {
    const savedCustomer = await ensureCustomerSaved();
    await claimSavedCustomer(savedCustomer);
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
      await resolveTicketDirectly(ticketId);
      ElMessage.success('工单已创建并直接办结');
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
    followUpPageNum.value = 1;
    await loadFollowUpHistory();
    ElMessage.success('跟进已添加');
  } finally {
    savingFollowUp.value = false;
  }
};

const handleClosed = () => emit('closed');
</script>

<style scoped lang="scss">
.incoming-call-workspace {
  box-sizing: border-box;
  min-height: calc(100vh - 104px);
  padding: 18px 20px 24px;
  background: #f4f7fb;
}

.workspace-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 16px;
  padding: 16px 18px;
  border: 1px solid #e4ecf6;
  border-radius: 14px;
  background: #fff;
}

.pop-header {
  min-width: 0;
}

.pop-header-main {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  min-width: 0;
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

.pop-body {
  display: grid;
  grid-template-columns: minmax(460px, 40%) minmax(0, 1fr);
  gap: 16px;
  min-height: calc(100vh - 206px);
}

.pop-body.without-assist {
  grid-template-columns: minmax(0, 1fr);
}

.pop-side {
  display: flex;
  min-width: 0;
}

.pop-main {
  min-width: 0;
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

.screen-assist-panel {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  min-height: calc(100vh - 206px);
}

.screen-assist-panel :deep(.assist-transcript) {
  flex: 0 1 auto;
  min-height: 280px;
  max-height: min(560px, calc(100vh - 286px));
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
  font-size: 15px;
  font-weight: 700;
}

.hero-phone-row {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #2459cf;
  font-size: 13px;
  font-weight: 600;
}

.section-block {
  margin-bottom: 14px;
  padding: 14px 16px 4px;
  border: 1px solid #e4ecf6;
  border-radius: 12px;
  background: #fff;
}

.ticket-section.collapsed {
  padding-bottom: 14px;
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

.ticket-section-actions,
.ticket-submit-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ticket-toggle-icon {
  margin-left: 4px;
  transition: transform 0.2s ease;
}

.ticket-toggle-icon.expanded {
  transform: rotate(180deg);
}

.ticket-submit-actions {
  justify-content: flex-end;
  padding-bottom: 12px;
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

.compact-history-table {
  font-size: 12px;
}

.compact-history-table :deep(.el-table__cell) {
  padding: 6px 0;
}

.compact-history-table :deep(.cell) {
  font-size: 12px;
  line-height: 1.45;
}

.history-pagination {
  justify-content: flex-end;
  margin-top: 10px;
  font-size: 12px;
}

.follow-editor {
  display: grid;
  gap: 8px;
  margin-bottom: 12px;
}

@media (max-width: 1180px) {
  .incoming-call-workspace {
    padding: 12px;
  }

  .pop-body {
    grid-template-columns: 1fr;
  }
}
</style>
