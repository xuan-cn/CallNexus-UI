<template>
  <div class="p-2 assignment-page">
    <div class="workspace">
      <el-card class="task-panel" shadow="never">
        <template #header>
          <div class="panel-heading">
            <div class="panel-title">导入任务</div>
            <div class="panel-desc">选择任务后分配该任务导入的客户</div>
          </div>
        </template>
        <el-input
          v-model="taskQuery.taskName"
          clearable
          placeholder="搜索任务"
          :prefix-icon="Search"
          class="task-search"
          @keyup.enter="searchTasks"
        />
        <div v-loading="taskLoading" class="task-list">
          <button
            v-for="task in tasks"
            :key="task.id"
            type="button"
            class="task-item"
            :class="{ active: `${task.id}` === `${selectedTaskId}` }"
            @click="selectTask(task)"
          >
            <div class="task-name">{{ task.taskName }}</div>
            <div class="task-counts">
              <span><b>{{ task.importedCount || 0 }}</b>导入</span>
              <span class="is-warn"><b>{{ task.unassignedCount || 0 }}</b>未分配</span>
              <span class="is-ok"><b>{{ task.assignedCount || 0 }}</b>已分配</span>
            </div>
            <div class="last-time">最近导入 {{ task.lastImportTime || '暂无' }}</div>
          </button>
          <el-empty v-if="!taskLoading && !tasks.length" description="暂无导入任务" :image-size="64" />
        </div>
        <pagination
          v-show="taskTotal > 0"
          v-model:page="taskQuery.pageNum"
          v-model:limit="taskQuery.pageSize"
          :total="taskTotal"
          layout="prev, pager, next"
          small
          class="task-pagination"
          @pagination="loadTasks"
        />
      </el-card>

      <el-card class="customer-panel" shadow="never">
        <template #header>
          <div class="panel-heading">
            <div class="panel-title">{{ selectedTask ? `资料分配 · ${selectedTask.taskName}` : '资料分配' }}</div>
            <div class="panel-desc">未分配资料仅管理员可见；重新分配会关闭原有效归属。</div>
          </div>
        </template>

        <el-empty v-if="!selectedTask" description="请选择导入任务" :image-size="80" />
        <template v-else>
          <el-form :model="query" class="filter-panel" label-position="top">
            <el-form-item label="分配状态">
              <el-select v-model="query.assignmentState" placeholder="全部状态" @change="search">
                <el-option v-for="option in stateOptions" :key="option.value" :label="option.label" :value="option.value" />
              </el-select>
            </el-form-item>
            <el-form-item label="客户电话">
              <el-input v-model="query.primaryPhone" clearable placeholder="手机号或电话" @keyup.enter="search" />
            </el-form-item>
            <el-form-item label="客户姓名">
              <el-input v-model="query.customerName" clearable placeholder="客户姓名" @keyup.enter="search" />
            </el-form-item>
            <el-form-item label="导入批次">
              <el-select v-model="query.importBatchId" clearable filterable placeholder="全部批次">
                <el-option
                  v-for="batch in batches"
                  :key="batch.batchId"
                  :label="batch.fileName || '未命名批次'"
                  :value="batch.batchId!"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="客户类型">
              <el-input v-model="query.customerType" clearable placeholder="客户类型" @keyup.enter="search" />
            </el-form-item>
            <el-form-item label="标签">
              <el-input v-model="query.tags" clearable placeholder="标签关键字" @keyup.enter="search" />
            </el-form-item>
            <el-form-item class="filter-actions">
              <el-button type="primary" @click="search">查询</el-button>
              <el-button @click="resetQuery">重置</el-button>
            </el-form-item>
          </el-form>

          <div class="table-toolbar">
            <div class="selection-summary">
              <span class="stat-pill">共 <b>{{ total }}</b> 条</span>
              <span v-if="selectedRows.length" class="stat-pill is-active">已选 <b>{{ selectedRows.length }}</b></span>
            </div>
            <div class="toolbar-actions">
              <el-button
                v-hasPermi="['callcenter:customer-assignment:assign']"
                type="primary"
                :disabled="!selectedRows.length"
                @click="openAssign()"
              >
                分配选中{{ selectedRows.length ? `（${selectedRows.length}）` : '' }}
              </el-button>
              <el-button
                v-hasPermi="['callcenter:customer-assignment:assign']"
                plain
                :disabled="!total"
                @click="openAssignAll"
              >
                平均分配筛选结果（{{ total }}）
              </el-button>
              <el-button circle :icon="Refresh" title="刷新列表" @click="loadCustomers" />
            </div>
          </div>

          <el-table
            v-loading="loading"
            :data="rows"
            class="assignment-table"
            row-key="id"
            stripe
            @selection-change="selectedRows = $event"
          >
            <el-table-column type="selection" width="46" />
            <el-table-column label="客户" min-width="140">
              <template #default="{ row }">
                <span class="customer-name">{{ row.customerName || '未命名客户' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="主号码" min-width="140">
              <template #default="{ row }">
                <span v-if="row.primaryPhone" class="phone-text">{{ row.primaryPhone }}</span>
                <span v-else class="empty-chip">暂无号码</span>
              </template>
            </el-table-column>
            <el-table-column label="客户类型" min-width="110">
              <template #default="{ row }">
                <el-tag v-if="row.customerType" effect="plain" round size="small">{{ row.customerType }}</el-tag>
                <span v-else class="empty-chip">未设置</span>
              </template>
            </el-table-column>
            <el-table-column label="来源渠道" min-width="110">
              <template #default="{ row }">
                <span v-if="row.sourceChannel">{{ row.sourceChannel }}</span>
                <span v-else class="empty-chip">未设置</span>
              </template>
            </el-table-column>
            <el-table-column label="标签" min-width="140" show-overflow-tooltip>
              <template #default="{ row }">
                <span v-if="row.tags">{{ row.tags }}</span>
                <span v-else class="empty-chip">无标签</span>
              </template>
            </el-table-column>
            <el-table-column label="归属技能组" min-width="130">
              <template #default="{ row }">
                <el-tag v-if="row.skillGroupId" type="success" effect="plain" round size="small">
                  {{ groupName(row.skillGroupId) }}
                </el-tag>
                <span v-else class="empty-chip">未分配</span>
              </template>
            </el-table-column>
            <el-table-column label="归属坐席" min-width="140">
              <template #default="{ row }">
                <el-tag v-if="row.agentId" effect="plain" round size="small">{{ agentName(row.agentId) }}</el-tag>
                <span v-else class="empty-chip">未分配</span>
              </template>
            </el-table-column>
            <el-table-column label="创建时间" width="160">
              <template #default="{ row }">
                <span class="time-text">{{ row.createTime || '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="88" fixed="right" align="center">
              <template #default="{ row }">
                <el-button link type="primary" @click="openAssign([row])">分配</el-button>
              </template>
            </el-table-column>
          </el-table>

          <pagination
            v-show="total > 0"
            v-model:page="query.pageNum"
            v-model:limit="query.pageSize"
            class="customer-pagination"
            :total="total"
            @pagination="loadCustomers"
          />
        </template>
      </el-card>
    </div>

    <el-drawer v-model="assignDrawer.visible" title="分配客户资料" size="560px" append-to-body @closed="resetAssign">
      <el-alert type="info" :closable="false" show-icon title="分配后只保留一条当前有效归属。坐席列表严格限定为所选技能组的有效成员。" />
      <el-form class="assign-form" :model="assignDrawer.form" label-width="100px">
        <el-form-item label="分配范围">
          <el-tag>{{ assignDrawer.form.selectAll ? `当前筛选结果 ${total} 个` : `${assignDrawer.form.customerIds.length} 个客户` }}</el-tag>
        </el-form-item>
        <el-form-item label="分配方式" required>
          <el-radio-group v-model="assignDrawer.form.allocationMode" @change="assignDrawer.form.agentId = undefined">
            <el-radio-button value="EVEN">组内平均分配</el-radio-button>
            <el-radio-button value="SPECIFIED_AGENT">指定坐席</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="技能组" required>
          <el-select
            v-model="assignDrawer.form.skillGroupId"
            filterable
            class="w-full"
            placeholder="请选择技能组"
            @change="assignDrawer.form.agentId = undefined"
          >
            <el-option v-for="group in enabledGroups" :key="group.id" :label="group.groupName" :value="group.id" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="assignDrawer.form.allocationMode === 'SPECIFIED_AGENT'" label="具体坐席" required>
          <el-select
            v-model="assignDrawer.form.agentId"
            filterable
            class="w-full"
            :disabled="!assignDrawer.form.skillGroupId"
            placeholder="请选择具体坐席"
          >
            <el-option
              v-for="agent in availableAgents"
              :key="agent.id"
              :label="`${agent.agentName}（${agent.agentCode}）`"
              :value="agent.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item v-else label="分配预览">
          <el-alert :closable="false" :type="availableAgents.length ? 'success' : 'warning'" :title="allocationPreview" show-icon />
        </el-form-item>
        <el-form-item label="客户类型"><el-input v-model="assignDrawer.form.customerType" /></el-form-item>
        <el-form-item label="来源渠道"><el-input v-model="assignDrawer.form.sourceChannel" /></el-form-item>
        <el-form-item label="标签"><el-input v-model="assignDrawer.form.tags" /></el-form-item>
        <el-form-item label="分配备注">
          <el-input v-model="assignDrawer.form.remark" type="textarea" :rows="4" maxlength="500" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="assignDrawer.visible = false">取消</el-button>
        <el-button type="primary" :loading="assignDrawer.loading" @click="submitAssign">确认分配</el-button>
      </template>
    </el-drawer>
  </div>
</template>

<script setup name="CustomerAssignment" lang="ts">
import { Refresh, Search } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import type { CustomerAssignmentForm, CustomerImportResultVO, CustomerQuery, CustomerVO } from '@/api/callcenter/customer';
import { listAgents } from '@/api/callcenter/agent';
import type { AgentVO } from '@/api/callcenter/agent/types';
import { listSkillGroups } from '@/api/callcenter/skill-group';
import type { SkillGroupVO } from '@/api/callcenter/skill-group/types';
import {
  assignImportTaskCustomers,
  pageImportTaskBatches,
  pageImportTaskCustomers,
  pageImportTasks,
  type CustomerImportTaskVO
} from '@/api/callcenter/customer-import-task';

const taskLoading = ref(false);
const tasks = ref<CustomerImportTaskVO[]>([]);
const taskTotal = ref(0);
const selectedTaskId = ref<string | number>();
const taskQuery = reactive({ pageNum: 1, pageSize: 8, taskName: '', status: '' });
const selectedTask = computed(() => tasks.value.find((item) => `${item.id}` === `${selectedTaskId.value}`));
const loading = ref(false);
const rows = ref<CustomerVO[]>([]);
const total = ref(0);
const selectedRows = ref<CustomerVO[]>([]);
const batches = ref<CustomerImportResultVO[]>([]);
const skillGroups = ref<SkillGroupVO[]>([]);
const agents = ref<AgentVO[]>([]);
const enabledGroups = computed(() => skillGroups.value.filter((item) => item.enabled));
const availableAgents = computed(() => {
  const group = skillGroups.value.find((item) => `${item.id}` === `${assignDrawer.form.skillGroupId}`);
  const ids = new Set((group?.agentIds || []).map(String));
  return agents.value.filter((item) => item.enabled && ids.has(String(item.id)));
});
const stateOptions = [
  { label: '全部', value: '' },
  { label: '未分配', value: 'UNASSIGNED' },
  { label: '已分配', value: 'ASSIGNED' }
];
const defaultQuery = (): CustomerQuery => ({ pageNum: 1, pageSize: 10, assignmentState: 'UNASSIGNED' });
const query = reactive<CustomerQuery>(defaultQuery());
const defaultAssign = (): CustomerAssignmentForm => ({
  customerIds: [],
  selectAll: false,
  allocationMode: 'EVEN',
  customerType: '',
  sourceChannel: '',
  tags: '',
  skillGroupId: undefined,
  agentId: undefined,
  remark: ''
});
const assignDrawer = reactive({ visible: false, loading: false, form: defaultAssign() });
const assignmentTargetCount = computed(() => (assignDrawer.form.selectAll ? total.value : assignDrawer.form.customerIds.length));
const allocationPreview = computed(() => {
  if (!assignDrawer.form.skillGroupId) return '选择技能组后可查看平均分配结果';
  const agentCount = availableAgents.value.length;
  if (!agentCount) return '当前技能组没有启用的坐席，无法平均分配';
  const minimum = Math.floor(assignmentTargetCount.value / agentCount);
  const remainder = assignmentTargetCount.value % agentCount;
  if (!remainder) return `${assignmentTargetCount.value} 条资料将平均分给 ${agentCount} 位坐席，每人 ${minimum} 条`;
  return `${assignmentTargetCount.value} 条资料将分给 ${agentCount} 位坐席，每人 ${minimum}～${minimum + 1} 条，最多相差 1 条`;
});

const loadTasks = async () => {
  taskLoading.value = true;
  try {
    const response = await pageImportTasks(taskQuery);
    tasks.value = response.rows || [];
    taskTotal.value = response.total || 0;
    if (!selectedTaskId.value && tasks.value.length) selectTask(tasks.value[0]);
  } finally {
    taskLoading.value = false;
  }
};
const searchTasks = () => {
  taskQuery.pageNum = 1;
  loadTasks();
};
const selectTask = (task: CustomerImportTaskVO) => {
  selectedTaskId.value = task.id;
  Object.assign(query, defaultQuery());
  selectedRows.value = [];
  loadBatches();
  loadCustomers();
};
const loadBatches = async () => {
  if (!selectedTaskId.value) return;
  const response = await pageImportTaskBatches(selectedTaskId.value, { pageNum: 1, pageSize: 200 });
  batches.value = response.rows || [];
};
const loadCustomers = async () => {
  if (!selectedTaskId.value) return;
  loading.value = true;
  try {
    const response = await pageImportTaskCustomers(selectedTaskId.value, query);
    rows.value = response.rows || [];
    total.value = response.total || 0;
  } finally {
    loading.value = false;
  }
};
const search = () => {
  query.pageNum = 1;
  selectedRows.value = [];
  loadCustomers();
};
const resetQuery = () => {
  Object.assign(query, defaultQuery());
  loadCustomers();
};
const openAssign = (targets?: CustomerVO[]) => {
  const list = targets?.length ? targets : selectedRows.value;
  if (!list.length) return ElMessage.warning('请选择客户');
  const first = list[0];
  assignDrawer.form = {
    ...defaultAssign(),
    customerIds: list.map((item) => item.id),
    customerType: list.length === 1 ? first.customerType : '',
    sourceChannel: list.length === 1 ? first.sourceChannel : '',
    tags: list.length === 1 ? first.tags : '',
    skillGroupId: list.length === 1 ? first.skillGroupId : undefined,
    agentId: list.length === 1 ? first.agentId : undefined,
    remark: list.length === 1 ? first.assignmentRemark : ''
  };
  assignDrawer.visible = true;
};
const openAssignAll = () => {
  assignDrawer.form = {
    ...defaultAssign(),
    allocationMode: 'EVEN',
    selectAll: true,
    selectionQuery: { ...query, pageNum: undefined, pageSize: undefined }
  };
  assignDrawer.visible = true;
};
const resetAssign = () => {
  assignDrawer.loading = false;
  assignDrawer.form = defaultAssign();
};
const submitAssign = async () => {
  if (!selectedTaskId.value || !assignDrawer.form.skillGroupId) return ElMessage.warning('请选择技能组');
  if (assignDrawer.form.allocationMode === 'EVEN' && !availableAgents.value.length) return ElMessage.warning('当前技能组没有启用的坐席');
  if (assignDrawer.form.allocationMode === 'SPECIFIED_AGENT' && !assignDrawer.form.agentId) return ElMessage.warning('请选择具体坐席');
  if (assignDrawer.form.agentId && !availableAgents.value.some((item) => `${item.id}` === `${assignDrawer.form.agentId}`)) {
    return ElMessage.warning('所选坐席不属于当前技能组');
  }
  assignDrawer.loading = true;
  try {
    await assignImportTaskCustomers(selectedTaskId.value, assignDrawer.form);
    ElMessage.success(assignDrawer.form.allocationMode === 'EVEN' ? '平均分配成功' : '分配成功');
    assignDrawer.visible = false;
    selectedRows.value = [];
    await loadTasks();
    await loadCustomers();
  } finally {
    assignDrawer.loading = false;
  }
};
const groupName = (id?: string | number) => skillGroups.value.find((item) => `${item.id}` === `${id}`)?.groupName || `${id || '-'}`;
const agentName = (id?: string | number) => {
  const item = agents.value.find((agent) => `${agent.id}` === `${id}`);
  return item ? `${item.agentName}（${item.agentCode}）` : `${id || '-'}`;
};

onMounted(async () => {
  const [groups, agentPage] = await Promise.all([listSkillGroups(), listAgents({ pageNum: 1, pageSize: 1000, enabled: true })]);
  skillGroups.value = groups.data || [];
  agents.value = agentPage.rows || [];
  await loadTasks();
});
</script>

<style scoped>
.assignment-page,
.workspace {
  height: calc(100vh - 105px);
}

.workspace {
  display: grid;
  grid-template-columns: minmax(280px, 28%) 1fr;
  gap: 14px;
}

.task-panel,
.customer-panel {
  min-height: 0;
}

.task-panel :deep(.el-card__header),
.customer-panel :deep(.el-card__header) {
  padding: 14px 16px !important;
}

.task-panel :deep(.el-card__body) {
  display: flex;
  flex-direction: column;
  height: calc(100% - 70px);
  padding: 12px 14px 10px !important;
}

.customer-panel :deep(.el-card__body) {
  display: flex;
  flex-direction: column;
  height: calc(100% - 70px);
  padding: 12px 14px 10px !important;
}

.panel-heading {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.panel-title {
  color: #15233d;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.3;
}

.panel-desc {
  color: #7b8798;
  font-size: 12px;
  line-height: 1.45;
}

.task-search {
  flex: none;
}

.task-list {
  flex: 1;
  min-height: 0;
  margin-top: 12px;
  overflow: auto;
}

.task-item {
  display: block;
  width: 100%;
  margin-bottom: 8px;
  padding: 12px 12px 10px;
  text-align: left;
  cursor: pointer;
  border: 1px solid #e4ecf6;
  border-radius: 12px;
  background: #fff;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease,
    box-shadow 0.15s ease;
}

.task-item:hover {
  border-color: #c5d8ff;
  background: #f8fbff;
}

.task-item.active {
  border-color: rgba(37, 99, 235, 0.35);
  background: linear-gradient(180deg, #f5f9ff, #eef5ff);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.08);
}

.task-name {
  color: #17324d;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.3;
}

.task-counts {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  margin-top: 10px;
  color: #64748b;
  font-size: 11px;
}

.task-counts span {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 8px;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #eef2f7;
}

.task-counts b {
  color: #153b60;
  font-size: 15px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
}

.task-counts .is-warn b {
  color: #c2410c;
}

.task-counts .is-ok b {
  color: #0f766e;
}

.task-item.active .task-counts span {
  background: rgba(255, 255, 255, 0.72);
  border-color: #dbe7f5;
}

.last-time {
  margin-top: 8px;
  color: #94a3b8;
  font-size: 11px;
}

.task-pagination {
  flex: none;
  margin-top: 8px;
}

.filter-panel {
  display: grid;
  grid-template-columns: repeat(4, minmax(140px, 1fr));
  gap: 10px 12px;
  margin-bottom: 12px;
  padding: 12px 14px;
  border: 1px solid #e8eef6;
  border-radius: 12px;
  background: #f7faff;
}

.filter-panel :deep(.el-form-item) {
  margin: 0;
}

.filter-panel :deep(.el-form-item__label) {
  height: auto;
  padding: 0 0 6px;
  color: #64748b;
  font-size: 12px;
  font-weight: 500;
  line-height: 18px;
}

.filter-panel :deep(.el-input),
.filter-panel :deep(.el-select) {
  width: 100%;
}

.filter-actions {
  align-self: end;
}

.filter-actions :deep(.el-form-item__content) {
  justify-content: flex-end;
  gap: 8px;
}

.table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 44px;
  margin-bottom: 12px;
  padding: 8px 12px;
  border: 1px solid #e8eef6;
  border-radius: 12px;
  background: #f7faff;
}

.selection-summary,
.toolbar-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.stat-pill {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border: 1px solid #e4ecf6;
  border-radius: 999px;
  background: #fff;
  color: #64748b;
  font-size: 12px;
}

.stat-pill b {
  margin: 0 2px;
  color: #153b60;
  font-weight: 600;
}

.stat-pill.is-active {
  border-color: rgba(37, 99, 235, 0.28);
  background: rgba(37, 99, 235, 0.08);
  color: #1d4ed8;
}

.stat-pill.is-active b {
  color: #1d4ed8;
}

.assignment-table {
  width: 100%;
}

.assignment-table :deep(.el-table__header th) {
  font-size: 12px;
  font-weight: 600;
}

.assignment-table :deep(.el-table__row) {
  height: 48px;
}

.customer-name {
  color: #17324d;
  font-size: 14px;
  font-weight: 600;
}

.phone-text {
  color: #35507a;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

.time-text {
  color: #64748b;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.empty-chip {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 8px;
  border: 1px solid #e8eef6;
  border-radius: 999px;
  background: #f8fafc;
  color: #94a3b8;
  font-size: 12px;
  line-height: 1;
  white-space: nowrap;
}

.customer-pagination {
  margin-top: 12px;
}

.assign-form {
  margin-top: 18px;
}

.w-full {
  width: 100%;
}

@media (max-width: 1400px) {
  .filter-panel {
    grid-template-columns: repeat(3, minmax(150px, 1fr));
  }
}

@media (max-width: 1200px) {
  .workspace {
    grid-template-columns: 270px 1fr;
  }

  .filter-panel {
    grid-template-columns: repeat(2, minmax(160px, 1fr));
  }

  .table-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
