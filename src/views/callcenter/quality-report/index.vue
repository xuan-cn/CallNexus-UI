<template>
  <div class="quality-report-page">
    <section class="filter-panel">
      <div class="page-heading">
        <span class="heading-icon"
          ><el-icon><TrendCharts /></el-icon
        ></span>
        <div>
          <h2>质检报表</h2>
          <p>查看质检覆盖、评分趋势以及坐席和技能组表现</p>
        </div>
      </div>
      <el-form class="filter-form" :inline="true" size="small" @submit.prevent>
        <el-form-item label="统计日期">
          <el-date-picker
            v-model="dateRange"
            class="date-range"
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
        <el-form-item label="技能组">
          <el-select v-model="query.skillGroupId" clearable filterable placeholder="全部技能组" class="filter-select">
            <el-option v-for="item in options.skillGroups" :key="String(item.id)" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="队列">
          <el-select v-model="query.queueId" clearable filterable placeholder="全部队列" class="filter-select">
            <el-option v-for="item in options.queues" :key="String(item.id)" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="坐席">
          <el-select v-model="query.agentId" clearable filterable placeholder="全部坐席" class="filter-select">
            <el-option v-for="item in options.agents" :key="String(item.id)" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item><el-button type="primary" :loading="loading" @click="load">查询</el-button></el-form-item>
      </el-form>
    </section>

    <section class="metric-grid">
      <div v-for="item in metrics" :key="item.label" class="metric-card">
        <span>{{ item.label }}</span
        ><strong>{{ item.value }}</strong
        ><small>{{ item.note }}</small>
      </div>
    </section>

    <section class="chart-grid">
      <el-card shadow="never">
        <template #header>质检覆盖趋势</template>
        <div ref="coverageChartRef" class="chart" />
      </el-card>
      <el-card shadow="never">
        <template #header>评分与合格率趋势</template>
        <div ref="scoreChartRef" class="chart" />
      </el-card>
    </section>

    <section class="analysis-grid">
      <el-card class="analysis-card" shadow="never">
        <template #header>
          <div class="card-header"><span>高频扣分项</span><el-button link type="primary" @click="exportDeductions">导出</el-button></div>
        </template>
        <div v-show="deductionItems.length" ref="deductionChartRef" class="deduction-chart" />
        <el-empty v-if="!deductionItems.length" description="当前范围暂无扣分项" :image-size="70" />
      </el-card>
      <el-card class="analysis-card" shadow="never">
        <template #header>AI 初审采纳分析</template>
        <div class="ai-summary">
          <div>
            <strong>{{ percent(aiAdoption?.adoptionRate) }}</strong
            ><span>AI 单项采纳率</span>
          </div>
          <div>
            <strong>{{ aiAdoption?.aiTaskCount ?? 0 }}</strong
            ><span>AI 初审任务</span>
          </div>
          <div>
            <strong>{{ aiAdoption?.adoptedItemCount ?? 0 }}</strong
            ><span>采纳项</span>
          </div>
          <div>
            <strong>{{ aiAdoption?.modifiedItemCount ?? 0 }}</strong
            ><span>人工改判项</span>
          </div>
        </div>
        <el-tabs v-model="aiAnalysisTab" @tab-change="loadAiRanking">
          <el-tab-pane label="高频改判" name="MODIFIED">
            <el-table :data="aiModifications" size="small" max-height="200" empty-text="当前范围暂无人工改判">
              <el-table-column prop="itemName" label="评分项" min-width="150" show-overflow-tooltip />
              <el-table-column prop="evaluatedCount" label="AI判断" width="72" align="center" />
              <el-table-column prop="modifiedCount" label="改判" width="64" align="center" />
              <el-table-column label="改判率" width="82" align="right">
                <template #default="{ row }">{{ percent(row.evaluatedCount ? (row.modifiedCount * 100) / row.evaluatedCount : 0) }}</template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
          <el-tab-pane label="按坐席" name="AGENT" />
          <el-tab-pane label="按质检员" name="REVIEWER" />
          <el-tab-pane label="按模板" name="TEMPLATE" />
        </el-tabs>
        <el-table v-if="aiAnalysisTab !== 'MODIFIED'" :data="aiRanking" size="small" max-height="200" empty-text="当前范围暂无 AI 初审">
          <el-table-column prop="dimensionName" label="对象" min-width="120" show-overflow-tooltip />
          <el-table-column prop="aiTaskCount" label="任务" width="62" align="center" />
          <el-table-column prop="evaluatedItemCount" label="判断项" width="68" align="center" />
          <el-table-column prop="modifiedItemCount" label="改判" width="62" align="center" />
          <el-table-column label="采纳率" width="78" align="right"
            ><template #default="{ row }">{{ percent(row.adoptionRate) }}</template></el-table-column
          >
        </el-table>
      </el-card>
    </section>

    <el-card class="appeal-card" shadow="never">
      <template #header>申诉分析</template>
      <div class="appeal-layout">
        <div class="appeal-overview">
          <div class="appeal-metrics">
            <div>
              <span>申诉率</span><strong>{{ percent(appealSummary?.appealRate) }}</strong>
            </div>
            <div>
              <span>申诉成功率</span><strong>{{ percent(appealSummary?.successRate) }}</strong>
            </div>
            <div>
              <span>申诉任务</span><strong>{{ appealSummary?.appealedTaskCount ?? 0 }}</strong>
            </div>
            <div>
              <span>待处理</span><strong>{{ appealSummary?.pendingCount ?? 0 }}</strong>
            </div>
          </div>
          <div ref="appealChartRef" class="appeal-chart" />
        </div>
        <div class="appeal-ranking">
          <el-tabs v-model="appealDimension" @tab-change="loadAppealRanking">
            <el-tab-pane label="按坐席" name="AGENT" />
            <el-tab-pane label="按质检员" name="REVIEWER" />
            <el-tab-pane label="按技能组" name="SKILL_GROUP" />
          </el-tabs>
          <el-table :data="appealRanking" size="small" max-height="245" empty-text="当前范围暂无申诉">
            <el-table-column prop="dimensionName" label="对象" min-width="120" show-overflow-tooltip />
            <el-table-column prop="publishedCount" label="发布" width="62" align="center" />
            <el-table-column prop="appealedCount" label="申诉" width="62" align="center" />
            <el-table-column label="申诉率" width="78" align="right"
              ><template #default="{ row }">{{ percent(row.appealRate) }}</template></el-table-column
            >
            <el-table-column label="成功率" width="78" align="right"
              ><template #default="{ row }">{{ percent(row.successRate) }}</template></el-table-column
            >
          </el-table>
        </div>
      </div>
    </el-card>

    <section class="ranking-grid">
      <el-card shadow="never">
        <template #header>坐席质检排行</template>
        <el-table :data="agentRanking" size="small" max-height="330">
          <el-table-column type="index" label="#" width="46" align="center" />
          <el-table-column prop="dimensionName" label="坐席" min-width="130" show-overflow-tooltip />
          <el-table-column prop="resultCount" label="样本" width="68" align="center" />
          <el-table-column label="平均分" width="78" align="right"
            ><template #default="{ row }">{{ score(row.averageScore) }}</template></el-table-column
          >
          <el-table-column label="合格率" width="82" align="right"
            ><template #default="{ row }">{{ percent(row.qualifiedRate) }}</template></el-table-column
          >
          <el-table-column prop="fatalCount" label="致命项" width="72" align="center" />
        </el-table>
      </el-card>
      <el-card shadow="never">
        <template #header>技能组质检排行</template>
        <el-table :data="skillGroupRanking" size="small" max-height="330">
          <el-table-column type="index" label="#" width="46" align="center" />
          <el-table-column prop="dimensionName" label="技能组" min-width="130" show-overflow-tooltip />
          <el-table-column prop="resultCount" label="样本" width="68" align="center" />
          <el-table-column label="平均分" width="78" align="right"
            ><template #default="{ row }">{{ score(row.averageScore) }}</template></el-table-column
          >
          <el-table-column label="合格率" width="82" align="right"
            ><template #default="{ row }">{{ percent(row.qualifiedRate) }}</template></el-table-column
          >
          <el-table-column prop="fatalCount" label="致命项" width="72" align="center" />
        </el-table>
      </el-card>
    </section>

    <el-card class="detail-card" shadow="never">
      <template #header>
        <div class="detail-header">
          <span>质检明细</span>
          <div class="detail-filters">
            <el-input v-model="detailQuery.keyword" clearable placeholder="任务编号/通话ID/人员" @keyup.enter="searchDetails" />
            <el-select v-model="detailQuery.qualified" clearable placeholder="全部结果">
              <el-option label="合格" :value="true" /><el-option label="不合格" :value="false" />
            </el-select>
            <el-select v-model="detailQuery.fatalFlag" clearable placeholder="全部风险">
              <el-option label="命中致命项" :value="true" /><el-option label="未命中致命项" :value="false" />
            </el-select>
            <el-button type="primary" @click="searchDetails">查询明细</el-button>
            <el-button @click="exportDetails">导出明细</el-button>
          </div>
        </div>
      </template>
      <el-table v-loading="loading" :data="detailRows" size="small">
        <el-table-column label="质检时间" prop="publishedAt" width="158" />
        <el-table-column label="任务编号" min-width="142" show-overflow-tooltip>
          <template #default="{ row }"
            ><el-button link type="primary" @click="openTask(row)">{{ row.taskCode }}</el-button></template
          >
        </el-table-column>
        <el-table-column label="业务通话ID" min-width="180" show-overflow-tooltip>
          <template #default="{ row }"
            ><el-button link type="primary" @click="openCall(row)">{{ row.businessCallId || '-' }}</el-button></template
          >
        </el-table-column>
        <el-table-column label="坐席" min-width="100" show-overflow-tooltip>
          <template #default="{ row }">{{ row.agentName || row.agentExtension || '-' }}</template>
        </el-table-column>
        <el-table-column prop="skillGroupName" label="技能组" min-width="105" show-overflow-tooltip />
        <el-table-column prop="queueName" label="队列" min-width="105" show-overflow-tooltip />
        <el-table-column label="评分模板" min-width="130" show-overflow-tooltip>
          <template #default="{ row }"
            >{{ row.templateName || '-' }}<span v-if="row.templateVersionNo"> v{{ row.templateVersionNo }}</span></template
          >
        </el-table-column>
        <el-table-column prop="reviewerName" label="质检员" width="90" show-overflow-tooltip />
        <el-table-column prop="totalScore" label="得分" width="66" align="right" />
        <el-table-column label="结果" width="76" align="center">
          <template #default="{ row }"
            ><el-tag :type="row.qualified ? 'success' : 'danger'" effect="light">{{ row.qualified ? '合格' : '不合格' }}</el-tag></template
          >
        </el-table-column>
        <el-table-column label="致命项" width="72" align="center">
          <template #default="{ row }"><el-tag v-if="row.fatalFlag" type="danger" effect="plain">命中</el-tag><span v-else>-</span></template>
        </el-table-column>
        <el-table-column label="申诉" width="88" align="center">
          <template #default="{ row }">{{ appealStatusLabel(row.appealStatus) }}</template>
        </el-table-column>
        <el-table-column prop="summary" label="质检总结" min-width="180" show-overflow-tooltip />
      </el-table>
      <pagination
        v-show="detailTotal > 0"
        v-model:page="detailQuery.pageNum"
        v-model:limit="detailQuery.pageSize"
        :total="detailTotal"
        @pagination="loadDetails"
      />
    </el-card>

    <CallRecordDetailDrawer v-model="callDetailVisible" :session-id="callDetailSessionId" />
  </div>
</template>

<script setup lang="ts">
import * as echarts from 'echarts';
import { TrendCharts } from '@element-plus/icons-vue';
import { computed, getCurrentInstance, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  getQualityReportOptions,
  getQualityReportSummary,
  getQualityReportTrend,
  getQualityAiAdoption,
  getQualityAppealSummary,
  listQualityAgentRanking,
  listQualityAiAdoptionRanking,
  listQualityAiModifications,
  listQualityAppealRanking,
  listQualityDeductionItems,
  pageQualityReportDetails,
  listQualitySkillGroupRanking
} from '@/api/callcenter/quality';
import type {
  QualityAppealStatus,
  QualityAiAdoptionSummaryVO,
  QualityAiAdoptionRankingDimension,
  QualityAiAdoptionRankingVO,
  QualityAiModificationVO,
  QualityAppealRankingDimension,
  QualityAppealRankingVO,
  QualityAppealSummaryVO,
  QualityDeductionItemVO,
  QualityReportDetailVO,
  QualityReportOptionsVO,
  QualityReportQuery,
  QualityReportRankingVO,
  QualityReportSummaryVO,
  QualityReportTrendVO
} from '@/api/callcenter/quality/types';
import CallRecordDetailDrawer from '@/components/CallRecordDetailDrawer/index.vue';

const formatDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const today = new Date();
const start = new Date(today);
start.setDate(today.getDate() - 6);
const dateRange = ref<[string, string]>([formatDate(start), formatDate(today)]);
const query = reactive<QualityReportQuery>({});
const detailQuery = reactive<QualityReportQuery>({ pageNum: 1, pageSize: 20 });
const loading = ref(false);
const summary = ref<QualityReportSummaryVO>();
const trend = ref<QualityReportTrendVO[]>([]);
const agentRanking = ref<QualityReportRankingVO[]>([]);
const skillGroupRanking = ref<QualityReportRankingVO[]>([]);
const deductionItems = ref<QualityDeductionItemVO[]>([]);
const aiAdoption = ref<QualityAiAdoptionSummaryVO>();
const aiModifications = ref<QualityAiModificationVO[]>([]);
const aiAnalysisTab = ref<'MODIFIED' | QualityAiAdoptionRankingDimension>('MODIFIED');
const aiRanking = ref<QualityAiAdoptionRankingVO[]>([]);
const appealSummary = ref<QualityAppealSummaryVO>();
const appealDimension = ref<QualityAppealRankingDimension>('AGENT');
const appealRanking = ref<QualityAppealRankingVO[]>([]);
const detailRows = ref<QualityReportDetailVO[]>([]);
const detailTotal = ref(0);
const options = reactive<QualityReportOptionsVO>({ agents: [], queues: [], skillGroups: [] });
const coverageChartRef = ref<HTMLDivElement>();
const scoreChartRef = ref<HTMLDivElement>();
const deductionChartRef = ref<HTMLDivElement>();
const appealChartRef = ref<HTMLDivElement>();
const callDetailVisible = ref(false);
const callDetailSessionId = ref<string | number>();
const router = useRouter();
const { proxy } = getCurrentInstance() as ComponentInternalInstance;
let coverageChart: echarts.ECharts | undefined;
let scoreChart: echarts.ECharts | undefined;
let deductionChart: echarts.ECharts | undefined;
let appealChart: echarts.ECharts | undefined;

const percent = (value?: number) => `${Number(value || 0).toFixed(2)}%`;
const score = (value?: number) => Number(value || 0).toFixed(2);
const metrics = computed(() => [
  { label: '应质检通话', value: summary.value?.eligibleCallCount ?? 0, note: '统计范围内已结束通话' },
  { label: '已质检通话', value: summary.value?.reviewedCallCount ?? 0, note: `覆盖率 ${percent(summary.value?.coverageRate)}` },
  { label: '有效结果', value: summary.value?.resultCount ?? 0, note: '仅当前生效版本' },
  { label: '平均质检分', value: score(summary.value?.averageScore), note: '有效结果平均分' },
  { label: '合格率', value: percent(summary.value?.qualifiedRate), note: `合格 ${summary.value?.qualifiedCount ?? 0} 条` },
  { label: '致命项率', value: percent(summary.value?.fatalRate), note: `致命项 ${summary.value?.fatalCount ?? 0} 条` }
]);
const params = (): QualityReportQuery => ({ ...query, beginDate: dateRange.value[0], endDate: dateRange.value[1] });
const detailParams = (): QualityReportQuery => ({ ...params(), ...detailQuery });
const appealStatusLabel = (value?: QualityAppealStatus) =>
  ({ SUBMITTED: '待复核', REJECTED: '已驳回', RECHECK_REQUESTED: '重新质检', ACCEPTED: '已调整' })[value || ''] || '-';

const applyQuickRange = (days: number) => {
  const end = new Date();
  const begin = new Date(end);
  begin.setDate(end.getDate() - Math.max(0, days - 1));
  dateRange.value = [formatDate(begin), formatDate(end)];
  load();
};
const loadOptions = async () => {
  const response = await getQualityReportOptions();
  Object.assign(options, response.data || { agents: [], queues: [], skillGroups: [] });
};
const load = async () => {
  loading.value = true;
  detailQuery.pageNum = 1;
  try {
    const [summaryRes, trendRes, agentRes, groupRes, deductionRes, detailRes, aiRes, aiModificationRes, aiRankingRes, appealRes, appealRankingRes] =
      await Promise.all([
        getQualityReportSummary(params()),
        getQualityReportTrend(params()),
        listQualityAgentRanking(params()),
        listQualitySkillGroupRanking(params()),
        listQualityDeductionItems(params()),
        pageQualityReportDetails(detailParams()),
        getQualityAiAdoption(params()),
        listQualityAiModifications(params()),
        listQualityAiAdoptionRanking(params(), aiAnalysisTab.value === 'MODIFIED' ? 'AGENT' : aiAnalysisTab.value),
        getQualityAppealSummary(params()),
        listQualityAppealRanking(params(), appealDimension.value)
      ]);
    summary.value = summaryRes.data;
    trend.value = trendRes.data || [];
    agentRanking.value = agentRes.data || [];
    skillGroupRanking.value = groupRes.data || [];
    deductionItems.value = deductionRes.data || [];
    detailRows.value = detailRes.rows || [];
    detailTotal.value = detailRes.total || 0;
    aiAdoption.value = aiRes.data;
    aiModifications.value = aiModificationRes.data || [];
    aiRanking.value = aiRankingRes.data || [];
    appealSummary.value = appealRes.data;
    appealRanking.value = appealRankingRes.data || [];
    await nextTick();
    renderCharts();
  } finally {
    loading.value = false;
  }
};
const loadDetails = async () => {
  loading.value = true;
  try {
    const response = await pageQualityReportDetails(detailParams());
    detailRows.value = response.rows || [];
    detailTotal.value = response.total || 0;
  } finally {
    loading.value = false;
  }
};
const searchDetails = () => {
  detailQuery.pageNum = 1;
  loadDetails();
};
const loadAppealRanking = async () => {
  const response = await listQualityAppealRanking(params(), appealDimension.value);
  appealRanking.value = response.data || [];
};
const loadAiRanking = async () => {
  if (aiAnalysisTab.value === 'MODIFIED') return;
  const response = await listQualityAiAdoptionRanking(params(), aiAnalysisTab.value);
  aiRanking.value = response.data || [];
};
const exportDetails = () => proxy?.download('api/v1/quality/reports/details/export', detailParams(), `质检明细_${Date.now()}.xlsx`);
const exportDeductions = () => proxy?.download('api/v1/quality/reports/deduction-items/export', params(), `高频扣分项_${Date.now()}.xlsx`);
const openTask = (row: QualityReportDetailVO) => router.push({ path: '/quality-management/workbench', query: { taskId: String(row.taskId) } });
const openCall = (row: QualityReportDetailVO) => {
  callDetailSessionId.value = row.callSessionId;
  callDetailVisible.value = true;
};
const renderCharts = () => {
  if (coverageChartRef.value) {
    coverageChart ||= echarts.init(coverageChartRef.value);
    coverageChart.setOption(
      {
        tooltip: { trigger: 'axis' },
        legend: { top: 2, data: ['应质检', '已质检', '覆盖率'] },
        grid: { left: 44, right: 48, top: 42, bottom: 28 },
        xAxis: { type: 'category', data: trend.value.map((item) => item.bucket.slice(5)) },
        yAxis: [
          { type: 'value', minInterval: 1 },
          { type: 'value', min: 0, max: 100, axisLabel: { formatter: '{value}%' } }
        ],
        series: [
          { name: '应质检', type: 'bar', data: trend.value.map((item) => item.eligibleCallCount), barMaxWidth: 22 },
          { name: '已质检', type: 'bar', data: trend.value.map((item) => item.reviewedCallCount), barMaxWidth: 22 },
          { name: '覆盖率', type: 'line', smooth: true, yAxisIndex: 1, data: trend.value.map((item) => item.coverageRate) }
        ]
      },
      true
    );
  }
  if (scoreChartRef.value) {
    scoreChart ||= echarts.init(scoreChartRef.value);
    scoreChart.setOption(
      {
        tooltip: { trigger: 'axis' },
        legend: { top: 2, data: ['平均分', '合格率'] },
        grid: { left: 44, right: 48, top: 42, bottom: 28 },
        xAxis: { type: 'category', data: trend.value.map((item) => item.bucket.slice(5)) },
        yAxis: [
          { type: 'value', min: 0, max: 100 },
          { type: 'value', min: 0, max: 100, axisLabel: { formatter: '{value}%' } }
        ],
        series: [
          { name: '平均分', type: 'line', smooth: true, data: trend.value.map((item) => item.averageScore) },
          { name: '合格率', type: 'line', smooth: true, yAxisIndex: 1, data: trend.value.map((item) => item.qualifiedRate) }
        ]
      },
      true
    );
  }
  if (deductionItems.value.length && deductionChartRef.value) {
    deductionChart ||= echarts.init(deductionChartRef.value);
    const rows = [...deductionItems.value].slice(0, 12).reverse();
    deductionChart.setOption(
      {
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        legend: { top: 2, data: ['命中次数', '累计扣分'] },
        grid: { left: 150, right: 34, top: 38, bottom: 24 },
        xAxis: { type: 'value', minInterval: 1 },
        yAxis: { type: 'category', data: rows.map((item) => item.itemName), axisLabel: { overflow: 'truncate', width: 130 } },
        series: [
          { name: '命中次数', type: 'bar', data: rows.map((item) => item.occurrenceCount), barMaxWidth: 18 },
          { name: '累计扣分', type: 'bar', data: rows.map((item) => item.totalDeduction), barMaxWidth: 18 }
        ]
      },
      true
    );
  }
  if (appealChartRef.value) {
    appealChart ||= echarts.init(appealChartRef.value);
    appealChart.setOption(
      {
        tooltip: { trigger: 'item' },
        legend: { bottom: 0 },
        series: [
          {
            name: '申诉结果',
            type: 'pie',
            radius: ['42%', '68%'],
            center: ['50%', '44%'],
            label: { formatter: '{b} {c}' },
            data: [
              { name: '维持原结果', value: appealSummary.value?.maintainedCount || 0 },
              { name: '调整评分', value: appealSummary.value?.adjustedCount || 0 },
              { name: '重新质检', value: appealSummary.value?.recheckedCount || 0 },
              { name: '处理中', value: appealSummary.value?.pendingCount || 0 }
            ]
          }
        ]
      },
      true
    );
  }
};
const resize = () => {
  coverageChart?.resize();
  scoreChart?.resize();
  deductionChart?.resize();
  appealChart?.resize();
};
onMounted(async () => {
  await loadOptions();
  await load();
  window.addEventListener('resize', resize);
});
onBeforeUnmount(() => {
  window.removeEventListener('resize', resize);
  coverageChart?.dispose();
  scoreChart?.dispose();
  deductionChart?.dispose();
  appealChart?.dispose();
});
</script>

<style scoped lang="scss">
.quality-report-page {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 100%;
  padding: 10px 12px;
  box-sizing: border-box;
  overflow: auto;
  font-size: 12px;
}
.filter-panel,
.metric-card,
.chart-grid .el-card,
.ranking-grid .el-card {
  border: 0;
  border-radius: 12px;
  background: var(--el-bg-color);
}
.analysis-card,
.appeal-card,
.detail-card {
  border: 0;
  border-radius: 12px;
}
.filter-panel {
  padding: 12px 14px;
}
.page-heading {
  display: flex;
  align-items: center;
  gap: 10px;
}
.heading-icon {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 9px;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  font-size: 18px;
}
.page-heading h2 {
  margin: 0 0 3px;
  font-size: 17px;
  font-weight: 500;
}
.page-heading p {
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 11px;
}
.filter-form {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--el-border-color-lighter);
}
.filter-form :deep(.el-form-item) {
  margin: 0;
  min-width: 0;
}
.date-range {
  width: 260px !important;
}
.filter-select {
  width: 160px;
}
.metric-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(120px, 1fr));
  gap: 8px;
}
.metric-card {
  padding: 10px 12px;
  background: var(--el-fill-color-lighter);
}
.metric-card span,
.metric-card small {
  display: block;
  color: var(--el-text-color-secondary);
  font-size: 11px;
}
.metric-card strong {
  display: block;
  margin: 4px 0 2px;
  font-size: 20px;
  font-weight: 500;
}
.chart-grid,
.ranking-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.chart-grid :deep(.el-card__header),
.ranking-grid :deep(.el-card__header) {
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 500;
}
.analysis-card :deep(.el-card__header),
.appeal-card :deep(.el-card__header),
.detail-card :deep(.el-card__header) {
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 500;
}
.chart-grid :deep(.el-card__body),
.ranking-grid :deep(.el-card__body) {
  padding: 8px 12px;
}
.analysis-card :deep(.el-card__body),
.appeal-card :deep(.el-card__body),
.detail-card :deep(.el-card__body) {
  padding: 8px 12px 10px;
}
.chart {
  height: 260px;
}
.ranking-grid :deep(.el-table) {
  font-size: 11px;
}
.analysis-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.deduction-chart {
  height: 310px;
}
.ai-summary,
.appeal-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 8px;
}
.ai-summary > div,
.appeal-metrics > div {
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--el-fill-color-lighter);
}
.ai-summary strong,
.ai-summary span,
.appeal-metrics strong,
.appeal-metrics span {
  display: block;
}
.ai-summary strong,
.appeal-metrics strong {
  margin-bottom: 2px;
  font-size: 18px;
  font-weight: 500;
}
.ai-summary span,
.appeal-metrics span {
  color: var(--el-text-color-secondary);
  font-size: 11px;
}
.appeal-layout {
  display: grid;
  grid-template-columns: minmax(420px, 0.9fr) minmax(520px, 1.1fr);
  gap: 18px;
}
.appeal-chart {
  height: 220px;
}
.appeal-ranking :deep(.el-tabs__header) {
  margin-bottom: 8px;
}
.appeal-ranking :deep(.el-table),
.analysis-card :deep(.el-table) {
  font-size: 11px;
}
.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.detail-filters {
  display: flex;
  gap: 8px;
}
.detail-filters .el-input {
  width: 190px;
}
.detail-filters .el-select {
  width: 120px;
}
.detail-card :deep(.el-table) {
  font-size: 11px;
}
@media (max-width: 1200px) {
  .metric-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  .chart-grid,
  .ranking-grid,
  .analysis-grid,
  .appeal-layout {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 760px) {
  .filter-form :deep(.el-form-item),
  .date-range,
  .filter-select {
    width: 100% !important;
  }
  .detail-header,
  .detail-filters {
    align-items: stretch;
    flex-direction: column;
  }
  .detail-filters .el-input,
  .detail-filters .el-select {
    width: 100%;
  }
}
</style>
