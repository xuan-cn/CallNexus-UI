<template>
  <div class="report-page">
    <el-card class="filter-card" shadow="never">
      <div class="page-head">
        <div class="page-title">
          <span class="page-title-icon">
            <el-icon><component :is="pageIcon" /></el-icon>
          </span>
          <div>
            <h2>{{ title }}</h2>
            <p>{{ subtitle }}</p>
          </div>
        </div>
        <el-form :inline="true" size="small" @submit.prevent>
          <el-form-item>
            <el-date-picker
              v-model="dateRange"
              type="daterange"
              value-format="YYYY-MM-DD"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              :clearable="false"
            />
          </el-form-item>
          <el-form-item v-if="mode !== 'overview'">
            <el-input v-model="query.keyword" clearable placeholder="号码、坐席或名称" @keyup.enter="load" />
          </el-form-item>
          <el-form-item v-if="mode === 'call'">
            <el-select v-model="query.direction" clearable placeholder="通话方向" style="width: 110px">
              <el-option label="呼入" value="INBOUND" /><el-option label="呼出" value="OUTBOUND" /><el-option label="内部" value="INTERNAL" />
            </el-select>
          </el-form-item>
          <el-form-item><el-button type="primary" :loading="loading" @click="handleQuery">查询</el-button></el-form-item>
        </el-form>
      </div>
    </el-card>

    <template v-if="mode === 'overview' || mode === 'call'">
      <div class="metric-grid">
        <div v-for="item in metricItems" :key="item.label" class="metric-item">
          <span>{{ item.label }}</span
          ><strong>{{ item.value }}</strong
          ><small>{{ item.note }}</small>
        </div>
      </div>
      <div class="chart-grid">
        <el-card shadow="never"
          ><template #header>话务趋势</template>
          <div ref="trendChartRef" class="chart"
        /></el-card>
        <el-card shadow="never"
          ><template #header>呼叫结果构成</template>
          <div ref="distributionChartRef" class="chart"
        /></el-card>
      </div>
      <el-card v-if="mode === 'call'" class="table-card" shadow="never">
        <template #header>通话明细</template>
        <el-table v-loading="loading" :data="callRows" size="small" height="100%">
          <el-table-column label="开始时间" prop="startedAt" width="158" />
          <el-table-column label="方向" width="70"
            ><template #default="{ row }">{{ directionLabel(row.direction) }}</template></el-table-column
          >
          <el-table-column label="客户号码" prop="customerNumber" min-width="128" show-overflow-tooltip />
          <el-table-column label="坐席" min-width="110" show-overflow-tooltip
            ><template #default="{ row }">{{ row.agentName || row.agentExtension || '-' }}</template></el-table-column
          >
          <el-table-column label="队列" prop="queueName" min-width="120" show-overflow-tooltip />
          <el-table-column label="结果" width="90"
            ><template #default="{ row }">{{ row.answeredAt ? '已接通' : '未接通' }}</template></el-table-column
          >
          <el-table-column label="等待" width="82"
            ><template #default="{ row }">{{ duration(row.waitSeconds) }}</template></el-table-column
          >
          <el-table-column label="通话时长" width="96"
            ><template #default="{ row }">{{ duration(row.talkSeconds) }}</template></el-table-column
          >
          <el-table-column label="挂断原因" prop="hangupCause" min-width="140" show-overflow-tooltip />
        </el-table>
        <pagination v-show="total > 0" v-model:page="query.pageNum" v-model:limit="query.pageSize" :total="total" @pagination="loadCallDetails" />
      </el-card>
    </template>

    <template v-else-if="mode === 'agent'">
      <el-card class="chart-card analysis-chart-card" shadow="never"
        ><template #header
          ><div class="section-title">
            <el-icon><TrendCharts /></el-icon><span>坐席处理量排行</span>
          </div></template
        >
        <div ref="rankChartRef" class="rank-chart"
      /></el-card>
      <el-card class="table-card analysis-table-card" shadow="never">
        <el-table v-loading="loading" :data="agentRows" size="small" class="analysis-table">
          <el-table-column label="坐席" min-width="112"
            ><template #default="{ row }"
              ><div class="primary-cell">{{ row.agentName }}</div>
              <div class="secondary-cell">{{ row.extension || row.agentCode }}</div></template
            ></el-table-column
          >
          <el-table-column label="技能组" prop="skillGroupNames" min-width="110" show-overflow-tooltip />
          <el-table-column label="处理量" prop="handledCount" sortable width="76" align="center" />
          <el-table-column label="接听构成" min-width="132">
            <template #default="{ row }">
              <div class="metric-pair">
                <span>呼入 {{ row.inboundAnsweredCount }}</span
                ><span>呼出 {{ row.outboundAnsweredCount }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="未接" prop="missedCount" sortable width="68" align="center" />
          <el-table-column label="响应 / 通话" min-width="142">
            <template #default="{ row }">
              <div class="stacked-metric">
                <span>响应 {{ duration(row.averageResponseSeconds) }}</span
                ><span>通话 {{ duration(row.averageTalkSeconds) }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="在线 / 示忙" min-width="142">
            <template #default="{ row }">
              <div class="stacked-metric">
                <span>在线 {{ duration(row.onlineSeconds) }}</span
                ><span>示忙 {{ duration(row.notReadySeconds) }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="利用率" width="78" align="center"
            ><template #default="{ row }">{{ percent(row.utilizationRate) }}</template></el-table-column
          >
        </el-table>
      </el-card>
    </template>

    <template v-else>
      <el-card class="chart-card analysis-chart-card" shadow="never"
        ><template #header
          ><div class="section-title">
            <el-icon><Histogram /></el-icon><span>队列进入量排行</span>
          </div></template
        >
        <div ref="rankChartRef" class="rank-chart"
      /></el-card>
      <el-card class="table-card analysis-table-card" shadow="never">
        <el-table v-loading="loading" :data="queueRows" size="small" class="analysis-table">
          <el-table-column label="队列" min-width="126"
            ><template #default="{ row }"
              ><div class="primary-cell">{{ row.queueName }}</div>
              <div class="secondary-cell">{{ row.queueCode }}</div></template
            ></el-table-column
          >
          <el-table-column label="技能组" prop="skillGroupName" min-width="108" show-overflow-tooltip />
          <el-table-column label="进入 / 接听" min-width="126">
            <template #default="{ row }">
              <div class="metric-pair">
                <span>进入 {{ row.enteredCount }}</span
                ><span>接听 {{ row.answeredCount }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="放弃 / 超时" min-width="126">
            <template #default="{ row }">
              <div class="metric-pair">
                <span>放弃 {{ row.abandonedCount }}</span
                ><span>超时 {{ row.timeoutCount }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="接通率 / 放弃率" min-width="138">
            <template #default="{ row }">
              <div class="stacked-metric">
                <span>接通 {{ percent(row.answerRate) }}</span
                ><span>放弃 {{ percent(row.abandonRate) }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="平均 / 最大等待" min-width="144">
            <template #default="{ row }">
              <div class="stacked-metric">
                <span>平均 {{ duration(row.averageWaitSeconds) }}</span
                ><span>最大 {{ duration(row.maximumWaitSeconds) }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="20秒服务水平" width="108" align="center"
            ><template #default="{ row }">{{ percent(row.serviceLevel) }}</template></el-table-column
          >
        </el-table>
      </el-card>
    </template>
  </div>
</template>

<script setup lang="ts">
import * as echarts from 'echarts';
import { DataAnalysis, Headset, Histogram, TrendCharts, User } from '@element-plus/icons-vue';
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import {
  getCallReportDistribution,
  getCallReportSummary,
  getCallReportTrend,
  getReportOverview,
  getReportOverviewDistribution,
  getReportOverviewTrend,
  listAgentReports,
  listCallReportDetails,
  listQueueReports
} from '@/api/callcenter/report';
import type {
  AgentReportVO,
  CallDetailVO,
  CallDistributionVO,
  OverviewKpiVO,
  QueueReportVO,
  ReportQuery,
  ReportTrendPointVO
} from '@/api/callcenter/report/types';

const props = defineProps<{ mode: 'overview' | 'call' | 'agent' | 'queue' }>();
const now = new Date();
const formatDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const start = new Date(now);
start.setDate(start.getDate() - 6);
const dateRange = ref<[string, string]>([formatDate(start), formatDate(now)]);
const query = reactive<ReportQuery>({ pageNum: 1, pageSize: 20 });
const loading = ref(false);
const kpis = ref<OverviewKpiVO>();
const trend = ref<ReportTrendPointVO[]>([]);
const distribution = ref<CallDistributionVO[]>([]);
const callRows = ref<CallDetailVO[]>([]);
const agentRows = ref<AgentReportVO[]>([]);
const queueRows = ref<QueueReportVO[]>([]);
const total = ref(0);
const trendChartRef = ref<HTMLDivElement>();
const distributionChartRef = ref<HTMLDivElement>();
const rankChartRef = ref<HTMLDivElement>();
let trendChart: echarts.ECharts | undefined;
let distributionChart: echarts.ECharts | undefined;
let rankChart: echarts.ECharts | undefined;

const titles = { overview: '运营总览', call: '通话分析', agent: '坐席分析', queue: '队列分析' };
const subtitles = {
  overview: '按业务通话口径查看整体话务和接通情况',
  call: '核对话务趋势、结果构成和原始通话',
  agent: '按坐席通话腿统计处理量和状态时长',
  queue: '按每次进入队列统计接听、放弃和服务水平'
};
const title = computed(() => titles[props.mode]);
const subtitle = computed(() => subtitles[props.mode]);
const pageIcon = computed(() => ({ overview: DataAnalysis, call: Headset, agent: User, queue: Histogram })[props.mode]);
const metricItems = computed(() => {
  const value = kpis.value;
  return [
    { label: '总通话量', value: value?.totalCalls ?? 0, note: '业务会话去重' },
    { label: '呼入 / 呼出', value: `${value?.inboundCalls ?? 0} / ${value?.outboundCalls ?? 0}`, note: '按通话方向' },
    { label: '接通量', value: value?.answeredCalls ?? 0, note: `接通率 ${percent(value?.answerRate)}` },
    { label: '未接通量', value: value?.unansweredCalls ?? 0, note: '无接听时间' },
    { label: '平均通话时长', value: duration(value?.averageTalkSeconds), note: `累计 ${duration(value?.totalTalkSeconds)}` },
    {
      label: props.mode === 'overview' ? '在线坐席 / 排队' : '统计周期',
      value:
        props.mode === 'overview'
          ? `${value?.onlineAgents ?? 0} / ${value?.waitingCalls ?? 0}`
          : `${dateRange.value[0].slice(5)} 至 ${dateRange.value[1].slice(5)}`,
      note: props.mode === 'overview' ? '当前实时值' : '最长31天'
    }
  ];
});

const params = () => ({ ...query, beginDate: dateRange.value[0], endDate: dateRange.value[1] });
const handleQuery = () => {
  query.pageNum = 1;
  load();
};
const load = async () => {
  loading.value = true;
  try {
    if (props.mode === 'overview' || props.mode === 'call') {
      const [summaryRes, trendRes, distributionRes] = await Promise.all([
        props.mode === 'overview' ? getReportOverview(params()) : getCallReportSummary(params()),
        props.mode === 'overview' ? getReportOverviewTrend(params()) : getCallReportTrend(params()),
        props.mode === 'overview' ? getReportOverviewDistribution(params()) : getCallReportDistribution(params())
      ]);
      kpis.value = summaryRes.data;
      trend.value = trendRes.data || [];
      distribution.value = distributionRes.data || [];
      if (props.mode === 'call') await loadCallDetails();
      await nextTick();
      renderTrend();
      renderDistribution();
    } else if (props.mode === 'agent') {
      agentRows.value = (await listAgentReports(params())).data || [];
      await nextTick();
      renderRank(
        agentRows.value.slice(0, 10).map((i) => i.agentName),
        agentRows.value.slice(0, 10).map((i) => i.handledCount)
      );
    } else {
      queueRows.value = (await listQueueReports(params())).data || [];
      await nextTick();
      renderRank(
        queueRows.value.slice(0, 10).map((i) => i.queueName),
        queueRows.value.slice(0, 10).map((i) => i.enteredCount)
      );
    }
  } finally {
    loading.value = false;
  }
};
const loadCallDetails = async () => {
  const res = await listCallReportDetails(params());
  callRows.value = res.rows || [];
  total.value = res.total || 0;
};
const chartBase = () => ({
  textStyle: { fontFamily: 'inherit', fontSize: 11 },
  tooltip: { trigger: 'axis' },
  grid: { left: 38, right: 18, top: 28, bottom: 32, containLabel: true }
});
const renderTrend = () => {
  if (!trendChartRef.value) return;
  trendChart?.dispose();
  trendChart = echarts.init(trendChartRef.value);
  trendChart.setOption({
    ...chartBase(),
    legend: { top: 0, textStyle: { fontSize: 11 } },
    xAxis: { type: 'category', data: trend.value.map((i) => (i.bucket.length > 10 ? i.bucket.slice(11) : i.bucket.slice(5))) },
    yAxis: { type: 'value', minInterval: 1, splitLine: { lineStyle: { color: '#edf1f6' } } },
    series: [
      { name: '呼入', type: 'line', smooth: true, showSymbol: false, data: trend.value.map((i) => i.inboundCalls) },
      { name: '呼出', type: 'line', smooth: true, showSymbol: false, data: trend.value.map((i) => i.outboundCalls) },
      { name: '接通', type: 'line', smooth: true, showSymbol: false, data: trend.value.map((i) => i.answeredCalls) }
    ]
  });
};
const renderDistribution = () => {
  if (!distributionChartRef.value) return;
  distributionChart?.dispose();
  distributionChart = echarts.init(distributionChartRef.value);
  distributionChart.setOption({
    ...chartBase(),
    xAxis: { type: 'category', data: distribution.value.map((i) => resultLabel(i.category)) },
    yAxis: { type: 'value', minInterval: 1, splitLine: { lineStyle: { color: '#edf1f6' } } },
    series: [
      { type: 'bar', barMaxWidth: 34, data: distribution.value.map((i) => i.count), itemStyle: { color: '#6d91bd', borderRadius: [4, 4, 0, 0] } }
    ]
  });
};
const renderRank = (names: string[], values: number[]) => {
  if (!rankChartRef.value) return;
  rankChart?.dispose();
  rankChart = echarts.init(rankChartRef.value);
  rankChart.setOption({
    ...chartBase(),
    grid: { left: 20, right: 30, top: 10, bottom: 10, containLabel: true },
    xAxis: { type: 'value', minInterval: 1, splitLine: { lineStyle: { color: '#edf1f6' } } },
    yAxis: { type: 'category', inverse: true, data: names },
    series: [
      {
        type: 'bar',
        barMaxWidth: 18,
        data: values,
        itemStyle: { color: '#7899bf', borderRadius: [0, 4, 4, 0] },
        label: { show: true, position: 'right' }
      }
    ]
  });
};
const duration = (seconds?: number) => {
  const value = Math.max(0, Number(seconds || 0));
  if (value < 60) return `${value}秒`;
  if (value < 3600) return `${Math.floor(value / 60)}分${value % 60}秒`;
  return `${Math.floor(value / 3600)}时${Math.floor((value % 3600) / 60)}分`;
};
const percent = (value?: number) => (value == null ? '--' : `${Number(value).toFixed(2)}%`);
const directionLabel = (value: string) => ({ INBOUND: '呼入', OUTBOUND: '呼出', INTERNAL: '内部' })[value] || value;
const resultLabel = (value: string) =>
  ({ ANSWERED: '已接通', NO_ANSWER: '无人接听', BUSY: '忙线', REJECTED: '拒接', FAILED: '失败' })[value] || value;
const resize = () => {
  trendChart?.resize();
  distributionChart?.resize();
  rankChart?.resize();
};
onMounted(() => {
  load();
  window.addEventListener('resize', resize);
});
onBeforeUnmount(() => {
  window.removeEventListener('resize', resize);
  trendChart?.dispose();
  distributionChart?.dispose();
  rankChart?.dispose();
});
</script>

<style scoped lang="scss">
.report-page {
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%;
  padding: 10px 12px;
  box-sizing: border-box;
  overflow: auto;
  font-size: 12px;
}
.filter-card,
.chart-grid .el-card,
.chart-card,
.table-card {
  border: 0;
  border-radius: 12px;
}
.filter-card :deep(.el-card__body) {
  padding: 12px 14px;
}
.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.page-title {
  display: flex;
  align-items: center;
  gap: 10px;
}
.page-title-icon {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 9px;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  font-size: 18px;
}
.page-head h2 {
  margin: 0 0 3px;
  color: var(--el-text-color-primary);
  font-size: 17px;
  font-weight: 500;
}
.page-head p {
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 11px;
}
.page-head :deep(.el-form-item) {
  margin-bottom: 0;
}
.metric-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(120px, 1fr));
  gap: 8px;
}
.metric-item {
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--el-fill-color-lighter);
}
.metric-item span,
.metric-item small {
  display: block;
  color: var(--el-text-color-secondary);
  font-size: 11px;
}
.metric-item strong {
  display: block;
  margin: 4px 0 2px;
  color: var(--el-text-color-primary);
  font-size: 20px;
  font-weight: 500;
}
.chart-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 10px;
}
.chart-grid :deep(.el-card__header),
.chart-card :deep(.el-card__header),
.table-card :deep(.el-card__header) {
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 500;
}
.chart-grid :deep(.el-card__body),
.chart-card :deep(.el-card__body) {
  padding: 10px 12px;
}
.chart {
  height: 260px;
}
.rank-chart {
  height: clamp(240px, 31vh, 330px);
}
.table-card {
  flex: 1;
  min-height: 360px;
}
.table-card :deep(.el-card__body) {
  display: flex;
  flex-direction: column;
  height: calc(100% - 44px);
  min-height: 310px;
  padding: 8px 12px 10px;
  box-sizing: border-box;
}
.table-card :deep(.el-table) {
  flex: 1;
  font-size: 11px;
}
.muted {
  margin-left: 5px;
  color: var(--el-text-color-secondary);
  font-size: 10px;
}
.section-title {
  display: flex;
  align-items: center;
  gap: 7px;
}
.section-title .el-icon {
  color: var(--el-color-primary);
  font-size: 15px;
}
.analysis-table-card {
  min-height: 0;
}
.analysis-table-card :deep(.el-card__body) {
  display: block;
  height: auto;
  min-height: 0;
  padding: 8px 12px 12px;
}
.analysis-table :deep(.el-table__cell) {
  padding: 7px 0;
}
.primary-cell {
  color: var(--el-text-color-primary);
  line-height: 18px;
}
.secondary-cell {
  color: var(--el-text-color-secondary);
  font-size: 10px;
  line-height: 16px;
}
.metric-pair {
  display: flex;
  gap: 12px;
  white-space: nowrap;
}
.stacked-metric {
  display: flex;
  flex-direction: column;
  gap: 2px;
  color: var(--el-text-color-regular);
  line-height: 16px;
  white-space: nowrap;
}
@media (max-width: 1200px) {
  .metric-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  .chart-grid {
    grid-template-columns: 1fr;
  }
}
</style>
