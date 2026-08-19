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
    <div v-loading="loading" class="detail-container">
      <div ref="leftPanelRef" class="detail-left">
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
                <file-upload
                  v-if="field.fieldType === 'FILE' && field.rawValue"
                  :model-value="field.rawValue"
                  :is-show-tip="false"
                  disabled
                />
                <div v-else class="custom-field-value">{{ field.value }}</div>
              </div>
            </el-col>
          </el-row>
        </div>
      </div>

      <div class="detail-right">
        <div
          class="side-panel"
          :class="{ 'is-scrolling': sidePanelScrolling }"
          :style="{ height: rightPanelHeight }"
          @scroll.capture="handleSideScroll"
        >
          <el-tabs v-model="activeTab">
            <el-tab-pane v-if="businessType === 'CUSTOMER'" label="电话号码" name="phones">
              <div class="phone-toolbar">
                <span class="phone-tip">来电可通过任意启用号码识别客户，外呼默认使用主号码。</span>
                <el-button type="primary" plain @click="openPhoneDialog()">新增号码</el-button>
              </div>
              <el-table :data="customerDetail?.phones || []" size="small">
                <el-table-column label="号码" min-width="138">
                  <template #default="{ row }">
                    <el-button
                      v-if="row.enabled"
                      class="phone-dial-link"
                      link
                      type="primary"
                      title="点击拨打"
                      @click="requestDialPhone(row)"
                    >
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
                      <el-dropdown
                        v-if="!row.primaryFlag"
                        trigger="click"
                        @command="(command: string) => handlePhoneCommand(command, row)"
                      >
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
import { listFormTemplates } from '@/api/callcenter/form-template';
import { FormBusinessType, FormField, FormTemplate } from '@/api/callcenter/form-template/types';
import { getTicket, TicketVO } from '@/api/callcenter/ticket';
import { listCallRecords } from '@/api/callcenter/call-record';
import { hangupCauseLabel } from '@/api/callcenter/call-record/display';
import { CallDirection, CallRecordVO } from '@/api/callcenter/call-record/types';
import { useAgentDialBus } from '@/composables/useAgentDial';

const props = defineProps<{ businessType: FormBusinessType; businessId?: string | number }>();
const visible = defineModel<boolean>({ default: false });
const loading = ref(false);
const detail = ref<CustomerVO | TicketVO>();
const template = ref<FormTemplate>();
const followUps = ref<CustomerFollowUpVO[]>([]);
const followUpContent = ref('');
const followUpSubmitting = ref(false);
const callRecords = ref<CallRecordVO[]>([]);
const activeTab = ref('followUp');
const leftPanelRef = ref<HTMLElement>();
const rightPanelHeight = ref('');
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
let leftPanelObserver: ResizeObserver | undefined;
let scrollTimer: ReturnType<typeof setTimeout> | undefined;
const customerDetail = computed(() => (props.businessType === 'CUSTOMER' ? (detail.value as CustomerVO | undefined) : undefined));
const ticketDetail = computed(() => (props.businessType === 'TICKET' ? (detail.value as TicketVO | undefined) : undefined));
const agentDialBus = useAgentDialBus();

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
  const fallbackRecords = await Promise.all(
    numbers.map((participantNumber) => listCallRecords({ pageNum: 1, pageSize: 100, participantNumber }))
  );
  callRecords.value = [...new Map(fallbackRecords.flatMap((response) => response.rows).map((record) => [String(record.id), record])).values()]
    .sort((left, right) => String(right.startedAt || '').localeCompare(String(left.startedAt || '')));
};
const directionLabel = (direction: CallDirection) =>
  ({ INBOUND: '呼入', OUTBOUND: '呼出', INTERNAL: '内部通话', UNKNOWN: '未知' })[direction] || direction;
const ticketStatusLabel = (status?: string) =>
  ({ OPEN: '待处理', PROCESSING: '处理中', RESOLVED: '已解决', CLOSED: '已关闭' })[status || ''] || status || '-';
const processStatusLabel = (status?: string) =>
  (
    {
      draft: '未提交',
      waiting: '流转中',
      back: '已退回',
      cancel: '已撤销',
      finish: '已完成',
      invalid: '已作废',
      termination: '已终止'
    } as Record<string, string>
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
    activeTab.value = 'followUp';
    await Promise.all([loadFollowUps(), loadCallRecords()]);
    await nextTick();
    updateRightPanelHeight();
  } finally {
    loading.value = false;
  }
};

watch(visible, async (opened) => {
  if (!opened) return;
  await loadDetail();
});

const updateRightPanelHeight = () => {
  if (!leftPanelRef.value) return;
  rightPanelHeight.value = `${leftPanelRef.value.offsetHeight}px`;
};

const handleSideScroll = () => {
  sidePanelScrolling.value = true;
  clearTimeout(scrollTimer);
  scrollTimer = setTimeout(() => {
    sidePanelScrolling.value = false;
  }, 200);
};

onMounted(() => {
  leftPanelObserver = new ResizeObserver(updateRightPanelHeight);
  watch(
    leftPanelRef,
    (element) => {
      leftPanelObserver?.disconnect();
      if (element) leftPanelObserver?.observe(element);
      updateRightPanelHeight();
    },
    { immediate: true }
  );
});

onBeforeUnmount(() => {
  leftPanelObserver?.disconnect();
  clearTimeout(scrollTimer);
});

defineExpose({ reload: loadDetail });
</script>

<style scoped lang="scss">
.detail-container {
  display: flex;
  gap: 18px;
}

:deep(.customer-detail-drawer .el-drawer__body) {
  padding: 16px 20px 20px;
  overflow-y: auto;
  background: linear-gradient(180deg, #f7faff 0%, #ffffff 28%);
}

.detail-left {
  flex: 14;
  min-width: 0;
}

.detail-right {
  flex: 10;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.customer-hero {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 14px;
  padding: 14px 16px;
  border: 1px solid #dce8f8;
  border-radius: 14px;
  background:
    radial-gradient(circle at 100% 0%, rgba(56, 189, 248, 0.16), transparent 42%),
    linear-gradient(135deg, #f4f9ff, #eef5ff);
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
  transition: border-color 0.16s ease, box-shadow 0.16s ease;
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
