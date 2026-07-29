<template>
  <div class="p-2">
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
        <el-form-item><el-button type="primary" @click="load">查询</el-button></el-form-item>
      </el-form>
    </el-card>
    <el-card shadow="hover">
      <div class="table-toolbar">
        <el-button v-hasPermi="['callcenter:ticket:create']" type="primary" plain @click="createVisible = true">
          <el-icon><Plus /></el-icon>
          新增工单
        </el-button>
      </div>
      <el-table v-loading="loading" :data="rows">
        <el-table-column label="工单编号" min-width="190">
          <template #default="{ row }"
            ><el-button link type="primary" @click="showDetail(row)">{{ row.ticketNo }}</el-button></template
          >
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
        <el-table-column label="创建时间" prop="createTime" min-width="170" />
        <el-table-column label="操作" fixed="right" width="210">
          <template #default="{ row }">
            <el-button v-if="canSubmit(row)" link type="primary" @click="submit(row)">提交</el-button>
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
          <el-button v-if="detail?.flowInstanceId" @click="showProgress(detail)">流程进度</el-button>
          <el-button v-if="canSubmit(detail)" type="primary" @click="submit(detail)">提交工单</el-button>
          <el-button v-if="isApprovalDetail(detail)" type="primary" @click="openApproval">办理当前任务</el-button>
          <el-button v-if="detail?.ticketStatus === 'RESOLVED'" type="success" @click="close(detail)">确认关闭</el-button>
        </div>
      </template>
    </CallCenterBusinessDetail>
    <SubmitVerify ref="submitVerifyRef" :task-variables="taskVariables" @submit-callback="handleWorkflowUpdated" />
    <ApprovalRecord ref="approvalRecordRef" />
    <DynamicBusinessFormDialog v-model="createVisible" business-type="TICKET" @saved="handleCreated" />
  </div>
</template>

<script setup name="TicketManagement" lang="ts">
import { closeTicket, listTickets, submitTicket, TicketQuery, TicketVO } from '@/api/callcenter/ticket';
import CallCenterBusinessDetail from '@/components/CallCenterBusinessDetail/index.vue';
import DynamicBusinessFormDialog from '@/layout/components/DynamicBusinessFormDialog.vue';
import SubmitVerify from '@/components/Process/submitVerify.vue';
import ApprovalRecord from '@/components/Process/approvalRecord.vue';
import { ElMessage, ElMessageBox } from 'element-plus';

const route = useRoute();
const loading = ref(false);
const rows = ref<TicketVO[]>([]);
const total = ref(0);
const createVisible = ref(false);
const detailVisible = ref(false);
const detailId = ref<string | number>();
const detailRef = ref<{ reload: () => Promise<void> }>();
const submitVerifyRef = ref<InstanceType<typeof SubmitVerify>>();
const approvalRecordRef = ref<InstanceType<typeof ApprovalRecord>>();
const taskVariables = ref<Record<string, unknown>>({});
const query = reactive<TicketQuery>({ pageNum: 1, pageSize: 10 });
const load = async () => {
  loading.value = true;
  try {
    const response = await listTickets(query);
    rows.value = response.rows;
    total.value = response.total;
  } finally {
    loading.value = false;
  }
};
const showDetail = (row: TicketVO) => {
  detailId.value = row.id;
  taskVariables.value = { entity: row };
  detailVisible.value = true;
};
const canSubmit = (ticket?: TicketVO) =>
  Boolean(ticket && ticket.ticketStatus === 'OPEN' && ticket.workflowCode && !ticket.flowInstanceId && ticket.processStatus !== 'waiting');
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
const isApprovalDetail = (ticket?: TicketVO) =>
  Boolean(ticket && route.query.type === 'approval' && route.query.taskId && String(ticket.id) === String(detailId.value));
const submit = async (ticket: TicketVO) => {
  await ElMessageBox.confirm(`确认提交工单 ${ticket.ticketNo} 并启动流程吗？`, '提交工单', { type: 'warning' });
  await submitTicket(ticket.id);
  ElMessage.success('工单流程已启动');
  await handleWorkflowUpdated();
};
const close = async (ticket: TicketVO) => {
  await ElMessageBox.confirm(`确认关闭工单 ${ticket.ticketNo} 吗？`, '关闭工单', { type: 'warning' });
  await closeTicket(ticket.id);
  ElMessage.success('工单已关闭');
  await handleWorkflowUpdated();
};
const showProgress = (ticket: TicketVO) => approvalRecordRef.value?.init(ticket.id);
const openApproval = () => submitVerifyRef.value?.openDialog(String(route.query.taskId));
async function handleWorkflowUpdated() {
  await load();
  if (detailVisible.value) await detailRef.value?.reload();
}
const handleCreated = async () => {
  query.pageNum = 1;
  await load();
};
onMounted(async () => {
  await load();
  if (route.query.id) {
    detailId.value = String(route.query.id);
    detailVisible.value = true;
  }
});
</script>

<style scoped>
.table-toolbar {
  margin-bottom: 12px;
}

.ticket-detail-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
