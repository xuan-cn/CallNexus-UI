<template>
  <div class="quality-operation-page">
    <section class="page-panel">
      <div class="page-heading">
        <div>
          <h2>质检运营</h2>
          <p>固化日报周报口径，配置风险阈值并闭环处理预警</p>
        </div>
        <div class="generate-actions">
          <el-button v-hasPermi="['callcenter:quality-operation:generate']" :loading="generating" @click="generate('DAILY')">生成昨日日报</el-button>
          <el-button v-hasPermi="['callcenter:quality-operation:generate']" type="primary" :loading="generating" @click="generate('WEEKLY')">
            生成上周周报
          </el-button>
        </div>
      </div>
    </section>

    <el-card shadow="never" class="content-card">
      <el-tabs v-model="activeTab" @tab-change="loadActive">
        <el-tab-pane label="周期报表" name="snapshots">
          <div class="toolbar">
            <el-select v-model="snapshotQuery.periodType" clearable placeholder="全部周期" @change="loadSnapshots">
              <el-option label="日报" value="DAILY" /><el-option label="周报" value="WEEKLY" />
            </el-select>
            <el-select v-model="snapshotQuery.scopeType" clearable placeholder="全部范围" @change="loadSnapshots">
              <el-option v-for="item in scopeOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
            <el-input v-model="snapshotQuery.keyword" clearable placeholder="范围名称" @keyup.enter="loadSnapshots" />
            <el-button type="primary" @click="loadSnapshots">查询</el-button>
          </div>
          <el-table v-loading="snapshotLoading" :data="snapshots" size="small">
            <el-table-column label="周期" width="76"
              ><template #default="{ row }">{{ periodLabel(row.periodType) }}</template></el-table-column
            >
            <el-table-column label="统计区间" min-width="176"
              ><template #default="{ row }">{{ row.periodStart }} 至 {{ row.periodEnd }}</template></el-table-column
            >
            <el-table-column prop="scopeName" label="统计范围" min-width="120" show-overflow-tooltip />
            <el-table-column prop="eligibleCallCount" label="可检通话" width="82" align="right" />
            <el-table-column prop="reviewedCallCount" label="已检通话" width="82" align="right" />
            <el-table-column label="覆盖率" width="78" align="right"
              ><template #default="{ row }">{{ percent(row.coverageRate) }}</template></el-table-column
            >
            <el-table-column label="平均分" width="76" align="right"
              ><template #default="{ row }">{{ number(row.averageScore) }}</template></el-table-column
            >
            <el-table-column label="合格率" width="78" align="right"
              ><template #default="{ row }">{{ percent(row.qualifiedRate) }}</template></el-table-column
            >
            <el-table-column label="致命率" width="78" align="right"
              ><template #default="{ row }">{{ percent(row.fatalRate) }}</template></el-table-column
            >
            <el-table-column label="AI采纳率" width="88" align="right"
              ><template #default="{ row }">{{ percent(row.aiAdoptionRate) }}</template></el-table-column
            >
            <el-table-column label="申诉率" width="78" align="right"
              ><template #default="{ row }">{{ percent(row.appealRate) }}</template></el-table-column
            >
            <el-table-column prop="generatedAt" label="生成时间" width="154" />
          </el-table>
          <pagination
            v-show="snapshotTotal > 0"
            v-model:page="snapshotQuery.pageNum"
            v-model:limit="snapshotQuery.pageSize"
            :total="snapshotTotal"
            :auto-scroll="false"
            @pagination="loadSnapshots"
          />
        </el-tab-pane>

        <el-tab-pane label="预警规则" name="rules">
          <div class="toolbar">
            <el-select v-model="ruleQuery.periodType" clearable placeholder="全部周期" @change="loadRules">
              <el-option label="日报" value="DAILY" /><el-option label="周报" value="WEEKLY" />
            </el-select>
            <el-select v-model="ruleQuery.metricCode" clearable placeholder="全部指标" @change="loadRules">
              <el-option v-for="item in metricOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
            <el-input v-model="ruleQuery.keyword" clearable placeholder="规则名称" @keyup.enter="loadRules" />
            <el-button type="primary" @click="loadRules">查询</el-button>
            <el-button v-hasPermi="['callcenter:quality-operation:config']" type="primary" plain @click="openRule()">新增规则</el-button>
          </div>
          <el-table v-loading="ruleLoading" :data="rules" size="small">
            <el-table-column prop="ruleName" label="规则名称" min-width="150" show-overflow-tooltip />
            <el-table-column label="周期" width="72"
              ><template #default="{ row }">{{ periodLabel(row.periodType) }}</template></el-table-column
            >
            <el-table-column label="触发条件" min-width="180"
              ><template #default="{ row }"
                >{{ metricLabel(row.metricCode) }} {{ operatorLabel(row.compareOperator) }} {{ row.thresholdValue }}</template
              ></el-table-column
            >
            <el-table-column prop="scopeName" label="统计范围" min-width="120" show-overflow-tooltip />
            <el-table-column label="状态" width="72"
              ><template #default="{ row }"
                ><el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '停用' }}</el-tag></template
              ></el-table-column
            >
            <el-table-column prop="remark" label="说明" min-width="160" show-overflow-tooltip />
            <el-table-column label="操作" width="120" fixed="right">
              <template #default="{ row }">
                <el-button v-hasPermi="['callcenter:quality-operation:config']" link type="primary" @click="openRule(row)">修改</el-button>
                <el-button v-hasPermi="['callcenter:quality-operation:config']" link type="danger" @click="removeRule(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <pagination
            v-show="ruleTotal > 0"
            v-model:page="ruleQuery.pageNum"
            v-model:limit="ruleQuery.pageSize"
            :total="ruleTotal"
            :auto-scroll="false"
            @pagination="loadRules"
          />
        </el-tab-pane>

        <el-tab-pane label="预警记录" name="alerts">
          <div class="toolbar">
            <el-select v-model="alertQuery.status" clearable placeholder="全部状态" @change="loadAlerts">
              <el-option label="待处理" value="OPEN" /><el-option label="已确认" value="ACKNOWLEDGED" /><el-option label="已关闭" value="CLOSED" />
            </el-select>
            <el-select v-model="alertQuery.metricCode" clearable placeholder="全部指标" @change="loadAlerts">
              <el-option v-for="item in metricOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
            <el-input v-model="alertQuery.keyword" clearable placeholder="规则名称" @keyup.enter="loadAlerts" />
            <el-button type="primary" @click="loadAlerts">查询</el-button>
          </div>
          <el-table v-loading="alertLoading" :data="alerts" size="small">
            <el-table-column prop="ruleName" label="预警规则" min-width="150" show-overflow-tooltip />
            <el-table-column label="统计区间" min-width="176"
              ><template #default="{ row }">{{ row.periodStart }} 至 {{ row.periodEnd }}</template></el-table-column
            >
            <el-table-column prop="scopeName" label="统计范围" min-width="110" />
            <el-table-column label="指标" min-width="108"
              ><template #default="{ row }">{{ metricLabel(row.metricCode) }}</template></el-table-column
            >
            <el-table-column label="实际/阈值" width="116"
              ><template #default="{ row }"
                >{{ row.actualValue }} / {{ operatorLabel(row.compareOperator) }} {{ row.thresholdValue }}</template
              ></el-table-column
            >
            <el-table-column label="状态" width="76"
              ><template #default="{ row }"
                ><el-tag :type="statusType(row.status)">{{ statusLabel(row.status) }}</el-tag></template
              ></el-table-column
            >
            <el-table-column prop="triggeredAt" label="触发时间" width="154" />
            <el-table-column label="操作" width="128" fixed="right">
              <template #default="{ row }">
                <el-button
                  v-if="row.status === 'OPEN'"
                  v-hasPermi="['callcenter:quality-operation:handle']"
                  link
                  type="primary"
                  @click="handleAlert(row, 'ACKNOWLEDGED')"
                  >确认</el-button
                >
                <el-button
                  v-if="row.status !== 'CLOSED'"
                  v-hasPermi="['callcenter:quality-operation:handle']"
                  link
                  type="danger"
                  @click="handleAlert(row, 'CLOSED')"
                  >关闭</el-button
                >
              </template>
            </el-table-column>
          </el-table>
          <pagination
            v-show="alertTotal > 0"
            v-model:page="alertQuery.pageNum"
            v-model:limit="alertQuery.pageSize"
            :total="alertTotal"
            :auto-scroll="false"
            @pagination="loadAlerts"
          />
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <el-dialog v-model="ruleVisible" :title="ruleForm.id ? '修改预警规则' : '新增预警规则'" width="560px" destroy-on-close>
      <el-form label-width="92px" size="small">
        <el-form-item label="规则名称" required><el-input v-model="ruleForm.ruleName" maxlength="128" /></el-form-item>
        <div class="form-grid">
          <el-form-item label="统计周期" required
            ><el-select v-model="ruleForm.periodType"><el-option label="日报" value="DAILY" /><el-option label="周报" value="WEEKLY" /></el-select
          ></el-form-item>
          <el-form-item label="预警指标" required
            ><el-select v-model="ruleForm.metricCode"
              ><el-option v-for="item in metricOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select
          ></el-form-item>
          <el-form-item label="判断方式" required
            ><el-select v-model="ruleForm.compareOperator"
              ><el-option v-for="item in operatorOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select
          ></el-form-item>
          <el-form-item label="阈值" required
            ><el-input-number v-model="ruleForm.thresholdValue" :min="0" :precision="2" controls-position="right"
          /></el-form-item>
          <el-form-item label="统计范围" required
            ><el-select v-model="ruleForm.scopeType" @change="ruleForm.scopeId = undefined"
              ><el-option v-for="item in scopeOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select
          ></el-form-item>
          <el-form-item v-if="ruleForm.scopeType !== 'TENANT'" :label="ruleForm.scopeType === 'QUEUE' ? '队列' : '技能组'" required>
            <el-select v-model="ruleForm.scopeId" filterable
              ><el-option v-for="item in currentScopeOptions" :key="String(item.id)" :label="item.name" :value="item.id"
            /></el-select>
          </el-form-item>
          <el-form-item label="启用"><el-switch v-model="ruleForm.enabled" /></el-form-item>
        </div>
        <el-form-item label="说明"><el-input v-model="ruleForm.remark" type="textarea" :rows="2" maxlength="500" /></el-form-item>
      </el-form>
      <template #footer
        ><el-button @click="ruleVisible = false">取消</el-button
        ><el-button type="primary" :loading="saving" @click="saveRule">保存</el-button></template
      >
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  acknowledgeQualityAlert,
  closeQualityAlert,
  createQualityAlertRule,
  deleteQualityAlertRule,
  generateQualityReportSnapshot,
  getQualityReportOptions,
  pageQualityAlertRecords,
  pageQualityAlertRules,
  pageQualityReportSnapshots,
  updateQualityAlertRule
} from '@/api/callcenter/quality';
import type {
  QualityAlertRecordVO,
  QualityAlertRuleForm,
  QualityAlertRuleVO,
  QualityOperationQuery,
  QualityOperationPeriod,
  QualityReportOptionsVO,
  QualityReportSnapshotVO
} from '@/api/callcenter/quality/types';

const activeTab = ref('snapshots');
const generating = ref(false);
const snapshotLoading = ref(false);
const ruleLoading = ref(false);
const alertLoading = ref(false);
const snapshots = ref<QualityReportSnapshotVO[]>([]);
const rules = ref<QualityAlertRuleVO[]>([]);
const alerts = ref<QualityAlertRecordVO[]>([]);
const snapshotTotal = ref(0);
const ruleTotal = ref(0);
const alertTotal = ref(0);
const snapshotQuery = reactive<QualityOperationQuery>({ pageNum: 1, pageSize: 10 });
const ruleQuery = reactive<QualityOperationQuery>({ pageNum: 1, pageSize: 10 });
const alertQuery = reactive<QualityOperationQuery>({ pageNum: 1, pageSize: 10 });
const options = reactive<QualityReportOptionsVO>({ agents: [], queues: [], skillGroups: [] });
const scopeOptions = [
  { label: '全部', value: 'TENANT' },
  { label: '队列', value: 'QUEUE' },
  { label: '技能组', value: 'SKILL_GROUP' }
] as const;
const metricOptions = [
  { label: '质检覆盖率', value: 'COVERAGE_RATE' },
  { label: '平均分', value: 'AVERAGE_SCORE' },
  { label: '合格率', value: 'QUALIFIED_RATE' },
  { label: '致命项率', value: 'FATAL_RATE' },
  { label: 'AI采纳率', value: 'AI_ADOPTION_RATE' },
  { label: '申诉率', value: 'APPEAL_RATE' }
] as const;
const operatorOptions = [
  { label: '小于', value: 'LT' },
  { label: '小于等于', value: 'LTE' },
  { label: '大于', value: 'GT' },
  { label: '大于等于', value: 'GTE' }
] as const;

const defaultRule = (): QualityAlertRuleForm => ({
  ruleName: '',
  periodType: 'DAILY',
  metricCode: 'COVERAGE_RATE',
  compareOperator: 'LT',
  thresholdValue: 80,
  scopeType: 'TENANT',
  scopeName: '全部',
  enabled: true,
  remark: ''
});
const ruleVisible = ref(false);
const saving = ref(false);
const ruleForm = reactive<QualityAlertRuleForm>(defaultRule());
const currentScopeOptions = computed(() => (ruleForm.scopeType === 'QUEUE' ? options.queues : options.skillGroups));

const loadSnapshots = async () => {
  snapshotLoading.value = true;
  try {
    const response = await pageQualityReportSnapshots(snapshotQuery);
    snapshots.value = response.rows || [];
    snapshotTotal.value = response.total || 0;
  } finally {
    snapshotLoading.value = false;
  }
};
const loadRules = async () => {
  ruleLoading.value = true;
  try {
    const response = await pageQualityAlertRules(ruleQuery);
    rules.value = response.rows || [];
    ruleTotal.value = response.total || 0;
  } finally {
    ruleLoading.value = false;
  }
};
const loadAlerts = async () => {
  alertLoading.value = true;
  try {
    const response = await pageQualityAlertRecords(alertQuery);
    alerts.value = response.rows || [];
    alertTotal.value = response.total || 0;
  } finally {
    alertLoading.value = false;
  }
};
const loadActive = () => {
  if (activeTab.value === 'rules') return loadRules();
  if (activeTab.value === 'alerts') return loadAlerts();
  return loadSnapshots();
};
const generate = async (periodType: QualityOperationPeriod) => {
  generating.value = true;
  try {
    await generateQualityReportSnapshot(periodType);
    ElMessage.success(periodType === 'DAILY' ? '昨日日报已生成' : '上周周报已生成');
    await Promise.all([loadSnapshots(), loadAlerts()]);
  } finally {
    generating.value = false;
  }
};
const openRule = (row?: QualityAlertRuleVO) => {
  Object.assign(ruleForm, defaultRule(), row || {});
  ruleVisible.value = true;
};
const saveRule = async () => {
  if (!ruleForm.ruleName.trim()) return ElMessage.warning('请填写规则名称');
  if (ruleForm.scopeType !== 'TENANT' && !ruleForm.scopeId) return ElMessage.warning('请选择统计范围');
  const selected = currentScopeOptions.value.find((item) => String(item.id) === String(ruleForm.scopeId));
  ruleForm.scopeName = ruleForm.scopeType === 'TENANT' ? '全部' : selected?.name || '';
  saving.value = true;
  try {
    if (ruleForm.id) await updateQualityAlertRule(ruleForm.id, ruleForm);
    else await createQualityAlertRule(ruleForm);
    ElMessage.success('预警规则已保存');
    ruleVisible.value = false;
    await loadRules();
  } finally {
    saving.value = false;
  }
};
const removeRule = async (row: QualityAlertRuleVO) => {
  await ElMessageBox.confirm(`确认删除预警规则“${row.ruleName}”？`, '删除规则', { type: 'warning' });
  await deleteQualityAlertRule(row.id);
  ElMessage.success('已删除');
  await loadRules();
};
const handleAlert = async (row: QualityAlertRecordVO, status: 'ACKNOWLEDGED' | 'CLOSED') => {
  const { value } = await ElMessageBox.prompt('可填写本次处理说明', status === 'CLOSED' ? '关闭预警' : '确认预警', {
    inputPlaceholder: '处理说明（选填）'
  });
  if (status === 'CLOSED') await closeQualityAlert(row.id, value);
  else await acknowledgeQualityAlert(row.id, value);
  ElMessage.success(status === 'CLOSED' ? '预警已关闭' : '预警已确认');
  await loadAlerts();
};
const periodLabel = (value: string) => (value === 'WEEKLY' ? '周报' : '日报');
const metricLabel = (value: string) => metricOptions.find((item) => item.value === value)?.label || value;
const operatorLabel = (value: string) => operatorOptions.find((item) => item.value === value)?.label || value;
const statusLabel = (value: string) => ({ OPEN: '待处理', ACKNOWLEDGED: '已确认', CLOSED: '已关闭' })[value] || value;
const statusType = (value: string) => (value === 'OPEN' ? 'danger' : value === 'ACKNOWLEDGED' ? 'warning' : 'info');
const percent = (value?: number) => `${number(value)}%`;
const number = (value?: number) => Number(value || 0).toFixed(2);

onMounted(async () => {
  const response = await getQualityReportOptions();
  Object.assign(options, response.data || { agents: [], queues: [], skillGroups: [] });
  await loadSnapshots();
});
</script>

<style scoped lang="scss">
.quality-operation-page {
  padding: 14px;
  font-size: 13px;
}
.page-panel,
.content-card {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  background: var(--el-bg-color);
}
.page-panel {
  padding: 16px 18px;
  margin-bottom: 12px;
}
.page-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  h2 {
    margin: 0 0 4px;
    font-size: 18px;
    font-weight: 500;
  }
  p {
    margin: 0;
    color: var(--el-text-color-secondary);
  }
}
.generate-actions {
  display: flex;
  gap: 8px;
}
.content-card :deep(.el-card__body) {
  padding: 4px 16px 16px;
}
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 8px 0 14px;
  .el-select,
  .el-input {
    width: 160px;
  }
}
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: 12px;
  :deep(.el-select),
  :deep(.el-input-number) {
    width: 100%;
  }
}
@media (max-width: 760px) {
  .page-heading {
    align-items: flex-start;
    flex-direction: column;
  }
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
