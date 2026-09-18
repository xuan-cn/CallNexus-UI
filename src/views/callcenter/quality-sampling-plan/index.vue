<template>
  <div class="p-2 quality-plan-page">
    <el-card shadow="never" class="mb-2">
      <el-form :model="query" inline size="small">
        <el-form-item label="关键词">
          <el-input v-model="query.keyword" clearable placeholder="计划名称/编码" @keyup.enter="search" />
        </el-form-item>
        <el-form-item label="抽样方式">
          <el-select v-model="query.samplingMethod" clearable placeholder="全部方式" style="width: 150px">
            <el-option v-for="item in methodOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="执行周期">
          <el-select v-model="query.scheduleType" clearable placeholder="全部周期" style="width: 130px">
            <el-option v-for="item in scheduleOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.enabled" clearable placeholder="全部" style="width: 100px">
            <el-option label="启用" :value="true" /><el-option label="停用" :value="false" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Search" @click="search">查询</el-button>
          <el-button icon="Refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never">
      <template #header>
        <div class="page-header">
          <div>
            <h3>抽检计划</h3>
            <span>按通话范围和抽样策略自动生成质检任务</span>
          </div>
          <el-button v-hasPermi="['callcenter:quality-plan:create']" type="primary" icon="Plus" @click="openCreate">新增计划</el-button>
        </div>
      </template>
      <el-table v-loading="loading" :data="rows">
        <el-table-column label="计划" min-width="190">
          <template #default="{ row }"
            ><div>{{ row.planName }}</div>
            <small>{{ row.planCode }}</small></template
          >
        </el-table-column>
        <el-table-column label="评分模板" prop="templateName" min-width="150" />
        <el-table-column label="抽样规则" min-width="170">
          <template #default="{ row }">
            <div>{{ methodLabel(row.samplingMethod) }}</div>
            <small>{{ samplingAmount(row) }}</small>
          </template>
        </el-table-column>
        <el-table-column label="筛选范围" min-width="190">
          <template #default="{ row }">
            <div>{{ scopeText(row) }}</div>
            <small>回溯 {{ row.lookbackDays }} 天 · 冷却 {{ row.cooldownDays }} 天</small>
          </template>
        </el-table-column>
        <el-table-column label="质检员" width="110">
          <template #default="{ row }">{{ row.reviewerName || '待分配' }}</template>
        </el-table-column>
        <el-table-column label="执行周期" width="145">
          <template #default="{ row }"
            ><div>{{ scheduleText(row) }}</div>
            <small>上次：{{ row.lastExecutedAt || '未执行' }}</small></template
          >
        </el-table-column>
        <el-table-column label="状态" width="80" align="center">
          <template #default="{ row }"
            ><el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '停用' }}</el-tag></template
          >
        </el-table-column>
        <el-table-column label="操作" width="245" fixed="right" align="center">
          <template #default="{ row }">
            <el-button v-hasPermi="['callcenter:quality-plan:execute']" link type="success" :loading="executingId === row.id" @click="execute(row)"
              >立即执行</el-button
            >
            <el-button link type="primary" @click="openExecutions(row)">执行记录</el-button>
            <el-button v-hasPermi="['callcenter:quality-plan:update']" link type="primary" @click="openEdit(row)">修改</el-button>
            <el-button v-hasPermi="['callcenter:quality-plan:delete']" link type="danger" @click="remove(row)">删除</el-button>
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

    <el-drawer v-model="drawer" :title="form.id ? '修改抽检计划' : '新增抽检计划'" size="920px" append-to-body>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="116px" size="small">
        <section class="form-section">
          <h4>基础信息</h4>
          <el-row :gutter="16">
            <el-col :span="8"
              ><el-form-item label="计划编码" prop="planCode"
                ><el-input v-model="form.planCode" :disabled="!!form.id" placeholder="如 QA_DAILY" /></el-form-item
            ></el-col>
            <el-col :span="8"
              ><el-form-item label="计划名称" prop="planName"><el-input v-model="form.planName" /></el-form-item
            ></el-col>
            <el-col :span="8"
              ><el-form-item label="评分模板" prop="templateId"
                ><el-select v-model="form.templateId" filterable style="width: 100%"
                  ><el-option
                    v-for="item in publishedTemplates"
                    :key="item.id"
                    :label="`${item.templateName} V${item.currentVersionNo || 1}`"
                    :value="item.id" /></el-select></el-form-item
            ></el-col>
          </el-row>
        </section>

        <section class="form-section">
          <h4>抽样策略</h4>
          <el-row :gutter="16">
            <el-col :span="8"
              ><el-form-item label="抽样方式" prop="samplingMethod"
                ><el-select v-model="form.samplingMethod" style="width: 100%"
                  ><el-option v-for="item in methodOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item
            ></el-col>
            <el-col v-if="form.samplingMethod === 'RANDOM_RATE'" :span="8"
              ><el-form-item label="抽样比例" prop="sampleRate"
                ><el-input-number v-model="form.sampleRate" :min="0.01" :max="100" :precision="2" :step="1" /><span class="unit"
                  >%</span
                ></el-form-item
              ></el-col
            >
            <el-col v-else :span="8"
              ><el-form-item label="每次抽取" prop="sampleCount"
                ><el-input-number v-model="form.sampleCount" :min="1" :max="10000" /><span class="unit">通</span></el-form-item
              ></el-col
            >
            <el-col v-if="form.samplingMethod === 'STRATIFIED'" :span="8"
              ><el-form-item label="分层维度" prop="stratifyDimension"
                ><el-select v-model="form.stratifyDimension" style="width: 100%"
                  ><el-option label="按坐席" value="AGENT" /><el-option label="按技能组" value="SKILL_GROUP" /></el-select></el-form-item
            ></el-col>
            <el-col :span="8"
              ><el-form-item label="每层最低"
                ><el-input-number v-model="form.minPerAgent" :min="0" :max="1000" /><span class="unit">通</span></el-form-item
              ></el-col
            >
            <el-col :span="8"
              ><el-form-item label="每层最高"
                ><el-input-number v-model="form.maxPerAgent" :min="1" :max="10000" clearable /><span class="unit">通</span></el-form-item
              ></el-col
            >
            <el-col :span="8"
              ><el-form-item label="任务优先级"
                ><el-input-number v-model="form.priority" :min="1" :max="9" /><span class="unit">P</span></el-form-item
              ></el-col
            >
          </el-row>
          <el-alert
            v-if="form.samplingMethod === 'STRATIFIED'"
            type="info"
            :closable="false"
            show-icon
            title="先保证各层最低抽检量，再轮询补足剩余名额，并受每层最高数量限制。"
          />
        </section>

        <section class="form-section">
          <h4>通话筛选</h4>
          <el-row :gutter="16">
            <el-col :span="8"
              ><el-form-item label="通话方向"
                ><el-select v-model="form.directionScope" style="width: 100%"
                  ><el-option label="全部" value="ALL" /><el-option label="呼入" value="INBOUND" /><el-option
                    label="呼出"
                    value="OUTBOUND" /></el-select></el-form-item
            ></el-col>
            <el-col :span="8"
              ><el-form-item label="队列"
                ><el-select v-model="form.queueId" clearable filterable placeholder="全部队列" style="width: 100%"
                  ><el-option v-for="item in options.queues" :key="item.id" :label="item.name" :value="item.id" /></el-select></el-form-item
            ></el-col>
            <el-col :span="8"
              ><el-form-item label="技能组"
                ><el-select v-model="form.skillGroupId" clearable filterable placeholder="全部技能组" style="width: 100%"
                  ><el-option v-for="item in options.skillGroups" :key="item.id" :label="item.name" :value="item.id" /></el-select></el-form-item
            ></el-col>
            <el-col :span="8"
              ><el-form-item label="坐席"
                ><el-select v-model="form.agentId" clearable filterable placeholder="全部坐席" style="width: 100%"
                  ><el-option v-for="item in options.agents" :key="item.id" :label="item.name" :value="item.id" /></el-select></el-form-item
            ></el-col>
            <el-col :span="8"
              ><el-form-item label="最短接通时长"
                ><el-input-number v-model="form.minDurationSeconds" :min="0" :max="86400" /><span class="unit">秒</span></el-form-item
              ></el-col
            >
            <el-col :span="8"
              ><el-form-item label="最长接通时长"
                ><el-input-number v-model="form.maxDurationSeconds" :min="0" :max="86400" /><span class="unit">秒</span></el-form-item
              ></el-col
            >
            <el-col :span="8"
              ><el-form-item label="录音要求"
                ><el-select v-model="form.requireRecording" clearable placeholder="不限" style="width: 100%"
                  ><el-option label="必须有录音" :value="true" /><el-option label="必须无录音" :value="false" /></el-select></el-form-item
            ></el-col>
            <el-col :span="8"
              ><el-form-item label="转写要求"
                ><el-select v-model="form.requireTranscript" clearable placeholder="不限" style="width: 100%"
                  ><el-option label="必须有转写" :value="true" /><el-option label="必须无转写" :value="false" /></el-select></el-form-item
            ></el-col>
            <el-col :span="8"
              ><el-form-item label="回溯范围"
                ><el-input-number v-model="form.lookbackDays" :min="1" :max="365" /><span class="unit">天</span></el-form-item
              ></el-col
            >
            <el-col :span="8"
              ><el-form-item label="重复冷却"
                ><el-input-number v-model="form.cooldownDays" :min="0" :max="3650" /><span class="unit">天</span></el-form-item
              ></el-col
            >
            <el-col :span="8"
              ><el-form-item label="排除已抽通话"><el-switch v-model="form.excludeSampled" /></el-form-item
            ></el-col>
          </el-row>
        </section>

        <section class="form-section">
          <h4>执行与分配</h4>
          <el-row :gutter="16">
            <el-col :span="8"
              ><el-form-item label="执行周期" prop="scheduleType"
                ><el-select v-model="form.scheduleType" style="width: 100%"
                  ><el-option v-for="item in scheduleOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item
            ></el-col>
            <el-col v-if="form.scheduleType !== 'MANUAL'" :span="8"
              ><el-form-item label="执行时间" prop="scheduleTime"
                ><el-time-picker v-model="form.scheduleTime" value-format="HH:mm:ss" format="HH:mm" style="width: 100%" /></el-form-item
            ></el-col>
            <el-col v-if="form.scheduleType === 'WEEKLY'" :span="8"
              ><el-form-item label="执行星期" prop="scheduleDay"
                ><el-select v-model="form.scheduleDay" style="width: 100%"
                  ><el-option v-for="item in weekdayOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item
            ></el-col>
            <el-col v-if="form.scheduleType === 'MONTHLY'" :span="8"
              ><el-form-item label="每月日期" prop="scheduleDay"
                ><el-input-number v-model="form.scheduleDay" :min="1" :max="31" /><span class="unit">日</span></el-form-item
              ></el-col
            >
            <el-col :span="8"
              ><el-form-item label="默认质检员"
                ><el-select v-model="form.reviewerId" clearable filterable placeholder="不选则待分配" style="width: 100%"
                  ><el-option v-for="item in reviewers" :key="item.id" :label="item.name" :value="item.id" /></el-select></el-form-item
            ></el-col>
            <el-col :span="8"
              ><el-form-item label="启用计划"><el-switch v-model="form.enabled" /></el-form-item
            ></el-col>
            <el-col :span="24"
              ><el-form-item label="备注"><el-input v-model="form.remark" type="textarea" :rows="2" maxlength="500" show-word-limit /></el-form-item
            ></el-col>
          </el-row>
        </section>
      </el-form>
      <template #footer
        ><el-button @click="drawer = false">取消</el-button><el-button type="primary" :loading="saving" @click="submit">保存计划</el-button></template
      >
    </el-drawer>

    <el-dialog v-model="executionDialog" :title="`${activePlan?.planName || ''} - 执行记录`" width="980px" append-to-body>
      <el-table v-loading="executionLoading" :data="executions">
        <el-table-column label="执行编号" prop="executionCode" min-width="190" />
        <el-table-column label="触发方式" width="90"
          ><template #default="{ row }">{{ row.triggerType === 'MANUAL' ? '手动' : '定时' }}</template></el-table-column
        >
        <el-table-column label="候选/选中/任务" width="145"
          ><template #default="{ row }">{{ row.candidateCount }} / {{ row.selectedCount }} / {{ row.taskCount }}</template></el-table-column
        >
        <el-table-column label="状态" width="85"
          ><template #default="{ row }"
            ><el-tag :type="row.status === 'SUCCESS' ? 'success' : row.status === 'FAILED' ? 'danger' : 'warning'">{{
              executionStatus(row.status)
            }}</el-tag></template
          ></el-table-column
        >
        <el-table-column label="执行时间" prop="startedAt" width="165" />
        <el-table-column label="执行说明" min-width="260"
          ><template #default="{ row }"
            ><span :class="{ error: row.status === 'FAILED' }">{{ row.errorMessage || row.exclusionSummary || '-' }}</span></template
          ></el-table-column
        >
      </el-table>
      <pagination
        v-show="executionTotal > 0"
        v-model:page="executionQuery.pageNum"
        v-model:limit="executionQuery.pageSize"
        :total="executionTotal"
        :auto-scroll="false"
        @pagination="loadExecutions"
      />
    </el-dialog>
  </div>
</template>

<script setup name="QualitySamplingPlan" lang="ts">
import {
  createQualitySamplingPlan,
  deleteQualitySamplingPlan,
  executeQualitySamplingPlan,
  getQualitySamplingOptions,
  getQualitySamplingPlan,
  listQualityReviewers,
  listQualityTemplates,
  pageQualitySamplingExecutions,
  pageQualitySamplingPlans,
  updateQualitySamplingPlan
} from '@/api/callcenter/quality';
import type {
  QualitySamplingExecutionVO,
  QualitySamplingOptionsVO,
  QualitySamplingPlanForm,
  QualitySamplingPlanQuery,
  QualitySamplingPlanVO,
  QualityTemplateVO,
  QualityUserOptionVO
} from '@/api/callcenter/quality/types';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;
const loading = ref(false),
  saving = ref(false),
  drawer = ref(false),
  executionDialog = ref(false),
  executionLoading = ref(false);
const executingId = ref<string | number>();
const rows = ref<QualitySamplingPlanVO[]>([]),
  templates = ref<QualityTemplateVO[]>([]),
  reviewers = ref<QualityUserOptionVO[]>([]);
const executions = ref<QualitySamplingExecutionVO[]>([]);
const total = ref(0),
  executionTotal = ref(0);
const activePlan = ref<QualitySamplingPlanVO>();
const formRef = ref();
const options = reactive<QualitySamplingOptionsVO>({ queues: [], skillGroups: [], agents: [] });
const query = reactive<QualitySamplingPlanQuery>({ pageNum: 1, pageSize: 10 });
const executionQuery = reactive<PageQuery>({ pageNum: 1, pageSize: 10 });
const defaultForm = (): QualitySamplingPlanForm => ({
  planCode: '',
  planName: '',
  templateId: undefined,
  samplingMethod: 'RANDOM_COUNT',
  sampleCount: 20,
  sampleRate: 10,
  stratifyDimension: 'AGENT',
  directionScope: 'ALL',
  lookbackDays: 1,
  minPerAgent: 0,
  maxPerAgent: 10,
  cooldownDays: 30,
  excludeSampled: true,
  priority: 5,
  scheduleType: 'MANUAL',
  scheduleTime: '02:00:00',
  enabled: true
});
const form = reactive<QualitySamplingPlanForm>(defaultForm());
const methodOptions = [
  { label: '随机固定数量', value: 'RANDOM_COUNT' },
  { label: '随机比例', value: 'RANDOM_RATE' },
  { label: '分层抽样', value: 'STRATIFIED' },
  { label: '风险优先', value: 'RISK_FIRST' }
];
const scheduleOptions = [
  { label: '仅手动执行', value: 'MANUAL' },
  { label: '每天', value: 'DAILY' },
  { label: '每周', value: 'WEEKLY' },
  { label: '每月', value: 'MONTHLY' }
];
const weekdayOptions = ['一', '二', '三', '四', '五', '六', '日'].map((label, index) => ({ label: `星期${label}`, value: index + 1 }));
const rules = {
  planCode: [{ required: true, message: '请输入计划编码', trigger: 'blur' }],
  planName: [{ required: true, message: '请输入计划名称', trigger: 'blur' }],
  templateId: [{ required: true, message: '请选择评分模板', trigger: 'change' }],
  samplingMethod: [{ required: true, message: '请选择抽样方式', trigger: 'change' }],
  directionScope: [{ required: true, message: '请选择通话方向', trigger: 'change' }],
  scheduleType: [{ required: true, message: '请选择执行周期', trigger: 'change' }],
  scheduleTime: [{ required: true, message: '请选择执行时间', trigger: 'change' }],
  scheduleDay: [{ required: true, message: '请设置执行日期', trigger: 'change' }]
};
const publishedTemplates = computed(() => templates.value.filter((item) => item.currentVersionId));
const methodLabel = (value: string) => methodOptions.find((item) => item.value === value)?.label || value;
const samplingAmount = (row: QualitySamplingPlanVO) =>
  row.samplingMethod === 'RANDOM_RATE' ? `${row.sampleRate || 0}%` : `${row.sampleCount || 0} 通/次`;
const scopeText = (row: QualitySamplingPlanVO) =>
  [row.directionScope === 'ALL' ? '全部方向' : row.directionScope === 'INBOUND' ? '呼入' : '呼出', row.queueName, row.skillGroupName, row.agentName]
    .filter(Boolean)
    .join(' · ');
const scheduleText = (row: QualitySamplingPlanVO) => {
  if (row.scheduleType === 'MANUAL') return '仅手动';
  const time = row.scheduleTime?.slice(0, 5) || '00:00';
  if (row.scheduleType === 'WEEKLY') return `每周${'一二三四五六日'[(row.scheduleDay || 1) - 1]} ${time}`;
  if (row.scheduleType === 'MONTHLY') return `每月${row.scheduleDay}日 ${time}`;
  return `每天 ${time}`;
};
const executionStatus = (value: string) => (({ RUNNING: '执行中', SUCCESS: '成功', FAILED: '失败' }) as Record<string, string>)[value] || value;
const load = async () => {
  loading.value = true;
  try {
    const response = await pageQualitySamplingPlans(query);
    rows.value = response.rows || [];
    total.value = response.total || 0;
  } finally {
    loading.value = false;
  }
};
const loadOptions = async () => {
  const [templateResponse, reviewerResponse, optionResponse] = await Promise.all([
    listQualityTemplates(),
    listQualityReviewers(),
    getQualitySamplingOptions()
  ]);
  templates.value = templateResponse.data || [];
  reviewers.value = reviewerResponse.data || [];
  Object.assign(options, optionResponse.data || { queues: [], skillGroups: [], agents: [] });
};
const search = () => {
  query.pageNum = 1;
  void load();
};
const resetQuery = () => {
  Object.assign(query, { pageNum: 1, pageSize: 10, keyword: undefined, samplingMethod: undefined, scheduleType: undefined, enabled: undefined });
  void load();
};
const openCreate = () => {
  Object.assign(form, defaultForm(), { templateId: publishedTemplates.value[0]?.id });
  drawer.value = true;
  nextTick(() => formRef.value?.clearValidate());
};
const openEdit = async (row: QualitySamplingPlanVO) => {
  const response = await getQualitySamplingPlan(row.id);
  Object.assign(form, defaultForm(), response.data);
  drawer.value = true;
  nextTick(() => formRef.value?.clearValidate());
};
const submit = async () => {
  await formRef.value?.validate();
  if (form.maxDurationSeconds != null && form.minDurationSeconds != null && form.maxDurationSeconds < form.minDurationSeconds)
    return proxy?.$modal.msgError('最长接通时长不能小于最短接通时长');
  if (form.maxPerAgent != null && form.maxPerAgent < form.minPerAgent) return proxy?.$modal.msgError('每层最高数量不能小于最低数量');
  saving.value = true;
  try {
    const payload = {
      ...form,
      scheduleDay: ['WEEKLY', 'MONTHLY'].includes(form.scheduleType) ? form.scheduleDay : undefined,
      scheduleTime: form.scheduleType === 'MANUAL' ? undefined : form.scheduleTime
    };
    if (form.id) await updateQualitySamplingPlan(form.id, payload);
    else await createQualitySamplingPlan(payload);
    proxy?.$modal.msgSuccess('抽检计划已保存');
    drawer.value = false;
    await load();
  } finally {
    saving.value = false;
  }
};
const execute = async (row: QualitySamplingPlanVO) => {
  await proxy?.$modal.confirm(`将从最近 ${row.lookbackDays} 天通话中抽样并生成质检任务，确定执行吗？`);
  executingId.value = row.id;
  try {
    const response = await executeQualitySamplingPlan(row.id);
    if (response.data.status === 'FAILED') proxy?.$modal.msgError(response.data.errorMessage || '抽检执行失败');
    else proxy?.$modal.msgSuccess(`执行完成：选中 ${response.data.selectedCount} 通，生成 ${response.data.taskCount} 个任务`);
    await load();
  } finally {
    executingId.value = undefined;
  }
};
const remove = async (row: QualitySamplingPlanVO) => {
  await proxy?.$modal.confirm(`确定删除抽检计划“${row.planName}”吗？`);
  await deleteQualitySamplingPlan(row.id);
  proxy?.$modal.msgSuccess('删除成功');
  await load();
};
const openExecutions = (row: QualitySamplingPlanVO) => {
  activePlan.value = row;
  Object.assign(executionQuery, { pageNum: 1, pageSize: 10 });
  executionDialog.value = true;
  void loadExecutions();
};
const loadExecutions = async () => {
  if (!activePlan.value) return;
  executionLoading.value = true;
  try {
    const response = await pageQualitySamplingExecutions(activePlan.value.id, executionQuery);
    executions.value = response.rows || [];
    executionTotal.value = response.total || 0;
  } finally {
    executionLoading.value = false;
  }
};
onMounted(async () => {
  await loadOptions();
  await load();
});
</script>

<style scoped lang="scss">
.quality-plan-page {
  font-size: 12px;
}
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.page-header h3 {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 500;
}
.page-header span,
small {
  color: var(--el-text-color-secondary);
  font-size: 11px;
}
.form-section {
  margin-bottom: 14px;
  padding: 14px 14px 4px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
}
.form-section h4 {
  margin: 0 0 14px;
  color: var(--el-text-color-primary);
  font-size: 14px;
  font-weight: 500;
}
.unit {
  margin-left: 6px;
  color: var(--el-text-color-secondary);
}
.error {
  color: var(--el-color-danger);
}
:deep(.el-form--inline .el-form-item) {
  margin-bottom: 8px;
}
</style>
