<template>
  <div class="p-2">
    <el-tabs v-model="activeTab" class="ticket-tabs">
      <el-tab-pane label="正式工单" name="tickets" />
      <el-tab-pane v-hasPermi="['callcenter:ai-ticket-draft:list']" label="AI 草稿审核" name="aiDrafts" />
    </el-tabs>
    <template v-if="activeTab === 'tickets'">
    <el-card class="mb-2" shadow="hover">
      <el-form :model="query" inline>
        <el-form-item label="工单编号"><el-input v-model="query.ticketNo" clearable @keyup.enter="load" /></el-form-item>
        <el-form-item label="来电号码"><el-input v-model="query.callerNumber" clearable @keyup.enter="load" /></el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.ticketStatus" clearable style="width: 140px">
            <el-option label="待处理" value="OPEN" /><el-option label="处理中" value="PROCESSING" />
            <el-option label="已解决" value="RESOLVED" /><el-option label="已关闭" value="CLOSED" />
          </el-select>
        </el-form-item>
        <el-form-item label="紧急程度">
          <el-select v-model="query.urgencyCode" clearable placeholder="全部" style="width: 130px">
            <el-option v-for="level in urgencyLevels" :key="String(level.id)" :label="level.levelName" :value="level.levelCode" />
          </el-select>
        </el-form-item>
        <el-form-item label="办结时限">
          <el-select v-model="query.deadlineStatus" clearable placeholder="全部" style="width: 150px">
            <el-option label="正常" value="NORMAL" />
            <el-option label="即将到期" value="DUE_SOON" />
            <el-option label="已超时" value="OVERDUE" />
            <el-option label="按时办结" value="COMPLETED" />
            <el-option label="超时办结" value="COMPLETED_OVERDUE" />
          </el-select>
        </el-form-item>
        <el-form-item label="工单模板">
          <el-select v-model="query.templateId" clearable filterable placeholder="全部模板" style="width: 180px" @change="handleTemplateChange">
            <el-option v-for="template in ticketTemplates" :key="template.id" :label="template.templateName" :value="template.id" />
          </el-select>
        </el-form-item>
        <DynamicQueryFields v-model="dynamicQueryValues" :fields="querySchemaFields" @search="handleSearch" />
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
    <el-card shadow="hover">
      <div class="table-toolbar">
        <el-button v-hasPermi="['callcenter:ticket:create']" type="primary" plain @click="createVisible = true">
          <el-icon><Plus /></el-icon>
          新增工单
        </el-button>
        <el-button plain @click="exportCurrentTickets">导出</el-button>
        <el-button v-hasPermi="['callcenter:ticket-urgency:manage']" plain @click="urgencyManagerVisible = true">紧急程度配置</el-button>
      </div>
      <el-table v-loading="loading" :data="rows" :row-class-name="ticketRowClass" :row-style="ticketRowStyle">
        <el-table-column label="工单编号" min-width="190">
          <template #default="{ row }"
            ><el-button link type="primary" @click="showDetail(row)">{{ row.ticketNo }}</el-button></template
          >
        </el-table-column>
        <el-table-column label="紧急程度" width="110" align="center">
          <template #default="{ row }">
            <el-dropdown v-if="canChangeUrgency" trigger="click" @command="(levelId) => changeUrgency(row, levelId)">
              <span class="urgency-trigger">
                <el-tag effect="plain" size="small" :style="urgencyTagStyle(row)">{{ row.urgencyName || '普通' }}</el-tag>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item v-for="level in urgencyLevels" :key="String(level.id)" :command="level.id" :disabled="String(level.id) === String(row.urgencyLevelId)">
                    <span class="urgency-menu-dot" :style="{ backgroundColor: level.tagColor }" />{{ level.levelName }}
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <el-tag v-else effect="plain" size="small" :style="urgencyTagStyle(row)">{{ row.urgencyName || '普通' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" prop="ticketStatus" width="110" />
        <el-table-column label="流程状态" width="110">
          <template #default="{ row }">{{ processStatusLabel(row.processStatus) }}</template>
        </el-table-column>
        <el-table-column label="当前节点" prop="currentNodeName" min-width="130">
          <template #default="{ row }">{{ row.currentNodeName || '-' }}</template>
        </el-table-column>
        <el-table-column label="来电号码" prop="callerNumber" min-width="140" />
        <el-table-column label="来源通话" prop="sourceCallId" min-width="240" show-overflow-tooltip />
        <el-table-column label="办结时限" min-width="210">
          <template #default="{ row }">
            <el-tooltip v-if="row.dueAt" :content="`截止时间：${formatDeadline(row.dueAt)}`" placement="top">
              <div class="deadline-cell">
                <el-tag :type="deadlineTagType(row)" effect="plain" size="small">{{ deadlineStatusLabel(row) }}</el-tag>
                <span class="deadline-time">{{ formatDeadlineCompact(row.dueAt) }}</span>
              </div>
            </el-tooltip>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column v-for="field in listVisibleTicketFields" :key="field.fieldCode" :label="field.fieldName" min-width="110" show-overflow-tooltip>
          <template #default="{ row }">{{ formatDynamicFieldValue(row.formData?.[field.fieldCode], field) }}</template>
        </el-table-column>
        <el-table-column label="创建时间" prop="createTime" min-width="170" />
        <el-table-column label="操作" fixed="right" width="220" class-name="ticket-operation-column">
          <template #default="{ row }">
            <el-button v-if="canEditDeadline(row)" v-hasPermi="['callcenter:ticket:create']" link type="primary" @click="openDeadlineDialog(row)">设置时限</el-button>
            <el-button v-if="canSubmit(row)" link type="primary" @click="submit(row)">提交</el-button>
            <el-button
              v-if="canResolveDirectly(row)"
              v-hasPermi="['callcenter:ticket:create']"
              link
              type="warning"
              @click="resolveDirectly(row)"
            >直接办结</el-button>
            <el-button v-if="row.flowInstanceId" link type="primary" @click="showProgress(row)">流程进度</el-button>
            <el-button v-if="row.ticketStatus === 'RESOLVED'" link type="success" @click="close(row)">关闭</el-button>
          </template>
        </el-table-column>
      </el-table>
      <pagination v-show="total > 0" v-model:page="query.pageNum" v-model:limit="query.pageSize" :total="total" @pagination="load" />
    </el-card>
    <CallCenterBusinessDetail ref="detailRef" v-model="detailVisible" business-type="TICKET" :business-id="detailId">
      <template #footer="{ detail }">
        <div class="ticket-detail-actions">
          <el-button @click="detailVisible = false">关闭窗口</el-button>
          <el-button v-if="canEditDeadline(detail)" v-hasPermi="['callcenter:ticket:create']" @click="openDeadlineDialog(detail)">设置时限</el-button>
          <el-button v-if="detail?.flowInstanceId" @click="showProgress(detail)">流程进度</el-button>
          <el-button v-if="canSubmit(detail)" type="primary" @click="submit(detail)">提交工单</el-button>
          <el-button v-if="isApprovalDetail(detail)" type="primary" @click="openApproval">办理当前任务</el-button>
          <el-button v-if="detail?.ticketStatus === 'RESOLVED'" type="success" @click="close(detail)">确认关闭</el-button>
        </div>
      </template>
    </CallCenterBusinessDetail>
    <ApprovalRecord ref="approvalRecordRef" />
    <DynamicBusinessFormDialog v-model="createVisible" business-type="TICKET" @saved="handleCreated" />
    <el-dialog v-model="deadlineDialogVisible" title="设置工单办结时限" width="500px" append-to-body destroy-on-close>
      <el-form label-width="110px">
        <el-form-item label="启用时限">
          <el-switch v-model="deadlineForm.enabled" />
        </el-form-item>
        <template v-if="deadlineForm.enabled">
          <el-form-item label="截止时间" required>
            <el-date-picker
              v-model="deadlineForm.dueAt"
              type="datetime"
              value-format="YYYY-MM-DD HH:mm:ss"
              placeholder="选择该工单的截止时间"
              style="width: 100%"
            />
          </el-form-item>
          <el-form-item label="提前提醒">
            <el-input-number v-model="deadlineForm.remindBeforeMinutes" :min="0" :max="525600" :step="10" />
            <span class="deadline-unit">分钟</span>
          </el-form-item>
          <div class="deadline-dialog-tip">设置后仅覆盖当前工单。填写 0 分钟表示不发送临期提醒，逾期提醒仍会发送。</div>
        </template>
        <el-alert v-else type="warning" :closable="false" title="关闭后，该工单将不再进行临期或逾期提醒。" />
      </el-form>
      <template #footer>
        <el-button @click="deadlineDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="deadlineSubmitting" @click="saveDeadline">保存</el-button>
      </template>
    </el-dialog>
    <TicketUrgencyManager v-model="urgencyManagerVisible" @changed="handleUrgencyConfigChanged" />
    </template>
    <AiTicketDraftReview v-else @open-ticket="openCreatedTicket" />
    <SubmitVerify ref="submitVerifyRef" :task-variables="taskVariables" @submit-callback="handleWorkflowUpdated" />
  </div>
</template>

<script setup name="TicketManagement" lang="ts">
import {
  closeTicket,
  exportTickets,
  listTicketUrgencyLevels,
  resolveTicketDirectly,
  searchTickets,
  submitTicket,
  type TicketQuery,
  type TicketUrgencyLevelVO,
  type TicketVO,
  updateTicketDeadline,
  updateTicketUrgency
} from '@/api/callcenter/ticket';
import { getFormQuerySchema, listFormTemplates } from '@/api/callcenter/form-template';
import type { FormQueryField, FormTemplate } from '@/api/callcenter/form-template/types';
import DynamicQueryFields from '@/components/callcenter/DynamicQueryFields.vue';
import { buildDynamicFilters, formatDynamicFieldValue } from '@/utils/callcenter/dynamic-form-query';
import CallCenterBusinessDetail from '@/components/CallCenterBusinessDetail/index.vue';
import DynamicBusinessFormDialog from '@/layout/components/DynamicBusinessFormDialog.vue';
import SubmitVerify from '@/components/Process/submitVerify.vue';
import ApprovalRecord from '@/components/Process/approvalRecord.vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import AiTicketDraftReview from './AiTicketDraftReview.vue';
import FileSaver from 'file-saver';
import TicketUrgencyManager from './TicketUrgencyManager.vue';
import { checkPermi } from '@/utils/permission';

const route = useRoute();
const router = useRouter();
const loading = ref(false);
const rows = ref<TicketVO[]>([]);
const total = ref(0);
const createVisible = ref(false);
const urgencyManagerVisible = ref(false);
const urgencyLevels = ref<TicketUrgencyLevelVO[]>([]);
const canChangeUrgency = checkPermi(['callcenter:ticket:update-urgency']);
const detailVisible = ref(false);
const detailId = ref<string | number>();
const detailRef = ref<{ reload: () => Promise<void> }>();
const submitVerifyRef = ref<InstanceType<typeof SubmitVerify>>();
const approvalRecordRef = ref<InstanceType<typeof ApprovalRecord>>();
const taskVariables = ref<Record<string, unknown>>({});
const query = reactive<TicketQuery>({ pageNum: 1, pageSize: 10 });
const ticketTemplates = ref<FormTemplate[]>([]);
const querySchemaFields = ref<FormQueryField[]>([]);
const dynamicQueryValues = ref<Record<string, unknown>>({});
const listVisibleTicketFields = computed(() =>
  (ticketTemplates.value.find((template) => String(template.id) === String(query.templateId))?.fields || [])
    .filter((field) => field.enabled !== false && field.listVisible)
    .sort((first, second) => (first.sortOrder || 0) - (second.sortOrder || 0))
);
const activeTab = ref('tickets');
const deadlineDialogVisible = ref(false);
const deadlineSubmitting = ref(false);
const deadlineTicket = ref<TicketVO>();
const deadlineForm = reactive({ enabled: true, dueAt: '', remindBeforeMinutes: 120 });
const loadUrgencyLevels = async () => {
  const response = await listTicketUrgencyLevels();
  urgencyLevels.value = response.data || [];
};
const load = async () => {
  loading.value = true;
  try {
    query.dynamicFilters = buildDynamicFilters(querySchemaFields.value, dynamicQueryValues.value);
    const response = await searchTickets(query);
    rows.value = response.rows;
    total.value = response.total;
  } finally {
    loading.value = false;
  }
};
const exportCurrentTickets = async () => {
  const data = {
    ...query,
    dynamicFilters: buildDynamicFilters(querySchemaFields.value, dynamicQueryValues.value)
  };
  const blob = await exportTickets(data);
  FileSaver.saveAs(blob, `工单资料_${Date.now()}.xlsx`);
};
const handleSearch = () => {
  query.pageNum = 1;
  load();
};
const handleTemplateChange = async () => {
  querySchemaFields.value = [];
  dynamicQueryValues.value = {};
  if (query.templateId) {
    querySchemaFields.value = (await getFormQuerySchema(query.templateId)).data?.fields || [];
  }
  handleSearch();
};
const resetQuery = () => {
  query.pageNum = 1;
  query.ticketNo = '';
  query.callerNumber = '';
  query.ticketStatus = undefined;
  query.deadlineStatus = undefined;
  query.urgencyCode = undefined;
  query.templateId = undefined;
  query.dynamicFilters = [];
  querySchemaFields.value = [];
  dynamicQueryValues.value = {};
  load();
};
const urgencyTagStyle = (ticket: TicketVO) => {
  const color = ticket.urgencyColor || '#909399';
  return { color, borderColor: color, backgroundColor: `${color}14` };
};
const ticketRowClass = ({ row }: { row: TicketVO }) => (Number(row.urgencyWeight || 0) >= 60 ? 'ticket-urgent-row' : '');
const ticketRowStyle = ({ row }: { row: TicketVO }) => ({ '--ticket-urgency-color': row.urgencyColor || '#E6A23C' });
const changeUrgency = async (ticket: TicketVO, levelId: string | number) => {
  await updateTicketUrgency(ticket.id, levelId);
  ElMessage.success('工单紧急程度已更新');
  await load();
  if (detailVisible.value && String(detailId.value) === String(ticket.id)) await detailRef.value?.reload();
};
const handleUrgencyConfigChanged = async () => {
  await Promise.all([loadUrgencyLevels(), load()]);
};
const showDetail = (row: TicketVO) => {
  detailId.value = row.id;
  taskVariables.value = { entity: row };
  detailVisible.value = true;
};
const canSubmit = (ticket?: TicketVO) =>
  Boolean(ticket && ticket.ticketStatus === 'OPEN' && ticket.workflowCode && !ticket.flowInstanceId && ticket.processStatus !== 'waiting');
const canResolveDirectly = (ticket?: TicketVO) =>
  Boolean(ticket && ticket.ticketStatus === 'OPEN' && !ticket.flowInstanceId && ticket.processStatus !== 'waiting');
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
const formatDeadline = (value?: string) => (value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '-');
const formatDeadlineCompact = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
const formatDateTimeValue = (value: Date | string) => {
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};
const canEditDeadline = (ticket?: TicketVO) => ticket?.ticketStatus === 'OPEN' || ticket?.ticketStatus === 'PROCESSING';
const openDeadlineDialog = (ticket: TicketVO) => {
  deadlineTicket.value = ticket;
  deadlineForm.enabled = Boolean(ticket.dueAt);
  deadlineForm.dueAt = ticket.dueAt ? formatDateTimeValue(ticket.dueAt) : formatDateTimeValue(new Date(Date.now() + 24 * 60 * 60 * 1000));
  deadlineForm.remindBeforeMinutes = ticket.dueAt && ticket.remindAt
    ? Math.max(0, Math.round((new Date(ticket.dueAt).getTime() - new Date(ticket.remindAt).getTime()) / 60_000))
    : 120;
  deadlineDialogVisible.value = true;
};
const saveDeadline = async () => {
  if (!deadlineTicket.value) return;
  if (deadlineForm.enabled && !deadlineForm.dueAt) {
    ElMessage.warning('请选择工单截止时间');
    return;
  }
  if (deadlineForm.enabled && new Date(deadlineForm.dueAt).getTime() <= Date.now()) {
    ElMessage.warning('工单截止时间必须晚于当前时间');
    return;
  }
  deadlineSubmitting.value = true;
  try {
    await updateTicketDeadline(deadlineTicket.value.id, {
      enabled: deadlineForm.enabled,
      dueAt: deadlineForm.enabled ? deadlineForm.dueAt : undefined,
      remindBeforeMinutes: deadlineForm.enabled ? deadlineForm.remindBeforeMinutes : undefined
    });
    ElMessage.success(deadlineForm.enabled ? '工单办结时限已更新' : '工单办结时限已取消');
    deadlineDialogVisible.value = false;
    await load();
    if (detailVisible.value) await detailRef.value?.reload();
  } finally {
    deadlineSubmitting.value = false;
  }
};
const compactDuration = (seconds: number) => {
  const totalMinutes = Math.max(0, Math.ceil(Math.abs(seconds) / 60));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}天${hours}小时`;
  if (hours > 0) return `${hours}小时${minutes}分钟`;
  return `${minutes}分钟`;
};
const deadlineStatusLabel = (ticket: TicketVO) => {
  if (ticket.deadlineStatus === 'COMPLETED') return '按时办结';
  if (ticket.deadlineStatus === 'COMPLETED_OVERDUE') return '超时办结';
  if (ticket.deadlineStatus === 'CANCELLED') return '已停止';
  const remaining = Number(ticket.remainingSeconds || 0);
  if (ticket.deadlineStatus === 'OVERDUE' || remaining < 0) return `已超时 ${compactDuration(remaining)}`;
  if (ticket.deadlineStatus === 'DUE_SOON') return `剩余 ${compactDuration(remaining)}`;
  return `剩余 ${compactDuration(remaining)}`;
};
const deadlineTagType = (ticket: TicketVO) => {
  if (ticket.deadlineStatus === 'COMPLETED') return 'success';
  if (ticket.deadlineStatus === 'OVERDUE' || ticket.deadlineStatus === 'COMPLETED_OVERDUE' || Number(ticket.remainingSeconds || 0) < 0) return 'danger';
  if (ticket.deadlineStatus === 'DUE_SOON') return 'warning';
  return 'info';
};
const isApprovalDetail = (ticket?: TicketVO) =>
  Boolean(ticket && route.query.type === 'approval' && route.query.taskId && String(ticket.id) === String(detailId.value));
const submit = async (ticket: TicketVO) => {
  await ElMessageBox.confirm(`确认提交工单 ${ticket.ticketNo} 并启动流程吗？`, '提交工单', { type: 'warning' });
  await submitTicket(ticket.id);
  ElMessage.success('工单流程已启动');
  await handleWorkflowUpdated();
};
const resolveDirectly = async (ticket: TicketVO) => {
  await ElMessageBox.confirm(`确认直接办结工单 ${ticket.ticketNo} 吗？该操作不会启动审批流程。`, '直接办结', { type: 'warning' });
  await resolveTicketDirectly(ticket.id);
  ElMessage.success('工单已直接办结');
  await load();
};
const close = async (ticket: TicketVO) => {
  await ElMessageBox.confirm(`确认关闭工单 ${ticket.ticketNo} 吗？`, '关闭工单', { type: 'warning' });
  await closeTicket(ticket.id);
  ElMessage.success('工单已关闭');
  await handleWorkflowUpdated();
};
const showProgress = (ticket: TicketVO) => approvalRecordRef.value?.init(ticket.id);
const openApproval = async () => {
  const taskId = Array.isArray(route.query.taskId) ? route.query.taskId[0] : route.query.taskId;
  if (!taskId) {
    ElMessage.error('未获取到当前流程任务，请从待办任务重新打开工单');
    return;
  }
  await nextTick();
  if (!submitVerifyRef.value) {
    ElMessage.error('任务办理组件加载失败，请刷新页面后重试');
    return;
  }
  await submitVerifyRef.value.openDialog(String(taskId));
};
async function handleWorkflowUpdated() {
  if (route.query.type === 'approval') {
    detailVisible.value = false;
    detailId.value = undefined;
    taskVariables.value = {};
    const nextQuery = { ...route.query };
    delete nextQuery.id;
    delete nextQuery.type;
    delete nextQuery.taskId;
    await router.replace({ query: nextQuery });
    await load();
    return;
  }
  await load();
  if (detailVisible.value) await detailRef.value?.reload();
}
const handleCreated = async () => {
  query.pageNum = 1;
  await load();
};
const openCreatedTicket = async (id: string | number) => {
  activeTab.value = 'tickets';
  await load();
  detailId.value = id;
  detailVisible.value = true;
};
onMounted(async () => {
  const [templates] = await Promise.all([listFormTemplates('TICKET'), loadUrgencyLevels(), load()]);
  ticketTemplates.value = (templates.data || []).filter((template) => template.enabled);
  if (ticketTemplates.value.length === 1 && !query.templateId) {
    query.templateId = ticketTemplates.value[0].id;
    await handleTemplateChange();
  }
  if (route.query.id) {
    detailId.value = String(route.query.id);
    detailVisible.value = true;
  }
});
watch(
  () => route.query.id,
  (id) => {
    if (!id) return;
    activeTab.value = 'tickets';
    detailId.value = String(id);
    detailVisible.value = true;
  }
);
</script>

<style scoped>
.table-toolbar {
  margin-bottom: 12px;
  display: flex;
  gap: 8px;
}
.ticket-tabs { margin-bottom: 10px; }
.urgency-trigger { cursor: pointer; }
.urgency-menu-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  margin-right: 7px;
  border-radius: 50%;
}
:deep(.ticket-urgent-row td:first-child) {
  box-shadow: inset 4px 0 0 var(--ticket-urgency-color);
}

:deep(.ticket-operation-column .cell) {
  white-space: nowrap;
}

.deadline-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  white-space: nowrap;
  font-size: 12px;
  color: #64748b;
}

.deadline-cell :deep(.el-tag) {
  flex: none;
}

.deadline-time {
  overflow: hidden;
  text-overflow: ellipsis;
}

.deadline-unit {
  margin-left: 8px;
  color: #606266;
}

.deadline-dialog-tip {
  margin: -4px 0 0 110px;
  color: #909399;
  font-size: 12px;
  line-height: 18px;
}

.ticket-detail-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
