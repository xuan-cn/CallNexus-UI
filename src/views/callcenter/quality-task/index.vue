<template>
  <div class="p-2 quality-task-page">
    <el-card shadow="never" class="mb-2">
      <el-form :model="query" inline size="small">
        <el-form-item label="关键词"
          ><el-input v-model="query.keyword" clearable placeholder="任务号/通话ID/坐席" @keyup.enter="search"
        /></el-form-item>
        <el-form-item label="状态"
          ><el-select v-model="query.status" clearable placeholder="全部状态" style="width: 140px"
            ><el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select
        ></el-form-item>
        <el-form-item label="质检员"
          ><el-select v-model="query.reviewerId" clearable filterable placeholder="全部质检员" style="width: 150px"
            ><el-option v-for="item in reviewers" :key="item.id" :label="item.name" :value="item.id" /></el-select
        ></el-form-item>
        <el-form-item
          ><el-button type="primary" icon="Search" @click="search">查询</el-button
          ><el-button icon="Refresh" @click="reset">重置</el-button></el-form-item
        >
      </el-form>
    </el-card>
    <el-card shadow="never">
      <template #header
        ><div class="task-header">
          <div>
            <h3>质检任务</h3>
            <span>人工抽取已结束通话，分配质检员并跟踪评分结果</span>
          </div>
          <el-button v-hasPermi="['callcenter:quality-task:create']" type="primary" icon="Plus" @click="openCreate">抽取通话</el-button>
        </div></template
      >
      <el-table v-loading="loading" :data="rows">
        <el-table-column label="任务编号" prop="taskCode" min-width="155" />
        <el-table-column label="通话" min-width="190"
          ><template #default="{ row }"
            ><div>{{ row.businessCallId || row.callSessionId }}</div>
            <small>{{ row.queueName || '-' }} · 分机 {{ row.agentExtension || '-' }}</small></template
          ></el-table-column
        >
        <el-table-column label="评分模板" prop="templateName" min-width="140" />
        <el-table-column label="质检员" prop="reviewerName" width="110"
          ><template #default="{ row }">{{ row.reviewerName || '待分配' }}</template></el-table-column
        >
        <el-table-column label="优先级" width="80" align="center"
          ><template #default="{ row }">P{{ row.priority }}</template></el-table-column
        >
        <el-table-column label="状态" width="100"
          ><template #default="{ row }"
            ><el-tag :type="statusType(row.status)">{{ statusLabel(row.status) }}</el-tag></template
          ></el-table-column
        >
        <el-table-column label="得分" width="100"
          ><template #default="{ row }"
            ><span v-if="row.totalScore !== undefined"
              >{{ row.totalScore }}
              <el-tag size="small" :type="row.qualified ? 'success' : 'danger'">{{ row.qualified ? '合格' : '不合格' }}</el-tag></span
            ><span v-else>-</span></template
          ></el-table-column
        >
        <el-table-column label="创建时间" prop="createTime" width="165" />
        <el-table-column label="操作" width="205" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link type="primary" @click="openWorkbench(row)">进入质检</el-button>
            <el-button
              v-if="['PENDING', 'ASSIGNED'].includes(row.status)"
              v-hasPermi="['callcenter:quality-task:assign']"
              link
              type="primary"
              @click="openAssign(row)"
              >分配</el-button
            >
            <el-button v-if="row.status === 'SUBMITTED'" v-hasPermi="['callcenter:quality-task:publish']" link type="success" @click="publish(row)"
              >发布</el-button
            >
          </template>
        </el-table-column>
      </el-table>
      <pagination
        v-show="total > 0"
        v-model:page="query.pageNum"
        v-model:limit="query.pageSize"
        :total="total"
        :auto-scroll="false"
        @pagination="load"
      />
    </el-card>

    <el-dialog v-model="createDialog" title="从通话记录创建质检任务" width="1060px" append-to-body>
      <el-form :model="createForm" inline size="small" class="candidate-filter">
        <el-form-item label="评分模板"
          ><el-select v-model="createForm.templateId" filterable placeholder="选择已发布模板" style="width: 210px"
            ><el-option
              v-for="item in publishedTemplates"
              :key="item.id"
              :label="`${item.templateName} V${item.currentVersionNo || 1}`"
              :value="item.id" /></el-select
        ></el-form-item>
        <el-form-item label="分配给"
          ><el-select v-model="createForm.reviewerId" clearable filterable placeholder="暂不分配" style="width: 160px"
            ><el-option v-for="item in reviewers" :key="item.id" :label="item.name" :value="item.id" /></el-select
        ></el-form-item>
        <el-form-item label="优先级"><el-input-number v-model="createForm.priority" :min="1" :max="9" /></el-form-item>
        <el-form-item label="号码"><el-input v-model="candidateQuery.participantNumber" clearable placeholder="主叫或被叫" /></el-form-item>
        <el-form-item><el-button type="primary" plain icon="Search" @click="loadCandidates">筛选通话</el-button></el-form-item>
      </el-form>
      <el-table
        ref="candidateTableRef"
        v-loading="candidateLoading"
        :data="candidates"
        row-key="id"
        max-height="430"
        @selection-change="selectedCalls = $event"
      >
        <el-table-column type="selection" width="48" reserve-selection />
        <el-table-column label="开始时间" prop="startedAt" width="165" />
        <el-table-column label="方向" width="70"
          ><template #default="{ row }">{{
            row.direction === 'INBOUND' ? '呼入' : row.direction === 'OUTBOUND' ? '呼出' : row.direction
          }}</template></el-table-column
        >
        <el-table-column label="主叫" prop="callerNumber" min-width="120" /><el-table-column label="被叫" prop="calledNumber" min-width="120" />
        <el-table-column label="队列/坐席" min-width="150"
          ><template #default="{ row }">{{ row.handlingQueueName || '-' }} / {{ row.agentExtension || '-' }}</template></el-table-column
        >
        <el-table-column label="接通时长" width="100"
          ><template #default="{ row }">{{ duration(row.billableSeconds) }}</template></el-table-column
        >
        <el-table-column label="录音" width="80"
          ><template #default="{ row }"
            ><el-tag :type="row.recordingStatus === 'UPLOADED' ? 'success' : 'info'">{{
              row.recordingStatus === 'UPLOADED' ? '可用' : '无'
            }}</el-tag></template
          ></el-table-column
        >
      </el-table>
      <pagination
        v-show="candidateTotal > 0"
        v-model:page="candidateQuery.pageNum"
        v-model:limit="candidateQuery.pageSize"
        :total="candidateTotal"
        :auto-scroll="false"
        @pagination="loadCandidates"
      />
      <template #footer
        ><span class="selection-count">已选择 {{ selectedCalls.length }} 通</span><el-button @click="createDialog = false">取消</el-button
        ><el-button type="primary" :loading="creating" @click="createTasks">创建任务</el-button></template
      >
    </el-dialog>

    <el-dialog v-model="assignDialog" title="分配质检任务" width="420px" append-to-body>
      <el-form label-width="80px"
        ><el-form-item label="质检员"
          ><el-select v-model="assignReviewerId" filterable style="width: 100%"
            ><el-option v-for="item in reviewers" :key="item.id" :label="item.name" :value="item.id" /></el-select></el-form-item
      ></el-form>
      <template #footer
        ><el-button @click="assignDialog = false">取消</el-button><el-button type="primary" @click="assign">确认分配</el-button></template
      >
    </el-dialog>
  </div>
</template>

<script setup name="QualityTask" lang="ts">
import {
  assignQualityTask,
  createManualQualityTasks,
  listQualityReviewers,
  listQualityTemplates,
  pageQualityCallCandidates,
  pageQualityTasks,
  publishQualityResult
} from '@/api/callcenter/quality';
import type { ManualQualityTaskForm, QualityTaskQuery, QualityTaskVO, QualityTemplateVO, QualityUserOptionVO } from '@/api/callcenter/quality/types';
import type { CallRecordQuery, CallRecordVO } from '@/api/callcenter/call-record/types';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;
const router = useRouter();
const loading = ref(false),
  candidateLoading = ref(false),
  creating = ref(false),
  createDialog = ref(false),
  assignDialog = ref(false);
const rows = ref<QualityTaskVO[]>([]),
  reviewers = ref<QualityUserOptionVO[]>([]),
  templates = ref<QualityTemplateVO[]>([]),
  candidates = ref<CallRecordVO[]>([]),
  selectedCalls = ref<CallRecordVO[]>([]);
const total = ref(0),
  candidateTotal = ref(0);
const candidateTableRef = ref();
const activeTaskId = ref<string | number>();
const assignReviewerId = ref<string | number>();
const query = reactive<QualityTaskQuery>({ pageNum: 1, pageSize: 10 });
const candidateQuery = reactive<CallRecordQuery>({ pageNum: 1, pageSize: 10 });
const createForm = reactive<ManualQualityTaskForm>({ templateId: undefined, callSessionIds: [], priority: 5, reviewerId: undefined });
const statusOptions = [
  { label: '待分配', value: 'PENDING' },
  { label: '待质检', value: 'ASSIGNED' },
  { label: '已提交', value: 'SUBMITTED' },
  { label: '已发布', value: 'PUBLISHED' }
];
const statusLabel = (value: string) =>
  (
    ({
      PENDING: '待分配',
      ASSIGNED: '待质检',
      REVIEWING: '质检中',
      SUBMITTED: '已提交',
      PUBLISHED: '已发布',
      CLOSED: '已关闭',
      CANCELLED: '已取消'
    }) as Record<string, string>
  )[value] || value;
const statusType = (value: string) =>
  (({ PENDING: 'warning', ASSIGNED: 'primary', SUBMITTED: 'info', PUBLISHED: 'success' }) as Record<string, any>)[value] || 'info';
const duration = (seconds?: number) => {
  const value = Math.max(0, Number(seconds || 0));
  return value >= 60 ? `${Math.floor(value / 60)}分${value % 60}秒` : `${value}秒`;
};
const publishedTemplates = computed(() => templates.value.filter((item) => item.currentVersionId));
const load = async () => {
  loading.value = true;
  try {
    const response = await pageQualityTasks(query);
    rows.value = response.rows || [];
    total.value = response.total || 0;
  } finally {
    loading.value = false;
  }
};
const loadOptions = async () => {
  const [templateResponse, reviewerResponse] = await Promise.all([listQualityTemplates(), listQualityReviewers()]);
  templates.value = templateResponse.data || [];
  reviewers.value = reviewerResponse.data || [];
};
const search = () => {
  query.pageNum = 1;
  void load();
};
const reset = () => {
  Object.assign(query, { pageNum: 1, pageSize: 10, keyword: undefined, status: undefined, reviewerId: undefined });
  void load();
};
const loadCandidates = async () => {
  candidateLoading.value = true;
  try {
    const response = await pageQualityCallCandidates(candidateQuery);
    candidates.value = response.rows || [];
    candidateTotal.value = response.total || 0;
  } finally {
    candidateLoading.value = false;
  }
};
const openCreate = () => {
  Object.assign(createForm, { templateId: publishedTemplates.value[0]?.id, callSessionIds: [], priority: 5, reviewerId: undefined });
  selectedCalls.value = [];
  candidateTableRef.value?.clearSelection();
  createDialog.value = true;
  void loadCandidates();
};
const createTasks = async () => {
  if (!createForm.templateId) return proxy?.$modal.msgError('请选择已发布的评分模板');
  if (!selectedCalls.value.length) return proxy?.$modal.msgError('请至少选择一通电话');
  creating.value = true;
  try {
    await createManualQualityTasks({ ...createForm, callSessionIds: selectedCalls.value.map((item) => item.id) });
    proxy?.$modal.msgSuccess(`已创建 ${selectedCalls.value.length} 个质检任务`);
    createDialog.value = false;
    await load();
  } finally {
    creating.value = false;
  }
};
const openAssign = (row: QualityTaskVO) => {
  activeTaskId.value = row.id;
  assignReviewerId.value = row.reviewerId;
  assignDialog.value = true;
};
const assign = async () => {
  if (!activeTaskId.value || !assignReviewerId.value) return proxy?.$modal.msgError('请选择质检员');
  await assignQualityTask(activeTaskId.value, assignReviewerId.value);
  proxy?.$modal.msgSuccess('分配成功');
  assignDialog.value = false;
  await load();
};
const openWorkbench = (row: QualityTaskVO) => router.push({ path: '/quality-management/workbench', query: { taskId: String(row.id) } });
const publish = async (row: QualityTaskVO) => {
  await proxy?.$modal.confirm('发布后该评分结果将正式生效，确定继续吗？');
  await publishQualityResult(row.id);
  proxy?.$modal.msgSuccess('质检结果已发布');
  await load();
};
onMounted(async () => {
  await loadOptions();
  await load();
});
</script>

<style scoped lang="scss">
.quality-task-page {
  font-size: 12px;
}
.task-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.task-header h3 {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 500;
}
.task-header span,
small {
  color: var(--el-text-color-secondary);
  font-size: 11px;
}
.candidate-filter {
  padding: 10px 12px 0;
  background: var(--el-fill-color-lighter);
  border-radius: 8px;
}
.selection-count {
  margin-right: 14px;
  color: var(--el-text-color-secondary);
}
</style>
