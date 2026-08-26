<template>
  <div class="p-2 assignment-page">
    <div class="workspace">
      <el-card class="task-panel" shadow="never">
        <template #header>
          <div class="panel-title">导入任务</div>
          <div class="panel-desc">选择任务后分配该任务导入的客户</div>
        </template>
        <el-input v-model="taskQuery.taskName" clearable placeholder="搜索任务" :prefix-icon="Search" @keyup.enter="searchTasks" />
        <div v-loading="taskLoading" class="task-list">
          <button v-for="task in tasks" :key="task.id" class="task-item" :class="{ active: `${task.id}` === `${selectedTaskId}` }" @click="selectTask(task)">
            <div class="task-name">{{ task.taskName }}</div>
            <div class="task-code">{{ task.taskCode }}</div>
            <div class="task-counts">
              <span><b>{{ task.importedCount || 0 }}</b> 导入</span>
              <span><b>{{ task.unassignedCount || 0 }}</b> 未分配</span>
              <span><b>{{ task.assignedCount || 0 }}</b> 已分配</span>
            </div>
            <div class="last-time">最近导入：{{ task.lastImportTime || '无' }}</div>
          </button>
          <el-empty v-if="!taskLoading && !tasks.length" description="暂无导入任务" :image-size="75" />
        </div>
        <pagination v-show="taskTotal > 0" v-model:page="taskQuery.pageNum" v-model:limit="taskQuery.pageSize" :total="taskTotal" layout="prev, pager, next" small @pagination="loadTasks" />
      </el-card>

      <el-card class="customer-panel" shadow="never">
        <template #header>
          <div class="page-header">
            <div>
              <div class="panel-title">{{ selectedTask ? `资料分配 · ${selectedTask.taskName}` : '资料分配' }}</div>
              <div class="panel-desc">未分配资料仅管理员可见；重新分配会关闭原有效归属。</div>
            </div>
          </div>
        </template>
        <el-empty v-if="!selectedTask" description="请选择导入任务" />
        <template v-else>
          <el-form :model="query" class="filter-panel" label-position="top">
            <el-form-item label="分配状态">
              <el-select v-model="query.assignmentState" placeholder="全部状态" @change="search">
                <el-option v-for="option in stateOptions" :key="option.value" :label="option.label" :value="option.value" />
              </el-select>
            </el-form-item>
            <el-form-item label="客户电话"><el-input v-model="query.primaryPhone" clearable placeholder="手机号或电话" @keyup.enter="search" /></el-form-item>
            <el-form-item label="客户姓名"><el-input v-model="query.customerName" clearable placeholder="客户姓名" @keyup.enter="search" /></el-form-item>
            <el-form-item label="导入批次">
              <el-select v-model="query.importBatchId" clearable filterable placeholder="全部批次">
                <el-option v-for="batch in batches" :key="batch.batchId" :label="batch.fileName || `${batch.batchId}`" :value="batch.batchId!" />
              </el-select>
            </el-form-item>
            <el-form-item label="客户类型"><el-input v-model="query.customerType" clearable placeholder="客户类型" @keyup.enter="search" /></el-form-item>
            <el-form-item label="标签"><el-input v-model="query.tags" clearable placeholder="标签关键字" @keyup.enter="search" /></el-form-item>
            <el-form-item class="filter-actions">
              <el-button type="primary" @click="search">查询</el-button>
              <el-button @click="resetQuery">重置</el-button>
            </el-form-item>
          </el-form>

          <div class="table-toolbar">
            <div class="selection-summary">
              <span>共 {{ total }} 条</span>
              <el-tag v-if="selectedRows.length" type="primary" effect="plain">已选 {{ selectedRows.length }} 条</el-tag>
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
          <el-table v-loading="loading" :data="rows" row-key="id" @selection-change="selectedRows = $event">
            <el-table-column type="selection" width="48" />
            <el-table-column label="客户" min-width="170"><template #default="{ row }"><div class="customer-name">{{ row.customerName || '未命名客户' }}</div><div class="customer-id">ID {{ row.id }}</div></template></el-table-column>
            <el-table-column label="主号码" prop="primaryPhone" min-width="145" />
            <el-table-column label="客户类型" min-width="120"><template #default="{ row }">{{ row.customerType || '-' }}</template></el-table-column>
            <el-table-column label="来源渠道" min-width="120"><template #default="{ row }">{{ row.sourceChannel || '-' }}</template></el-table-column>
            <el-table-column label="标签" prop="tags" min-width="145" show-overflow-tooltip />
            <el-table-column label="归属技能组" min-width="145"><template #default="{ row }"><el-tag v-if="row.skillGroupId" type="success" effect="plain">{{ groupName(row.skillGroupId) }}</el-tag><span v-else class="muted">未分配</span></template></el-table-column>
            <el-table-column label="归属坐席" min-width="145"><template #default="{ row }"><el-tag v-if="row.agentId" effect="plain">{{ agentName(row.agentId) }}</el-tag><span v-else class="muted">-</span></template></el-table-column>
            <el-table-column label="创建时间" prop="createTime" width="170" />
            <el-table-column label="操作" width="90" fixed="right"><template #default="{ row }"><el-button link type="primary" @click="openAssign([row])">分配</el-button></template></el-table-column>
          </el-table>
          <pagination v-show="total > 0" v-model:page="query.pageNum" v-model:limit="query.pageSize" :total="total" @pagination="loadCustomers" />
        </template>
      </el-card>
    </div>

    <el-drawer v-model="assignDrawer.visible" title="分配客户资料" size="560px" append-to-body @closed="resetAssign">
      <el-alert type="info" :closable="false" show-icon title="分配后只保留一条当前有效归属。坐席列表严格限定为所选技能组的有效成员。" />
      <el-form class="assign-form" :model="assignDrawer.form" label-width="100px">
        <el-form-item label="分配范围"><el-tag>{{ assignDrawer.form.selectAll ? `当前筛选结果 ${total} 个` : `${assignDrawer.form.customerIds.length} 个客户` }}</el-tag></el-form-item>
        <el-form-item label="分配方式" required>
          <el-radio-group v-model="assignDrawer.form.allocationMode" @change="assignDrawer.form.agentId = undefined">
            <el-radio-button value="EVEN">组内平均分配</el-radio-button>
            <el-radio-button value="SPECIFIED_AGENT">指定坐席</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="技能组" required>
          <el-select v-model="assignDrawer.form.skillGroupId" filterable class="w-full" placeholder="请选择技能组" @change="assignDrawer.form.agentId = undefined">
            <el-option v-for="group in enabledGroups" :key="group.id" :label="group.groupName" :value="group.id" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="assignDrawer.form.allocationMode === 'SPECIFIED_AGENT'" label="具体坐席" required>
          <el-select v-model="assignDrawer.form.agentId" filterable class="w-full" :disabled="!assignDrawer.form.skillGroupId" placeholder="请选择具体坐席">
            <el-option v-for="agent in availableAgents" :key="agent.id" :label="`${agent.agentName}（${agent.agentCode}）`" :value="agent.id" />
          </el-select>
        </el-form-item>
        <el-form-item v-else label="分配预览">
          <el-alert :closable="false" :type="availableAgents.length ? 'success' : 'warning'" :title="allocationPreview" show-icon />
        </el-form-item>
        <el-form-item label="客户类型"><el-input v-model="assignDrawer.form.customerType" /></el-form-item>
        <el-form-item label="来源渠道"><el-input v-model="assignDrawer.form.sourceChannel" /></el-form-item>
        <el-form-item label="标签"><el-input v-model="assignDrawer.form.tags" /></el-form-item>
        <el-form-item label="分配备注"><el-input v-model="assignDrawer.form.remark" type="textarea" :rows="4" maxlength="500" show-word-limit /></el-form-item>
      </el-form>
      <template #footer><el-button @click="assignDrawer.visible = false">取消</el-button><el-button type="primary" :loading="assignDrawer.loading" @click="submitAssign">确认分配</el-button></template>
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

const taskLoading = ref(false); const tasks = ref<CustomerImportTaskVO[]>([]); const taskTotal = ref(0); const selectedTaskId = ref<string | number>();
const taskQuery = reactive({ pageNum: 1, pageSize: 8, taskName: '', status: '' });
const selectedTask = computed(() => tasks.value.find((item) => `${item.id}` === `${selectedTaskId.value}`));
const loading = ref(false); const rows = ref<CustomerVO[]>([]); const total = ref(0); const selectedRows = ref<CustomerVO[]>([]);
const batches = ref<CustomerImportResultVO[]>([]); const skillGroups = ref<SkillGroupVO[]>([]); const agents = ref<AgentVO[]>([]);
const enabledGroups = computed(() => skillGroups.value.filter((item) => item.enabled));
const availableAgents = computed(() => {
  const group = skillGroups.value.find((item) => `${item.id}` === `${assignDrawer.form.skillGroupId}`);
  const ids = new Set((group?.agentIds || []).map(String));
  return agents.value.filter((item) => item.enabled && ids.has(String(item.id)));
});
const stateOptions = [{ label: '全部', value: '' }, { label: '未分配', value: 'UNASSIGNED' }, { label: '已分配', value: 'ASSIGNED' }];
const defaultQuery = (): CustomerQuery => ({ pageNum: 1, pageSize: 10, assignmentState: 'UNASSIGNED' });
const query = reactive<CustomerQuery>(defaultQuery());
const defaultAssign = (): CustomerAssignmentForm => ({ customerIds: [], selectAll: false, allocationMode: 'EVEN', customerType: '', sourceChannel: '', tags: '', skillGroupId: undefined, agentId: undefined, remark: '' });
const assignDrawer = reactive({ visible: false, loading: false, form: defaultAssign() });
const assignmentTargetCount = computed(() => assignDrawer.form.selectAll ? total.value : assignDrawer.form.customerIds.length);
const allocationPreview = computed(() => {
  if (!assignDrawer.form.skillGroupId) return '选择技能组后可查看平均分配结果';
  const agentCount = availableAgents.value.length;
  if (!agentCount) return '当前技能组没有启用的坐席，无法平均分配';
  const minimum = Math.floor(assignmentTargetCount.value / agentCount);
  const remainder = assignmentTargetCount.value % agentCount;
  if (!remainder) return `${assignmentTargetCount.value} 条资料将平均分给 ${agentCount} 位坐席，每人 ${minimum} 条`;
  return `${assignmentTargetCount.value} 条资料将分给 ${agentCount} 位坐席，每人 ${minimum}～${minimum + 1} 条，最多相差 1 条`;
});

const loadTasks = async () => { taskLoading.value = true; try { const response = await pageImportTasks(taskQuery); tasks.value = response.rows || []; taskTotal.value = response.total || 0; if (!selectedTaskId.value && tasks.value.length) selectTask(tasks.value[0]); } finally { taskLoading.value = false; } };
const searchTasks = () => { taskQuery.pageNum = 1; loadTasks(); };
const selectTask = (task: CustomerImportTaskVO) => { selectedTaskId.value = task.id; Object.assign(query, defaultQuery()); selectedRows.value = []; loadBatches(); loadCustomers(); };
const loadBatches = async () => { if (!selectedTaskId.value) return; const response = await pageImportTaskBatches(selectedTaskId.value, { pageNum: 1, pageSize: 200 }); batches.value = response.rows || []; };
const loadCustomers = async () => { if (!selectedTaskId.value) return; loading.value = true; try { const response = await pageImportTaskCustomers(selectedTaskId.value, query); rows.value = response.rows || []; total.value = response.total || 0; } finally { loading.value = false; } };
const search = () => { query.pageNum = 1; selectedRows.value = []; loadCustomers(); };
const resetQuery = () => { Object.assign(query, defaultQuery()); loadCustomers(); };
const openAssign = (targets?: CustomerVO[]) => { const list = targets?.length ? targets : selectedRows.value; if (!list.length) return ElMessage.warning('请选择客户'); const first = list[0]; assignDrawer.form = { ...defaultAssign(), customerIds: list.map((item) => item.id), customerType: list.length === 1 ? first.customerType : '', sourceChannel: list.length === 1 ? first.sourceChannel : '', tags: list.length === 1 ? first.tags : '', skillGroupId: list.length === 1 ? first.skillGroupId : undefined, agentId: list.length === 1 ? first.agentId : undefined, remark: list.length === 1 ? first.assignmentRemark : '' }; assignDrawer.visible = true; };
const openAssignAll = () => { assignDrawer.form = { ...defaultAssign(), allocationMode: 'EVEN', selectAll: true, selectionQuery: { ...query, pageNum: undefined, pageSize: undefined } }; assignDrawer.visible = true; };
const resetAssign = () => { assignDrawer.loading = false; assignDrawer.form = defaultAssign(); };
const submitAssign = async () => { if (!selectedTaskId.value || !assignDrawer.form.skillGroupId) return ElMessage.warning('请选择技能组'); if (assignDrawer.form.allocationMode === 'EVEN' && !availableAgents.value.length) return ElMessage.warning('当前技能组没有启用的坐席'); if (assignDrawer.form.allocationMode === 'SPECIFIED_AGENT' && !assignDrawer.form.agentId) return ElMessage.warning('请选择具体坐席'); if (assignDrawer.form.agentId && !availableAgents.value.some((item) => `${item.id}` === `${assignDrawer.form.agentId}`)) return ElMessage.warning('所选坐席不属于当前技能组'); assignDrawer.loading = true; try { await assignImportTaskCustomers(selectedTaskId.value, assignDrawer.form); ElMessage.success(assignDrawer.form.allocationMode === 'EVEN' ? '平均分配成功' : '分配成功'); assignDrawer.visible = false; selectedRows.value = []; await loadTasks(); await loadCustomers(); } finally { assignDrawer.loading = false; } };
const groupName = (id?: string | number) => skillGroups.value.find((item) => `${item.id}` === `${id}`)?.groupName || `${id || '-'}`;
const agentName = (id?: string | number) => { const item = agents.value.find((agent) => `${agent.id}` === `${id}`); return item ? `${item.agentName}（${item.agentCode}）` : `${id || '-'}`; };

onMounted(async () => { const [groups, agentPage] = await Promise.all([listSkillGroups(), listAgents({ pageNum: 1, pageSize: 1000, enabled: true })]); skillGroups.value = groups.data || []; agents.value = agentPage.rows || []; await loadTasks(); });
</script>

<style scoped>
.assignment-page,.workspace{height:calc(100vh - 105px)}.workspace{display:grid;grid-template-columns:minmax(300px,30%) 1fr;gap:12px}.task-panel,.customer-panel{min-height:0}.task-panel:deep(.el-card__body){height:calc(100% - 74px);display:flex;flex-direction:column}.panel-title{font-size:18px;font-weight:700;color:#102a43}.panel-desc,.task-code,.last-time,.muted{font-size:12px;color:#8795a6}.task-list{flex:1;min-height:0;overflow:auto;margin-top:12px}.task-item{display:block;width:100%;padding:14px;margin-bottom:10px;text-align:left;background:#fff;border:1px solid #e3e9f0;border-radius:10px;cursor:pointer}.task-item.active{border-color:transparent;background:#f2f7fc;box-shadow:none}.task-name{font-weight:700;color:#17324d}.task-code{margin:4px 0 12px}.task-counts{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;color:#60758a;font-size:12px}.task-counts b{display:block;font-size:16px;color:#153b60}.last-time{margin-top:10px}.page-header,.table-toolbar,.selection-summary,.toolbar-actions{display:flex;align-items:center}.page-header,.table-toolbar{justify-content:space-between;gap:14px}.filter-panel{display:grid;grid-template-columns:repeat(4,minmax(150px,1fr));gap:10px 14px;padding:14px 16px;margin-bottom:10px;background:#f7f9fc;border:1px solid #e8edf3;border-radius:10px}.filter-panel:deep(.el-form-item){margin:0}.filter-panel:deep(.el-form-item__label){height:auto;padding:0 0 6px;font-size:12px;font-weight:600;line-height:18px;color:#52677d}.filter-panel:deep(.el-input),.filter-panel:deep(.el-select){width:100%}.filter-actions{align-self:end}.filter-actions:deep(.el-form-item__content){justify-content:flex-end}.table-toolbar{min-height:48px;padding:6px 0;border-bottom:1px solid #edf1f5;color:#75869a;font-size:13px}.selection-summary,.toolbar-actions{gap:10px}.customer-name{font-weight:600}.customer-id{font-size:12px;color:#94a3b8}.assign-form{margin-top:18px}.w-full{width:100%}@media(max-width:1400px){.filter-panel{grid-template-columns:repeat(3,minmax(160px,1fr))}}@media(max-width:1200px){.filter-panel{grid-template-columns:repeat(2,minmax(180px,1fr))}.workspace{grid-template-columns:290px 1fr}.table-toolbar{align-items:flex-start;flex-direction:column}.toolbar-actions{flex-wrap:wrap}}
</style>
