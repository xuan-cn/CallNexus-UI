<template>
  <div class="satisfaction-page">
    <section class="filter-panel">
      <div class="page-title">
        <span class="title-icon"><el-icon><DataAnalysis /></el-icon></span>
        <div><h2>满意度分析</h2><p>查看挂机评价参与情况、评分趋势以及队列和坐席表现</p></div>
      </div>
      <el-button class="export-button" :icon="Download" :loading="exporting" @click="handleExport">导出</el-button>
      <el-form class="filter-form" :inline="true" size="small" @submit.prevent>
        <el-form-item label="统计日期">
          <el-date-picker v-model="dateRange" class="date-range" type="daterange" value-format="YYYY-MM-DD"
            range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" :clearable="false" />
        </el-form-item>
        <el-form-item class="quick-range">
          <el-button @click="applyQuickRange(1)">今天</el-button><el-button @click="applyQuickRange(7)">近7天</el-button
          ><el-button @click="applyQuickRange(30)">近30天</el-button>
        </el-form-item>
        <el-form-item label="队列">
          <el-select v-model="query.queueId" clearable filterable placeholder="全部队列" class="filter-select">
            <el-option v-for="item in queueOptions" :key="String(item.id)" :value="item.id"
              :label="`${item.queueName}${item.enabled ? '' : '（已停用）'}`" />
          </el-select>
        </el-form-item>
        <el-form-item label="坐席">
          <el-select v-model="query.agentId" clearable filterable placeholder="全部坐席" class="filter-select">
            <el-option v-for="item in agentOptions" :key="String(item.id)" :value="item.id"
              :label="`${item.agentName}${item.extension ? `（${item.extension}）` : ''}${item.enabled ? '' : '（已停用）'}`" />
          </el-select>
        </el-form-item>
        <el-form-item label="评价状态">
          <el-select v-model="query.satisfactionStatus" clearable placeholder="全部" class="short-select">
            <el-option label="已评价" value="SUBMITTED" /><el-option label="未评价" value="NO_INPUT" />
          </el-select>
        </el-form-item>
        <el-form-item label="评分">
          <el-select v-model="query.satisfactionScore" clearable placeholder="全部" class="short-select">
            <el-option v-for="score in 5" :key="score" :label="`${score} 分`" :value="score" />
          </el-select>
        </el-form-item>
        <el-form-item><el-button type="primary" :loading="loading" @click="handleQuery">查询</el-button></el-form-item>
      </el-form>
    </section>

    <div class="metric-grid">
      <div v-for="item in metricItems" :key="item.label" class="metric-item">
        <span>{{ item.label }}</span><strong>{{ item.value }}</strong><small>{{ item.note }}</small>
      </div>
    </div>

    <div class="chart-grid">
      <el-card shadow="never">
        <template #header>满意度趋势</template>
        <div v-show="hasData" ref="trendChartRef" class="chart" />
        <el-empty v-if="!hasData" description="当前范围暂无评价数据" :image-size="70" />
      </el-card>
      <el-card shadow="never">
        <template #header>评分分布</template>
        <div v-show="submittedCount > 0" ref="distributionChartRef" class="chart" />
        <el-empty v-if="submittedCount === 0" description="暂无已提交评价" :image-size="70" />
      </el-card>
    </div>

    <div class="ranking-grid">
      <el-card shadow="never"><template #header>队列满意度</template>
        <el-table :data="queueRankings" size="small" max-height="310">
          <el-table-column label="队列" prop="dimensionName" min-width="120" show-overflow-tooltip />
          <el-table-column label="评价数" prop="submittedCount" width="70" align="center" />
          <el-table-column label="参与率" width="80" align="right"><template #default="{ row }">{{ percent(row.participationRate) }}</template></el-table-column>
          <el-table-column label="平均分" width="72" align="right"><template #default="{ row }">{{ scoreText(row.averageScore) }}</template></el-table-column>
          <el-table-column label="满意率" width="80" align="right"><template #default="{ row }">{{ percent(row.satisfactionRate) }}</template></el-table-column>
        </el-table>
      </el-card>
      <el-card shadow="never"><template #header>坐席满意度</template>
        <el-table :data="agentRankings" size="small" max-height="310">
          <el-table-column label="坐席" prop="dimensionName" min-width="120" show-overflow-tooltip />
          <el-table-column label="评价数" prop="submittedCount" width="70" align="center" />
          <el-table-column label="参与率" width="80" align="right"><template #default="{ row }">{{ percent(row.participationRate) }}</template></el-table-column>
          <el-table-column label="平均分" width="72" align="right"><template #default="{ row }">{{ scoreText(row.averageScore) }}</template></el-table-column>
          <el-table-column label="满意率" width="80" align="right"><template #default="{ row }">{{ percent(row.satisfactionRate) }}</template></el-table-column>
        </el-table>
      </el-card>
    </div>

    <el-card class="detail-card" shadow="never"><template #header>评价明细</template>
      <el-table v-loading="loading" :data="detailRows" size="small">
        <el-table-column label="评价时间" prop="evaluatedAt" width="158" />
        <el-table-column label="队列" prop="queueName" min-width="112" show-overflow-tooltip />
        <el-table-column label="技能组" prop="skillGroupName" min-width="100" show-overflow-tooltip />
        <el-table-column label="坐席" min-width="104" show-overflow-tooltip><template #default="{ row }">{{ row.agentName || row.agentExtension || '-' }}</template></el-table-column>
        <el-table-column label="客户号码" prop="customerNumber" width="118" />
        <el-table-column label="评价" width="82" align="center"><template #default="{ row }">
          <el-rate v-if="row.status === 'SUBMITTED'" :model-value="row.score" disabled size="small" />
          <span v-else class="muted">未评价</span>
        </template></el-table-column>
        <el-table-column label="按键" width="58" align="center"><template #default="{ row }">{{ row.digit || '-' }}</template></el-table-column>
        <el-table-column label="通话时长" width="88" align="right"><template #default="{ row }">{{ duration(row.talkSeconds) }}</template></el-table-column>
        <el-table-column label="业务通话ID" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <el-button link type="primary" @click="openCallDetail(row)">{{ row.businessCallId || '-' }}</el-button>
          </template>
        </el-table-column>
      </el-table>
      <pagination v-show="total > 0" v-model:page="query.pageNum" v-model:limit="query.pageSize" :total="total" @pagination="loadDetails" />
    </el-card>
    <CallRecordDetailDrawer v-model="callDetailVisible" :session-id="callDetailSessionId" />
  </div>
</template>

<script setup lang="ts">
import * as echarts from 'echarts';
import { DataAnalysis, Download } from '@element-plus/icons-vue';
import { computed, getCurrentInstance, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import {
  getSatisfactionReportDistribution, getSatisfactionReportSummary, getSatisfactionReportTrend,
  listReportAgentOptions, listReportQueueOptions, listSatisfactionAgentRankings,
  listSatisfactionDetails, listSatisfactionQueueRankings
} from '@/api/callcenter/report';
import type {
  ReportAgentOptionVO, ReportQuery, ReportQueueOptionVO, SatisfactionDetailVO, SatisfactionRankingVO,
  SatisfactionScoreDistributionVO, SatisfactionSummaryVO, SatisfactionTrendPointVO
} from '@/api/callcenter/report/types';
import CallRecordDetailDrawer from '@/components/CallRecordDetailDrawer/index.vue';

const formatDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const { proxy } = getCurrentInstance() as ComponentInternalInstance;
const today = new Date();
const begin = new Date(today);
begin.setDate(begin.getDate() - 6);
const dateRange = ref<[string, string]>([formatDate(begin), formatDate(today)]);
const query = reactive<ReportQuery>({ pageNum: 1, pageSize: 20 });
const loading = ref(false);
const exporting = ref(false);
const summary = ref<SatisfactionSummaryVO>();
const trendRows = ref<SatisfactionTrendPointVO[]>([]);
const distributionRows = ref<SatisfactionScoreDistributionVO[]>([]);
const queueRankings = ref<SatisfactionRankingVO[]>([]);
const agentRankings = ref<SatisfactionRankingVO[]>([]);
const detailRows = ref<SatisfactionDetailVO[]>([]);
const queueOptions = ref<ReportQueueOptionVO[]>([]);
const agentOptions = ref<ReportAgentOptionVO[]>([]);
const total = ref(0);
const callDetailVisible = ref(false);
const callDetailSessionId = ref<string | number>();
const trendChartRef = ref<HTMLDivElement>();
const distributionChartRef = ref<HTMLDivElement>();
let trendChart: echarts.ECharts | undefined;
let distributionChart: echarts.ECharts | undefined;

const hasData = computed(() => Number(summary.value?.invitationCount || 0) > 0);
const submittedCount = computed(() => Number(summary.value?.submittedCount || 0));
const percent = (value?: number) => `${Number(value || 0).toFixed(2)}%`;
const scoreText = (value?: number) => `${Number(value || 0).toFixed(2)}`;
const duration = (seconds?: number) => {
  const value = Math.max(0, Number(seconds || 0));
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const secs = value % 60;
  return hours ? `${hours}时${minutes}分` : minutes ? `${minutes}分${secs}秒` : `${secs}秒`;
};
const metricItems = computed(() => [
  { label: '评价邀请', value: summary.value?.invitationCount ?? 0, note: '进入挂机评价流程' },
  { label: '已评价', value: summary.value?.submittedCount ?? 0, note: `参与率 ${percent(summary.value?.participationRate)}` },
  { label: '平均分', value: scoreText(summary.value?.averageScore), note: `样本 ${summary.value?.submittedCount ?? 0} 条` },
  { label: '满意率', value: percent(summary.value?.satisfactionRate), note: '4至5分 / 已评价' },
  { label: '不满意率', value: percent(summary.value?.dissatisfactionRate), note: '1至2分 / 已评价' },
  { label: '未评价率', value: percent(summary.value?.noInputRate), note: `未按键 ${summary.value?.noInputCount ?? 0} 条` }
]);
const params = () => ({ ...query, beginDate: dateRange.value[0], endDate: dateRange.value[1] });

const applyQuickRange = (days: number) => {
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - Math.max(0, days - 1));
  dateRange.value = [formatDate(start), formatDate(end)];
  handleQuery();
};
const handleQuery = () => { query.pageNum = 1; load(); };
const handleExport = async () => {
  exporting.value = true;
  try {
    await proxy?.download(
      'api/v1/reports/satisfaction/export',
      params(),
      `满意度分析_${dateRange.value[0]}_${dateRange.value[1]}.xlsx`
    );
  } finally { exporting.value = false; }
};
const openCallDetail = (row: SatisfactionDetailVO) => {
  callDetailSessionId.value = row.sessionId;
  callDetailVisible.value = true;
};
const loadOptions = async () => {
  const [queues, agents] = await Promise.all([listReportQueueOptions(), listReportAgentOptions()]);
  queueOptions.value = queues.data || [];
  agentOptions.value = agents.data || [];
};
const load = async () => {
  loading.value = true;
  try {
    const [summaryRes, trendRes, distributionRes, queuesRes, agentsRes, detailsRes] = await Promise.all([
      getSatisfactionReportSummary(params()), getSatisfactionReportTrend(params()),
      getSatisfactionReportDistribution(params()), listSatisfactionQueueRankings(params()),
      listSatisfactionAgentRankings(params()), listSatisfactionDetails(params())
    ]);
    summary.value = summaryRes.data;
    trendRows.value = trendRes.data || [];
    distributionRows.value = distributionRes.data || [];
    queueRankings.value = queuesRes.data || [];
    agentRankings.value = agentsRes.data || [];
    detailRows.value = detailsRes.rows || [];
    total.value = detailsRes.total || 0;
    await nextTick();
    renderCharts();
  } finally { loading.value = false; }
};
const loadDetails = async () => {
  loading.value = true;
  try {
    const res = await listSatisfactionDetails(params());
    detailRows.value = res.rows || [];
    total.value = res.total || 0;
  } finally { loading.value = false; }
};
const renderCharts = () => {
  if (hasData.value && trendChartRef.value) {
    trendChart ||= echarts.init(trendChartRef.value);
    trendChart.setOption({
      tooltip: { trigger: 'axis' }, legend: { top: 2, data: ['平均分', '满意率', '参与率'] },
      grid: { left: 42, right: 48, top: 42, bottom: 28 },
      xAxis: { type: 'category', data: trendRows.value.map((item) => item.bucket.slice(5)) },
      yAxis: [{ type: 'value', min: 0, max: 5 }, { type: 'value', min: 0, max: 100, axisLabel: { formatter: '{value}%' } }],
      series: [
        { name: '平均分', type: 'line', smooth: true, data: trendRows.value.map((item) => item.averageScore) },
        { name: '满意率', type: 'line', smooth: true, yAxisIndex: 1, data: trendRows.value.map((item) => item.satisfactionRate) },
        { name: '参与率', type: 'line', smooth: true, yAxisIndex: 1, data: trendRows.value.map((item) => item.participationRate) }
      ]
    }, true);
  }
  if (submittedCount.value > 0 && distributionChartRef.value) {
    distributionChart ||= echarts.init(distributionChartRef.value);
    const counts = new Map(distributionRows.value.map((item) => [item.score, item.count]));
    distributionChart.setOption({
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } }, grid: { left: 38, right: 18, top: 18, bottom: 28 },
      xAxis: { type: 'category', data: ['1分', '2分', '3分', '4分', '5分'] }, yAxis: { type: 'value', minInterval: 1 },
      series: [{ type: 'bar', barMaxWidth: 34, data: [1, 2, 3, 4, 5].map((score) => counts.get(score) || 0), itemStyle: { color: '#409eff', borderRadius: [4, 4, 0, 0] } }]
    }, true);
  }
};
const resize = () => { trendChart?.resize(); distributionChart?.resize(); };
onMounted(async () => { await loadOptions(); await load(); window.addEventListener('resize', resize); });
onBeforeUnmount(() => { window.removeEventListener('resize', resize); trendChart?.dispose(); distributionChart?.dispose(); });
</script>

<style scoped lang="scss">
.satisfaction-page { display: flex; flex-direction: column; gap: 10px; min-height: 100%; padding: 10px 12px; box-sizing: border-box; overflow: auto; font-size: 12px; }
.filter-panel, .metric-item, .chart-grid .el-card, .ranking-grid .el-card, .detail-card { border: 0; border-radius: 12px; background: var(--el-bg-color); }
.filter-panel { position: relative; padding: 12px 14px; }
.export-button { position: absolute; top: 12px; right: 14px; }
.page-title { display: flex; align-items: center; gap: 10px; }
.title-icon { display: grid; width: 34px; height: 34px; place-items: center; border-radius: 9px; color: var(--el-color-primary); background: var(--el-color-primary-light-9); font-size: 18px; }
.page-title h2 { margin: 0 0 3px; font-size: 17px; font-weight: 500; }
.page-title p { margin: 0; color: var(--el-text-color-secondary); font-size: 11px; }
.filter-form { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--el-border-color-lighter); }
.filter-form :deep(.el-form-item) { margin: 0; min-width: 0; }.date-range { width: 260px !important; }.filter-select { width: 180px; }.short-select { width: 108px; }
.metric-grid { display: grid; grid-template-columns: repeat(6, minmax(120px, 1fr)); gap: 8px; }
.metric-item { padding: 10px 12px; background: var(--el-fill-color-lighter); }
.metric-item span, .metric-item small { display: block; color: var(--el-text-color-secondary); font-size: 11px; }.metric-item strong { display: block; margin: 4px 0 2px; font-size: 20px; font-weight: 500; }
.chart-grid, .ranking-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.chart-grid :deep(.el-card__header), .ranking-grid :deep(.el-card__header), .detail-card :deep(.el-card__header) { padding: 10px 14px; font-size: 13px; font-weight: 500; }
.chart-grid :deep(.el-card__body), .ranking-grid :deep(.el-card__body) { padding: 8px 12px; }.chart { height: 250px; }.chart-grid :deep(.el-empty) { height: 250px; padding: 0; }
.detail-card :deep(.el-card__body) { padding: 8px 12px 10px; }.detail-card :deep(.el-table), .ranking-grid :deep(.el-table) { font-size: 11px; }
.detail-card :deep(.el-rate) { height: 18px; white-space: nowrap; }.detail-card :deep(.el-rate__icon) { margin-right: 0; font-size: 14px; }.muted { color: var(--el-text-color-secondary); }
@media (max-width: 1200px) { .metric-grid { grid-template-columns: repeat(3, 1fr); }.chart-grid, .ranking-grid { grid-template-columns: 1fr; } }
@media (max-width: 760px) { .filter-form :deep(.el-form-item), .date-range, .filter-select, .short-select { width: 100% !important; } }
</style>
