<template>
  <div class="app-container auto-outbound-page">
    <el-card shadow="never" class="query-card">
      <div class="page-heading">
        <div>
          <h2>自动外呼</h2>
          <p>按允许时段、频率和重试策略自动执行 AI、IVR 或渐进式外呼。</p>
        </div>
        <el-button v-hasPermi="['callcenter:auto-outbound-task:create']" type="primary" @click="handleAdd">
          <el-icon><Plus /></el-icon>新增任务
        </el-button>
      </div>
      <el-form :inline="true" class="query-form">
        <el-form-item label="任务">
          <el-input v-model="query.keyword" clearable placeholder="名称或编码" @keyup.enter="applyFilter" />
        </el-form-item>
        <el-form-item label="模式">
          <el-select v-model="query.dialMode" clearable placeholder="全部模式">
            <el-option v-for="item in dialModeOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" clearable placeholder="全部状态">
            <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="applyFilter">查询</el-button>
          <el-button @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" class="list-card">
      <el-table v-loading="loading" :data="filteredTasks">
        <el-table-column label="任务" min-width="210">
          <template #default="{ row }">
            <div class="task-name">{{ row.taskName }}</div>
            <div class="secondary">{{ row.taskCode }}</div>
          </template>
        </el-table-column>
        <el-table-column label="拨打模式" width="130">
          <template #default="{ row }"
            ><el-tag effect="plain">{{ dialModeLabel(row.dialMode) }}</el-tag></template
          >
        </el-table-column>
        <el-table-column label="接听目标" min-width="160">
          <template #default="{ row }">{{ targetLabel(row) }}</template>
        </el-table-column>
        <el-table-column label="策略" min-width="210">
          <template #default="{ row }">
            <div>{{ row.concurrencyLimit }} 并发 · {{ row.callsPerMinute }} 次/分钟</div>
            <div class="secondary">每日 {{ row.maxCallsPerDay }} 次，累计 {{ row.maxCallsTotal }} 次</div>
          </template>
        </el-table-column>
        <el-table-column label="名单进度" min-width="180">
          <template #default="{ row }">
            <el-progress :percentage="progress(row)" :stroke-width="8" />
            <div class="secondary">待拨 {{ row.pendingCount }} · 已完成 {{ row.completedCount }} · 共 {{ row.totalCount }}</div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }"
            ><el-tag :type="statusType(row.status)">{{ statusLabel(row.status) }}</el-tag></template
          >
        </el-table-column>
        <el-table-column label="创建时间" prop="createTime" width="165" />
        <el-table-column label="操作" fixed="right" width="220">
          <template #default="{ row }">
            <div class="operation-actions">
              <el-button v-hasPermi="['callcenter:auto-outbound-task:query']" link type="primary" @click="memberDrawerRef?.open(row)">名单</el-button>
              <el-tooltip v-if="row.status !== 'COMPLETED'" :disabled="row.totalCount > 0 || row.status === 'RUNNING'" content="请先生成外呼名单">
                <span class="primary-action-wrap">
                  <el-button
                    v-hasPermi="['callcenter:auto-outbound-task:execute']"
                    link
                    :type="primaryActionType(row)"
                    :disabled="row.totalCount === 0 && row.status !== 'RUNNING'"
                    @click="handlePrimaryAction(row)"
                    >{{ primaryActionLabel(row) }}</el-button
                  >
                </span>
              </el-tooltip>
              <el-dropdown trigger="click" @command="(command) => handleMoreCommand(command, row)">
                <el-button link type="primary"
                  >更多<el-icon class="more-arrow"><ArrowDown /></el-icon
                ></el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item v-hasPermi="['callcenter:auto-outbound-task:query']" command="monitor">调度监控</el-dropdown-item>
                    <el-dropdown-item v-hasPermi="['callcenter:auto-outbound-task:update']" command="edit" :disabled="row.status === 'RUNNING'"
                      >修改配置</el-dropdown-item
                    >
                    <el-dropdown-item
                      v-if="!['COMPLETED', 'STOPPED'].includes(row.status)"
                      v-hasPermi="['callcenter:auto-outbound-task:execute']"
                      command="stop"
                      divided
                      >停止任务</el-dropdown-item
                    >
                    <el-dropdown-item
                      v-hasPermi="['callcenter:auto-outbound-task:delete']"
                      command="delete"
                      :disabled="row.status === 'RUNNING' || row.totalCount > 0"
                      >删除任务</el-dropdown-item
                    >
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!loading && filteredTasks.length === 0" description="暂无自动外呼任务" />
    </el-card>

    <el-drawer v-model="drawer.visible" :title="drawer.title" size="760px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="120px">
        <el-tabs v-model="drawer.tab">
          <el-tab-pane label="基础设置" name="base">
            <el-row :gutter="18">
              <el-col :span="12"
                ><el-form-item label="任务编码" prop="taskCode"><el-input v-model="form.taskCode" maxlength="32" /></el-form-item
              ></el-col>
              <el-col :span="12"
                ><el-form-item label="任务名称" prop="taskName"><el-input v-model="form.taskName" maxlength="64" /></el-form-item
              ></el-col>
              <el-col :span="12"
                ><el-form-item label="拨打模式" prop="dialMode"
                  ><el-select v-model="form.dialMode" class="full" @change="handleModeChange"
                    ><el-option v-for="item in dialModeOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item
              ></el-col>
              <el-col :span="12"
                ><el-form-item :label="targetFieldLabel" prop="targetId"
                  ><el-select v-model="form.targetId" class="full" filterable
                    ><el-option
                      v-for="item in currentTargetOptions"
                      :key="item.value"
                      :label="item.label"
                      :value="item.value" /></el-select></el-form-item
              ></el-col>
              <el-col :span="12"
                ><el-form-item label="外显号码"
                  ><el-select v-model="form.callerNumberId" class="full" clearable filterable
                    ><el-option
                      v-for="item in callerNumberOptions"
                      :key="item.value"
                      :label="item.label"
                      :value="item.value" /></el-select></el-form-item
              ></el-col>
              <el-col :span="12"
                ><el-form-item label="任务时区" prop="scheduleTimezone"
                  ><el-select v-model="form.scheduleTimezone" class="full"
                    ><el-option label="中国标准时间" value="Asia/Shanghai" /><el-option label="UTC" value="UTC" /></el-select></el-form-item
              ></el-col>
              <el-col :span="24"
                ><el-form-item label="任务说明"
                  ><el-input v-model="form.description" type="textarea" :rows="4" maxlength="500" show-word-limit /></el-form-item
              ></el-col>
            </el-row>
          </el-tab-pane>

          <el-tab-pane label="拨打策略" name="policy">
            <el-alert title="任务限制会与租户及线路容量共同生效，实际拨打采用其中最小值。" type="info" :closable="false" show-icon />
            <el-row :gutter="18" class="policy-grid">
              <el-col :span="12"
                ><el-form-item label="任务并发" prop="concurrencyLimit"
                  ><el-input-number v-model="form.concurrencyLimit" :min="1" :max="500" /></el-form-item
              ></el-col>
              <el-col :span="12"
                ><el-form-item label="每分钟呼叫" prop="callsPerMinute"
                  ><el-input-number v-model="form.callsPerMinute" :min="1" :max="3000" /></el-form-item
              ></el-col>
              <el-col :span="12"
                ><el-form-item label="每日最多" prop="maxCallsPerDay"
                  ><el-input-number v-model="form.maxCallsPerDay" :min="1" :max="100" /><span class="unit">次/客户</span></el-form-item
                ></el-col
              >
              <el-col :span="12"
                ><el-form-item label="任务累计最多" prop="maxCallsTotal"
                  ><el-input-number v-model="form.maxCallsTotal" :min="1" :max="1000" /><span class="unit">次/客户</span></el-form-item
                ></el-col
              >
              <el-col :span="12"
                ><el-form-item label="最小拨打间隔" prop="minCallIntervalMinutes"
                  ><el-input-number v-model="form.minCallIntervalMinutes" :min="1" :max="43200" /><span class="unit">分钟</span></el-form-item
                ></el-col
              >
            </el-row>
          </el-tab-pane>

          <el-tab-pane label="呼叫时段" name="windows">
            <div class="section-header">
              <span>只在下列启用时段内发起新呼叫</span
              ><el-button type="primary" plain @click="addCallWindow"
                ><el-icon><Plus /></el-icon>添加时段</el-button
              >
            </div>
            <div v-for="(window, index) in form.callWindows" :key="index" class="policy-row window-row">
              <el-switch v-model="window.enabled" />
              <el-select v-model="window.weekdays" multiple collapse-tags :max-collapse-tags="3" placeholder="选择星期" class="week-select">
                <el-option v-for="item in weekdayOptions" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
              <el-time-picker v-model="window.startTime" value-format="HH:mm:ss" format="HH:mm" placeholder="开始" />
              <span>至</span>
              <el-time-picker v-model="window.endTime" value-format="HH:mm:ss" format="HH:mm" placeholder="结束" />
              <el-button link type="danger" :disabled="form.callWindows.length === 1" @click="form.callWindows.splice(index, 1)">删除</el-button>
            </div>
          </el-tab-pane>

          <el-tab-pane label="重试规则" name="retry">
            <el-alert title="达到单个客户的每日或累计呼叫上限后，即使规则允许也不会继续重试。" type="info" :closable="false" show-icon />
            <div class="retry-table">
              <div class="retry-head"><span>结果</span><span>启用</span><span>最大重试</span><span>间隔（分钟）</span></div>
              <div v-for="rule in form.retryRules" :key="rule.resultCode" class="retry-line">
                <span>{{ retryResultLabel(rule.resultCode) }}</span>
                <el-switch v-model="rule.retryEnabled" />
                <el-input-number v-model="rule.maxRetryCount" :min="0" :max="10" :disabled="!rule.retryEnabled" />
                <el-input-number v-model="rule.retryIntervalMinutes" :min="1" :max="10080" :disabled="!rule.retryEnabled" />
              </div>
            </div>
          </el-tab-pane>
          <el-tab-pane label="结果回写" name="writeback">
            <el-alert
              title="通话结束后自动生成客户跟进记录；标签只追加到客户当前有效归属，不覆盖已有标签。"
              type="info"
              :closable="false"
              show-icon
            />
            <el-row :gutter="18" class="policy-grid">
              <el-col :span="24"
                ><el-form-item label="写入跟进记录"><el-switch v-model="form.resultWritebackEnabled" /></el-form-item
              ></el-col>
              <el-col :span="12"
                ><el-form-item label="接通标签"
                  ><el-input
                    v-model="form.connectedTag"
                    :disabled="!form.resultWritebackEnabled"
                    maxlength="64"
                    placeholder="例如：自动外呼已接通" /></el-form-item
              ></el-col>
              <el-col :span="12"
                ><el-form-item label="未接通标签"
                  ><el-input
                    v-model="form.failedTag"
                    :disabled="!form.resultWritebackEnabled"
                    maxlength="64"
                    placeholder="例如：自动外呼待重试" /></el-form-item
              ></el-col>
            </el-row>
          </el-tab-pane>
        </el-tabs>
      </el-form>
      <template #footer>
        <el-button @click="drawer.visible = false">取消</el-button>
        <el-button type="primary" :loading="drawer.saving" @click="submit">保存任务</el-button>
      </template>
    </el-drawer>
    <MemberDrawer ref="memberDrawerRef" />
    <MonitorDrawer ref="monitorDrawerRef" />
  </div>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, onMounted, reactive, ref } from 'vue';
import type { FormInstance, FormRules } from 'element-plus';
import { ArrowDown, Plus } from '@element-plus/icons-vue';
import MemberDrawer from './MemberDrawer.vue';
import MonitorDrawer from './MonitorDrawer.vue';
import {
  createAutoOutboundTask,
  deleteAutoOutboundTask,
  getAutoOutboundTask,
  listAutoOutboundTasks,
  pauseAutoOutboundTask,
  resumeAutoOutboundTask,
  startAutoOutboundTask,
  stopAutoOutboundTask,
  updateAutoOutboundTask
} from '@/api/callcenter/auto-outbound-task';
import type {
  AutoOutboundDialMode,
  AutoOutboundRetryResult,
  AutoOutboundStatus,
  AutoOutboundTaskForm,
  AutoOutboundTaskVO
} from '@/api/callcenter/auto-outbound-task/types';
import { listAiAgents } from '@/api/callcenter/ai-knowledge';
import { listIvrFlows } from '@/api/callcenter/ivr-flow';
import { listSkillGroups } from '@/api/callcenter/skill-group';
import { listPhoneNumbers } from '@/api/callcenter/phone-number';

const { proxy } = getCurrentInstance()!;
const loading = ref(false);
const tasks = ref<AutoOutboundTaskVO[]>([]);
const filteredTasks = ref<AutoOutboundTaskVO[]>([]);
const formRef = ref<FormInstance>();
const memberDrawerRef = ref<InstanceType<typeof MemberDrawer>>();
const monitorDrawerRef = ref<InstanceType<typeof MonitorDrawer>>();
const query = reactive<{ keyword: string; dialMode?: AutoOutboundDialMode; status?: AutoOutboundStatus }>({ keyword: '' });
const drawer = reactive({ visible: false, saving: false, title: '', tab: 'base', id: undefined as string | number | undefined });
const aiOptions = ref<Array<{ label: string; value: string | number }>>([]);
const ivrOptions = ref<Array<{ label: string; value: string | number }>>([]);
const skillGroupOptions = ref<Array<{ label: string; value: string | number }>>([]);
const callerNumberOptions = ref<Array<{ label: string; value: string | number }>>([]);

const dialModeOptions = [
  { label: 'AI 自动外呼', value: 'AGENTLESS_AI' as const },
  { label: 'IVR 自动外呼', value: 'AGENTLESS_IVR' as const },
  { label: '渐进式人工外呼', value: 'PROGRESSIVE' as const }
];
const statusOptions = [
  { label: '草稿', value: 'DRAFT' },
  { label: '运行中', value: 'RUNNING' },
  { label: '已暂停', value: 'PAUSED' },
  { label: '已完成', value: 'COMPLETED' },
  { label: '已停止', value: 'STOPPED' }
];
const weekdayOptions = [
  { label: '周一', value: 1 },
  { label: '周二', value: 2 },
  { label: '周三', value: 3 },
  { label: '周四', value: 4 },
  { label: '周五', value: 5 },
  { label: '周六', value: 6 },
  { label: '周日', value: 7 }
];

const defaultRetryRules = () => [
  { resultCode: 'NO_ANSWER' as const, retryEnabled: true, maxRetryCount: 2, retryIntervalMinutes: 30 },
  { resultCode: 'BUSY' as const, retryEnabled: true, maxRetryCount: 2, retryIntervalMinutes: 15 },
  { resultCode: 'FAILED' as const, retryEnabled: true, maxRetryCount: 1, retryIntervalMinutes: 10 },
  { resultCode: 'OTHER' as const, retryEnabled: false, maxRetryCount: 0, retryIntervalMinutes: 30 }
];
const emptyForm = (): AutoOutboundTaskForm => ({
  taskCode: '',
  taskName: '',
  description: '',
  callerNumberId: undefined,
  dialMode: 'AGENTLESS_AI',
  targetType: 'AI_AGENT',
  targetId: undefined,
  skillGroupId: undefined,
  concurrencyLimit: 1,
  callsPerMinute: 10,
  maxCallsPerDay: 1,
  maxCallsTotal: 3,
  minCallIntervalMinutes: 30,
  scheduleTimezone: 'Asia/Shanghai',
  resultWritebackEnabled: true,
  connectedTag: '自动外呼已接通',
  failedTag: '自动外呼未接通',
  callWindows: [{ weekdays: [1, 2, 3, 4, 5], startTime: '09:00:00', endTime: '18:00:00', enabled: true }],
  retryRules: defaultRetryRules()
});
const form = reactive<AutoOutboundTaskForm>(emptyForm());
const rules: FormRules = {
  taskCode: [{ required: true, message: '请输入任务编码', trigger: 'blur' }],
  taskName: [{ required: true, message: '请输入任务名称', trigger: 'blur' }],
  dialMode: [{ required: true, message: '请选择拨打模式', trigger: 'change' }],
  targetId: [{ required: true, message: '请选择接听目标', trigger: 'change' }],
  scheduleTimezone: [{ required: true, message: '请选择任务时区', trigger: 'change' }]
};

const currentTargetOptions = computed(() =>
  form.dialMode === 'AGENTLESS_AI' ? aiOptions.value : form.dialMode === 'AGENTLESS_IVR' ? ivrOptions.value : skillGroupOptions.value
);
const targetFieldLabel = computed(() => (form.dialMode === 'AGENTLESS_AI' ? 'AI 助手' : form.dialMode === 'AGENTLESS_IVR' ? 'IVR 流程' : '技能组'));

const load = async () => {
  loading.value = true;
  try {
    tasks.value = (await listAutoOutboundTasks()).data;
    applyFilter();
  } finally {
    loading.value = false;
  }
};
const loadOptions = async () => {
  const [agents, flows, groups, numbers] = await Promise.all([
    listAiAgents(),
    listIvrFlows(),
    listSkillGroups(),
    listPhoneNumbers({ pageNum: 1, pageSize: 1000, enabled: true })
  ]);
  aiOptions.value = agents.data.filter((item) => item.enabled).map((item) => ({ label: item.agentName, value: item.id }));
  ivrOptions.value = flows.data
    .filter((item) => item.enabled && item.publishStatus === 'PUBLISHED')
    .map((item) => ({ label: item.flowName, value: item.id }));
  skillGroupOptions.value = groups.data.filter((item) => item.enabled).map((item) => ({ label: item.groupName, value: item.id }));
  callerNumberOptions.value = numbers.rows
    .filter((item) => item.gatewayId && ['CALLER_ID', 'BOTH'].includes(item.numberType))
    .map((item) => ({ label: `${item.number} - ${item.numberName || item.gatewayName || '外显号码'}`, value: item.id }));
};
const applyFilter = () => {
  const keyword = query.keyword.trim().toLowerCase();
  filteredTasks.value = tasks.value.filter(
    (item) =>
      (!keyword || item.taskName.toLowerCase().includes(keyword) || item.taskCode.toLowerCase().includes(keyword)) &&
      (!query.dialMode || item.dialMode === query.dialMode) &&
      (!query.status || item.status === query.status)
  );
};
const resetQuery = () => {
  query.keyword = '';
  query.dialMode = undefined;
  query.status = undefined;
  applyFilter();
};
const resetForm = () => Object.assign(form, emptyForm());
const handleAdd = async () => {
  resetForm();
  await loadOptions();
  drawer.id = undefined;
  drawer.title = '新增自动外呼任务';
  drawer.tab = 'base';
  drawer.visible = true;
};
const handleEdit = async (row: AutoOutboundTaskVO) => {
  resetForm();
  await loadOptions();
  Object.assign(form, (await getAutoOutboundTask(row.id)).data);
  drawer.id = row.id;
  drawer.title = '修改自动外呼任务';
  drawer.tab = 'base';
  drawer.visible = true;
};
const handleModeChange = (mode: AutoOutboundDialMode) => {
  form.targetId = undefined;
  form.targetType = mode === 'AGENTLESS_AI' ? 'AI_AGENT' : mode === 'AGENTLESS_IVR' ? 'IVR_FLOW' : 'SKILL_GROUP';
};
const addCallWindow = () => form.callWindows.push({ weekdays: [1, 2, 3, 4, 5], startTime: '09:00:00', endTime: '18:00:00', enabled: true });
const submit = async () => {
  if (!(await formRef.value?.validate())) return;
  if (!form.callWindows.length || form.callWindows.some((item) => !item.weekdays.length || !item.startTime || !item.endTime)) {
    proxy?.$modal.msgWarning('请完整配置至少一个呼叫时段');
    return;
  }
  drawer.saving = true;
  try {
    drawer.id ? await updateAutoOutboundTask(drawer.id, form) : await createAutoOutboundTask(form);
    proxy?.$modal.msgSuccess('自动外呼任务保存成功');
    drawer.visible = false;
    await load();
  } finally {
    drawer.saving = false;
  }
};
const handleDelete = async (row: AutoOutboundTaskVO) => {
  await proxy?.$modal.confirm(`确认删除自动外呼任务“${row.taskName}”吗？`);
  await deleteAutoOutboundTask(row.id);
  await load();
};
const handleStart = async (row: AutoOutboundTaskVO) => {
  row.status === 'PAUSED' ? await resumeAutoOutboundTask(row.id) : await startAutoOutboundTask(row.id);
  await load();
};
const handlePause = async (row: AutoOutboundTaskVO) => {
  await pauseAutoOutboundTask(row.id);
  await load();
};
const handleStop = async (row: AutoOutboundTaskVO) => {
  await proxy?.$modal.confirm(`确认停止任务“${row.taskName}”吗？停止后可修改配置或重新启动。`);
  await stopAutoOutboundTask(row.id);
  await load();
};
const primaryActionLabel = (row: AutoOutboundTaskVO) =>
  row.status === 'RUNNING' ? '暂停' : row.status === 'PAUSED' ? '继续' : row.status === 'STOPPED' ? '重启' : '启动';
const primaryActionType = (row: AutoOutboundTaskVO) => (row.status === 'RUNNING' ? 'warning' : 'success');
const handlePrimaryAction = async (row: AutoOutboundTaskVO) => (row.status === 'RUNNING' ? handlePause(row) : handleStart(row));
const handleMoreCommand = async (command: string, row: AutoOutboundTaskVO) => {
  if (command === 'monitor') monitorDrawerRef.value?.open(row);
  else if (command === 'edit') await handleEdit(row);
  else if (command === 'stop') await handleStop(row);
  else if (command === 'delete') await handleDelete(row);
};
const dialModeLabel = (mode: AutoOutboundDialMode) => dialModeOptions.find((item) => item.value === mode)?.label || mode;
const statusLabel = (status: AutoOutboundStatus) => statusOptions.find((item) => item.value === status)?.label || status;
const statusType = (status: AutoOutboundStatus) =>
  status === 'RUNNING' ? 'success' : status === 'PAUSED' ? 'warning' : status === 'STOPPED' ? 'danger' : 'info';
const retryResultLabel = (code: AutoOutboundRetryResult) => ({ NO_ANSWER: '无人接听', BUSY: '用户忙', FAILED: '呼叫失败', OTHER: '其他结果' })[code];
const progress = (row: AutoOutboundTaskVO) => (row.totalCount ? Math.round((row.completedCount * 100) / row.totalCount) : 0);
const targetLabel = (row: AutoOutboundTaskVO) => {
  const options = row.targetType === 'AI_AGENT' ? aiOptions.value : row.targetType === 'IVR_FLOW' ? ivrOptions.value : skillGroupOptions.value;
  return options.find((item) => String(item.value) === String(row.targetId))?.label || `${row.targetType} / ${row.targetId}`;
};

onMounted(async () => {
  await Promise.all([loadOptions(), load()]);
});
</script>

<style scoped>
.auto-outbound-page {
  display: grid;
  gap: 14px;
}
.query-card,
.list-card {
  border-radius: 10px;
}
.page-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}
.page-heading h2 {
  margin: 0;
  color: var(--el-text-color-primary);
  font-size: 20px;
}
.page-heading p {
  margin: 7px 0 0;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}
.query-form {
  padding-top: 18px;
  margin-bottom: -18px;
  border-top: 1px solid var(--el-border-color-lighter);
  margin-top: 18px;
}
.query-form :deep(.el-input),
.query-form :deep(.el-select) {
  width: 210px;
}
.task-name {
  color: var(--el-text-color-primary);
  font-weight: 600;
}
.secondary {
  margin-top: 4px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.operation-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  white-space: nowrap;
}
.primary-action-wrap {
  display: inline-flex;
  align-items: center;
  height: 32px;
}
.operation-actions :deep(.el-button) {
  margin-left: 0;
}
.operation-actions :deep(.el-dropdown) {
  display: inline-flex;
  align-items: center;
}
.more-arrow {
  margin-left: 3px;
}
.full {
  width: 100%;
}
.policy-grid {
  margin-top: 22px;
}
.unit {
  margin-left: 8px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  color: var(--el-text-color-secondary);
}
.policy-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  margin-bottom: 10px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  background: var(--el-fill-color-lighter);
}
.week-select {
  width: 260px;
}
.window-row :deep(.el-date-editor) {
  width: 135px;
}
.retry-table {
  margin-top: 18px;
  overflow: hidden;
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
}
.retry-head,
.retry-line {
  display: grid;
  grid-template-columns: 1.2fr 0.7fr 1fr 1.2fr;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
}
.retry-head {
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-light);
  font-size: 12px;
}
.retry-line + .retry-line {
  border-top: 1px solid var(--el-border-color-lighter);
}
@media (max-width: 1100px) {
  .query-form :deep(.el-input),
  .query-form :deep(.el-select) {
    width: 170px;
  }
}
</style>
