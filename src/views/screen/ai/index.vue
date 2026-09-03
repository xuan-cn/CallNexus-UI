<template>
  <ScreenShell
    :title="text.title"
    subtitle="AI VOICEBOT OPERATIONS DASHBOARD"
    :footer-text="text.footer"
    :badge-tone="liveDataOk ? 'live' : 'demo'"
    :switch-links="[{ label: text.switchHome, path: '/screen/home' }]"
  >
    <div class="screen-page ai-page theme-exhibit">
      <section class="ai-kpis screen-kpi-grid screen-kpi-grid-compact screen-kpi-grid-4">
        <article v-for="(item, index) in kpis" :key="item.label" class="screen-kpi-card" :class="`is-tone-${index}`">
          <div class="screen-kpi-label">{{ item.label }}</div>
          <div class="screen-kpi-value">{{ item.value }}</div>
          <div class="screen-kpi-extra" :class="item.tone">{{ item.extra }}</div>
        </article>
      </section>

      <div class="screen-cols ai-cols">
        <div class="screen-col ai-col-left">
          <article class="screen-panel screen-col-grow screen-panel-side ai-panel-top">
            <div class="screen-panel-head">
              <div>
                <div class="screen-panel-title">{{ text.trendTitle }}</div>
                <div class="screen-panel-sub">{{ text.trendSub }}</div>
              </div>
            </div>
            <div class="screen-panel-body">
              <div ref="trafficChartRef" class="screen-chart" />
            </div>
          </article>
          <article class="screen-panel screen-col-grow screen-panel-side ai-panel-bottom">
            <div class="screen-panel-head">
              <div>
                <div class="screen-panel-title">{{ text.latencyTitle }}</div>
                <div class="screen-panel-sub">{{ text.latencySub }}</div>
              </div>
            </div>
            <div class="screen-panel-body">
              <div ref="latencyChartRef" class="screen-chart" />
            </div>
          </article>
        </div>

        <div class="screen-col ai-col-center">
          <article class="screen-panel screen-col-grow screen-panel-hero ai-panel-top ai-hero">
            <div class="screen-panel-head">
              <div>
                <div class="screen-panel-title">{{ text.heroResolve }}</div>
                <div class="screen-panel-sub">{{ text.heroResolveSub }}</div>
              </div>
            </div>
            <div class="screen-panel-body ai-hero-body">
              <div class="ai-hero-rate">
                <div class="ai-rate-wrap">
                  <svg class="ai-rate-svg" viewBox="0 0 120 120" aria-hidden="true">
                    <circle class="ai-rate-track" cx="60" cy="60" r="52" />
                    <circle
                      class="ai-rate-progress"
                      cx="60"
                      cy="60"
                      r="52"
                      transform="rotate(-90 60 60)"
                      :stroke-dasharray="ringLength"
                      :stroke-dashoffset="ringOffset"
                    />
                  </svg>
                  <div class="ai-rate-hole">
                    <div class="ai-rate-value">{{ heroCore.resolve }}%</div>
                    <div class="ai-rate-sub">{{ text.funnelInbound }} {{ heroCore.inbound }}</div>
                  </div>
                </div>
              </div>
              <div class="ai-hero-stats">
                <div v-for="item in focusMetrics" :key="item.label" class="ai-stat-chip">
                  <span class="ai-stat-label">{{ item.label }}</span>
                  <strong class="ai-stat-value" :style="{ color: item.color }">{{ item.value }}</strong>
                </div>
              </div>
            </div>
          </article>
          <article class="screen-panel screen-col-grow screen-panel-side ai-panel-bottom ai-panel-funnel">
            <div class="screen-panel-head">
              <div>
                <div class="screen-panel-title">{{ text.heroFunnel }}</div>
                <div class="screen-panel-sub">{{ text.heroFunnelSub }}</div>
              </div>
            </div>
            <div class="screen-panel-body ai-funnel-body">
              <div class="ai-funnel-bars">
                <div v-for="item in outcomeBars" :key="item.label" class="ai-bar-row">
                  <div class="ai-bar-head">
                    <span class="ai-bar-dot" :style="{ background: item.color }" />
                    <span class="ai-bar-name">{{ item.label }}</span>
                    <strong class="ai-bar-num">{{ item.value }}</strong>
                    <span class="ai-bar-pct">{{ item.percent }}%</span>
                  </div>
                  <div class="ai-bar-track">
                    <span class="ai-bar-fill" :style="{ width: item.barWidth, background: item.color }" />
                  </div>
                </div>
              </div>
              <div class="ai-extras-grid">
                <div v-for="item in heroExtraCards" :key="item.label" class="ai-extra-card">
                  <span class="ai-extra-label">{{ item.label }}</span>
                  <strong class="ai-extra-value">{{ item.value }}</strong>
                </div>
              </div>
            </div>
          </article>
        </div>

        <div class="screen-col ai-col-right">
          <article class="screen-panel screen-col-grow screen-panel-side ai-panel-top ai-panel-intent">
            <div class="screen-panel-head">
              <div>
                <div class="screen-panel-title">{{ text.intentTitle }}</div>
                <div class="screen-panel-sub">{{ text.intentSub }}</div>
              </div>
            </div>
            <div class="screen-panel-body">
              <div class="screen-rank-list ai-intent-rank">
                <div v-for="(item, index) in intentRanking" :key="item.name" class="screen-rank-item" :class="{ 'is-top': index < 3 }">
                  <span class="screen-rank-no">{{ index + 1 }}</span>
                  <span class="screen-rank-name">{{ item.name }}</span>
                  <span class="screen-rank-value">{{ item.count }}</span>
                  <div class="screen-rank-bar"><span :style="{ width: `${item.percent}%` }" /></div>
                </div>
              </div>
            </div>
          </article>
          <article class="screen-panel screen-col-grow screen-panel-side ai-panel-bottom ai-panel-feed">
            <div class="screen-panel-head">
              <div>
                <div class="screen-panel-title">{{ text.feedTitle }}</div>
                <div class="screen-panel-sub">{{ text.feedSub }}</div>
              </div>
            </div>
            <div class="screen-panel-body ai-feed-wrap screen-panel-scroll">
              <table class="screen-scroll-table">
                <thead>
                  <tr>
                    <th>{{ text.thTime }}</th>
                    <th>{{ text.thIntent }}</th>
                    <th>{{ text.thReason }}</th>
                    <th>{{ text.thStatus }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in feed" :key="row.id">
                    <td>{{ row.time }}</td>
                    <td>{{ row.intent }}</td>
                    <td>{{ row.reason }}</td>
                    <td><span class="screen-tag" :class="row.tagClass">{{ row.status }}</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </article>
        </div>
      </div>
    </div>
  </ScreenShell>
</template>

<script setup lang="ts">
import * as echarts from 'echarts';
import { getAiScreenDashboard, type AiScreenDashboard } from '@/api/screen/ai';
import ScreenShell from '../components/ScreenShell.vue';
import { aiText as text } from '../constants/text';
import { buildAreaStyle, screenAxisStyle, screenGrid, screenLegend, screenTooltip } from '../utils/chart-theme';
import {
  createAiFeed,
  createAiHeroCore,
  createAiHeroExtras,
  createAiIntentRanking,
  createAiKpis,
  createAiLatencyTrend,
  createAiOutcomes,
  createAiTrafficTrend,
  type AiFeedItem,
  type AiKpi
} from '../mock/ai';

defineOptions({ name: 'ScreenAi' });

const kpis = ref<AiKpi[]>(createAiKpis());
const heroCore = ref(createAiHeroCore());
const heroExtras = ref(createAiHeroExtras());
const intentRanking = ref(createAiIntentRanking());
const feed = ref<AiFeedItem[]>(createAiFeed());
const outcomes = ref(createAiOutcomes());
const trafficTrend = ref(createAiTrafficTrend());
const latencyTrend = ref(createAiLatencyTrend());

const trafficChartRef = ref<HTMLDivElement>();
const latencyChartRef = ref<HTMLDivElement>();

let trafficChart: echarts.ECharts | undefined;
let latencyChart: echarts.ECharts | undefined;
let refreshTimer: number | undefined;
/** true = 正在用接口真实数据；失败时保留上次成功数据或降级 mock */
const liveDataOk = ref(false);

const RING_R = 52;
const ringLength = 2 * Math.PI * RING_R;
const ringOffset = computed(() => ringLength * (1 - heroCore.value.resolve / 100));

const focusMetrics = computed(() => [
  { label: text.heroTransfer, value: `${heroCore.value.transfer}%`, color: '#ff9a3c' },
  { label: text.heroFailRate, value: `${heroCore.value.failRate}%`, color: '#ff7a7a' },
  { label: text.heroAvgConf, value: `${Math.round(heroCore.value.avgConfidence * 100)}%`, color: '#6ec8ff' }
]);

const heroExtraCards = computed(() => [
  { label: text.heroFaqPending, value: `${heroExtras.value.faqPending}` },
  { label: text.heroTodaySessions, value: `${heroExtras.value.todaySessions}` },
  { label: text.heroActiveAgents, value: `${heroExtras.value.activeAgents}` }
]);

const outcomeBars = computed(() => {
  const total = Math.max(
    outcomes.value.reduce((sum, item) => sum + item.value, 0),
    1
  );
  return outcomes.value.map((item) => {
    const percent = Math.round((item.value / total) * 100);
    return {
      ...item,
      percent,
      barWidth: `${percent}%`
    };
  });
});

const renderTrafficChart = () => {
  if (!trafficChartRef.value) return;
  trafficChart?.dispose();
  trafficChart = echarts.init(trafficChartRef.value);
  trafficChart.setOption({
    color: ['#9b7bff', '#6ec8ff', '#3dd6a5'],
    tooltip: screenTooltip,
    legend: screenLegend,
    grid: screenGrid,
    xAxis: { type: 'category', boundaryGap: false, data: trafficTrend.value.map((item) => item.hour), ...screenAxisStyle },
    yAxis: { type: 'value', minInterval: 1, ...screenAxisStyle },
    series: [
      {
        name: text.chartAi,
        type: 'line',
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 2, shadowColor: 'rgba(155,123,255,0.4)', shadowBlur: 8 },
        areaStyle: buildAreaStyle('#9b7bff'),
        data: trafficTrend.value.map((item) => item.ai)
      },
      {
        name: text.chartHuman,
        type: 'line',
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 2 },
        areaStyle: buildAreaStyle('#6ec8ff'),
        data: trafficTrend.value.map((item) => item.human)
      },
      {
        name: text.chartResolved,
        type: 'line',
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 3 },
        areaStyle: buildAreaStyle('#34d399'),
        data: trafficTrend.value.map((item) => item.resolved)
      }
    ]
  });
};

const renderLatencyChart = () => {
  if (!latencyChartRef.value) return;
  latencyChart?.dispose();
  latencyChart = echarts.init(latencyChartRef.value);
  latencyChart.setOption({
    color: ['#9b7bff', '#ff7a6e'],
    tooltip: screenTooltip,
    legend: screenLegend,
    grid: screenGrid,
    xAxis: { type: 'category', data: latencyTrend.value.map((item) => item.hour), ...screenAxisStyle },
    yAxis: { type: 'value', ...screenAxisStyle },
    series: [
      {
        name: text.chartAsr,
        type: 'bar',
        barWidth: 10,
        data: latencyTrend.value.map((item) => item.asr),
        itemStyle: { borderRadius: [6, 6, 0, 0], color: 'rgba(155,123,255,0.78)' }
      },
      {
        name: text.chartTts,
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 5,
        lineStyle: { width: 2 },
        data: latencyTrend.value.map((item) => item.tts)
      }
    ]
  });
};

const renderCharts = () => {
  renderTrafficChart();
  renderLatencyChart();
};

const applyMock = (randomize = false) => {
  kpis.value = createAiKpis(randomize);
  heroCore.value = createAiHeroCore(randomize);
  heroExtras.value = createAiHeroExtras(randomize);
  intentRanking.value = createAiIntentRanking(randomize);
  feed.value = createAiFeed(randomize);
  outcomes.value = createAiOutcomes(randomize);
  trafficTrend.value = createAiTrafficTrend(randomize);
  latencyTrend.value = createAiLatencyTrend(randomize);
};

const applyDashboard = (data: AiScreenDashboard) => {
  kpis.value = (data.kpis || []).map((item) => ({
    label: item.label,
    value: item.value,
    extra: item.extra,
    tone: item.tone === 'is-up' || item.tone === 'is-down' ? item.tone : undefined
  }));
  heroCore.value = data.heroCore || createAiHeroCore();
  heroExtras.value = data.heroExtras || createAiHeroExtras();
  intentRanking.value = data.intentRanking?.length ? data.intentRanking : createAiIntentRanking();
  feed.value = data.feed?.length ? data.feed : createAiFeed();
  outcomes.value = data.outcomes?.length ? data.outcomes : createAiOutcomes();
  trafficTrend.value = data.trafficTrend?.length ? data.trafficTrend : createAiTrafficTrend();
  latencyTrend.value = data.latencyTrend?.length ? data.latencyTrend : createAiLatencyTrend();
};

const loadDashboard = async () => {
  try {
    const res = await getAiScreenDashboard();
    const payload = (res as any)?.data ?? res;
    if (!payload || typeof payload !== 'object') {
      throw new Error('empty dashboard');
    }
    applyDashboard(payload as AiScreenDashboard);
    liveDataOk.value = true;
    nextTick(renderCharts);
  } catch {
    // 接口不可用时：首次降级 mock；已有真数据则保留上次结果，避免闪烁
    if (!liveDataOk.value) {
      applyMock(false);
      nextTick(renderCharts);
    }
  }
};

const handleResize = () => {
  trafficChart?.resize();
  latencyChart?.resize();
};

onMounted(() => {
  nextTick(() => {
    renderCharts();
    requestAnimationFrame(handleResize);
  });
  window.addEventListener('resize', handleResize);
  loadDashboard();
  refreshTimer = window.setInterval(loadDashboard, 15000);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  if (refreshTimer) window.clearInterval(refreshTimer);
  trafficChart?.dispose();
  latencyChart?.dispose();
});
</script>

<style scoped lang="scss">
@import '../styles/screen-common.scss';
@import '../styles/screen-themes.scss';

.ai-page {
  gap: 6px;
}

.ai-page :deep(.screen-kpi-grid-compact .screen-kpi-card) {
  padding: 6px 8px 6px 10px;
}

.ai-page :deep(.screen-kpi-grid-compact .screen-kpi-value) {
  font-size: 20px;
}

.ai-page :deep(.screen-panel-sub) {
  display: none;
}

.ai-page :deep(.screen-panel-head) {
  padding-bottom: 2px;
}

.ai-cols {
  flex: 1;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
  align-items: stretch;
}

.ai-col-left,
.ai-col-center,
.ai-col-right {
  min-height: 0;
  overflow: hidden;
  gap: 6px;
}

.ai-panel-top,
.ai-panel-bottom {
  flex: 1 1 0;
  min-height: 0;
  overflow: hidden;
}

.ai-hero-body {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  align-items: center;
  gap: 12px;
  height: 100%;
  min-height: 0;
  padding: 8px 8px 10px;
  box-sizing: border-box;
  overflow: hidden;
}

.ai-hero-rate {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
  overflow: hidden;
}

.ai-rate-wrap {
  position: relative;
  width: clamp(112px, 70%, 168px);
  max-height: min(100%, 168px);
  aspect-ratio: 1;
  filter: drop-shadow(0 0 12px rgba(61, 214, 165, 0.25));
  animation: ai-ring-pulse 3.6s ease-in-out infinite;
}

.ai-rate-svg {
  display: block;
  width: 100%;
  height: 100%;
}

.ai-rate-track,
.ai-rate-progress {
  fill: none;
  stroke-width: 10;
  stroke-linecap: round;
}

.ai-rate-track {
  stroke: rgba(148, 163, 184, 0.2);
}

.ai-rate-progress {
  stroke: #3dd6a5;
  transition: stroke-dashoffset 0.6s ease;
}

.ai-rate-hole {
  position: absolute;
  inset: 18%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background:
    radial-gradient(circle at 40% 35%, rgba(48, 28, 96, 0.72), rgba(8, 6, 24, 0.98) 72%);
  box-shadow: inset 0 0 24px rgba(0, 0, 0, 0.55);
  text-align: center;
  pointer-events: none;
}

.ai-rate-value {
  color: #f6f2ff;
  font-size: clamp(20px, 1.8vw, 28px);
  font-weight: 700;
  line-height: 1;
  text-shadow: 0 0 18px rgba(61, 214, 165, 0.4);
  font-variant-numeric: tabular-nums;
}

.ai-rate-sub {
  margin-top: 3px;
  color: rgba(170, 160, 220, 0.75);
  font-size: 10px;
  white-space: nowrap;
}

.ai-hero-stats {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
  min-width: 0;
  min-height: 0;
  max-height: 100%;
  overflow: hidden;
}

.ai-stat-chip {
  display: grid;
  flex: 0 0 auto;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  min-height: 34px;
  padding: 8px 10px;
  border: 1px solid rgba(155, 123, 255, 0.22);
  border-radius: 8px;
  background: linear-gradient(120deg, rgba(60, 36, 110, 0.42), rgba(18, 14, 42, 0.55));
}

.ai-stat-label {
  color: rgba(200, 185, 240, 0.82);
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ai-stat-value {
  font-size: 16px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  white-space: nowrap;
}

.ai-funnel-body {
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  gap: 8px;
  height: 100%;
  min-height: 0;
  padding: 6px 12px 10px;
  box-sizing: border-box;
  overflow: hidden;
}

.ai-funnel-bars {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 10px;
  min-height: 0;
  overflow: hidden;
}

.ai-bar-row {
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  min-width: 0;
}

.ai-bar-head {
  display: grid;
  grid-template-columns: 7px minmax(0, 1fr) minmax(40px, auto) minmax(36px, auto);
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding-right: 2px;
}

.ai-bar-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.ai-bar-name {
  color: rgba(200, 185, 240, 0.9);
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ai-bar-num {
  color: #f4efff;
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  text-align: right;
  white-space: nowrap;
}

.ai-bar-pct {
  color: rgba(170, 160, 220, 0.8);
  font-size: 11px;
  text-align: right;
  white-space: nowrap;
  min-width: 36px;
}

.ai-bar-track {
  height: 5px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(40, 28, 80, 0.7);
}

.ai-bar-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  transition: width 0.6s ease;
}

.ai-extras-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 5px;
  min-width: 0;
}

.ai-extra-card {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 1px;
  min-width: 0;
  padding: 4px 6px;
  border: 1px solid rgba(155, 123, 255, 0.2);
  border-radius: 6px;
  background: linear-gradient(160deg, rgba(70, 40, 140, 0.35), rgba(20, 14, 48, 0.7));
  overflow: hidden;
}

.ai-extra-label {
  color: rgba(170, 160, 220, 0.78);
  font-size: 10px;
  line-height: 1.15;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ai-extra-value {
  color: #f4efff;
  font-size: 14px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
  white-space: nowrap;
}

@keyframes ai-ring-pulse {
  0%,
  100% {
    filter: drop-shadow(0 0 12px rgba(61, 214, 165, 0.2));
  }
  50% {
    filter: drop-shadow(0 0 22px rgba(61, 214, 165, 0.38));
  }
}

.ai-intent-rank.screen-rank-list {
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: flex-start;
  gap: 8px;
  height: 100%;
  min-height: 0;
  overflow: auto;
}

.ai-intent-rank .screen-rank-item {
  flex: 0 0 auto;
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr) auto;
  grid-template-rows: auto auto;
  align-items: center;
  column-gap: 8px;
  row-gap: 6px;
  min-height: 0;
  padding: 8px 10px;
  border-radius: 8px;
}

.ai-intent-rank .screen-rank-no {
  grid-row: 1 / 3;
  align-self: center;
  width: 20px;
  height: 20px;
  font-size: 10px;
}

.ai-intent-rank .screen-rank-name {
  grid-column: 2;
  grid-row: 1;
  font-size: 12px;
  line-height: 1.2;
}

.ai-intent-rank .screen-rank-value {
  grid-column: 3;
  grid-row: 1;
  font-size: 13px;
  font-weight: 700;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.ai-intent-rank .screen-rank-bar {
  grid-column: 2 / 4;
  grid-row: 2;
  height: 4px;
  border-radius: 999px;
}

.ai-feed-wrap {
  min-height: 0;
  overflow: auto;
  isolation: isolate;
}

@media (max-height: 820px) {
  .ai-rate-wrap {
    width: clamp(96px, 58%, 132px);
  }

  .ai-stat-chip {
    min-height: 28px;
    padding: 5px 8px;
  }

  .ai-stat-value {
    font-size: 14px;
  }

  .ai-funnel-bars {
    gap: 6px;
  }
}
</style>
