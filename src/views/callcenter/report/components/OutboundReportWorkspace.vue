<template>
  <div class="outbound-report-page">
    <section class="outbound-filter-panel">
      <div class="page-head">
        <div class="page-title">
          <span class="page-title-icon"
            ><el-icon><TrendCharts /></el-icon
          ></span>
          <div>
            <h2>外呼分析</h2>
            <p>统一查看预览外呼与自动外呼的拨打、接通和业务转化</p>
          </div>
        </div>
        <el-button :icon="Download" :loading="exporting" @click="handleExport">导出</el-button>
      </div>
      <el-form class="filter-form" :inline="true" size="small" label-position="left" @submit.prevent>
        <el-form-item label="统计日期">
          <el-date-picker
            v-model="dateRange"
            class="date-range-picker"
            type="daterange"
            value-format="YYYY-MM-DD"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            :clearable="false"
          />
        </el-form-item>
        <el-form-item class="quick-range">
          <el-button @click="applyQuickRange(1)">今天</el-button>
          <el-button @click="applyQuickRange(7)">近7天</el-button>
          <el-button @click="applyQuickRange(30)">近30天</el-button>
        </el-form-item>
        <el-form-item label="外呼类型">
          <el-select v-model="query.taskType" clearable placeholder="全部" style="width: 120px">
            <el-option label="预览外呼" value="PREVIEW" /><el-option label="自动外呼" value="AUTO" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input v-model="query.keyword" clearable placeholder="任务、客户或号码" style="width: 180px" @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item><el-button type="primary" :loading="loading" @click="handleQuery">查询</el-button></el-form-item>
      </el-form>
      <div v-if="selectedTaskName" class="selected-filter">
        <span>当前任务：</span><el-tag closable size="small" @close="clearTaskFilter">{{ selectedTaskName }}</el-tag>
      </div>
    </section>

    <div class="metric-grid">
      <div v-for="item in metricItems" :key="item.label" class="metric-item">
        <span>{{ item.label }}</span
        ><strong>{{ item.value }}</strong
        ><small>{{ item.note }}</small>
      </div>
    </div>

    <div class="chart-grid">
      <el-card shadow="never"
        ><template #header>外呼趋势</template>
        <div ref="trendChartRef" class="chart"
      /></el-card>
      <el-card shadow="never"
        ><template #header>外呼结果构成</template>
        <div ref="distributionChartRef" class="chart"
      /></el-card>
    </div>

<!--    <el-card class="table-card task-card" shadow="never">
      <template #header
        ><div class="section-head"><span>任务排行</span><small>点击“聚焦”可查看单个任务的完整指标</small></div></template
      >
      <el-table v-loading="loading" :data="taskRows" size="small">
        <el-table-column label="任务" min-width="170" show-overflow-tooltip prop="taskName" />
        <el-table-column label="类型" width="84"
          ><template #default="{ row }">{{ taskTypeLabel(row.taskType) }}</template></el-table-column
        >
        <el-table-column label="名单 / 已拨" min-width="108"
          ><template #default="{ row }">{{ row.memberCount }} / {{ row.dialedMemberCount }}</template></el-table-column
        >
        <el-table-column label="拨打次数" prop="attemptCount" width="88" align="center" />
        <el-table-column label="接通数" prop="answeredCount" width="76" align="center" />
        <el-table-column label="业务成功" prop="businessSuccessCount" width="84" align="center" />
        <el-table-column label="接通率" width="82" align="right"
          ><template #default="{ row }">{{ percent(row.answerRate) }}</template></el-table-column
        >
        <el-table-column label="转化率" width="82" align="right"
          ><template #default="{ row }">{{ percent(row.conversionRate) }}</template></el-table-column
        >
        <el-table-column label="操作" width="62" align="center"
          ><template #default="{ row }"><el-button link type="primary" @click="focusTask(row)">聚焦</el-button></template></el-table-column
        >
      </el-table>
    </el-card>-->

<!--    <el-card class="table-card attempt-card" shadow="never">
      <template #header>拨打明细</template>
      <el-table v-loading="loading" :data="attemptRows" size="small">
        <el-table-column label="开始时间" prop="startedAt" width="158" />
        <el-table-column label="任务" prop="taskName" min-width="142" show-overflow-tooltip />
        <el-table-column label="类型" width="80"
          ><template #default="{ row }">{{ taskTypeLabel(row.taskType) }}</template></el-table-column
        >
        <el-table-column label="客户" prop="customerName" min-width="100" show-overflow-tooltip />
        <el-table-column label="号码" prop="phoneNumber" min-width="118" show-overflow-tooltip />
        <el-table-column label="坐席" prop="agentName" min-width="92" show-overflow-tooltip />
        <el-table-column label="次数" width="58" align="center"
          ><template #default="{ row }">第{{ row.attemptNo }}次</template></el-table-column
        >
        <el-table-column label="结果" min-width="92"
          ><template #default="{ row }">{{ resultLabel(row.resultCode) }}</template></el-table-column
        >
        <el-table-column label="接通时长" width="92" align="right"
          ><template #default="{ row }">{{ duration(row.billableSeconds) }}</template></el-table-column
        >
        <el-table-column label="挂断原因" prop="hangupCause" min-width="116" show-overflow-tooltip />
      </el-table>
      <pagination v-show="total > 0" v-model:page="query.pageNum" v-model:limit="query.pageSize" :total="total" @pagination="loadAttempts" />
    </el-card>-->
  </div>
</template>

<script setup lang="ts">
import * as echarts from 'echarts';
import { Download, TrendCharts } from '@element-plus/icons-vue';
import { computed, getCurrentInstance, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import {
  getOutboundReportDistribution,
  getOutboundReportSummary,
  getOutboundReportTrend,
  listOutboundAttemptDetails,
  listOutboundTaskReports
} from '@/api/callcenter/report';
import type {
  CallDistributionVO,
  OutboundAttemptDetailVO,
  OutboundReportSummaryVO,
  OutboundTaskReportVO,
  OutboundTrendPointVO,
  ReportQuery
} from '@/api/callcenter/report/types';

const now = new Date();
const { proxy } = getCurrentInstance() as ComponentInternalInstance;
const formatDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const start = new Date(now);
start.setDate(start.getDate() - 6);
const dateRange = ref<[string, string]>([formatDate(start), formatDate(now)]);
const query = reactive<ReportQuery>({ pageNum: 1, pageSize: 20 });
const loading = ref(false);
const exporting = ref(false);
const summary = ref<OutboundReportSummaryVO>();
const trendRows = ref<OutboundTrendPointVO[]>([]);
const distributionRows = ref<CallDistributionVO[]>([]);
const taskRows = ref<OutboundTaskReportVO[]>([]);
const attemptRows = ref<OutboundAttemptDetailVO[]>([]);
const total = ref(0);
const selectedTaskName = ref('');
const trendChartRef = ref<HTMLDivElement>();
const distributionChartRef = ref<HTMLDivElement>();
let trendChart: echarts.ECharts | undefined;
let distributionChart: echarts.ECharts | undefined;

const metricItems = computed(() => {
  const value = summary.value;
  return [
    {
      label: '名单客户',
      value: value?.memberCount ?? 0,
      note: `本期已拨 ${value?.dialedMemberCount ?? 0} / 当前从未拨 ${value?.undialedMemberCount ?? 0}`
    },
    { label: '拨打次数', value: value?.attemptCount ?? 0, note: `平均 ${Number(value?.averageAttempts || 0).toFixed(2)} 次/客户` },
    { label: '接通数', value: value?.answeredCount ?? 0, note: `接通率 ${percent(value?.answerRate)}` },
    { label: '业务成功', value: value?.businessSuccessCount ?? 0, note: `转化率 ${percent(value?.conversionRate)}` },
    { label: '重试拨打', value: value?.retryAttemptCount ?? 0, note: '第2次及以后拨打' },
    { label: '累计通话', value: duration(value?.totalTalkSeconds), note: '按接通计费时长' }
  ];
});
const params = () => ({ ...query, beginDate: dateRange.value[0], endDate: dateRange.value[1] });
const handleQuery = () => {
  query.pageNum = 1;
  load();
};
const handleExport = async () => {
  exporting.value = true;
  try {
    await proxy?.download(
      'api/v1/reports/outbound/export',
      params(),
      `外呼分析_${dateRange.value[0]}_${dateRange.value[1]}.xlsx`
    );
  } finally {
    exporting.value = false;
  }
};
const applyQuickRange = (days: number) => {
  const endDate = new Date();
  const beginDate = new Date(endDate);
  beginDate.setDate(endDate.getDate() - Math.max(0, days - 1));
  dateRange.value = [formatDate(beginDate), formatDate(endDate)];
  handleQuery();
};
const load = async () => {
  loading.value = true;
  try {
    const [summaryRes, trendRes, distributionRes, tasksRes, attemptsRes] = await Promise.all([
      getOutboundReportSummary(params()),
      getOutboundReportTrend(params()),
      getOutboundReportDistribution(params()),
      listOutboundTaskReports(params()),
      listOutboundAttemptDetails(params())
    ]);
    summary.value = summaryRes.data;
    trendRows.value = trendRes.data || [];
    distributionRows.value = distributionRes.data || [];
    taskRows.value = tasksRes.data || [];
    attemptRows.value = attemptsRes.rows || [];
    total.value = attemptsRes.total || 0;
    await nextTick();
    renderCharts();
  } finally {
    loading.value = false;
  }
};
const loadAttempts = async () => {
  loading.value = true;
  try {
    const res = await listOutboundAttemptDetails(params());
    attemptRows.value = res.rows || [];
    total.value = res.total || 0;
  } finally {
    loading.value = false;
  }
};
const focusTask = (row: OutboundTaskReportVO) => {
  query.taskId = row.taskId;
  selectedTaskName.value = row.taskName;
  query.pageNum = 1;
  load();
};
const clearTaskFilter = () => {
  query.taskId = undefined;
  selectedTaskName.value = '';
  query.pageNum = 1;
  load();
};
const chartBase = () => ({
  textStyle: { fontFamily: 'inherit', fontSize: 11 },
  tooltip: { trigger: 'axis' },
  grid: { left: 38, right: 18, top: 30, bottom: 28, containLabel: true }
});
const renderCharts = () => {
  if (trendChartRef.value) {
    trendChart?.dispose();
    trendChart = echarts.init(trendChartRef.value);
    trendChart.setOption({
      ...chartBase(),
      legend: { top: 0, textStyle: { fontSize: 11 } },
      xAxis: { type: 'category', data: trendRows.value.map((i) => (i.bucket.length > 10 ? i.bucket.slice(11) : i.bucket.slice(5))) },
      yAxis: { type: 'value', minInterval: 1, splitLine: { lineStyle: { color: '#edf1f6' } } },
      series: [
        { name: '拨打', type: 'line', smooth: true, showSymbol: false, data: trendRows.value.map((i) => i.attemptCount) },
        { name: '接通', type: 'line', smooth: true, showSymbol: false, data: trendRows.value.map((i) => i.answeredCount) },
        { name: '业务成功', type: 'line', smooth: true, showSymbol: false, data: trendRows.value.map((i) => i.businessSuccessCount) }
      ]
    });
  }
  if (distributionChartRef.value) {
    distributionChart?.dispose();
    distributionChart = echarts.init(distributionChartRef.value);
    distributionChart.setOption({
      ...chartBase(),
      xAxis: {
        type: 'category',
        data: distributionRows.value.map((i) => resultLabel(i.category)),
        axisLabel: { interval: 0, rotate: distributionRows.value.length > 5 ? 25 : 0 }
      },
      yAxis: { type: 'value', minInterval: 1, splitLine: { lineStyle: { color: '#edf1f6' } } },
      series: [
        {
          type: 'bar',
          barMaxWidth: 30,
          data: distributionRows.value.map((i) => i.count),
          itemStyle: { color: '#7899bf', borderRadius: [4, 4, 0, 0] }
        }
      ]
    });
  }
};
const percent = (value?: number) => `${Number(value || 0).toFixed(2)}%`;
const duration = (seconds?: number) => {
  const value = Math.max(0, Number(seconds || 0));
  if (value < 60) return `${value}秒`;
  if (value < 3600) return `${Math.floor(value / 60)}分${value % 60}秒`;
  return `${Math.floor(value / 3600)}时${Math.floor((value % 3600) / 60)}分`;
};
const taskTypeLabel = (value: string) => ({ PREVIEW: '预览外呼', AUTO: '自动外呼' })[value] || value;
const resultLabel = (value?: string) =>
  ({
    CONNECTED: '已接通',
    INTERESTED: '有意向',
    TRANSFERRED: '已转人工',
    NOT_INTERESTED: '无意向',
    CALLBACK_REQUESTED: '要求回呼',
    DO_NOT_CALL: '拒绝再呼',
    NO_ANSWER: '无人接听',
    BUSY: '忙线',
    INVALID_NUMBER: '号码无效',
    FOLLOW_UP: '需跟进',
    FAILED: '失败',
    OTHER: '其他'
  })[value || ''] ||
  value ||
  '未登记';
const resize = () => {
  trendChart?.resize();
  distributionChart?.resize();
};
onMounted(() => {
  load();
  window.addEventListener('resize', resize);
});
onBeforeUnmount(() => {
  window.removeEventListener('resize', resize);
  trendChart?.dispose();
  distributionChart?.dispose();
});
</script>

<style scoped lang="scss">
.outbound-report-page {
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%;
  padding: 10px 12px;
  box-sizing: border-box;
  overflow: auto;
  font-size: 12px;
}
.outbound-filter-panel,
.chart-grid .el-card,
.table-card {
  border: 0;
  border-radius: 12px;
}
.outbound-filter-panel {
  display: block;
  flex: 0 0 auto;
  width: 100%;
  min-width: 0;
  padding: 12px 14px;
  box-sizing: border-box;
  background: var(--el-bg-color);
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
.page-title h2 {
  margin: 0 0 3px;
  font-size: 17px;
  font-weight: 500;
}
.page-title p {
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 11px;
}
.filter-form {
  display: grid;
  grid-template-columns: max-content max-content max-content minmax(220px, 1fr) max-content;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--el-border-color-lighter);
}
.filter-form :deep(.el-form-item) {
  display: flex;
  min-width: 0;
  margin-bottom: 0;
  margin-right: 0;
}
.date-range-picker {
  width: 260px !important;
}
.quick-range :deep(.el-button + .el-button) {
  margin-left: 4px;
}
.selected-filter {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  color: var(--el-text-color-secondary);
  font-size: 11px;
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
  font-size: 20px;
  font-weight: 500;
}
.chart-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 10px;
}
.chart-grid :deep(.el-card__header),
.table-card :deep(.el-card__header) {
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 500;
}
.chart-grid :deep(.el-card__body) {
  padding: 10px 12px;
}
.chart {
  height: 245px;
}
.table-card :deep(.el-card__body) {
  padding: 8px 12px 10px;
}
.table-card :deep(.el-table) {
  font-size: 11px;
}
.section-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.section-head small {
  color: var(--el-text-color-secondary);
  font-size: 10px;
  font-weight: 400;
}
.attempt-card {
  min-height: 340px;
}
@media (max-width: 1200px) {
  .metric-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  .chart-grid {
    grid-template-columns: 1fr;
  }
  .page-head {
    align-items: flex-start;
    flex-direction: column;
  }
  .filter-form {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: center;
  }
  .filter-form :deep(.el-form-item) {
    width: 100%;
  }
  .date-range-picker {
    width: 100% !important;
  }
}
@media (max-width: 760px) {
  .filter-form {
    grid-template-columns: 1fr;
  }
}
</style>
