<template>
  <div class="p-2">
    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <div>
            <strong>预览式外呼任务</strong>
            <div class="description">坐席领取客户后查看资料，确认后手动拨打并登记外呼结果。</div>
          </div>
          <el-button v-hasPermi="['callcenter:outbound-task:create']" type="primary" plain icon="Plus" @click="handleAdd">新增任务</el-button>
        </div>
      </template>
      <el-table v-loading="loading" :data="tasks">
        <el-table-column label="任务编码" prop="taskCode" min-width="130" />
        <el-table-column label="任务名称" prop="taskName" min-width="170" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }"><el-tag :type="statusTag(row.status)">{{ statusLabel(row.status) }}</el-tag></template>
        </el-table-column>
        <el-table-column label="名单进度" min-width="210">
          <template #default="{ row }">
            <el-progress :percentage="progress(row)" :stroke-width="10" />
            <span class="progress-text">完成 {{ row.completedCount }} / 总计 {{ row.totalCount }}，待处理 {{ row.pendingCount }}</span>
          </template>
        </el-table-column>
        <el-table-column label="说明" prop="description" min-width="180" show-overflow-tooltip />
        <el-table-column label="操作" width="410" fixed="right" align="center">
          <template #default="{ row }">
            <el-button v-hasPermi="['callcenter:outbound-task:query']" link type="primary" @click="showMembers(row)">名单</el-button>
            <el-button v-hasPermi="['callcenter:outbound-task:query']" link type="primary" @click="showStatistics(row)">统计</el-button>
            <el-button v-hasPermi="['callcenter:outbound-task:update']" link type="warning" @click="recoverExpired(row)">恢复异常名单</el-button>
            <el-button v-if="row.status !== 'RUNNING'" v-hasPermi="['callcenter:outbound-task:update']" link type="success" @click="changeTaskStatus(row, true)">开始</el-button>
            <el-button v-else v-hasPermi="['callcenter:outbound-task:update']" link type="warning" @click="changeTaskStatus(row, false)">暂停</el-button>
            <el-button v-if="row.status === 'RUNNING'" v-hasPermi="['callcenter:outbound-task:execute']" link type="primary" @click="openWorkbench(row)">执行</el-button>
            <el-button v-hasPermi="['callcenter:outbound-task:update']" link type="primary" icon="Edit" @click="handleUpdate(row)" />
            <el-button v-hasPermi="['callcenter:outbound-task:delete']" link type="danger" icon="Delete" @click="handleDelete(row)" />
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="taskDialog.visible" :title="taskDialog.title" width="560px" append-to-body>
      <el-form ref="taskFormRef" :model="taskForm" :rules="taskRules" label-width="90px">
        <el-form-item label="任务编码" prop="taskCode"><el-input v-model="taskForm.taskCode" placeholder="例如 OUTBOUND_202606" /></el-form-item>
        <el-form-item label="任务名称" prop="taskName"><el-input v-model="taskForm.taskName" /></el-form-item>
        <el-form-item label="任务说明"><el-input v-model="taskForm.description" type="textarea" :rows="4" maxlength="500" show-word-limit /></el-form-item>
      </el-form>
      <template #footer><el-button @click="taskDialog.visible = false">取消</el-button><el-button type="primary" @click="submitTask">保存</el-button></template>
    </el-dialog>

    <el-drawer v-model="memberDrawer.visible" :title="`${memberDrawer.task?.taskName || ''} - 外呼名单`" size="72%">
      <div class="member-toolbar">
        <el-button v-hasPermi="['callcenter:outbound-task:update']" type="primary" plain @click="openCustomerDialog">添加客户</el-button>
      </div>
      <el-table :data="members">
        <el-table-column label="客户" prop="customerName" min-width="140"><template #default="{ row }">{{ row.customerName || '未提供姓名' }}</template></el-table-column>
        <el-table-column label="电话号码" prop="phoneNumber" min-width="140" />
        <el-table-column label="状态" width="100"><template #default="{ row }">{{ memberStatusLabel(row.status) }}</template></el-table-column>
        <el-table-column label="拨打次数" prop="attemptCount" width="90" />
        <el-table-column label="结果" width="120"><template #default="{ row }">{{ resultLabel(row.resultCode) }}</template></el-table-column>
        <el-table-column label="结果备注" prop="resultRemark" min-width="180" show-overflow-tooltip />
        <el-table-column label="下次跟进" prop="nextFollowUpAt" min-width="170" />
      </el-table>
    </el-drawer>

    <el-dialog v-model="customerDialog.visible" title="添加客户到外呼任务" width="760px" append-to-body>
      <el-form inline @submit.prevent><el-form-item label="客户电话"><el-input v-model="customerQuery.primaryPhone" clearable /></el-form-item><el-form-item label="客户姓名"><el-input v-model="customerQuery.customerName" clearable /></el-form-item><el-button type="primary" @click="loadCustomers">查询</el-button></el-form>
      <el-table ref="customerTableRef" :data="customers" @selection-change="selectedCustomers = $event">
        <el-table-column type="selection" width="48" />
        <el-table-column label="客户电话" prop="primaryPhone" min-width="150" />
        <el-table-column label="客户姓名" min-width="160"><template #default="{ row }">{{ row.customerName || '未提供姓名' }}</template></el-table-column>
        <el-table-column label="创建时间" prop="createTime" min-width="170" />
      </el-table>
      <template #footer><el-button @click="customerDialog.visible = false">取消</el-button><el-button type="primary" @click="addCustomers">添加选中客户</el-button></template>
    </el-dialog>

    <el-dialog v-model="workbench.visible" title="预览式外呼工作台" width="720px" append-to-body :close-on-click-modal="false">
      <el-empty v-if="!workbench.member" description="点击领取下一位客户开始外呼">
        <el-button type="primary" @click="claimNext">领取下一位客户</el-button>
      </el-empty>
      <template v-else>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="客户姓名">{{ workbench.member.customerName || '客户未提供姓名' }}</el-descriptions-item>
          <el-descriptions-item label="客户电话">{{ workbench.member.phoneNumber }}</el-descriptions-item>
          <el-descriptions-item label="拨打次数">{{ workbench.member.attemptCount }}</el-descriptions-item>
          <el-descriptions-item label="名单状态">{{ memberStatusLabel(workbench.member.status) }}</el-descriptions-item>
        </el-descriptions>
        <div class="dial-actions">
          <el-button class="workbench-action" type="primary" plain @click="showCustomerDetail(workbench.member.customerId)">查看客户详情</el-button>
          <el-button class="workbench-action" type="success" :loading="workbench.dialing" :disabled="workbench.member.status === 'DIALING'" @click="dialCurrent">拨打客户</el-button>
        </div>
        <el-divider content-position="left">登记外呼结果</el-divider>
        <el-form label-width="100px">
          <el-form-item label="外呼结果"><el-select v-model="resultForm.resultCode" style="width: 100%" @change="handleResultChange"><el-option v-for="item in resultOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item>
          <el-form-item label="结果备注"><el-input v-model="resultForm.resultRemark" type="textarea" :rows="3" maxlength="1000" show-word-limit /></el-form-item>
          <el-form-item label="下次跟进"><el-date-picker v-model="resultForm.nextFollowUpAt" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" style="width: 100%" @change="handleFollowUpTimeChange" /></el-form-item>
          <el-form-item label="需要重呼"><el-switch v-model="resultForm.retry" @change="handleRetryChange" /></el-form-item>
          <el-alert v-if="resultForm.retry" title="到达下次跟进时间后，该客户会重新进入可领取名单。" type="info" :closable="false" show-icon />
        </el-form>
      </template>
      <template #footer>
        <el-button @click="workbench.visible = false">关闭</el-button>
        <el-button v-if="workbench.member" type="primary" @click="completeCurrent">保存外呼结果</el-button>
      </template>
    </el-dialog>
    <el-dialog v-model="statisticsDialog.visible" :title="`${statisticsDialog.task?.taskName || ''} - 外呼统计`" width="760px" append-to-body>
      <div v-loading="statisticsDialog.loading">
        <div v-if="statisticsDialog.data" class="statistics-grid">
          <div v-for="item in statisticsCards" :key="item.label" class="statistics-card">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </div>
        </div>
        <el-divider content-position="left">外呼结果分布</el-divider>
        <el-table :data="resultDistributionRows" empty-text="暂无已登记的外呼结果">
          <el-table-column label="外呼结果" prop="label" />
          <el-table-column label="数量" prop="count" width="140" />
        </el-table>
      </div>
    </el-dialog>
    <CallCenterBusinessDetail v-model="customerDetail.visible" business-type="CUSTOMER" :business-id="customerDetail.id" />
  </div>
</template>

<script setup name="OutboundTask" lang="ts">
import {
  addOutboundCustomers, claimNextOutboundMember, completeOutboundMember, createOutboundTask, deleteOutboundTask, dialOutboundMember,
  getOutboundTask, getOutboundTaskStatistics, listOutboundMembers, listOutboundTasks, pauseOutboundTask, recoverExpiredOutboundMembers,
  renewOutboundMemberLease, startOutboundTask, updateOutboundTask
} from '@/api/callcenter/outbound-task';
import { CompleteOutboundMemberForm, OutboundMemberVO, OutboundTaskForm, OutboundTaskStatisticsVO, OutboundTaskStatus, OutboundTaskVO } from '@/api/callcenter/outbound-task/types';
import { CustomerQuery, CustomerVO, listCustomers } from '@/api/callcenter/customer';
import CallCenterBusinessDetail from '@/components/CallCenterBusinessDetail/index.vue';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;
const loading = ref(false);
const tasks = ref<OutboundTaskVO[]>([]);
const taskFormRef = ref<ElFormInstance>();
const taskDialog = reactive({ visible: false, title: '', id: undefined as string | number | undefined });
const taskForm = reactive<OutboundTaskForm>({ taskCode: '', taskName: '', description: '' });
const taskRules = {
  taskCode: [{ required: true, pattern: /^[A-Za-z0-9_-]{2,32}$/, message: '请输入合法任务编码', trigger: 'blur' }],
  taskName: [{ required: true, message: '请输入任务名称', trigger: 'blur' }]
};
const memberDrawer = reactive({ visible: false, task: undefined as OutboundTaskVO | undefined });
const members = ref<OutboundMemberVO[]>([]);
const customerDialog = reactive({ visible: false });
const customerQuery = reactive<CustomerQuery>({ pageNum: 1, pageSize: 100, primaryPhone: '', customerName: '' });
const customers = ref<CustomerVO[]>([]);
const selectedCustomers = ref<CustomerVO[]>([]);
const workbench = reactive({ visible: false, task: undefined as OutboundTaskVO | undefined, member: undefined as OutboundMemberVO | undefined, dialing: false });
const customerDetail = reactive({ visible: false, id: undefined as string | number | undefined });
const statisticsDialog = reactive({ visible: false, loading: false, task: undefined as OutboundTaskVO | undefined, data: undefined as OutboundTaskStatisticsVO | undefined });
const resultForm = reactive<CompleteOutboundMemberForm>({ resultCode: 'CONNECTED', resultRemark: '', nextFollowUpAt: undefined, retry: false });
const resultOptions = [
  { value: 'CONNECTED', label: '已接通' }, { value: 'NO_ANSWER', label: '无人接听' }, { value: 'BUSY', label: '客户忙' },
  { value: 'INVALID_NUMBER', label: '号码无效' }, { value: 'NOT_INTERESTED', label: '无意向' }, { value: 'FOLLOW_UP', label: '需要跟进' }, { value: 'OTHER', label: '其他' }
];
const statusLabel = (value: OutboundTaskStatus) => ({ DRAFT: '草稿', RUNNING: '执行中', PAUSED: '已暂停', COMPLETED: '已完成' })[value];
const statusTag = (value: OutboundTaskStatus) => value === 'RUNNING' ? 'success' : value === 'PAUSED' ? 'warning' : 'info';
const memberStatusLabel = (value: string) => ({ PENDING: '待领取', CLAIMED: '已领取', DIALING: '拨打中', COMPLETED: '已完成', RETRY: '待重呼', SKIPPED: '已跳过' })[value] || value;
const resultLabel = (value?: string) => resultOptions.find((item) => item.value === value)?.label || '-';
const statisticsCards = computed(() => {
  const data = statisticsDialog.data;
  if (!data) return [];
  return [
    { label: '总名单', value: data.totalCount },
    { label: '待领取', value: data.pendingCount },
    { label: '已领取', value: data.claimedCount },
    { label: '拨打中', value: data.dialingCount },
    { label: '已拨打', value: data.dialedCount },
    { label: '已接通', value: data.connectedCount },
    { label: '已完成', value: data.completedCount },
    { label: '待重呼', value: data.retryCount },
    { label: '完成率', value: `${data.completionRate}%` },
    { label: '接通率', value: `${data.connectionRate}%` }
  ];
});
const resultDistributionRows = computed(() => Object.entries(statisticsDialog.data?.resultDistribution || {})
  .map(([code, count]) => ({ code, label: resultLabel(code), count })));
const progress = (row: OutboundTaskVO) => row.totalCount ? Math.round(row.completedCount * 100 / row.totalCount) : 0;
const resetTaskForm = () => Object.assign(taskForm, { taskCode: '', taskName: '', description: '', version: undefined });
const resetResult = () => Object.assign(resultForm, { resultCode: 'CONNECTED', resultRemark: '', nextFollowUpAt: undefined, retry: false });
const load = async () => { loading.value = true; try { tasks.value = (await listOutboundTasks()).data; } finally { loading.value = false; } };
const handleAdd = () => { resetTaskForm(); taskDialog.id = undefined; taskDialog.title = '新增预览式外呼任务'; taskDialog.visible = true; };
const handleUpdate = async (row: OutboundTaskVO) => { resetTaskForm(); Object.assign(taskForm, (await getOutboundTask(row.id)).data); taskDialog.id = row.id; taskDialog.title = '修改预览式外呼任务'; taskDialog.visible = true; };
const submitTask = () => taskFormRef.value?.validate(async (valid) => { if (!valid) return; taskDialog.id ? await updateOutboundTask(taskDialog.id, taskForm) : await createOutboundTask(taskForm); proxy?.$modal.msgSuccess('保存成功'); taskDialog.visible = false; await load(); });
const handleDelete = async (row: OutboundTaskVO) => { await proxy?.$modal.confirm(`确认删除外呼任务“${row.taskName}”吗？`); await deleteOutboundTask(row.id); proxy?.$modal.msgSuccess('删除成功'); await load(); };
const changeTaskStatus = async (row: OutboundTaskVO, start: boolean) => { start ? await startOutboundTask(row.id) : await pauseOutboundTask(row.id); proxy?.$modal.msgSuccess(start ? '任务已开始' : '任务已暂停'); await load(); };
const showMembers = async (row: OutboundTaskVO) => { memberDrawer.task = row; members.value = (await listOutboundMembers(row.id)).data; memberDrawer.visible = true; };
const showStatistics = async (row: OutboundTaskVO) => {
  statisticsDialog.task = row;
  statisticsDialog.visible = true;
  statisticsDialog.loading = true;
  try { statisticsDialog.data = (await getOutboundTaskStatistics(row.id)).data; } finally { statisticsDialog.loading = false; }
};
const recoverExpired = async (row: OutboundTaskVO) => {
  await proxy?.$modal.confirm(`确认检查并恢复外呼任务“${row.taskName}”中已超过租约时间的异常名单吗？`);
  const count = (await recoverExpiredOutboundMembers(row.id)).data;
  proxy?.$modal.msgSuccess(count ? `已恢复 ${count} 条异常名单` : '没有需要恢复的异常名单');
  await load();
};
const openCustomerDialog = async () => { customerDialog.visible = true; await loadCustomers(); };
const loadCustomers = async () => { customers.value = (await listCustomers(customerQuery)).rows; };
const addCustomers = async () => { if (!memberDrawer.task || !selectedCustomers.value.length) return proxy?.$modal.msgWarning('请选择客户'); await addOutboundCustomers(memberDrawer.task.id, selectedCustomers.value.map((item) => item.id)); customerDialog.visible = false; await showMembers(memberDrawer.task); await load(); };
const openWorkbench = (row: OutboundTaskVO) => { workbench.task = row; workbench.member = undefined; resetResult(); workbench.visible = true; };
const claimNext = async () => { if (!workbench.task) return; workbench.member = (await claimNextOutboundMember(workbench.task.id)).data; resetResult(); };
const dialCurrent = async () => { if (!workbench.member) return; workbench.dialing = true; try { workbench.member = (await dialOutboundMember(workbench.member.id)).data; proxy?.$modal.msgSuccess('已发起外呼'); } finally { workbench.dialing = false; } };
const showCustomerDetail = (customerId: string | number) => { customerDetail.id = customerId; customerDetail.visible = true; };
const handleResultChange = (resultCode: CompleteOutboundMemberForm['resultCode']) => {
  if (resultCode === 'FOLLOW_UP') resultForm.retry = true;
};
const handleFollowUpTimeChange = (value?: string) => {
  if (value) resultForm.retry = true;
};
const handleRetryChange = (retry: boolean) => {
  if (!retry) resultForm.nextFollowUpAt = undefined;
};
const validateResult = () => {
  if (resultForm.retry && !resultForm.nextFollowUpAt) {
    proxy?.$modal.msgWarning('需要重呼时，请设置下次跟进时间');
    return false;
  }
  return true;
};
const completeCurrent = async () => {
  if (!workbench.member || !validateResult()) return;
  await completeOutboundMember(workbench.member.id, resultForm);
  proxy?.$modal.msgSuccess('外呼结果已保存，并已写入客户跟进记录');
  workbench.member = undefined;
  resetResult();
  await load();
};
let leaseRenewTimer: ReturnType<typeof setInterval> | undefined;
const renewCurrentMemberLease = async () => {
  if (!workbench.visible || !workbench.member || !['CLAIMED', 'DIALING'].includes(workbench.member.status)) return;
  try {
    workbench.member = (await renewOutboundMemberLease(workbench.member.id)).data;
  } catch {
    // 请求层已统一提示错误，保留当前名单供坐席继续处理。
  }
};
onMounted(() => {
  load();
  leaseRenewTimer = setInterval(renewCurrentMemberLease, 5 * 60 * 1000);
});
onBeforeUnmount(() => {
  if (leaseRenewTimer) clearInterval(leaseRenewTimer);
});
</script>

<style scoped>
.card-header { display: flex; align-items: center; justify-content: space-between; }
.description, .progress-text { margin-top: 6px; color: var(--el-text-color-secondary); font-size: 12px; }
.member-toolbar { margin-bottom: 14px; }
.dial-actions { display: flex; justify-content: center; gap: 12px; padding: 24px 0 8px; }
.workbench-action { width: 132px; height: 40px; margin-left: 0 !important; }
.statistics-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.statistics-card { display: flex; flex-direction: column; gap: 8px; padding: 16px; border: 1px solid var(--el-border-color-light); border-radius: 8px; background: var(--el-fill-color-light); }
.statistics-card span { color: var(--el-text-color-secondary); font-size: 13px; }
.statistics-card strong { color: var(--el-color-primary); font-size: 24px; }
</style>
