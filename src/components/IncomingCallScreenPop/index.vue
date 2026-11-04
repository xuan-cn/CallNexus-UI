<template>
  <div class="incoming-screen-pop incoming-call-workspace" :class="{ 'customer-view-mode': props.customerView }">
    <header v-if="!props.customerView" class="workspace-header">
      <div class="pop-header">
        <div class="pop-header-main">
          <span class="pop-badge" :class="callTone">{{ callStatusText }}</span>
          <span class="pop-phone">{{ phone || '未知号码' }}</span>
          <span v-if="numberLocation" class="pop-location">{{ numberLocation }}</span>
          <span v-if="durationText" class="pop-duration">{{ durationText }}</span>
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
          <div class="hero-top">
            <div class="hero-identity">
              <div class="avatar">{{ avatarText }}</div>
              <div class="hero-copy">
                <div class="hero-name-row">
                  <button v-if="!editingName" type="button" class="hero-name-display" @click="startEditName">
                    <strong :class="{ placeholder: !customerName.trim() }">{{ customerName.trim() || '未命名客户' }}</strong>
                    <el-icon><EditPen /></el-icon>
                  </button>
                  <el-input
                    v-else
                    ref="nameInputRef"
                    v-model="customerName"
                    class="name-input"
                    placeholder="输入客户姓名"
                    maxlength="64"
                    @blur="editingName = false"
                    @keyup.enter="editingName = false"
                  />
                  <el-tag v-if="customer?.customerType" effect="plain" round>{{ customer.customerType }}</el-tag>
                  <el-tag :type="assignmentTone" effect="plain" round>{{ assignmentLabel }}</el-tag>
                </div>
                <div class="hero-phone-row">
                  <el-icon><Phone /></el-icon>
                  <span>{{ phone || '-' }}</span>
                  <span v-if="numberLocationText" class="hero-divider">·</span>
                  <span v-if="numberLocationText" class="hero-meta-text">{{ numberLocationText }}</span>
                  <span v-if="customer?.createTime" class="hero-divider">·</span>
                  <span v-if="customer?.createTime" class="hero-meta-text">建档 {{ formatShortTime(customer.createTime) }}</span>
                </div>
              </div>
            </div>

            <div class="hero-actions">
              <el-button v-if="props.customerView" plain @click="handleClosed">返回</el-button>
              <el-button :disabled="!phone" @click="copyPhone">复制号码</el-button>
              <el-button v-hasPermi="['callcenter:customer:sms']" :disabled="!customer?.id" @click="smsVisible = true">发送短信</el-button>
              <el-button type="primary" plain :disabled="!phone" @click="dialCustomer">外呼</el-button>
              <el-button type="primary" :loading="savingCustomer" @click="saveCustomerInfo">保存信息</el-button>
            </div>
          </div>

          <div class="hero-bottom">
            <div class="hero-stats">
              <button type="button" class="hero-stat" @click="jumpHistory('calls')">
                <strong>{{ callTotal }}</strong>
                <span>通话</span>
              </button>
              <button type="button" class="hero-stat" @click="jumpHistory('tickets')">
                <strong>{{ ticketTotal }}</strong>
                <span>工单</span>
              </button>
              <button type="button" class="hero-stat" @click="jumpHistory('followUps')">
                <strong>{{ followUpTotal }}</strong>
                <span>跟进</span>
              </button>
            </div>
          </div>

          <div v-if="heroChips.length" class="hero-chips">
            <span v-for="chip in heroChips" :key="chip" class="hero-chip">{{ chip }}</span>
          </div>
        </div>

        <div class="workspace-stack">
          <div class="workspace-primary">
            <div class="section-block">
              <div class="section-head">
                <div class="section-title">
                  <strong>客户信息</strong>
                  <span>完善基础资料，便于后续跟进与外呼</span>
                </div>
                <div class="section-head-actions">
                  <el-button
                    v-if="showAssist"
                    type="primary"
                    :loading="summarizingCustomer"
                    :disabled="!props.callId"
                    @click="summarizeCustomerToField"
                  >
                    AI 总结到客户字段
                  </el-button>
                  <el-select v-model="customerTemplateId" clearable placeholder="客户模板" class="template-select">
                    <el-option
                      v-for="item in customerTemplates"
                      :key="String(item.id)"
                      :label="item.templateName"
                      :value="item.id"
                      :disabled="!item.enabled"
                    />
                  </el-select>
                </div>
              </div>
              <el-form label-position="top" class="section-form dense-form">
                <el-row :gutter="12">
                  <el-col :xs="24" :sm="12" :md="customerMetaSpan">
                    <el-form-item label="联系电话" required>
                      <el-input :model-value="phone" disabled />
                    </el-form-item>
                  </el-col>
                  <el-col :xs="24" :sm="12" :md="customerMetaSpan">
                    <el-form-item label="客户姓名">
                      <el-input v-model="customerName" placeholder="可选" />
                    </el-form-item>
                  </el-col>
                  <el-col
                    v-for="item in customerFieldLayout"
                    :key="`c-${item.field.fieldCode}`"
                    :xs="24"
                    :sm="item.span >= 16 ? 24 : 12"
                    :md="item.span"
                  >
                    <el-form-item :label="item.field.fieldName" :required="item.field.required">
                      <el-input
                        v-if="item.field.fieldType === 'INPUT'"
                        v-model="customerFormData[item.field.fieldCode]"
                        :placeholder="item.field.placeholder"
                      />
                      <el-input
                        v-else-if="item.field.fieldType === 'TEXTAREA'"
                        v-model="customerFormData[item.field.fieldCode]"
                        type="textarea"
                        :rows="3"
                        :placeholder="item.field.placeholder"
                      />
                      <el-input-number
                        v-else-if="item.field.fieldType === 'NUMBER'"
                        v-model="customerFormData[item.field.fieldCode]"
                        style="width: 100%"
                      />
                      <file-upload
                        v-else-if="item.field.fieldType === 'FILE'"
                        v-model="customerFormData[item.field.fieldCode]"
                        :limit="5"
                        :file-size="20"
                      />
                      <el-date-picker
                        v-else-if="item.field.fieldType === 'DATE' || item.field.fieldType === 'DATETIME'"
                        v-model="customerFormData[item.field.fieldCode]"
                        :type="item.field.fieldType === 'DATE' ? 'date' : 'datetime'"
                        value-format="YYYY-MM-DD HH:mm:ss"
                        style="width: 100%"
                      />
                      <el-radio-group
                        v-else-if="item.field.fieldType === 'RADIO'"
                        v-model="customerFormData[item.field.fieldCode]"
                        class="wrap-options"
                      >
                        <el-radio v-for="option in item.field.options" :key="option.value" :value="option.value">
                          {{ option.label }}
                        </el-radio>
                      </el-radio-group>
                      <el-checkbox-group
                        v-else-if="item.field.fieldType === 'CHECKBOX'"
                        v-model="customerFormData[item.field.fieldCode]"
                        class="wrap-options"
                      >
                        <el-checkbox v-for="option in item.field.options" :key="option.value" :value="option.value">
                          {{ option.label }}
                        </el-checkbox>
                      </el-checkbox-group>
                      <el-select
                        v-else
                        v-model="customerFormData[item.field.fieldCode]"
                        :multiple="item.field.fieldType === 'MULTI_SELECT'"
                        clearable
                        style="width: 100%"
                      >
                        <el-option v-for="option in item.field.options" :key="option.value" :label="option.label" :value="option.value" />
                      </el-select>
                    </el-form-item>
                  </el-col>
                </el-row>
              </el-form>
              <div class="section-footer">
                <span class="section-hint">修改后记得保存，姓名会同步到顶部资料卡</span>
                <el-button type="primary" :loading="savingCustomer" @click="saveCustomerInfo">保存信息</el-button>
              </div>
            </div>

            <div class="section-block ticket-section" :class="{ collapsed: !ticketSectionExpanded }">
              <div class="section-head">
                <div class="section-title">
                  <strong>工单信息</strong>
                  <span>{{ ticketSectionExpanded ? '填写后可提交或直接办结' : '点击展开快速建单' }}</span>
                </div>
                <div class="ticket-section-actions">
                  <el-button
                    v-if="ticketSectionExpanded && showAssist"
                    type="primary"
                    :loading="generatingTicketDraft"
                    :disabled="!props.callId"
                    @click="generateTicketDraft"
                  >
                    AI 自动填单
                  </el-button>
                  <el-select v-if="ticketSectionExpanded" v-model="ticketTemplateId" clearable placeholder="工单模板" class="template-select">
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
                  <el-form label-position="top" class="section-form dense-form">
                    <el-row :gutter="12">
                      <el-col :xs="24" :sm="12" :md="ticketMetaSpan">
                        <el-form-item label="来电号码">
                          <el-input :model-value="phone" disabled />
                        </el-form-item>
                      </el-col>
                      <el-col :xs="24" :sm="12" :md="ticketMetaSpan">
                        <el-form-item label="关联客户">
                          <el-input
                            :model-value="customer?.customerName || customerName || (customer?.id ? `客户#${customer.id}` : '保存后自动关联')"
                            disabled
                          />
                        </el-form-item>
                      </el-col>
                      <el-col
                        v-for="item in ticketFieldLayout"
                        :key="`t-${item.field.fieldCode}`"
                        :xs="24"
                        :sm="item.span >= 16 ? 24 : 12"
                        :md="item.span"
                      >
                        <el-form-item :label="item.field.fieldName" :required="item.field.required">
                          <el-input
                            v-if="item.field.fieldType === 'INPUT'"
                            v-model="ticketFormData[item.field.fieldCode]"
                            :placeholder="item.field.placeholder"
                          />
                          <el-input
                            v-else-if="item.field.fieldType === 'TEXTAREA'"
                            v-model="ticketFormData[item.field.fieldCode]"
                            type="textarea"
                            :rows="3"
                            :placeholder="item.field.placeholder"
                          />
                          <el-input-number
                            v-else-if="item.field.fieldType === 'NUMBER'"
                            v-model="ticketFormData[item.field.fieldCode]"
                            style="width: 100%"
                          />
                          <file-upload
                            v-else-if="item.field.fieldType === 'FILE'"
                            v-model="ticketFormData[item.field.fieldCode]"
                            :limit="5"
                            :file-size="20"
                          />
                          <el-date-picker
                            v-else-if="item.field.fieldType === 'DATE' || item.field.fieldType === 'DATETIME'"
                            v-model="ticketFormData[item.field.fieldCode]"
                            :type="item.field.fieldType === 'DATE' ? 'date' : 'datetime'"
                            value-format="YYYY-MM-DD HH:mm:ss"
                            style="width: 100%"
                          />
                          <el-radio-group
                            v-else-if="item.field.fieldType === 'RADIO'"
                            v-model="ticketFormData[item.field.fieldCode]"
                            class="wrap-options"
                          >
                            <el-radio v-for="option in item.field.options" :key="option.value" :value="option.value">
                              {{ option.label }}
                            </el-radio>
                          </el-radio-group>
                          <el-checkbox-group
                            v-else-if="item.field.fieldType === 'CHECKBOX'"
                            v-model="ticketFormData[item.field.fieldCode]"
                            class="wrap-options"
                          >
                            <el-checkbox v-for="option in item.field.options" :key="option.value" :value="option.value">
                              {{ option.label }}
                            </el-checkbox>
                          </el-checkbox-group>
                          <el-select
                            v-else
                            v-model="ticketFormData[item.field.fieldCode]"
                            :multiple="item.field.fieldType === 'MULTI_SELECT'"
                            clearable
                            style="width: 100%"
                          >
                            <el-option v-for="option in item.field.options" :key="option.value" :label="option.label" :value="option.value" />
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
          </div>

          <section class="workspace-history history-block">
            <div class="history-head">
              <div class="section-title">
                <strong>互动记录</strong>
                <span>通话 {{ callTotal }} · 工单 {{ ticketTotal }} · 跟进 {{ followUpTotal }}</span>
              </div>
            </div>
            <el-tabs v-model="historyTab" class="history-tabs">
              <el-tab-pane name="calls">
                <template #label>
                  <span class="tab-label"
                    >通话 <em>{{ callTotal }}</em></span
                  >
                </template>
                <div v-loading="callHistoryLoading" class="history-pane" :class="{ 'is-empty': !callRecords.length }">
                  <template v-if="!callRecords.length && !callHistoryLoading">
                    <div class="history-empty">
                      <strong>暂无通话记录</strong>
                      <p>外呼或接通后来电后，记录会出现在这里</p>
                    </div>
                  </template>
                  <template v-else>
                    <el-table :data="callRecords" class="compact-history-table" size="small">
                      <el-table-column label="方向" width="88">
                        <template #default="{ row }">
                          <el-tag size="small" :type="row.direction === 'INBOUND' ? 'success' : 'primary'">
                            {{ row.direction === 'INBOUND' ? '呼入' : row.direction === 'OUTBOUND' ? '呼出' : row.direction }}
                          </el-tag>
                        </template>
                      </el-table-column>
                      <el-table-column prop="callerNumber" label="主叫" min-width="120" show-overflow-tooltip />
                      <el-table-column prop="calledNumber" label="被叫" min-width="120" show-overflow-tooltip />
                      <el-table-column label="时长" width="88">
                        <template #default="{ row }">{{ formatDuration(row.billableSeconds) }}</template>
                      </el-table-column>
                      <el-table-column prop="hangupCause" label="挂断原因" min-width="120" show-overflow-tooltip />
                      <el-table-column prop="startedAt" label="时间" width="160" show-overflow-tooltip />
                    </el-table>
                    <el-pagination
                      v-if="callTotal > 0"
                      v-model:current-page="callPageNum"
                      v-model:page-size="callPageSize"
                      class="history-pagination"
                      small
                      background
                      layout="total, prev, pager, next"
                      :page-sizes="[5, 10, 20]"
                      :total="callTotal"
                      @current-change="loadCallHistory"
                      @size-change="handleCallPageSizeChange"
                    />
                  </template>
                </div>
              </el-tab-pane>
              <el-tab-pane name="tickets">
                <template #label>
                  <span class="tab-label"
                    >工单 <em>{{ ticketTotal }}</em></span
                  >
                </template>
                <div v-loading="ticketHistoryLoading" class="history-pane" :class="{ 'is-empty': !tickets.length }">
                  <template v-if="!tickets.length && !ticketHistoryLoading">
                    <div class="history-empty">
                      <strong>暂无历史工单</strong>
                      <p>上方提交工单后，可在这里快速回看</p>
                    </div>
                  </template>
                  <template v-else>
                    <el-table :data="tickets" class="compact-history-table" size="small">
                      <el-table-column prop="ticketNo" label="工单编号" min-width="150" show-overflow-tooltip />
                      <el-table-column prop="ticketStatus" label="状态" width="100" />
                      <el-table-column label="节点" min-width="140" show-overflow-tooltip>
                        <template #default="{ row }">{{ row.currentNodeName || row.processStatus || '-' }}</template>
                      </el-table-column>
                      <el-table-column prop="createTime" label="创建时间" width="160" show-overflow-tooltip />
                    </el-table>
                    <el-pagination
                      v-if="ticketTotal > 0"
                      v-model:current-page="ticketPageNum"
                      v-model:page-size="ticketPageSize"
                      class="history-pagination"
                      small
                      background
                      layout="total, prev, pager, next"
                      :page-sizes="[5, 10, 20]"
                      :total="ticketTotal"
                      @current-change="loadTicketHistory"
                      @size-change="handleTicketPageSizeChange"
                    />
                  </template>
                </div>
              </el-tab-pane>
              <el-tab-pane name="followUps">
                <template #label>
                  <span class="tab-label"
                    >跟进 <em>{{ followUpTotal }}</em></span
                  >
                </template>
                <div v-loading="followUpHistoryLoading" class="history-pane" :class="{ 'is-empty': !followUps.length }">
                  <div v-if="customer?.id" class="follow-editor flat">
                    <el-input v-model="followUpContent" type="textarea" :rows="2" maxlength="2000" show-word-limit placeholder="补充本次跟进" />
                    <el-button type="primary" plain :loading="savingFollowUp" :disabled="!followUpContent.trim()" @click="addFollowUp">
                      添加跟进
                    </el-button>
                  </div>
                  <template v-if="!followUps.length && !followUpHistoryLoading">
                    <div class="history-empty compact">
                      <strong>暂无跟进记录</strong>
                      <p>把沟通约定或处理结果记下来，方便下次接手</p>
                    </div>
                  </template>
                  <template v-else>
                    <div class="follow-list">
                      <article v-for="row in followUps" :key="String(row.id)" class="follow-item">
                        <div class="follow-item-head">
                          <strong>{{ row.followUpByName || row.followUpBy || '跟进人' }}</strong>
                          <span>{{ row.followUpTime }}</span>
                        </div>
                        <p>{{ row.content }}</p>
                      </article>
                    </div>
                    <el-pagination
                      v-if="followUpTotal > 0"
                      v-model:current-page="followUpPageNum"
                      v-model:page-size="followUpPageSize"
                      class="history-pagination"
                      small
                      background
                      layout="total, prev, pager, next"
                      :page-sizes="[5, 10, 20]"
                      :total="followUpTotal"
                      @current-change="loadFollowUpHistory"
                      @size-change="handleFollowUpPageSizeChange"
                    />
                  </template>
                </div>
              </el-tab-pane>
            </el-tabs>
          </section>
        </div>
      </section>
    </div>
    <SendSmsDrawer v-model="smsVisible" :customer-id="customer?.id" />
  </div>
</template>

<script setup lang="ts">
import { ArrowDown, EditPen, Phone } from '@element-plus/icons-vue';
import { ElMessage, type InputInstance } from 'element-plus';
import AgentAssistPanel from '@/components/AgentAssistPanel/index.vue';
import SendSmsDrawer from '@/components/BusinessSms/SendSmsDrawer.vue';
import { generateAgentAssistTicketDraft, getAgentAssist, summarizeAgentAssistCustomer } from '@/api/callcenter/agent-assist';
import { useAgentDialBus } from '@/composables/useAgentDial';
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
const agentDialBus = useAgentDialBus();

const booting = ref(false);
const phone = ref('');
const customerName = ref('');
const customer = ref<CustomerVO>();
const smsVisible = ref(false);
const customerTemplates = ref<FormTemplate[]>([]);
const ticketTemplates = ref<FormTemplate[]>([]);
const customerTemplateId = ref<string | number>();
const ticketTemplateId = ref<string | number>();
const customerFormData = reactive<Record<string, any>>({});
const ticketFormData = reactive<Record<string, any>>({});
const savingCustomer = ref(false);
const savingTicket = ref(false);
const generatingTicketDraft = ref(false);
const summarizingCustomer = ref(false);
const assistEnabled = ref(false);
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
const editingName = ref(false);
const nameInputRef = ref<InputInstance>();

const selectedCustomerTemplate = computed(() => customerTemplates.value.find((item) => String(item.id) === String(customerTemplateId.value)));
const selectedTicketTemplate = computed(() => ticketTemplates.value.find((item) => String(item.id) === String(ticketTemplateId.value)));
const avatarText = computed(() => (customerName.value || customer.value?.customerName || phone.value || '客').slice(0, 1));
const callTone = computed(() => (props.incoming ? 'incoming' : props.active ? 'active' : 'idle'));
const showAssist = computed(() => Boolean(props.callId) && !props.customerView && assistEnabled.value);
const numberLocationText = computed(() => props.numberLocation || '');
const assignmentLabel = computed(() => {
  if (customer.value?.agentName) return `坐席 ${customer.value.agentName}`;
  if (customer.value?.agentId) return `坐席 #${customer.value.agentId}`;
  if (customer.value?.assignmentId || customer.value?.skillGroupId) return '已分配';
  return customer.value?.id ? '未分配' : '未建档';
});
const assignmentTone = computed(() => {
  if (customer.value?.agentId || customer.value?.assignmentId || customer.value?.skillGroupId) return 'success';
  return customer.value?.id ? 'warning' : 'info';
});
const heroChips = computed(() => {
  const chips: string[] = [];
  if (customer.value?.sourceChannel) chips.push(`来源 ${customer.value.sourceChannel}`);
  if (customer.value?.assignmentSource) chips.push(`分配 ${customer.value.assignmentSource}`);
  const tags = String(customer.value?.tags || '')
    .split(/[,，;；\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  chips.push(...tags.slice(0, 4));
  if (!customer.value?.id) chips.unshift('新客户');
  return chips;
});

const startEditName = async () => {
  editingName.value = true;
  await nextTick();
  nameInputRef.value?.focus();
};

const formatShortTime = (time?: string) => {
  if (!time) return '';
  return time.replace('T', ' ').slice(0, 16);
};

const copyPhone = async () => {
  const value = phone.value.trim();
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
    ElMessage.success('号码已复制');
  } catch {
    ElMessage.warning('复制失败，请手动选择号码');
  }
};

const dialCustomer = () => {
  const destination = phone.value.trim();
  if (!destination) return;
  agentDialBus.emit({
    destination,
    customerId: customer.value?.id,
    source: 'CUSTOMER_DETAIL'
  });
};

const jumpHistory = async (tab: 'calls' | 'tickets' | 'followUps') => {
  historyTab.value = tab;
  await nextTick();
  document.querySelector('.history-block')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

type LayoutField = {
  fieldType?: string;
  fieldCode?: string;
  fieldName?: string;
  layoutSpan?: number;
  options?: Array<{ label: string; value: string }>;
};

/** 模板约定 12/24；本页用 8/16/24 三列网格，并尊重自定义 layoutSpan */
const preferredFieldSpan = (field: LayoutField) => {
  if (field.fieldType === 'TEXTAREA' || field.fieldType === 'FILE') return 24;
  if (field.layoutSpan === 24) return 24;

  const code = String(field.fieldCode || '').toLowerCase();
  const name = String(field.fieldName || '');
  const looksWide = /address|addr|remark|note|content|desc|detail/.test(code) || /地址|备注|说明|内容|描述|详情/.test(name);
  if (looksWide) return 16;

  if (field.fieldType === 'RADIO' || field.fieldType === 'CHECKBOX') {
    return (field.options?.length || 0) > 3 ? 16 : 8;
  }

  // layoutSpan=12 或未设置 → 三列短字段
  return 8;
};

const packTemplateFields = <T extends LayoutField>(fields: T[], initialUsed: number) => {
  const result: Array<{ field: T; span: number }> = [];
  let rowUsed = initialUsed;

  const expandPrev = (add: number) => {
    if (add <= 0 || !result.length) return;
    const prev = result[result.length - 1];
    if (prev.span < 24) prev.span = Math.min(24, prev.span + add);
  };

  fields.forEach((field, index) => {
    let span = preferredFieldSpan(field);

    if (span >= 24) {
      if (rowUsed > 0 && rowUsed < 24) expandPrev(24 - rowUsed);
      result.push({ field, span: 24 });
      rowUsed = 0;
      return;
    }

    if (rowUsed > 0 && rowUsed + span > 24) {
      expandPrev(24 - rowUsed);
      rowUsed = 0;
    }

    const remaining = 24 - rowUsed;
    if (span > remaining) span = remaining;

    const laterCanFill = fields.slice(index + 1).some((item) => {
      const next = preferredFieldSpan(item);
      return next < 24 && next <= remaining - span;
    });
    if (!laterCanFill && span < remaining) {
      span = remaining;
    }

    result.push({ field, span });
    rowUsed = (rowUsed + span) % 24;
  });

  return result;
};

const customerMetaSpan = computed(() => {
  const fields = selectedCustomerTemplate.value?.fields || [];
  return fields.some((field) => preferredFieldSpan(field) < 24) ? 8 : 12;
});

const customerFieldLayout = computed(() => {
  const fields = selectedCustomerTemplate.value?.fields || [];
  const initialUsed = customerMetaSpan.value === 8 ? 16 : 24;
  return packTemplateFields(fields, initialUsed);
});

const ticketMetaSpan = computed(() => {
  const fields = selectedTicketTemplate.value?.fields || [];
  return fields.some((field) => preferredFieldSpan(field) < 24) ? 8 : 12;
});

const ticketFieldLayout = computed(() => {
  const fields = selectedTicketTemplate.value?.fields || [];
  const initialUsed = ticketMetaSpan.value === 8 ? 16 : 24;
  return packTemplateFields(fields, initialUsed);
});

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
    assistEnabled.value = false;
    customer.value = undefined;
    followUpContent.value = '';
    ticketSectionExpanded.value = !props.customerView;
    historyTab.value = 'calls';
    callPageNum.value = 1;
    ticketPageNum.value = 1;
    followUpPageNum.value = 1;
    const [customerTplRes, ticketTplRes, assistRes] = await Promise.all([
      listFormTemplates('CUSTOMER'),
      listFormTemplates('TICKET'),
      props.callId && !props.customerView ? getAgentAssist(props.callId) : Promise.resolve(undefined)
    ]);
    assistEnabled.value = Boolean(assistRes?.data?.assistEnabled);
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

const summarizeCustomerToField = async () => {
  if (!props.callId) return;
  summarizingCustomer.value = true;
  try {
    const savedCustomer = await ensureCustomerSaved();
    if (!savedCustomer?.id) return;
    const response = await summarizeAgentAssistCustomer(props.callId, savedCustomer.id);
    const result = response.data;
    customerTemplateId.value = result.templateId;
    await nextTick();
    customerFormData[result.fieldCode] = result.summary;
    customer.value = (await getCustomer(savedCustomer.id)).data;
    ElMessage.success('通话总结已写入客户资料');
    emit('saved');
  } finally {
    summarizingCustomer.value = false;
  }
};

const generateTicketDraft = async () => {
  if (!props.callId) return;
  generatingTicketDraft.value = true;
  try {
    const response = await generateAgentAssistTicketDraft(props.callId);
    const draft = response.data;
    ticketTemplateId.value = draft.ticketTemplateId;
    await nextTick();
    populateFormData(ticketFormData, selectedTicketTemplate.value, draft.formData);
    ticketSectionExpanded.value = true;
    ElMessage.success('AI 已填写工单字段，请确认后提交');
  } finally {
    generatingTicketDraft.value = false;
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
  --ink: #15233d;
  --muted: #64748b;
  --line: #e4ecf6;
  --soft: #f4f7fb;
  --card: #ffffff;
  --accent: #2459cf;
  --accent-soft: #eef4ff;
  box-sizing: border-box;
  min-height: calc(100vh - 104px);
  padding: 16px 18px 22px;
  background: radial-gradient(circle at top right, rgba(47, 107, 255, 0.08), transparent 28%), linear-gradient(180deg, #f7f9fc 0%, var(--soft) 100%);
}

.workspace-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
  padding: 14px 16px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 8px 24px rgba(21, 35, 61, 0.04);
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
  color: var(--accent);
  font-size: 16px;
  font-weight: 700;
}

.pop-location,
.pop-duration {
  color: var(--muted);
  font-size: 13px;
}

.pop-body {
  display: grid;
  grid-template-columns: minmax(360px, 31%) minmax(0, 1fr);
  gap: 14px;
  min-height: calc(100vh - 190px);
}

.pop-body.without-assist {
  grid-template-columns: minmax(0, 1fr);
}

.pop-side,
.pop-main {
  min-width: 0;
}

.pop-side {
  position: sticky;
  top: 12px;
  display: flex;
  align-self: start;
  height: calc(100vh - 126px);
  min-height: 480px;
  max-height: calc(100vh - 126px);
}

.screen-assist-panel {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}

.screen-assist-panel :deep(.assist-transcript) {
  flex: 1 1 auto;
  min-height: 0;
  max-height: none;
}

.screen-assist-panel :deep(.assist-transcript.is-empty) {
  flex: 1 1 auto;
  max-height: none;
}

.customer-hero {
  display: grid;
  gap: 14px;
  margin-bottom: 14px;
  padding: 16px 18px;
  border: 1px solid #d9e6fb;
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(238, 244, 255, 0.96) 100%);
  box-shadow: 0 10px 28px rgba(36, 89, 207, 0.06);
}

.hero-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.hero-bottom {
  padding-top: 12px;
  border-top: 1px solid rgba(219, 231, 247, 0.9);
}

.hero-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  width: 100%;
}

.hero-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-height: 48px;
  padding: 8px 10px;
  border: 1px solid #dbe7f7;
  border-radius: 12px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(245, 249, 255, 0.94) 100%);
  box-shadow: 0 4px 12px rgba(36, 89, 207, 0.04);
  color: inherit;
  cursor: pointer;
  text-align: center;
  transition:
    border-color 0.15s ease,
    background 0.15s ease,
    box-shadow 0.15s ease,
    transform 0.15s ease;
}

.hero-stat:hover {
  border-color: #9db7eb;
  background: #fff;
  box-shadow: 0 8px 16px rgba(36, 89, 207, 0.08);
  transform: translateY(-1px);
}

.hero-stat strong {
  color: var(--accent);
  font-size: 18px;
  font-weight: 700;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}

.hero-stat span {
  color: var(--muted);
  font-size: 12px;
  font-weight: 500;
  line-height: 1.2;
}

.hero-identity {
  display: flex;
  gap: 14px;
  align-items: center;
  min-width: 0;
  flex: 1;
}

.avatar {
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: linear-gradient(180deg, #3b82f6 0%, #2459cf 100%);
  color: #fff;
  font-size: 22px;
  font-weight: 700;
  box-shadow: 0 10px 18px rgba(36, 89, 207, 0.22);
}

.hero-copy {
  flex: 1;
  min-width: 0;
  display: grid;
  gap: 6px;
}

.hero-name-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.hero-name-display {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: min(360px, 100%);
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--ink);
  cursor: pointer;
  text-align: left;
}

.hero-name-display strong {
  overflow: hidden;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.hero-name-display strong.placeholder {
  color: #94a3b8;
}

.hero-name-display .el-icon {
  color: #94a3b8;
  font-size: 14px;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.hero-name-display:hover .el-icon {
  opacity: 1;
}

.name-input {
  max-width: 280px;
}

.name-input :deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px #c9daf8 inset;
  background: #fff;
  font-size: 18px;
  font-weight: 700;
}

.hero-phone-row {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  color: var(--accent);
  font-size: 13px;
  font-weight: 600;
}

.hero-divider {
  color: #94a3b8;
  font-weight: 400;
}

.hero-meta-text {
  color: var(--muted);
  font-weight: 500;
}

.hero-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.hero-chip {
  display: inline-flex;
  align-items: center;
  max-width: 180px;
  height: 24px;
  padding: 0 10px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(47, 107, 255, 0.08);
  color: #3b587c;
  font-size: 12px;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  flex: 0 0 auto;
}

.workspace-stack {
  display: grid;
  gap: 14px;
}

.workspace-primary,
.workspace-history {
  min-width: 0;
}

.section-block,
.workspace-history {
  border: 1px solid var(--line);
  border-radius: 16px;
  background: var(--card);
  box-shadow: 0 8px 24px rgba(21, 35, 61, 0.03);
}

.section-block {
  margin-bottom: 14px;
  padding: 14px 14px 10px;
}

.workspace-primary .section-block:last-child {
  margin-bottom: 0;
}

.ticket-section.collapsed {
  padding-bottom: 14px;
}

.section-head,
.history-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}

.section-title {
  display: grid;
  gap: 4px;
}

.section-title strong {
  color: var(--ink);
  font-size: 15px;
}

.section-title span,
.section-hint {
  color: var(--muted);
  font-size: 12px;
  line-height: 1.45;
}

.template-select {
  width: 200px;
}

.section-head-actions,
.ticket-section-actions,
.ticket-submit-actions,
.section-footer {
  display: flex;
  align-items: center;
  gap: 10px;
}

.section-head-actions,
.ticket-section-actions {
  justify-content: flex-end;
  flex-wrap: wrap;
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
  padding: 4px 0 8px;
}

.section-footer {
  justify-content: space-between;
  padding-top: 4px;
  border-top: 1px dashed #e8eef6;
}

.dense-form {
  margin-top: 2px;
}

.dense-form :deep(.el-form-item) {
  margin-bottom: 10px;
}

.dense-form :deep(.el-form-item__label) {
  margin-bottom: 4px !important;
  overflow: hidden;
  color: #64748b;
  font-size: 12px;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dense-form :deep(.wrap-options) {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
}

.dense-form :deep(.el-input__wrapper),
.dense-form :deep(.el-textarea__inner),
.dense-form :deep(.el-select__wrapper) {
  min-height: 34px;
  border-radius: 10px;
}

.workspace-history {
  padding: 14px 16px 12px;
}

.history-tabs :deep(.el-tabs__header) {
  margin-bottom: 10px;
}

.history-tabs :deep(.el-tabs__nav-wrap::after) {
  height: 1px;
  background: #edf2f7;
}

.history-pane {
  min-height: 0;
}

.history-pane.is-empty {
  min-height: 0;
}

.history-empty {
  display: grid;
  gap: 6px;
  place-content: center;
  min-height: 148px;
  padding: 28px 16px;
  border: 1px dashed #e2e8f0;
  border-radius: 12px;
  background: #f8fafc;
  color: var(--muted);
  text-align: center;
}

.history-empty.compact {
  min-height: 112px;
  padding: 20px 16px;
}

.history-empty strong {
  color: #475569;
  font-size: 14px;
  font-weight: 650;
}

.history-empty p {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
}

.follow-editor {
  display: grid;
  gap: 8px;
  margin-bottom: 12px;
}

.follow-editor.flat {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
}

.follow-list {
  display: grid;
  gap: 10px;
}

.follow-item {
  padding: 12px 14px;
  border: 1px solid #e8eef6;
  border-radius: 12px;
  background: #fbfcfe;
}

.follow-item-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 6px;
}

.follow-item-head strong {
  color: var(--ink);
  font-size: 13px;
}

.follow-item-head span {
  color: var(--muted);
  font-size: 12px;
}

.follow-item p {
  margin: 0;
  color: #334155;
  font-size: 13px;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
}

.tab-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.tab-label em {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent);
  font-style: normal;
  font-size: 11px;
  font-weight: 700;
}

.compact-history-table {
  font-size: 12px;
}

.compact-history-table :deep(.el-table__cell) {
  padding: 7px 0;
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

@media (max-width: 1180px) {
  .incoming-call-workspace {
    padding: 12px;
  }

  .pop-body {
    grid-template-columns: 1fr;
  }

  .pop-side {
    position: static;
    display: block;
    height: auto;
    min-height: 0;
    max-height: none;
  }

  .screen-assist-panel {
    min-height: 420px;
  }

  .screen-assist-panel :deep(.assist-transcript) {
    min-height: 340px;
    max-height: 520px;
  }

  .hero-top {
    flex-direction: column;
    align-items: stretch;
  }

  .hero-actions {
    justify-content: flex-start;
  }

  .follow-editor.flat {
    grid-template-columns: 1fr;
  }

  .section-footer {
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .section-head,
  .section-head-actions,
  .ticket-section-actions {
    align-items: flex-start;
  }

  .template-select {
    width: 160px;
  }
}
</style>
