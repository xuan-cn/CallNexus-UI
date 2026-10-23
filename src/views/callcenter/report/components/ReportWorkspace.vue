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
        <el-button :icon="Download" :loading="exporting" @click="handleExport">导出</el-button>
      </div>
      <el-form class="filter-form" :inline="true" size="small" @submit.prevent>
        <el-form-item label="统计时间">
          <el-date-picker
            v-model="dateRange"
            class="date-range-picker"
            :class="{ 'date-time-range-picker': mode === 'agent' }"
            :type="mode === 'agent' ? 'datetimerange' : 'daterange'"
            :value-format="mode === 'agent' ? 'YYYY-MM-DD HH:mm:ss' : 'YYYY-MM-DD'"
            range-separator="至"
            :start-placeholder="mode === 'agent' ? '开始时间' : '开始日期'"
            :end-placeholder="mode === 'agent' ? '结束时间' : '结束日期'"
            :clearable="false"
          />
        </el-form-item>
        <el-form-item v-if="mode === 'call'" label="时间粒度">
          <el-select v-model="query.granularity" class="granularity-filter">
            <el-option label="按小时" value="HOUR" />
            <el-option label="按天" value="DAY" />
            <el-option label="按月" value="MONTH" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="mode === 'call'" label="呼入/呼出组">
          <el-select v-model="query.skillGroupId" clearable filterable placeholder="全部组" class="group-filter">
            <el-option v-for="group in skillGroupOptions" :key="String(group.id)" :label="skillGroupOptionLabel(group)" :value="group.id" />
          </el-select>
        </el-form-item>
        <el-form-item v-else-if="mode === 'queue'">
          <el-input v-model="query.keyword" clearable placeholder="队列名称或编码" @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item v-if="mode === 'call' || mode === 'agent'" :label="mode === 'call' ? '坐席' : undefined">
          <el-select v-model="query.agentId" clearable filterable placeholder="全部坐席" class="agent-filter">
            <el-option v-for="agent in agentOptions" :key="agent.id" :label="agentOptionLabel(agent)" :value="agent.id" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="mode === 'call'" label="方向">
          <el-select v-model="query.direction" clearable placeholder="全部方向" class="direction-filter">
            <el-option label="呼入" value="INBOUND" /><el-option label="呼出" value="OUTBOUND" /><el-option label="内部" value="INTERNAL" />
          </el-select>
        </el-form-item>
        <el-form-item><el-button type="primary" :loading="loading" @click="handleQuery">查询</el-button></el-form-item>
      </el-form>
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
        <template #header>坐席话务统计</template>
        <el-table v-loading="loading" :data="callStatisticRows" size="small" height="100%">
          <el-table-column label="统计时段" prop="bucket" min-width="128" fixed="left" />
          <el-table-column label="坐席" min-width="112" fixed="left">
            <template #default="{ row }">
              <div class="primary-cell">{{ row.agentName || '-' }}</div>
              <div class="secondary-cell">{{ row.agentExtension || '-' }}</div>
            </template>
          </el-table-column>
          <el-table-column label="总话务" prop="totalCalls" width="78" align="center" />
          <el-table-column label="总接通" prop="answeredCalls" width="78" align="center" />
          <el-table-column label="接通率" width="80" align="center">
            <template #default="{ row }">{{ percent(row.answerRate) }}</template>
          </el-table-column>
          <el-table-column label="呼出数量" min-width="112" align="center">
            <template #default="{ row }">
              <div class="stacked-metric">
                <span>总量 {{ row.outboundCalls }}</span
                ><small>接通 {{ row.outboundAnsweredCalls }}</small>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="呼出接通率" width="98" align="center">
            <template #default="{ row }">{{ percent(row.outboundAnswerRate) }}</template>
          </el-table-column>
          <el-table-column label="呼出时长" min-width="130" align="center">
            <template #default="{ row }">
              <div class="stacked-metric">
                <span>总计 {{ duration(row.outboundTalkSeconds) }}</span
                ><small>平均 {{ duration(row.outboundAverageTalkSeconds) }}</small>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="呼入数量" min-width="112" align="center">
            <template #default="{ row }">
              <div class="stacked-metric">
                <span>总量 {{ row.inboundCalls }}</span
                ><small>接通 {{ row.inboundAnsweredCalls }}</small>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="呼入接通率" width="98" align="center">
            <template #default="{ row }">{{ percent(row.inboundAnswerRate) }}</template>
          </el-table-column>
          <el-table-column label="呼入时长" min-width="130" align="center">
            <template #default="{ row }">
              <div class="stacked-metric">
                <span>总计 {{ duration(row.inboundTalkSeconds) }}</span
                ><small>平均 {{ duration(row.inboundAverageTalkSeconds) }}</small>
              </div>
            </template>
          </el-table-column>
        </el-table>
        <pagination v-show="total > 0" v-model:page="query.pageNum" v-model:limit="query.pageSize" :total="total" @pagination="loadCallStatistics" />
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
      <el-card class="table-card analysis-table-card agent-analysis-table-card" shadow="never">
        <el-table v-loading="loading" :data="agentRows" size="small" height="100%" class="analysis-table">
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
          <el-table-column label="总通话时长" prop="totalTalkSeconds" sortable width="108" align="center">
            <template #default="{ row }">{{ duration(row.totalTalkSeconds) }}</template>
          </el-table-column>
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
          <el-table-column label="操作" width="64" align="center" fixed="right">
            <template #default="{ row }"><el-button link type="primary" @click="openAgentDetail(row)">详情</el-button></template>
          </el-table-column>
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

    <el-drawer v-model="agentDetailVisible" :title="agentDetailTitle" size="780px" append-to-body class="agent-report-drawer">
      <template v-if="selectedAgent">
        <div class="detail-period">统计周期：{{ dateRange[0] }} 至 {{ dateRange[1] }}</div>
        <div class="detail-metrics">
          <div>
            <span>处理量</span><strong>{{ selectedAgent.handledCount }}</strong>
          </div>
          <div>
            <span>呼入接听</span><strong>{{ selectedAgent.inboundAnsweredCount }}</strong>
          </div>
          <div>
            <span>外呼接通</span><strong>{{ selectedAgent.outboundAnsweredCount }}</strong>
          </div>
          <div>
            <span>未接</span><strong>{{ selectedAgent.missedCount }}</strong>
          </div>
          <div>
            <span>平均响应</span><strong>{{ duration(selectedAgent.averageResponseSeconds) }}</strong>
          </div>
          <div>
            <span>平均通话</span><strong>{{ duration(selectedAgent.averageTalkSeconds) }}</strong>
          </div>
          <div>
            <span>在线时长</span><strong>{{ duration(selectedAgent.onlineSeconds) }}</strong>
          </div>
          <div>
            <span>利用率</span><strong>{{ percent(selectedAgent.utilizationRate) }}</strong>
          </div>
        </div>

        <el-tabs v-model="agentDetailTab" @tab-change="handleAgentDetailTabChange">
          <el-tab-pane label="状态轨迹" name="presence">
            <el-table v-loading="presenceLoading" :data="presenceRows" size="small" max-height="520">
              <el-table-column label="状态" width="88">
                <template #default="{ row }">{{ presenceStatusLabel(row.status) }}</template>
              </el-table-column>
              <el-table-column label="来源" width="92">
                <template #default="{ row }">{{ presenceSourceLabel(row.source) }}</template>
              </el-table-column>
              <el-table-column label="开始时间" prop="startedAt" width="158" />
              <el-table-column label="结束时间" width="158">
                <template #default="{ row }">{{ row.endedAt || '进行中' }}</template>
              </el-table-column>
              <el-table-column label="持续时长" min-width="92" align="right">
                <template #default="{ row }">{{ duration(row.durationSeconds) }}</template>
              </el-table-column>
            </el-table>
            <pagination
              v-show="presenceTotal > 0"
              v-model:page="presenceQuery.pageNum"
              v-model:limit="presenceQuery.pageSize"
              :total="presenceTotal"
              @pagination="loadAgentPresence"
            />
          </el-tab-pane>
          <el-tab-pane label="近期通话" name="calls">
            <el-table v-loading="agentCallsLoading" :data="agentCallRows" size="small" max-height="520">
              <el-table-column label="开始时间" prop="startedAt" width="158" />
              <el-table-column label="方向" width="66">
                <template #default="{ row }">{{ directionLabel(row.direction) }}</template>
              </el-table-column>
              <el-table-column label="客户号码" prop="customerNumber" min-width="120" show-overflow-tooltip />
              <el-table-column label="结果" width="76">
                <template #default="{ row }">{{ row.answeredAt ? '已接通' : '未接通' }}</template>
              </el-table-column>
              <el-table-column label="通话时长" width="92" align="right">
                <template #default="{ row }">{{ duration(row.talkSeconds) }}</template>
              </el-table-column>
              <el-table-column label="挂断原因" prop="hangupCause" min-width="110" show-overflow-tooltip />
            </el-table>
            <pagination
              v-show="agentCallTotal > 0"
              v-model:page="agentCallQuery.pageNum"
              v-model:limit="agentCallQuery.pageSize"
              :total="agentCallTotal"
              @pagination="loadAgentCalls"
            />
          </el-tab-pane>
        </el-tabs>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import * as echarts from 'echarts';
import { DataAnalysis, Download, Headset, Histogram, TrendCharts, User } from '@element-plus/icons-vue';
import { computed, getCurrentInstance, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import {
  getCallReportDistribution,
  getCallReportSummary,
  getCallReportTrend,
  getReportOverview,
  getReportOverviewDistribution,
  getReportOverviewTrend,
  listAgentReportCalls,
  listAgentReportPresenceLogs,
  listAgentReports,
  listCallReportStatistics,
  listReportAgentOptions,
  listReportSkillGroupOptions,
  listQueueReports
} from '@/api/callcenter/report';
import type {
  AgentReportVO,
  AgentPresenceLogVO,
  CallAgentStatisticVO,
  CallDetailVO,
  CallDistributionVO,
  OverviewKpiVO,
  QueueReportVO,
  ReportAgentOptionVO,
  ReportQuery,
  ReportSkillGroupOptionVO,
  ReportTrendPointVO
} from '@/api/callcenter/report/types';

const props = defineProps<{ mode: 'overview' | 'call' | 'agent' | 'queue' }>();
const { proxy } = getCurrentInstance() as ComponentInternalInstance;
const now = new Date();
const formatDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const formatDateTime = (date: Date) =>
  `${formatDate(date)} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
const start = new Date(now);
start.setDate(start.getDate() - 6);
if (props.mode === 'agent') start.setHours(0, 0, 0, 0);
const dateRange = ref<[string, string]>(props.mode === 'agent' ? [formatDateTime(start), formatDateTime(now)] : [formatDate(start), formatDate(now)]);
const query = reactive<ReportQuery>({ pageNum: 1, pageSize: 20, granularity: props.mode === 'call' ? 'DAY' : undefined });
const agentOptions = ref<ReportAgentOptionVO[]>([]);
const skillGroupOptions = ref<ReportSkillGroupOptionVO[]>([]);
const loading = ref(false);
const exporting = ref(false);
const kpis = ref<OverviewKpiVO>();
const trend = ref<ReportTrendPointVO[]>([]);
const distribution = ref<CallDistributionVO[]>([]);
const callStatisticRows = ref<CallAgentStatisticVO[]>([]);
const agentRows = ref<AgentReportVO[]>([]);
const selectedAgent = ref<AgentReportVO>();
const agentDetailVisible = ref(false);
const agentDetailTab = ref('presence');
const presenceLoading = ref(false);
const agentCallsLoading = ref(false);
const presenceRows = ref<AgentPresenceLogVO[]>([]);
const agentCallRows = ref<CallDetailVO[]>([]);
const presenceTotal = ref(0);
const agentCallTotal = ref(0);
const presenceQuery = reactive<ReportQuery>({ pageNum: 1, pageSize: 10 });
const agentCallQuery = reactive<ReportQuery>({ pageNum: 1, pageSize: 10 });
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
  call: '按小时、天或月汇总坐席话务、接通和通话时长',
  agent: '按坐席通话腿统计处理量和状态时长',
  queue: '按每次进入队列统计接听、放弃和服务水平'
};
const title = computed(() => titles[props.mode]);
const subtitle = computed(() => subtitles[props.mode]);
const pageIcon = computed(() => ({ overview: DataAnalysis, call: Headset, agent: User, queue: Histogram })[props.mode]);
const agentDetailTitle = computed(() => {
  if (!selectedAgent.value) return '坐席详情';
  const identity = selectedAgent.value.extension || selectedAgent.value.agentCode;
  return `${selectedAgent.value.agentName}${identity ? `（${identity}）` : ''}`;
});
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
      note: props.mode === 'overview' ? '当前实时值' : rangeLimitNote.value
    }
  ];
});

const params = () => ({ ...query, beginDate: dateRange.value[0], endDate: dateRange.value[1] });
const rangeLimitNote = computed(() => {
  if (query.granularity === 'MONTH') return '最长5年';
  if (query.granularity === 'DAY') return '最长366天';
  return '最长31天';
});
const agentOptionLabel = (agent: ReportAgentOptionVO) => {
  const identity = agent.extension || agent.agentCode;
  return `${agent.agentName}${identity ? `（${identity}）` : ''}${agent.enabled ? '' : '（已停用）'}`;
};
const skillGroupOptionLabel = (group: ReportSkillGroupOptionVO) => `${group.groupName}${group.enabled ? '' : '（已停用）'}`;
const loadAgentOptions = async () => {
  if (props.mode !== 'call' && props.mode !== 'agent') return;
  agentOptions.value = (await listReportAgentOptions()).data || [];
};
const loadSkillGroupOptions = async () => {
  if (props.mode !== 'call') return;
  skillGroupOptions.value = (await listReportSkillGroupOptions()).data || [];
};
const handleQuery = () => {
  query.pageNum = 1;
  load();
};
const handleExport = async () => {
  const config = {
    overview: { url: 'api/v1/reports/overview/export', name: '运营总览' },
    call: { url: 'api/v1/reports/calls/export', name: '通话分析' },
    agent: { url: 'api/v1/reports/agents/export', name: '坐席分析' },
    queue: { url: 'api/v1/reports/queues/export', name: '队列分析' }
  }[props.mode];
  exporting.value = true;
  try {
    const rangeLabel = `${dateRange.value[0]}_${dateRange.value[1]}`.replace(/[ :]/g, '-');
    await proxy?.download(config.url, params(), `${config.name}_${rangeLabel}.xlsx`);
  } finally {
    exporting.value = false;
  }
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
      if (props.mode === 'call') await loadCallStatistics();
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
const loadCallStatistics = async () => {
  const res = await listCallReportStatistics(params());
  callStatisticRows.value = res.rows || [];
  total.value = res.total || 0;
};
const detailParams = (pageQuery: ReportQuery) => ({
  ...pageQuery,
  beginDate: dateRange.value[0],
  endDate: dateRange.value[1]
});
const openAgentDetail = async (row: AgentReportVO) => {
  selectedAgent.value = row;
  presenceRows.value = [];
  agentCallRows.value = [];
  presenceQuery.pageNum = 1;
  agentCallQuery.pageNum = 1;
  agentDetailTab.value = 'presence';
  agentDetailVisible.value = true;
  await loadAgentPresence();
};
const loadAgentPresence = async () => {
  if (!selectedAgent.value) return;
  presenceLoading.value = true;
  try {
    const res = await listAgentReportPresenceLogs(selectedAgent.value.agentId, detailParams(presenceQuery));
    presenceRows.value = res.rows || [];
    presenceTotal.value = res.total || 0;
  } finally {
    presenceLoading.value = false;
  }
};
const loadAgentCalls = async () => {
  if (!selectedAgent.value) return;
  agentCallsLoading.value = true;
  try {
    const res = await listAgentReportCalls(selectedAgent.value.agentId, detailParams(agentCallQuery));
    agentCallRows.value = res.rows || [];
    agentCallTotal.value = res.total || 0;
  } finally {
    agentCallsLoading.value = false;
  }
};
const handleAgentDetailTabChange = (name: string | number) => {
  if (name === 'presence') loadAgentPresence();
  if (name === 'calls') loadAgentCalls();
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
    xAxis: { type: 'category', data: trend.value.map((i) => trendBucketLabel(i.bucket)) },
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
const trendBucketLabel = (bucket: string) => {
  if (query.granularity === 'HOUR') return bucket.slice(11);
  if (query.granularity === 'MONTH') return bucket;
  return bucket.slice(5);
};
const presenceStatusLabel = (value: string) =>
  ({ IDLE: '空闲', NOT_READY: '示忙', BUSY: '通话中', AFTER_CALL: '话后整理', OFFLINE: '离线' })[value] || value;
const presenceSourceLabel = (value: string) =>
  ({ SIGN_IN: '签入', SIGN_OUT: '签出', MANUAL: '人工', API: '接口', TELEPHONY_EVENT: '电话事件', SYSTEM_AUTO: '系统自动' })[value] || value;
const resize = () => {
  trendChart?.resize();
  distributionChart?.resize();
  rankChart?.resize();
};
onMounted(() => {
  loadAgentOptions();
  loadSkillGroupOptions();
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
.filter-card {
  flex: 0 0 auto;
  width: 100%;
  min-width: 0;
}
.filter-card :deep(.el-card__body) {
  padding: 12px 14px;
}
.page-head {
  display: flex;
  align-items: center;
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
.filter-form {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  min-width: 0;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--el-border-color-lighter);
}
.filter-form :deep(.el-form-item) {
  min-width: 0;
  margin-bottom: 0;
  margin-right: 0;
}
.filter-form :deep(.el-input) {
  width: 180px;
}
.date-range-picker {
  width: 260px !important;
}
.date-time-range-picker {
  width: 380px !important;
}
.agent-filter {
  width: 190px;
}
.group-filter {
  width: 180px;
}
.granularity-filter,
.direction-filter {
  width: 110px;
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
.analysis-chart-card {
  flex: 0 0 auto;
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
.agent-analysis-table-card {
  flex: 0 0 clamp(420px, 50vh, 620px);
  min-height: 420px;
}
.agent-analysis-table-card :deep(.el-card__body) {
  display: flex;
  height: 100%;
  min-height: 0;
  box-sizing: border-box;
}
.agent-analysis-table-card :deep(.analysis-table) {
  flex: 1;
  min-height: 0;
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
:global(.agent-report-drawer .el-drawer__body) {
  padding: 10px 16px 16px;
  font-size: 12px;
}
.detail-period {
  margin-bottom: 8px;
  color: var(--el-text-color-secondary);
  font-size: 11px;
}
.detail-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 10px;
}
.detail-metrics div {
  padding: 9px 10px;
  border-radius: 8px;
  background: var(--el-fill-color-lighter);
}
.detail-metrics span,
.detail-metrics strong {
  display: block;
}
.detail-metrics span {
  color: var(--el-text-color-secondary);
  font-size: 10px;
}
.detail-metrics strong {
  margin-top: 4px;
  color: var(--el-text-color-primary);
  font-size: 15px;
  font-weight: 500;
}
:global(.agent-report-drawer .el-table) {
  font-size: 11px;
}
@media (max-width: 1200px) {
  .metric-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  .chart-grid {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 760px) {
  .filter-form :deep(.el-form-item),
  .filter-form :deep(.el-input),
  .agent-filter,
  .group-filter,
  .granularity-filter,
  .direction-filter,
  .date-range-picker {
    width: 100% !important;
  }
}
</style>
