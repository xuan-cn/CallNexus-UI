<template>
  <el-dialog v-model="visible" :title="businessType === 'CUSTOMER' ? '客户详情' : '工单详情'" width="1180px" append-to-body>
    <div v-loading="loading" class="detail-container">
      <div ref="leftPanelRef" class="detail-left">
        <el-descriptions v-if="detail" :column="2" border>
          <template v-if="businessType === 'CUSTOMER'">
            <el-descriptions-item label="客户电话">{{ customerDetail?.primaryPhone }}</el-descriptions-item>
            <el-descriptions-item label="客户姓名">{{ customerDetail?.customerName || '未提供' }}</el-descriptions-item>
          </template>
          <template v-else>
            <el-descriptions-item label="工单编号">{{ ticketDetail?.ticketNo }}</el-descriptions-item>
            <el-descriptions-item label="工单状态">{{ ticketDetail?.ticketStatus }}</el-descriptions-item>
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
                <div class="custom-field-value">{{ field.value }}</div>
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
                      <div>{{ item.content }}</div>
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
                    <span>挂断原因：{{ item.hangupCause || '-' }}</span>
                  </div>
                </el-card>
              </div>
              <el-empty v-else description="暂无通话记录" :image-size="70" />
            </el-tab-pane>
          </el-tabs>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { addCustomerFollowUp, CustomerFollowUpVO, CustomerVO, getCustomer, listCustomerFollowUps } from '@/api/callcenter/customer';
import { ElMessage } from 'element-plus';
import { listFormTemplates } from '@/api/callcenter/form-template';
import { FormBusinessType, FormField, FormTemplate } from '@/api/callcenter/form-template/types';
import { getTicket, TicketVO } from '@/api/callcenter/ticket';
import { listCallRecords } from '@/api/callcenter/call-record';
import { CallDirection, CallRecordVO } from '@/api/callcenter/call-record/types';

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
let leftPanelObserver: ResizeObserver | undefined;
let scrollTimer: ReturnType<typeof setTimeout> | undefined;
const customerDetail = computed(() => (props.businessType === 'CUSTOMER' ? (detail.value as CustomerVO | undefined) : undefined));
const ticketDetail = computed(() => (props.businessType === 'TICKET' ? (detail.value as TicketVO | undefined) : undefined));

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
    layoutSpan: field.layoutSpan || 12
  }));
});

const loadFollowUps = async () => {
  if (props.businessType !== 'CUSTOMER' || !props.businessId) return;
  followUps.value = (await listCustomerFollowUps(props.businessId)).data;
};
const loadCallRecords = async () => {
  const participantNumber = customerDetail.value?.primaryPhone || ticketDetail.value?.callerNumber;
  if (!participantNumber) {
    callRecords.value = [];
    return;
  }
  callRecords.value = (await listCallRecords({ pageNum: 1, pageSize: 100, participantNumber })).rows;
};
const directionLabel = (direction: CallDirection) =>
  ({ INBOUND: '呼入', OUTBOUND: '呼出', INTERNAL: '内部通话', UNKNOWN: '未知' })[direction] || direction;
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

watch(visible, async (opened) => {
  if (!opened || !props.businessId) return;
  loading.value = true;
  try {
    detail.value = props.businessType === 'CUSTOMER' ? (await getCustomer(props.businessId)).data : (await getTicket(props.businessId)).data;
    const templates = (await listFormTemplates(props.businessType)).data;
    template.value = templates.find((item) => String(item.id) === String(detail.value?.templateId));
    followUpContent.value = '';
    activeTab.value = 'followUp';
    await loadFollowUps();
    await nextTick();
    updateRightPanelHeight();
  } finally {
    loading.value = false;
  }
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
</script>

<style scoped lang="scss">
.detail-container {
  display: flex;
  gap: 18px;
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
.custom-detail {
  padding: 14px;
  margin-top: 16px;
  border: 1px dashed #9eb2cc;
  border-radius: 10px;
}
.custom-field {
  min-height: 68px;
  padding: 12px;
  margin-bottom: 12px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  background: #fff;
}
.custom-field-label {
  margin-bottom: 8px;
  font-size: 13px;
  color: #909399;
}
.custom-field-value {
  line-height: 22px;
  color: #303133;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.section-title {
  margin-bottom: 12px;
  font-weight: 600;
}
.side-panel {
  padding: 0 14px 14px;
  border: 1px solid #e4e7ed;
  border-radius: 10px;
  background: #fff;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 240px;
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
.follow-up-user {
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
}
.call-record-item {
  margin-bottom: 12px;
}
.call-record-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #909399;
  font-size: 12px;
}
.call-record-number {
  margin: 12px 0;
  font-size: 16px;
  font-weight: 600;
}
.call-record-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: #606266;
  font-size: 13px;
}
.el-timeline.is-start {
  padding-left: 20px;
  padding-right: 20px;
}
</style>
