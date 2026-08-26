<template>
  <el-drawer v-model="visible" :title="`名单管理 · ${task?.taskName || ''}`" size="900px">
    <el-alert
      title="来源规则只决定下次生成哪些客户；生成后形成号码快照，客户资料变化不会自动改写已有名单。"
      type="info"
      :closable="false"
      show-icon
    />

    <div class="section-title"><span>客户资料来源</span><el-button type="primary" plain @click="openSourceDialog">添加来源</el-button></div>
    <el-table v-loading="sourceLoading" :data="sources" empty-text="尚未配置资料来源" max-height="220">
      <el-table-column label="导入任务" prop="importTaskName" min-width="150" />
      <el-table-column label="筛选条件" prop="filterSummary" min-width="360" show-overflow-tooltip />
      <el-table-column label="状态" width="80"
        ><template #default="{ row }"
          ><el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '停用' }}</el-tag></template
        ></el-table-column
      >
      <el-table-column label="操作" width="80"
        ><template #default="{ row }"
          ><el-button link type="danger" :disabled="(task?.totalCount || 0) > 0" @click="removeSource(row)">删除</el-button></template
        ></el-table-column
      >
    </el-table>

    <div class="member-toolbar">
      <div class="section-title member-title">
        <span>名单快照</span><span class="hint">共 {{ memberTotal }} 条</span>
      </div>
      <div>
        <el-input v-model="memberQuery.phoneNumber" clearable placeholder="搜索号码" class="phone-search" @keyup.enter="loadMembers" />
        <el-select v-model="memberQuery.status" clearable placeholder="全部状态" class="status-select" @change="loadMembers">
          <el-option label="待拨打" value="PENDING" /><el-option label="已拦截" value="BLOCKED" /><el-option label="已完成" value="COMPLETED" />
        </el-select>
        <el-button type="primary" :disabled="sources.length === 0" :loading="materializing" @click="materialize">生成名单</el-button>
      </div>
    </div>
    <el-table v-loading="memberLoading" :data="members" empty-text="暂无名单，请先添加来源并生成" height="390">
      <el-table-column label="客户" min-width="140"
        ><template #default="{ row }"
          ><div>{{ row.customerName || '未命名客户' }}</div>
         </template
        ></el-table-column
      >
      <el-table-column label="拨打号码" min-width="145"
        ><template #default="{ row }"
          ><div>{{ row.phoneNumber }}</div>
          <small>{{ row.phoneLabel || '未设置标签' }}</small></template
        ></el-table-column
      >
      <el-table-column label="来源任务" prop="sourceImportTaskId" min-width="150" />
      <el-table-column label="状态" width="90"
        ><template #default="{ row }"
          ><el-tag :type="row.status === 'PENDING' ? 'success' : row.status === 'BLOCKED' ? 'danger' : 'info'">{{
            memberStatus(row.status)
          }}</el-tag></template
        ></el-table-column
      >
      <el-table-column label="最近结果" min-width="165">
        <template #default="{ row }">
          <div>{{ row.lastResultLabel || row.blockedReason || '-' }}</div>
          <small v-if="row.failureCategoryLabel" :class="row.retryable ? 'retryable' : 'non-retryable'">
            {{ row.failureCategoryLabel }} · {{ row.retryable ? '可重试' : '不重试' }}
          </small>
        </template>
      </el-table-column>
      <el-table-column label="结果说明" min-width="180" show-overflow-tooltip>
        <template #default="{ row }">{{ row.lastResultRemark || row.blockedReason || '-' }}</template>
      </el-table-column>
      <el-table-column label="最近呼叫" prop="lastAttemptAt" width="165" />
    </el-table>
    <pagination
      v-show="memberTotal > 0"
      v-model:page="memberQuery.pageNum"
      v-model:limit="memberQuery.pageSize"
      :total="memberTotal"
      @pagination="loadMembers"
    />

    <el-dialog v-model="sourceDialog" title="添加客户资料来源" width="620px" append-to-body destroy-on-close>
      <el-form :model="sourceForm" label-width="110px">
        <el-form-item label="导入任务" required>
          <el-select v-model="sourceForm.importTaskId" filterable class="full" @change="handleImportTaskChange">
            <el-option v-for="item in importTasks" :key="item.id" :label="item.taskName" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="限定批次">
          <el-select
            v-model="sourceForm.importBatchId"
            clearable
            filterable
            class="full"
            :loading="batchLoading"
            :disabled="!sourceForm.importTaskId"
            placeholder="留空表示该任务全部成功导入客户"
          >
            <el-option v-for="item in importBatches" :key="item.batchId" :label="batchLabel(item)" :value="item.batchId" />
            <template #empty>
              <el-empty :image-size="56" description="该任务暂无可用的成功导入批次" />
            </template>
          </el-select>
        </el-form-item>
        <el-row :gutter="16"
          ><el-col :span="12"
            ><el-form-item label="客户类型"><el-input v-model="sourceForm.customerType" clearable /></el-form-item></el-col
          ><el-col :span="12"
            ><el-form-item label="标签包含"><el-input v-model="sourceForm.tags" clearable /></el-form-item></el-col
        ></el-row>
        <el-row :gutter="16"
          ><el-col :span="12"
            ><el-form-item label="归属技能组"
              ><el-select v-model="sourceForm.skillGroupId" clearable class="full"
                ><el-option
                  v-for="item in skillGroups"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value" /></el-select></el-form-item></el-col
          ><el-col :span="12"
            ><el-form-item label="归属坐席"
              ><el-select v-model="sourceForm.agentId" clearable class="full"
                ><el-option v-for="item in agents" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item></el-col
        ></el-row>
        <el-row :gutter="16"
          ><el-col :span="12"
            ><el-form-item label="归属状态"
              ><el-select v-model="sourceForm.assignmentState" class="full"
                ><el-option label="全部" value="ALL" /><el-option label="已分配" value="ASSIGNED" /><el-option
                  label="未分配"
                  value="UNASSIGNED" /></el-select></el-form-item></el-col
          ><el-col :span="12"
            ><el-form-item label="号码策略"
              ><el-select v-model="sourceForm.phoneStrategy" class="full"
                ><el-option label="主号码，没有则跳过" value="PRIMARY_ONLY" /><el-option
                  label="主号码优先，没有则取首个有效号码"
                  value="PRIMARY_OR_FIRST" /><el-option
                  label="指定标签优先，没有则取主号码"
                  value="LABEL_OR_PRIMARY" /></el-select></el-form-item></el-col
        ></el-row>
        <el-form-item v-if="sourceForm.phoneStrategy === 'LABEL_OR_PRIMARY'" label="号码标签" required
          ><el-input v-model="sourceForm.phoneLabel" clearable placeholder="例如：本人、工作电话、备用号码"
        /></el-form-item>
      </el-form>
      <template #footer
        ><el-button @click="sourceDialog = false">取消</el-button
        ><el-button type="primary" :loading="sourceSaving" @click="saveSource">保存来源</el-button></template
      >
    </el-dialog>
  </el-drawer>
</template>

<script setup lang="ts">
import { getCurrentInstance, reactive, ref } from 'vue';
import {
  addAutoOutboundSource,
  deleteAutoOutboundSource,
  listAutoOutboundSources,
  materializeAutoOutboundMembers,
  pageAutoOutboundMembers
} from '@/api/callcenter/auto-outbound-task';
import type {
  AutoOutboundMemberVO,
  AutoOutboundSourceForm,
  AutoOutboundSourceVO,
  AutoOutboundTaskVO
} from '@/api/callcenter/auto-outbound-task/types';
import { pageImportTaskBatches, pageImportTasks, type CustomerImportTaskVO } from '@/api/callcenter/customer-import-task';
import type { CustomerImportResultVO } from '@/api/callcenter/customer';
import { listSkillGroups } from '@/api/callcenter/skill-group';
import { listAgents } from '@/api/callcenter/agent';

const { proxy } = getCurrentInstance()!;
const visible = ref(false);
const task = ref<AutoOutboundTaskVO>();
const sources = ref<AutoOutboundSourceVO[]>([]);
const members = ref<AutoOutboundMemberVO[]>([]);
const memberTotal = ref(0);
const sourceLoading = ref(false);
const memberLoading = ref(false);
const materializing = ref(false);
const sourceDialog = ref(false);
const sourceSaving = ref(false);
const importTasks = ref<CustomerImportTaskVO[]>([]);
const importBatches = ref<CustomerImportResultVO[]>([]);
const batchLoading = ref(false);
const skillGroups = ref<Array<{ label: string; value: string | number }>>([]);
const agents = ref<Array<{ label: string; value: string | number }>>([]);
const memberQuery = reactive({ pageNum: 1, pageSize: 10, status: '', phoneNumber: '' });
const newSource = (): AutoOutboundSourceForm => ({ assignmentState: 'ALL', phoneStrategy: 'PRIMARY_OR_FIRST', enabled: true });
const sourceForm = reactive<AutoOutboundSourceForm>(newSource());
let openSequence = 0;
let batchLoadSequence = 0;
const resetSourceForm = () => {
  sourceForm.importTaskId = undefined;
  sourceForm.importBatchId = undefined;
  sourceForm.customerType = undefined;
  sourceForm.tags = undefined;
  sourceForm.skillGroupId = undefined;
  sourceForm.agentId = undefined;
  sourceForm.assignmentState = 'ALL';
  sourceForm.phoneStrategy = 'PRIMARY_OR_FIRST';
  sourceForm.phoneLabel = undefined;
  sourceForm.enabled = true;
  importBatches.value = [];
};
const loadOptions = async () => {
  const [taskPage, groups, agentRows] = await Promise.all([
    pageImportTasks({ pageNum: 1, pageSize: 1000, status: 'ENABLED' }),
    listSkillGroups(),
    listAgents({ enabled: true })
  ]);
  importTasks.value = taskPage.rows || [];
  skillGroups.value = groups.data.filter((item) => item.enabled).map((item) => ({ label: item.groupName, value: item.id }));
  agents.value = agentRows.data.filter((item) => item.enabled).map((item) => ({ label: `${item.agentName}（${item.agentCode}）`, value: item.id }));
};
const openSourceDialog = () => {
  resetSourceForm();
  sourceDialog.value = true;
};
const handleImportTaskChange = async (taskId?: string | number) => {
  sourceForm.importBatchId = undefined;
  importBatches.value = [];
  const sequence = ++batchLoadSequence;
  if (!taskId) return;
  batchLoading.value = true;
  try {
    const result = await pageImportTaskBatches(taskId, { pageNum: 1, pageSize: 1000 });
    if (sequence !== batchLoadSequence || String(sourceForm.importTaskId) !== String(taskId)) return;
    importBatches.value = (result.rows || []).filter((item) => ['SUCCESS', 'PARTIAL_SUCCESS'].includes(item.status || ''));
  } finally {
    if (sequence === batchLoadSequence) batchLoading.value = false;
  }
};
const batchLabel = (batch: CustomerImportResultVO) => {
  const status = batch.status === 'PARTIAL_SUCCESS' ? '部分成功' : '成功';
  return `${batch.fileName || `批次 ${batch.batchId}`} · ${status} · 导入 ${batch.importedCount || 0} 条${batch.createTime ? ` · ${batch.createTime}` : ''}`;
};

const fetchSources = async (taskId: string | number, sequence: number) => {
  sourceLoading.value = true;
  try {
    const result = await listAutoOutboundSources(taskId);
    if (sequence === openSequence && String(task.value?.id) === String(taskId)) sources.value = result.data || [];
  } finally {
    if (sequence === openSequence) sourceLoading.value = false;
  }
};
const fetchMembers = async (taskId: string | number, sequence: number) => {
  memberLoading.value = true;
  try {
    const result = await pageAutoOutboundMembers(taskId, memberQuery);
    if (sequence === openSequence && String(task.value?.id) === String(taskId)) {
      members.value = result.rows || [];
      memberTotal.value = result.total || 0;
    }
  } finally {
    if (sequence === openSequence) memberLoading.value = false;
  }
};
const loadSources = async () => {
  if (task.value?.id) await fetchSources(task.value.id, openSequence);
};
const loadMembers = async () => {
  if (task.value?.id) await fetchMembers(task.value.id, openSequence);
};

const open = async (row: AutoOutboundTaskVO) => {
  const sequence = ++openSequence;
  task.value = row;
  visible.value = true;
  resetSourceForm();
  memberQuery.pageNum = 1;
  sources.value = [];
  members.value = [];
  memberTotal.value = 0;

  // 主体数据独立加载，不能被下拉选项接口失败或变慢阻断。
  await Promise.allSettled([fetchSources(row.id, sequence), fetchMembers(row.id, sequence), loadOptions()]);
};
const saveSource = async () => {
  if (!task.value || !sourceForm.importTaskId) {
    proxy?.$modal.msgWarning('请选择客户资料导入任务');
    return;
  }
  if (sourceForm.phoneStrategy === 'LABEL_OR_PRIMARY' && !sourceForm.phoneLabel?.trim()) {
    proxy?.$modal.msgWarning('请输入优先使用的号码标签');
    return;
  }
  sourceSaving.value = true;
  try {
    await addAutoOutboundSource(task.value.id, sourceForm);
    sourceDialog.value = false;
    resetSourceForm();
    await loadSources();
  } finally {
    sourceSaving.value = false;
  }
};
const removeSource = async (row: AutoOutboundSourceVO) => {
  if (!task.value) return;
  await proxy?.$modal.confirm('确认删除该名单来源吗？');
  await deleteAutoOutboundSource(task.value.id, row.id);
  await loadSources();
};
const materialize = async () => {
  if (!task.value) return;
  materializing.value = true;
  try {
    const result = (await materializeAutoOutboundMembers(task.value.id)).data;
    proxy?.$modal.msgSuccess(
      `生成完成：新增 ${result.addedCount}，黑名单拦截 ${result.blacklistedCount}，重复 ${result.duplicateCount}，无效号码 ${result.invalidPhoneCount}`
    );
    await loadMembers();
  } finally {
    materializing.value = false;
  }
};
const memberStatus = (status: string) =>
  ({ PENDING: '待拨打', BLOCKED: '已拦截', COMPLETED: '已完成', RETRY: '待重试', DIALING: '拨打中' })[status] || status;
defineExpose({ open });
</script>

<style scoped>
.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 22px 0 12px;
  font-weight: 600;
}
.retryable {
  color: #b26a00;
}
.non-retryable {
  color: #c94444;
}
.member-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.member-title {
  flex: 1;
  justify-content: flex-start;
  gap: 10px;
}
.hint,
small {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  font-weight: 400;
}
.phone-search {
  width: 155px;
  margin-right: 8px;
}
.status-select {
  width: 120px;
  margin-right: 8px;
}
.full {
  width: 100%;
}
</style>
