<template>
  <component
    :is="businessType === 'CUSTOMER' ? ElDrawer : ElDialog"
    v-model="visible"
    :title="businessType === 'CUSTOMER' ? '客户详情' : '工单详情'"
    :width="businessType === 'TICKET' ? '1180px' : undefined"
    :size="businessType === 'CUSTOMER' ? 'min(1120px, 92vw)' : undefined"
    :class="{ 'customer-detail-drawer': businessType === 'CUSTOMER' }"
    append-to-body
  >
    <div
      v-loading="loading"
      class="detail-container"
      :class="{ 'customer-layout': businessType === 'CUSTOMER', 'assist-active': activeTab === 'assist' && businessCallId }"
    >
      <div class="detail-left">
        <div v-if="businessType === 'CUSTOMER' && customerDetail" class="customer-hero">
          <div class="customer-avatar">{{ (customerDetail.customerName || '客').slice(0, 1) }}</div>
          <div class="customer-hero-copy">
            <strong>{{ customerDetail.customerName || '未命名客户' }}</strong>
            <small>{{ customerDetail.primaryPhone || '暂无主号码' }}</small>
          </div>
          <el-tag v-if="customerDetail.customerType" effect="plain" round>{{ customerDetail.customerType }}</el-tag>
        </div>
        <el-descriptions v-if="detail" class="detail-summary" :column="2" border>
          <template v-if="businessType === 'CUSTOMER'">
            <el-descriptions-item label="主号码">{{ customerDetail?.primaryPhone }}</el-descriptions-item>
            <el-descriptions-item label="客户姓名">{{ customerDetail?.customerName || '未提供' }}</el-descriptions-item>
          </template>
          <template v-else>
            <el-descriptions-item label="工单编号">{{ ticketDetail?.ticketNo }}</el-descriptions-item>
            <el-descriptions-item label="工单状态">{{ ticketStatusLabel(ticketDetail?.ticketStatus) }}</el-descriptions-item>
            <el-descriptions-item label="流程状态">{{ processStatusLabel(ticketDetail?.processStatus) }}</el-descriptions-item>
            <el-descriptions-item label="当前节点">{{ ticketDetail?.currentNodeName || '-' }}</el-descriptions-item>
            <el-descriptions-item label="绑定流程">{{ ticketDetail?.workflowCode || '-' }}</el-descriptions-item>
            <el-descriptions-item label="来电号码">{{ ticketDetail?.callerNumber || '-' }}</el-descriptions-item>
            <el-descriptions-item label="关联客户ID">{{ ticketDetail?.customerId || '-' }}</el-descriptions-item>
          </template>
          <el-descriptions-item label="来源通话">{{ detail.sourceCallId || '-' }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ detail.createTime }}</el-descriptions-item>
        </el-descriptions>

        <div v-if="customFields.length" class="custom-detail">
          <div class="section-title">自定义字段</div>
          <el-row :gutter="12">
            <el-col v-for="field in customFields" :key="field.code" :span="field.layoutSpan">
              <div class="custom-field">
                <div class="custom-field-label">{{ field.label }}</div>
                <file-upload v-if="field.fieldType === 'FILE' && field.rawValue" :model-value="field.rawValue" :is-show-tip="false" disabled />
                <div v-else class="custom-field-value">{{ field.value }}</div>
              </div>
            </el-col>
          </el-row>
        </div>
      </div>

      <div class="detail-right">
        <div class="side-panel" :class="{ 'is-scrolling': sidePanelScrolling }" @scroll.capture="handleSideScroll">
          <el-tabs v-model="activeTab">
            <el-tab-pane v-if="businessType === 'CUSTOMER' && businessCallId" label="通话辅助" name="assist">
              <div class="assist-heading">
                <div>
                  <strong>实时话术辅助</strong>
                  <span>{{ assistDetail?.assistAgentName ? `知识助手：${assistDetail.assistAgentName}` : '等待技能组辅助配置' }}</span>
                </div>
                <el-tag :type="assistConnected ? 'success' : 'info'" effect="plain" round>
                  {{ assistConnected ? '实时接收中' : '连接中' }}
                </el-tag>
              </div>
              <div class="assist-workspace">
                <div ref="assistTranscriptRef" class="assist-transcript">
                  <div v-if="assistSegments.length" class="assist-dialogue-list">
                    <button
                      v-for="segment in assistSegments"
                      :key="String(segment.id)"
                      type="button"
                      class="assist-dialogue-item"
                      :class="[
                        `speaker-${String(segment.speaker || 'UNKNOWN').toLowerCase()}`,
                        { selected: String(segment.id) === String(selectedAssistSegmentId) }
                      ]"
                      @click="selectAssistSegment(segment)"
                    >
                      <span class="assist-speaker">{{ assistSpeakerLabel(segment.speaker) }}</span>
                      <span class="assist-text">{{ segment.textContent }}</span>
                    </button>
                  </div>
                  <el-empty v-else description="客户开始说话后，这里会实时显示对话" :image-size="62" />
                </div>
                <div class="assist-recommendation">
                  <template v-if="selectedSuggestion">
                    <div class="recommendation-title">
                      <span>建议回复</span>
                      <el-tag v-if="selectedSuggestion.sourceType" size="small" effect="plain">
                        {{ assistSourceLabel(selectedSuggestion.sourceType) }}
                      </el-tag>
                    </div>
                    <div v-if="selectedSuggestion.status === 'PROCESSING'" class="assist-thinking">
                      <i></i><i></i><i></i><span>正在结合知识库生成建议</span>
                    </div>
                    <div v-else-if="selectedSuggestion.status === 'FAILED'" class="assist-failed">
                      <span>{{ selectedSuggestion.failureReason || '建议生成失败' }}</span>
                      <el-button link type="primary" @click="regenerateSuggestion(selectedSuggestion)">重新生成</el-button>
                    </div>
                    <template v-else>
                      <div class="recommendation-content">{{ selectedSuggestion.suggestedReply }}</div>
                      <div class="recommendation-actions">
                        <span v-if="selectedSuggestion.processingMs">耗时 {{ selectedSuggestion.processingMs }}ms</span>
                        <el-button link type="primary" @click="copySuggestion(selectedSuggestion.suggestedReply)">复制话术</el-button>
                        <el-button link type="primary" @click="regenerateSuggestion(selectedSuggestion)">换一条</el-button>
                      </div>
                    </template>
                  </template>
                  <div v-else-if="selectedCustomerSegment" class="assist-thinking"><i></i><i></i><i></i><span>正在等待辅助建议</span></div>
                  <el-empty v-else description="点击客户话语查看对应建议" :image-size="62" />
                </div>
              </div>
              <div v-if="assistDetail?.ticketDraft" class="live-ticket-draft">
                <div class="live-ticket-header">
                  <div>
                    <span class="live-ticket-label">AI 工单草稿</span>
                    <strong>{{ assistDetail.ticketDraft.title || '待确认工单' }}</strong>
                  </div>
                  <el-tag :type="assistDetail.ticketDraft.status === 'CREATED' ? 'success' : 'warning'" effect="plain">
                    {{ assistDetail.ticketDraft.status === 'CREATED' ? '已建单' : '待确认' }}
                  </el-tag>
                </div>
                <p v-if="!ticketDraftEditing">{{ assistDetail.ticketDraft.summary || 'AI 正在根据当前对话补充工单摘要。' }}</p>
                <div class="live-ticket-meta">
                  <span>置信度 {{ Math.round(Number(assistDetail.ticketDraft.confidence || 0) * 100) }}%</span>
                  <span v-if="assistDetail.ticketDraft.missingFields?.length" class="live-ticket-missing">
                    缺少字段：{{ draftMissingFieldNames.join('、') }}
                  </span>
                  <span v-if="assistDetail.ticketDraft.formalTicketId">工单 ID：{{ assistDetail.ticketDraft.formalTicketId }}</span>
                </div>
                <el-collapse-transition>
                  <div v-if="ticketDraftEditing && ticketDraftForm" v-loading="ticketDraftTemplateLoading" class="live-ticket-editor">
                    <el-alert
                      v-if="draftLocalMissingFields.length"
                      type="warning"
                      :closable="false"
                      :title="`请补齐必填字段：${draftLocalMissingFieldNames.join('、')}`"
                    />
                    <el-form label-position="top">
                      <el-form-item label="工单标题" required>
                        <el-input v-model="ticketDraftForm.title" maxlength="256" placeholder="请输入工单标题" />
                      </el-form-item>
                      <el-form-item label="问题摘要">
                        <el-input v-model="ticketDraftForm.summary" type="textarea" :rows="3" maxlength="4000" show-word-limit />
                      </el-form-item>
                      <div class="live-ticket-template-title">
                        <strong>工单字段</strong>
                        <span>{{ ticketDraftTemplate?.templateName || '正在加载模板' }}</span>
                      </div>
                      <el-row :gutter="12">
                        <el-col v-for="field in ticketDraftTemplate?.fields || []" :key="field.fieldCode" :span="field.layoutSpan || 12">
                          <el-form-item :label="field.fieldName" :required="field.required">
                            <el-input
                              v-if="field.fieldType === 'INPUT'"
                              v-model="ticketDraftForm.formData[field.fieldCode]"
                              :placeholder="field.placeholder"
                            />
                            <el-input
                              v-else-if="field.fieldType === 'TEXTAREA'"
                              v-model="ticketDraftForm.formData[field.fieldCode]"
                              type="textarea"
                              :rows="3"
                              :placeholder="field.placeholder"
                            />
                            <el-input-number
                              v-else-if="field.fieldType === 'NUMBER'"
                              v-model="ticketDraftForm.formData[field.fieldCode]"
                              class="w-full"
                            />
                            <file-upload
                              v-else-if="field.fieldType === 'FILE'"
                              v-model="ticketDraftForm.formData[field.fieldCode]"
                              :limit="5"
                              :file-size="20"
                            />
                            <el-date-picker
                              v-else-if="field.fieldType === 'DATE' || field.fieldType === 'DATETIME'"
                              v-model="ticketDraftForm.formData[field.fieldCode]"
                              :type="field.fieldType === 'DATE' ? 'date' : 'datetime'"
                              :value-format="field.fieldType === 'DATE' ? 'YYYY-MM-DD' : 'YYYY-MM-DD HH:mm:ss'"
                              class="w-full"
                            />
                            <el-radio-group v-else-if="field.fieldType === 'RADIO'" v-model="ticketDraftForm.formData[field.fieldCode]">
                              <el-radio v-for="option in field.options || []" :key="option.value" :value="option.value">{{ option.label }}</el-radio>
                            </el-radio-group>
                            <el-checkbox-group v-else-if="field.fieldType === 'CHECKBOX'" v-model="ticketDraftForm.formData[field.fieldCode]">
                              <el-checkbox v-for="option in field.options || []" :key="option.value" :value="option.value">{{
                                option.label
                              }}</el-checkbox>
                            </el-checkbox-group>
                            <el-select
                              v-else
                              v-model="ticketDraftForm.formData[field.fieldCode]"
                              :multiple="field.fieldType === 'MULTI_SELECT'"
                              clearable
                              filterable
                              class="w-full"
                            >
                              <el-option v-for="option in field.options || []" :key="option.value" :label="option.label" :value="option.value" />
                            </el-select>
                          </el-form-item>
                        </el-col>
                      </el-row>
                    </el-form>
                  </div>
                </el-collapse-transition>
                <div v-if="assistDetail.ticketDraft.status !== 'CREATED'" class="live-ticket-actions">
                  <span>{{ ticketDraftEditing ? '坐席修改的字段不会被后续 AI 增量更新覆盖' : '可直接编辑 AI 提取结果后创建工单' }}</span>
                  <div v-if="!ticketDraftEditing">
                    <el-button @click="beginTicketDraftEdit">编辑草稿</el-button>
                    <el-button
                      type="primary"
                      :loading="ticketDraftApproving"
                      :disabled="Boolean(assistDetail.ticketDraft.missingFields?.length)"
                      @click="approveLiveTicketDraft"
                      >确认建单</el-button
                    >
                  </div>
                  <div v-else>
                    <el-button @click="cancelTicketDraftEdit">取消</el-button>
                    <el-button :loading="ticketDraftSaving" @click="saveLiveTicketDraft()">保存草稿</el-button>
                    <el-button type="primary" :loading="ticketDraftApproving" @click="saveAndApproveLiveTicketDraft">保存并建单</el-button>
                  </div>
                </div>
              </div>
            </el-tab-pane>
            <el-tab-pane v-if="businessType === 'CUSTOMER'" label="电话号码" name="phones">
              <div class="phone-toolbar">
                <span class="phone-tip">来电可通过任意启用号码识别客户，外呼默认使用主号码。</span>
                <el-button type="primary" plain @click="openPhoneDialog()">新增号码</el-button>
              </div>
              <el-table :data="customerDetail?.phones || []" size="small">
                <el-table-column label="号码" min-width="138">
                  <template #default="{ row }">
                    <el-button v-if="row.enabled" class="phone-dial-link" link type="primary" title="点击拨打" @click="requestDialPhone(row)">
                      {{ row.phoneNumber }}
                    </el-button>
                    <span v-else class="disabled-phone">{{ row.phoneNumber }}</span>
                  </template>
                </el-table-column>
                <el-table-column label="类型" width="76">
                  <template #default="{ row }">{{ phoneTypeLabel(row.phoneType) }}</template>
                </el-table-column>
                <el-table-column label="标签" min-width="82">
                  <template #default="{ row }">{{ row.phoneLabel || '-' }}</template>
                </el-table-column>
                <el-table-column label="状态" width="72">
                  <template #default="{ row }">
                    <el-tag v-if="row.primaryFlag" size="small">主号码</el-tag>
                    <el-tag v-else-if="!row.enabled" size="small" type="info">停用</el-tag>
                    <span v-else>启用</span>
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="128" fixed="right">
                  <template #default="{ row }">
                    <div class="phone-actions">
                      <el-button link type="primary" @click="openPhoneDialog(row)">编辑</el-button>
                      <el-dropdown v-if="!row.primaryFlag" trigger="click" @command="(command: string) => handlePhoneCommand(command, row)">
                        <el-button link type="primary">更多</el-button>
                        <template #dropdown>
                          <el-dropdown-menu>
                            <el-dropdown-item v-if="row.enabled" command="PRIMARY">设为主号</el-dropdown-item>
                            <el-dropdown-item command="DELETE" divided>删除</el-dropdown-item>
                          </el-dropdown-menu>
                        </template>
                      </el-dropdown>
                    </div>
                  </template>
                </el-table-column>
              </el-table>
            </el-tab-pane>
            <el-tab-pane label="跟进记录" name="followUp">
              <template v-if="businessType === 'CUSTOMER'">
                <el-input v-model="followUpContent" type="textarea" :rows="3" maxlength="2000" show-word-limit placeholder="填写本次跟进内容" />
                <div class="follow-up-actions">
                  <el-button type="primary" :loading="followUpSubmitting" :disabled="!followUpContent.trim()" @click="submitFollowUp">
                    添加跟进
                  </el-button>
                </div>
                <el-timeline v-if="followUps.length">
                  <el-timeline-item v-for="item in followUps" :key="String(item.id)" :timestamp="item.followUpTime" placement="top">
                    <el-card shadow="never">
                      <div class="follow-up-content">{{ item.content }}</div>
                      <div class="follow-up-user">跟进人：{{ item.followUpByName || item.followUpBy || '-' }}</div>
                    </el-card>
                  </el-timeline-item>
                </el-timeline>
                <el-empty v-else description="暂无跟进记录" :image-size="70" />
              </template>
              <el-empty v-else description="工单跟进记录功能待接入" :image-size="70" />
            </el-tab-pane>
            <el-tab-pane label="通话记录" name="calls">
              <div v-if="callRecords.length" class="call-record-list">
                <el-card v-for="item in callRecords" :key="String(item.id)" class="call-record-item" shadow="never">
                  <div class="call-record-header">
                    <el-tag :type="item.direction === 'INBOUND' ? 'success' : item.direction === 'OUTBOUND' ? 'primary' : 'info'">
                      {{ directionLabel(item.direction) }}
                    </el-tag>
                    <span>{{ item.startedAt || '-' }}</span>
                  </div>
                  <div class="call-record-number">{{ item.callerNumber || '-' }} → {{ item.calledNumber || '-' }}</div>
                  <div class="call-record-meta">
                    <span>坐席分机：{{ item.agentExtension || '-' }}</span>
                    <span>通话时长：{{ formatDuration(item.billableSeconds) }}</span>
                    <span>挂断原因：{{ hangupCauseLabel(item.hangupCause) }}</span>
                  </div>
                  <audio v-if="item.recordingUrl" class="call-record-audio" :src="item.recordingUrl" controls preload="metadata" />
                </el-card>
              </div>
              <el-empty v-else description="暂无通话记录" :image-size="70" />
            </el-tab-pane>
          </el-tabs>
        </div>
      </div>
    </div>
    <template v-if="$slots.footer" #footer>
      <slot name="footer" :detail="detail" :reload="loadDetail" />
    </template>
  </component>
  <el-dialog v-model="phoneDialogVisible" :title="editingPhone ? '编辑电话号码' : '新增电话号码'" width="520px" append-to-body>
    <el-form label-width="82px">
      <el-form-item label="电话号码" required>
        <el-input v-model="phoneForm.phoneNumber" placeholder="请输入手机、座机或其他可呼叫号码" />
      </el-form-item>
      <el-form-item label="号码类型">
        <el-select v-model="phoneForm.phoneType" style="width: 100%">
          <el-option label="手机" value="MOBILE" />
          <el-option label="家庭电话" value="HOME" />
          <el-option label="工作电话" value="WORK" />
          <el-option label="其他" value="OTHER" />
        </el-select>
      </el-form-item>
      <el-form-item label="号码标签">
        <el-input v-model="phoneForm.phoneLabel" maxlength="32" placeholder="例如：本人、公司前台、家属" />
      </el-form-item>
      <el-form-item label="启用">
        <el-switch v-model="phoneForm.enabled" :disabled="Boolean(editingPhone?.primaryFlag)" />
      </el-form-item>
      <el-form-item label="主号码">
        <el-switch v-model="phoneForm.primaryFlag" :disabled="Boolean(editingPhone?.primaryFlag)" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="phoneDialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="phoneSubmitting" @click="submitPhone">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import {
  addCustomerFollowUp,
  addCustomerPhone,
  CustomerFollowUpVO,
  CustomerPhoneForm,
  CustomerPhoneVO,
  CustomerVO,
  deleteCustomerPhone,
  getCustomer,
  listCustomerFollowUps,
  setCustomerPrimaryPhone,
  updateCustomerPhone
} from '@/api/callcenter/customer';
import { ElDialog, ElDrawer, ElMessage, ElMessageBox } from 'element-plus';
import { getFormTemplate, listFormTemplates } from '@/api/callcenter/form-template';
import { FormBusinessType, FormField, FormTemplate } from '@/api/callcenter/form-template/types';
import { getTicket, TicketVO } from '@/api/callcenter/ticket';
import { listCallRecords } from '@/api/callcenter/call-record';
import { hangupCauseLabel } from '@/api/callcenter/call-record/display';
import { CallDirection, CallRecordVO } from '@/api/callcenter/call-record/types';
import { useAgentDialBus } from '@/composables/useAgentDial';
import {
  approveAgentAssistTicketDraft,
  getAgentAssist,
  regenerateAgentAssistSuggestion,
  streamAgentAssist,
  updateAgentAssistTicketDraft
} from '@/api/callcenter/agent-assist';
import type { AgentAssistDetailVO, AgentAssistSuggestionVO } from '@/api/callcenter/agent-assist/types';
import type { AiCallTranscriptSegmentVO } from '@/api/callcenter/ai-speech/types';
import type { AiTicketDraftVO } from '@/api/callcenter/ai-ticket-draft';

const props = defineProps<{ businessType: FormBusinessType; businessId?: string | number; businessCallId?: string }>();
const visible = defineModel<boolean>({ default: false });
const loading = ref(false);
const detail = ref<CustomerVO | TicketVO>();
const template = ref<FormTemplate>();
const followUps = ref<CustomerFollowUpVO[]>([]);
const followUpContent = ref('');
const followUpSubmitting = ref(false);
const callRecords = ref<CallRecordVO[]>([]);
const activeTab = ref('followUp');
const assistDetail = ref<AgentAssistDetailVO>();
const assistConnected = ref(false);
const ticketDraftApproving = ref(false);
const ticketDraftSaving = ref(false);
const ticketDraftEditing = ref(false);
const ticketDraftForm = ref<AiTicketDraftVO>();
const ticketDraftTemplate = ref<FormTemplate>();
const ticketDraftTemplateLoading = ref(false);
const selectedAssistSegmentId = ref<string | number>();
const assistTranscriptRef = ref<HTMLElement>();
const sidePanelScrolling = ref(false);
const phoneDialogVisible = ref(false);
const phoneSubmitting = ref(false);
const editingPhone = ref<CustomerPhoneVO>();
const phoneForm = reactive<CustomerPhoneForm>({
  phoneNumber: '',
  phoneType: 'MOBILE',
  phoneLabel: '',
  primaryFlag: false,
  enabled: true,
  sortOrder: 0
});
let scrollTimer: ReturnType<typeof setTimeout> | undefined;
let assistStreamController: AbortController | undefined;
let assistReconnectTimer: ReturnType<typeof setTimeout> | undefined;
let assistStreamCallId = '';
const customerDetail = computed(() => (props.businessType === 'CUSTOMER' ? (detail.value as CustomerVO | undefined) : undefined));
const ticketDetail = computed(() => (props.businessType === 'TICKET' ? (detail.value as TicketVO | undefined) : undefined));
const agentDialBus = useAgentDialBus();
const businessCallId = computed(() => props.businessCallId?.trim() || '');
const assistSegments = computed(() => assistDetail.value?.transcriptSegments || []);
const selectedCustomerSegment = computed(() =>
  assistSegments.value.find((item) => String(item.id) === String(selectedAssistSegmentId.value) && item.speaker === 'CUSTOMER')
);
const selectedSuggestion = computed(() =>
  assistDetail.value?.suggestions.find((item) => String(item.transcriptSegmentId) === String(selectedAssistSegmentId.value))
);
const draftFieldName = (code: string) => ticketDraftTemplate.value?.fields.find((field) => field.fieldCode === code)?.fieldName || code;
const draftMissingFieldNames = computed(() => (assistDetail.value?.ticketDraft?.missingFields || []).map(draftFieldName));
const emptyDraftValue = (value: unknown) =>
  value === null || value === undefined || (typeof value === 'string' && !value.trim()) || (Array.isArray(value) && !value.length);
const draftLocalMissingFields = computed(() =>
  (ticketDraftTemplate.value?.fields || [])
    .filter((field) => field.required && emptyDraftValue(ticketDraftForm.value?.formData?.[field.fieldCode]))
    .map((field) => field.fieldCode)
);
const draftLocalMissingFieldNames = computed(() => draftLocalMissingFields.value.map(draftFieldName));

const assistSpeakerLabel = (speaker?: string) => ({ CUSTOMER: '客户', AGENT: '坐席', AI: 'AI' })[speaker || ''] || '通话方';
const assistSourceLabel = (source?: string) => {
  if (!source) return '';
  if (source.startsWith('FAQ')) return 'FAQ';
  if (source === 'DOCUMENT') return '知识文档';
  if (source === 'MODEL') return '模型建议';
  return source;
};

const chooseLatestCustomerSegment = () => {
  const customers = assistSegments.value.filter((item) => item.speaker === 'CUSTOMER');
  if (!customers.length) return;
  const selectedStillExists = customers.some((item) => String(item.id) === String(selectedAssistSegmentId.value));
  if (!selectedStillExists || selectedAssistSegmentId.value === undefined) {
    selectedAssistSegmentId.value = customers[customers.length - 1].id;
  }
};

const loadAssist = async () => {
  if (!businessCallId.value) {
    assistDetail.value = undefined;
    return;
  }
  const nextDetail = (await getAgentAssist(businessCallId.value)).data;
  const previousDraftId = assistDetail.value?.ticketDraft?.id;
  assistDetail.value = nextDetail;
  const draft = nextDetail.ticketDraft;
  if (draft?.ticketTemplateId != null) await loadTicketDraftTemplate(draft.ticketTemplateId);
  if (!draft || draft.status === 'CREATED' || (ticketDraftEditing.value && String(previousDraftId) !== String(draft.id))) {
    cancelTicketDraftEdit();
  }
  chooseLatestCustomerSegment();
  await nextTick();
  assistTranscriptRef.value?.scrollTo({ top: assistTranscriptRef.value.scrollHeight, behavior: 'smooth' });
};

const selectAssistSegment = (segment: AiCallTranscriptSegmentVO) => {
  if (segment.speaker === 'CUSTOMER') selectedAssistSegmentId.value = segment.id;
};

const copySuggestion = async (content?: string) => {
  if (!content) return;
  await navigator.clipboard.writeText(content);
  ElMessage.success('建议话术已复制');
};

const regenerateSuggestion = async (suggestion: AgentAssistSuggestionVO) => {
  if (!businessCallId.value) return;
  await regenerateAgentAssistSuggestion(businessCallId.value, suggestion.id);
  await loadAssist();
};

const loadTicketDraftTemplate = async (templateId: string | number) => {
  if (String(ticketDraftTemplate.value?.id) === String(templateId)) return;
  ticketDraftTemplateLoading.value = true;
  try {
    ticketDraftTemplate.value = (await getFormTemplate(templateId)).data;
  } finally {
    ticketDraftTemplateLoading.value = false;
  }
};

const cloneTicketDraft = (draft: AiTicketDraftVO): AiTicketDraftVO => ({
  ...draft,
  formData: JSON.parse(JSON.stringify(draft.formData || {}))
});

const normalizeDraftCollectionFields = () => {
  if (!ticketDraftForm.value) return;
  for (const field of ticketDraftTemplate.value?.fields || []) {
    if (['CHECKBOX', 'MULTI_SELECT'].includes(field.fieldType) && !Array.isArray(ticketDraftForm.value.formData[field.fieldCode])) {
      ticketDraftForm.value.formData[field.fieldCode] = [];
    }
  }
};

const beginTicketDraftEdit = async () => {
  const draft = assistDetail.value?.ticketDraft;
  if (!draft || draft.status === 'CREATED') return;
  await loadTicketDraftTemplate(draft.ticketTemplateId);
  ticketDraftForm.value = cloneTicketDraft(draft);
  normalizeDraftCollectionFields();
  ticketDraftEditing.value = true;
};

const cancelTicketDraftEdit = () => {
  ticketDraftEditing.value = false;
  ticketDraftForm.value = undefined;
};

const saveLiveTicketDraft = async (showMessage = true) => {
  const draft = ticketDraftForm.value;
  if (!draft || !businessCallId.value) return undefined;
  if (!draft.title?.trim()) {
    ElMessage.warning('请填写工单标题');
    return undefined;
  }
  ticketDraftSaving.value = true;
  try {
    const response = await updateAgentAssistTicketDraft(businessCallId.value, draft.id, {
      version: draft.version,
      title: draft.title.trim(),
      summary: draft.summary?.trim(),
      formData: draft.formData
    });
    const saved = response.data;
    if (assistDetail.value) assistDetail.value.ticketDraft = saved;
    ticketDraftForm.value = cloneTicketDraft(saved);
    normalizeDraftCollectionFields();
    if (showMessage) ElMessage.success('工单草稿已保存');
    return saved;
  } finally {
    ticketDraftSaving.value = false;
  }
};

const saveAndApproveLiveTicketDraft = async () => {
  if (draftLocalMissingFields.value.length) {
    ElMessage.warning(`请先补齐必填字段：${draftLocalMissingFieldNames.value.join('、')}`);
    return;
  }
  await ElMessageBox.confirm('确认保存当前内容并创建正式工单吗？', '确认建单', { type: 'warning' });
  ticketDraftApproving.value = true;
  try {
    const saved = await saveLiveTicketDraft(false);
    if (!saved || !businessCallId.value) return;
    await approveAgentAssistTicketDraft(businessCallId.value, saved.id, saved.version);
    ElMessage.success('正式工单已创建');
    cancelTicketDraftEdit();
    await Promise.all([loadAssist(), loadDetail()]);
  } finally {
    ticketDraftApproving.value = false;
  }
};

const approveLiveTicketDraft = async () => {
  const draft = assistDetail.value?.ticketDraft;
  if (!draft || !businessCallId.value || draft.missingFields?.length) return;
  await ElMessageBox.confirm('确认使用当前 AI 草稿创建正式工单吗？', '确认建单', { type: 'warning' });
  ticketDraftApproving.value = true;
  try {
    await approveAgentAssistTicketDraft(businessCallId.value, draft.id, draft.version);
    ElMessage.success('正式工单已创建');
    await Promise.all([loadAssist(), loadDetail()]);
  } finally {
    ticketDraftApproving.value = false;
  }
};

const stopAssistStream = () => {
  if (assistReconnectTimer) clearTimeout(assistReconnectTimer);
  assistReconnectTimer = undefined;
  assistStreamController?.abort();
  assistStreamController = undefined;
  assistStreamCallId = '';
  assistConnected.value = false;
};

const startAssistStream = () => {
  stopAssistStream();
  const callId = businessCallId.value;
  if (!callId || !visible.value) return;
  assistStreamCallId = callId;
  const connect = () => {
    if (assistStreamCallId !== callId || !visible.value) return;
    const controller = new AbortController();
    assistStreamController = controller;
    streamAgentAssist(
      callId,
      (event) => {
        if (event === 'connected') assistConnected.value = true;
        if (event === 'segment' || event === 'suggestion' || event === 'ticket-draft') void loadAssist();
      },
      controller.signal
    )
      .catch((error) => {
        if (error?.name !== 'AbortError') console.warn('Agent assist stream disconnected', error);
      })
      .finally(() => {
        assistConnected.value = false;
        if (controller.signal.aborted || assistStreamCallId !== callId || !visible.value) return;
        assistReconnectTimer = setTimeout(connect, 1500);
      });
  };
  connect();
};

const displayValue = (value: unknown, field?: FormField) => {
  if (value === null || value === undefined || value === '') return '-';
  const displayItem = (item: unknown) => field?.options.find((option) => String(option.value) === String(item))?.label || String(item);
  return Array.isArray(value) ? value.map(displayItem).join('、') : displayItem(value);
};
const customFields = computed(() => {
  const formData = detail.value?.formData || {};
  return (template.value?.fields || []).map((field) => ({
    code: field.fieldCode,
    label: field.fieldName,
    value: displayValue(formData[field.fieldCode], field),
    rawValue: formData[field.fieldCode],
    fieldType: field.fieldType,
    layoutSpan: field.layoutSpan || 12
  }));
});
const phoneTypeLabel = (type?: string) => ({ MOBILE: '手机', HOME: '家庭', WORK: '工作', OTHER: '其他' })[type || 'OTHER'] || '其他';

const openPhoneDialog = (phone?: CustomerPhoneVO) => {
  editingPhone.value = phone;
  phoneForm.phoneNumber = phone?.phoneNumber || '';
  phoneForm.phoneType = phone?.phoneType || 'MOBILE';
  phoneForm.phoneLabel = phone?.phoneLabel || '';
  phoneForm.primaryFlag = Boolean(phone?.primaryFlag);
  phoneForm.enabled = phone?.enabled ?? true;
  phoneForm.sortOrder = phone?.sortOrder || 0;
  phoneDialogVisible.value = true;
};

const submitPhone = async () => {
  if (!props.businessId || !phoneForm.phoneNumber.trim()) {
    ElMessage.warning('电话号码不能为空');
    return;
  }
  phoneSubmitting.value = true;
  try {
    if (editingPhone.value) {
      await updateCustomerPhone(props.businessId, editingPhone.value.id, { ...phoneForm });
    } else {
      await addCustomerPhone(props.businessId, { ...phoneForm });
    }
    ElMessage.success(editingPhone.value ? '电话号码已更新' : '电话号码已添加');
    phoneDialogVisible.value = false;
    await loadDetail();
  } finally {
    phoneSubmitting.value = false;
  }
};

const makePrimaryPhone = async (phone: CustomerPhoneVO) => {
  if (!props.businessId) return;
  await setCustomerPrimaryPhone(props.businessId, phone.id);
  ElMessage.success('主号码已更新');
  await loadDetail();
};

const removePhone = async (phone: CustomerPhoneVO) => {
  if (!props.businessId) return;
  await ElMessageBox.confirm(`确认删除电话号码 ${phone.phoneNumber}？`, '删除电话号码', { type: 'warning' });
  await deleteCustomerPhone(props.businessId, phone.id);
  ElMessage.success('电话号码已删除');
  await loadDetail();
};

const handlePhoneCommand = async (command: string, phone: CustomerPhoneVO) => {
  if (command === 'PRIMARY') {
    await makePrimaryPhone(phone);
    return;
  }
  if (command === 'DELETE') await removePhone(phone);
};

const requestDialPhone = async (phone: CustomerPhoneVO) => {
  if (!phone.enabled) return;
  try {
    await ElMessageBox.confirm(`确认拨打 ${phone.phoneNumber}？`, '拨打客户电话', {
      type: 'info',
      confirmButtonText: '立即拨打',
      cancelButtonText: '取消'
    });
  } catch {
    return;
  }
  agentDialBus.emit({
    destination: phone.phoneNumber,
    customerId: props.businessId,
    source: 'CUSTOMER_DETAIL'
  });
};

const loadFollowUps = async () => {
  if (props.businessType !== 'CUSTOMER' || !props.businessId) return;
  followUps.value = (await listCustomerFollowUps(props.businessId)).data;
};
const loadCallRecords = async () => {
  if (!props.businessId) {
    callRecords.value = [];
    return;
  }
  const explicitQuery =
    props.businessType === 'CUSTOMER'
      ? { pageNum: 1, pageSize: 100, customerId: props.businessId }
      : { pageNum: 1, pageSize: 100, ticketId: props.businessId };
  callRecords.value = (await listCallRecords(explicitQuery)).rows;
  if (callRecords.value.length) return;
  const participantNumbers =
    props.businessType === 'CUSTOMER'
      ? (customerDetail.value?.phones || []).map((phone) => phone.normalizedPhone || phone.phoneNumber)
      : [ticketDetail.value?.callerNumber];
  const numbers = [...new Set(participantNumbers.filter(Boolean))] as string[];
  if (!numbers.length && customerDetail.value?.primaryPhone) numbers.push(customerDetail.value.primaryPhone);
  if (!numbers.length) return;
  const fallbackRecords = await Promise.all(numbers.map((participantNumber) => listCallRecords({ pageNum: 1, pageSize: 100, participantNumber })));
  callRecords.value = [...new Map(fallbackRecords.flatMap((response) => response.rows).map((record) => [String(record.id), record])).values()].sort(
    (left, right) => String(right.startedAt || '').localeCompare(String(left.startedAt || ''))
  );
};
const directionLabel = (direction: CallDirection) =>
  ({ INBOUND: '呼入', OUTBOUND: '呼出', INTERNAL: '内部通话', UNKNOWN: '未知' })[direction] || direction;
const ticketStatusLabel = (status?: string) =>
  ({ OPEN: '待处理', PROCESSING: '处理中', RESOLVED: '已解决', CLOSED: '已关闭' })[status || ''] || status || '-';
const processStatusLabel = (status?: string) =>
  (
    ({
      draft: '未提交',
      waiting: '流转中',
      back: '已退回',
      cancel: '已撤销',
      finish: '已完成',
      invalid: '已作废',
      termination: '已终止'
    }) as Record<string, string>
  )[status || ''] || '-';
const formatDuration = (seconds?: number) => {
  const value = Math.max(0, seconds || 0);
  const minutes = Math.floor(value / 60);
  const remainSeconds = value % 60;
  return minutes > 0 ? `${minutes}分${remainSeconds}秒` : `${remainSeconds}秒`;
};
const submitFollowUp = async () => {
  if (!props.businessId || !followUpContent.value.trim()) return;
  followUpSubmitting.value = true;
  try {
    await addCustomerFollowUp(props.businessId, followUpContent.value.trim());
    followUpContent.value = '';
    await Promise.all([loadFollowUps(), loadCallRecords()]);
    ElMessage.success('跟进记录已添加');
  } finally {
    followUpSubmitting.value = false;
  }
};

const loadDetail = async () => {
  if (!props.businessId) return;
  loading.value = true;
  try {
    detail.value = props.businessType === 'CUSTOMER' ? (await getCustomer(props.businessId)).data : (await getTicket(props.businessId)).data;
    const templates = (await listFormTemplates(props.businessType)).data;
    template.value = templates.find((item) => String(item.id) === String(detail.value?.templateId));
    followUpContent.value = '';
    activeTab.value = businessCallId.value ? 'assist' : 'followUp';
    await Promise.all([loadFollowUps(), loadCallRecords(), loadAssist()]);
  } finally {
    loading.value = false;
  }
};

watch(visible, async (opened) => {
  if (!opened) {
    stopAssistStream();
    cancelTicketDraftEdit();
    return;
  }
  await loadDetail();
  startAssistStream();
});

watch(businessCallId, async (callId) => {
  if (!visible.value) return;
  if (callId) activeTab.value = 'assist';
  await loadAssist();
  startAssistStream();
});

const handleSideScroll = () => {
  sidePanelScrolling.value = true;
  clearTimeout(scrollTimer);
  scrollTimer = setTimeout(() => {
    sidePanelScrolling.value = false;
  }, 200);
};

onBeforeUnmount(() => {
  clearTimeout(scrollTimer);
  stopAssistStream();
});

defineExpose({ reload: loadDetail });
</script>

<style scoped lang="scss">
.detail-container {
  display: flex;
  gap: 18px;
}

.detail-container.customer-layout {
  height: calc(100dvh - 102px);
  min-height: 0;
  align-items: stretch;
}

.detail-container.assist-active {
  .detail-left {
    flex: 8;
  }

  .detail-right {
    flex: 16;
  }
}

:deep(.customer-detail-drawer .el-drawer__body) {
  padding: 16px 20px 20px;
  overflow: hidden;
  background: linear-gradient(180deg, #f7faff 0%, #ffffff 28%);
}

.detail-left {
  flex: 14;
  min-width: 0;
}

.customer-layout .detail-left {
  padding-right: 4px;
  overflow-y: auto;
}

.detail-right {
  flex: 10;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.assist-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;

  > div {
    display: grid;
    gap: 3px;
  }

  strong {
    color: #17345f;
    font-size: 15px;
  }

  span {
    color: #8391a7;
    font-size: 12px;
  }
}

.assist-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(260px, 0.75fr);
  gap: 12px;
  min-height: 410px;
}

.assist-transcript,
.assist-recommendation {
  min-width: 0;
  border: 1px solid #e3eaf4;
  border-radius: 12px;
  background: #f7f9fc;
}

.assist-transcript {
  max-height: 520px;
  overflow-y: auto;
  padding: 12px;
}

.assist-dialogue-list {
  display: grid;
  gap: 10px;
}

.assist-dialogue-item {
  display: grid;
  width: min(82%, 560px);
  padding: 9px 12px;
  border: 1px solid transparent;
  border-radius: 12px;
  color: #243552;
  font: inherit;
  text-align: left;
  cursor: default;
  background: #fff;
  transition:
    border-color 0.16s ease,
    box-shadow 0.16s ease;

  &.speaker-customer {
    cursor: pointer;
  }

  &.speaker-agent,
  &.speaker-ai {
    justify-self: end;
    background: #edf6ff;
  }

  &.selected {
    border-color: #5c9ee8;
    box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.1);
  }
}

.assist-speaker {
  margin-bottom: 3px;
  color: #8190a6;
  font-size: 11px;
}

.assist-text {
  overflow-wrap: anywhere;
  font-size: 13px;
  line-height: 1.65;
}

.assist-recommendation {
  align-self: start;
  min-height: 210px;
  padding: 14px;
  background: linear-gradient(155deg, #f6fbff, #eef6ff);
}

.recommendation-title,
.recommendation-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.live-ticket-draft {
  margin-top: 12px;
  padding: 14px 16px;
  border: 1px solid #d9e7fb;
  border-radius: 12px;
  background: linear-gradient(135deg, #f7fbff, #eef6ff);

  p {
    margin: 10px 0;
    color: #46566f;
    font-size: 12px;
    line-height: 1.7;
    white-space: pre-wrap;
  }
}

.live-ticket-header,
.live-ticket-actions,
.live-ticket-meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.live-ticket-header {
  justify-content: space-between;

  > div {
    display: grid;
    gap: 3px;
  }

  strong {
    color: #1d2c45;
    font-size: 14px;
  }
}

.live-ticket-label,
.live-ticket-meta,
.live-ticket-actions {
  color: #7b899d;
  font-size: 11px;
}

.live-ticket-meta {
  flex-wrap: wrap;
}

.live-ticket-missing {
  color: #d97706;
}

.live-ticket-actions {
  justify-content: space-between;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid #dce8f8;

  > div {
    display: flex;
    gap: 8px;
  }
}

.live-ticket-editor {
  max-height: 520px;
  margin-top: 12px;
  padding: 14px;
  overflow-y: auto;
  border: 1px solid #dce8f8;
  border-radius: 10px;
  background: #fff;

  :deep(.el-form-item) {
    margin-bottom: 14px;
  }

  :deep(.el-form-item__label) {
    color: #53637a;
    font-size: 12px;
  }
}

.live-ticket-template-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 4px 0 12px;
  padding-top: 12px;
  border-top: 1px solid #edf1f6;

  strong {
    color: #27364d;
    font-size: 13px;
  }

  span {
    color: #8391a7;
    font-size: 11px;
  }
}

.w-full {
  width: 100%;
}

.recommendation-title {
  color: #17345f;
  font-size: 14px;
  font-weight: 700;
}

.recommendation-content {
  margin-top: 12px;
  padding: 12px;
  border-radius: 10px;
  color: #1d3557;
  font-size: 13px;
  line-height: 1.75;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  background: #fff;
  box-shadow: 0 6px 18px rgba(45, 96, 158, 0.08);
}

.recommendation-actions {
  justify-content: flex-end;
  margin-top: 8px;
  color: #97a3b6;
  font-size: 11px;
}

.assist-thinking,
.assist-failed {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 120px;
  color: #7d899b;
  font-size: 12px;
}

.assist-thinking i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #aeb8c7;
  animation: assist-dot 1.1s ease-in-out infinite;

  &:nth-child(2) {
    animation-delay: 0.14s;
  }

  &:nth-child(3) {
    animation-delay: 0.28s;
    margin-right: 4px;
  }
}

@keyframes assist-dot {
  0%,
  100% {
    transform: translateY(1px);
    opacity: 0.45;
  }
  50% {
    transform: translateY(-4px);
    opacity: 1;
  }
}

@media (max-width: 1080px) {
  .assist-workspace {
    grid-template-columns: 1fr;
  }
}

.customer-hero {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 14px;
  padding: 14px 16px;
  border: 1px solid #dce8f8;
  border-radius: 14px;
  background: radial-gradient(circle at 100% 0%, rgba(56, 189, 248, 0.16), transparent 42%), linear-gradient(135deg, #f4f9ff, #eef5ff);
}

.customer-avatar {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  color: #fff;
  font-size: 18px;
  font-weight: 700;
  border-radius: 14px;
  background: linear-gradient(145deg, #38bdf8, #2563eb);
  box-shadow: 0 8px 16px rgba(37, 99, 235, 0.22);
}

.customer-hero-copy {
  display: grid;
  gap: 4px;
  min-width: 0;
  flex: 1;

  strong {
    overflow: hidden;
    color: #15233d;
    font-size: 16px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  small {
    color: #6b7c94;
    font-size: 12px;
  }
}

.detail-summary {
  overflow: hidden;
  border-radius: 12px;
}

.detail-summary :deep(.el-descriptions__label) {
  width: 92px;
  color: #5b6b82;
  font-weight: 600;
  background: #f5f8fc;
}

.detail-summary :deep(.el-descriptions__content) {
  color: #24324c;
  font-weight: 500;
}

.custom-detail {
  padding: 14px;
  margin-top: 16px;
  border: 1px solid #dce8f8;
  border-radius: 12px;
  background: linear-gradient(180deg, #ffffff, #f8fbff);
}

.custom-field {
  min-height: 60px;
  padding: 10px 12px;
  margin-bottom: 10px;
  border: 1px solid #e4eaf3;
  border-radius: 10px;
  background: #fff;
  transition:
    border-color 0.16s ease,
    box-shadow 0.16s ease;
}

.custom-field:hover {
  border-color: #c9dbf8;
  box-shadow: 0 6px 14px rgba(37, 99, 235, 0.06);
}

.custom-field-label {
  margin-bottom: 6px;
  font-size: 12px;
  color: #7b8798;
}

.custom-field-value {
  font-size: 13px;
  line-height: 20px;
  color: #24324c;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.section-title {
  margin-bottom: 12px;
  color: #15233d;
  font-weight: 700;
}

.side-panel {
  height: 100%;
  padding: 0 14px 14px;
  border: 1px solid #dce8f8;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 10px 24px rgba(28, 48, 78, 0.05);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 240px;

  :deep(.el-tabs__header) {
    margin: 0 0 12px;
  }

  :deep(.el-tabs__item) {
    font-weight: 600;
  }

  :deep(.el-tabs) {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  :deep(.el-tabs__content) {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    scrollbar-color: transparent transparent;
    scrollbar-width: thin;

    &::-webkit-scrollbar {
      width: 6px;
    }

    &::-webkit-scrollbar-thumb {
      border-radius: 6px;
      background: transparent;
    }
  }

  :deep(.el-tab-pane) {
    height: 100%;
  }

  &.is-scrolling :deep(.el-tabs__content) {
    scrollbar-color: #c0c4cc transparent;

    &::-webkit-scrollbar-thumb {
      background: #c0c4cc;
    }
  }
}

.follow-up-actions {
  margin: 10px 0 18px;
  text-align: right;
}

.phone-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  padding: 10px 12px;
  border: 1px solid #e8eef6;
  border-radius: 10px;
  background: #f7faff;
}

.phone-tip {
  color: #7b8798;
  font-size: 12px;
  line-height: 18px;
}

.disabled-phone {
  color: #a8abb2;
  text-decoration: line-through;
}

.phone-dial-link {
  height: auto;
  padding: 0;
  font-weight: 600;
}

.phone-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  white-space: nowrap;

  :deep(.el-button + .el-button) {
    margin-left: 0;
  }
}

.follow-up-content {
  white-space: pre-line;
  line-height: 1.8;
  overflow-wrap: anywhere;
  color: #24324c;
}

.follow-up-user {
  margin-top: 8px;
  font-size: 12px;
  color: #7b8798;
}

:deep(.el-timeline-item__timestamp) {
  color: #8b97aa;
}

:deep(.el-timeline .el-card) {
  border: 1px solid #e8eef6;
  border-radius: 12px;
  background: #fafcff;
  box-shadow: none;
}

.call-record-item {
  margin-bottom: 12px;
  border: 1px solid #e8eef6;
  border-radius: 12px;
  background: #fafcff;
}

.call-record-item :deep(.el-card__body) {
  padding: 14px;
}

.call-record-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #7b8798;
  font-size: 12px;
}

.call-record-number {
  margin: 12px 0;
  color: #15233d;
  font-size: 16px;
  font-weight: 700;
}

.call-record-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: #5f6e86;
  font-size: 13px;
}

.call-record-audio {
  width: 100%;
  height: 34px;
  margin-top: 12px;
}

.el-timeline.is-start {
  padding-left: 20px;
  padding-right: 20px;
}

@media (max-width: 900px) {
  .detail-container {
    flex-direction: column;
  }

  .side-panel {
    height: auto !important;
    max-height: 560px;
  }
}
</style>
