<template>
  <ScreenShell
    :title="text.title"
    subtitle="CALL CENTER OPERATIONS DASHBOARD"
    :footer-text="text.footer"
    :badge-tone="liveDataOk ? 'live' : 'demo'"
    :switch-links="[{ label: text.switchAi, path: '/screen/ai' }]"
  >
    <div class="screen-page home-page theme-ops">
      <section class="home-kpis screen-kpi-grid screen-kpi-grid-compact screen-kpi-grid-4">
        <article v-for="(item, index) in kpis" :key="item.label" class="screen-kpi-card" :class="`is-tone-${index}`">
          <div class="screen-kpi-label">{{ item.label }}</div>
          <div class="screen-kpi-value">{{ item.value }}</div>
          <div class="screen-kpi-extra" :class="item.tone">{{ item.extra }}</div>
        </article>
      </section>

      <div class="screen-cols home-cols">
        <div class="screen-col home-col-side">
          <article class="screen-panel screen-panel-side home-panel-trend">
            <div class="screen-panel-head">
              <div>
                <div class="screen-panel-title">{{ text.trendTitle }}</div>
                <div class="screen-panel-sub">{{ text.trendSub }}</div>
              </div>
            </div>
            <div class="screen-panel-body">
              <div ref="trendChartRef" class="screen-chart" />
            </div>
          </article>
          <article class="screen-panel screen-panel-side home-panel-skill">
            <div class="screen-panel-head">
              <div>
                <div class="screen-panel-title">{{ text.skillTitle }}</div>
                <div class="screen-panel-sub">{{ text.skillSub }}</div>
              </div>
            </div>
            <div class="screen-panel-body">
              <div v-show="skillGroups.length" ref="skillChartRef" class="screen-chart" />
              <div v-if="!skillGroups.length" class="home-empty">
                <span class="home-empty-line" />
                <span>{{ text.emptySkill }}</span>
                <span class="home-empty-line" />
              </div>
            </div>
          </article>
        </div>

        <div class="screen-col home-col-center">
          <article class="screen-panel screen-panel-side home-hero">
            <div class="home-hero-body">
              <div class="home-hero-main">
                <div class="home-hero-glow" aria-hidden="true" />
                <div class="home-hero-floor" aria-hidden="true" />
                <div class="home-rate-stage">
                  <div class="home-orbit" aria-hidden="true"><i /><i /></div>
                  <div class="home-rate-wrap">
                    <svg class="home-rate-svg" viewBox="0 0 120 120" aria-hidden="true">
                      <circle class="home-rate-track" cx="60" cy="60" r="52" />
                      <circle
                        class="home-rate-progress"
                        cx="60"
                        cy="60"
                        r="52"
                        transform="rotate(-90 60 60)"
                        :stroke-dasharray="ringLength"
                        :stroke-dashoffset="ringOffset"
                      />
                    </svg>
                    <div class="home-rate-hole">
                      <div class="home-rate-value">{{ displayAnswerRate }}%</div>
                      <div class="home-rate-label">{{ text.heroRate }}</div>
                    </div>
                  </div>
                </div>
                <div class="home-hero-copy">
                  <div class="home-hero-kicker">{{ text.heroInbound }}</div>
                  <div class="home-hero-inbound">{{ heroCore.inbound }}</div>
                  <div class="home-hero-extra" :class="heroCore.inboundTone">
                    {{ heroCore.inboundExtra || text.heroTarget }}
                  </div>
                  <div class="home-target-row">
                    <span>{{ text.heroTarget }}</span>
                    <div class="home-target-track">
                      <span class="home-target-fill" :style="{ width: `${Math.min(displayAnswerRate, 100)}%` }" />
                      <i class="home-target-mark" />
                    </div>
                  </div>
                </div>
              </div>

              <div class="home-agent-strip">
                <div class="home-agent-head">
                  <span>{{ text.agentTitle }}</span>
                  <strong>{{ text.agentTotal }} {{ agentSummary.total }}</strong>
                </div>
                <div class="home-agent-row">
                  <div v-for="item in agentBars" :key="item.label" class="home-agent-item">
                    <span class="home-agent-dot" :style="{ background: item.color }" />
                    <span class="home-agent-name">{{ item.label }}</span>
                    <strong class="home-agent-num">{{ item.value }}</strong>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </div>

        <div class="screen-col home-col-side">
          <article class="screen-panel screen-panel-side home-panel-queue">
            <div class="screen-panel-head">
              <div>
                <div class="screen-panel-title">{{ text.queueTitle }}</div>
                <div class="screen-panel-sub">{{ text.queueSub }}</div>
              </div>
            </div>
            <div class="screen-panel-body">
              <div v-if="queueRanking.length" class="screen-rank-list">
                <div v-for="(item, index) in queueRanking" :key="item.name" class="screen-rank-item" :class="{ 'is-top': index < 3 }">
                  <span class="screen-rank-no">{{ index + 1 }}</span>
                  <span class="screen-rank-name">{{ item.name }}</span>
                  <span class="screen-rank-value">{{ item.waiting }} {{ text.ren }}</span>
                  <div class="screen-rank-bar"><span :style="{ width: `${item.percent}%` }" /></div>
                </div>
              </div>
              <div v-else class="home-empty">
                <span class="home-empty-line" />
                <span>{{ text.emptyQueue }}</span>
                <span class="home-empty-line" />
              </div>
            </div>
          </article>
          <article class="screen-panel screen-panel-side home-panel-feed">
            <div class="screen-panel-head">
              <div>
                <div class="screen-panel-title">{{ text.feedTitle }}</div>
                <div class="screen-panel-sub">{{ text.feedSub }}</div>
              </div>
            </div>
            <div class="screen-panel-body home-feed-wrap screen-panel-scroll">
              <table v-if="liveFeed.length" class="screen-scroll-table">
                <thead>
                  <tr>
                    <th>{{ text.thTime }}</th>
                    <th>{{ text.thType }}</th>
                    <th>{{ text.thPhone }}</th>
                    <th>{{ text.thStatus }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in liveFeed" :key="row.id">
                    <td>{{ row.time }}</td>
                    <td>{{ row.type }}</td>
                    <td>{{ row.phone }}</td>
                    <td><span class="screen-tag" :class="row.tagClass">{{ row.status }}</span></td>
                  </tr>
                </tbody>
              </table>
              <div v-else class="home-empty">
                <span class="home-empty-line" />
                <span>{{ text.emptyFeed }}</span>
                <span class="home-empty-line" />
              </div>
            </div>
          </article>
        </div>
      </div>
    </div>
  </ScreenShell>
</template>

<script setup lang="ts">
import * as echarts from 'echarts';
import { getHomeScreenDashboard, type HomeScreenDashboard } from '@/api/screen/home';
import ScreenShell from '../components/ScreenShell.vue';
import { homeText as text } from '../constants/text';
import { buildAreaStyle, screenAxisStyle, screenGrid, screenLegend, screenTooltip } from '../utils/chart-theme';
import {
  createHomeAgentSummary,
  createHomeHeroCore,
  createHomeKpis,
  createHomeLiveFeed,
  createHomeQueueRanking,
  createHomeSkillGroups,
  createHomeTrendHours,
  type HomeKpi,
  type HomeLiveFeedItem
} from '../mock/home';

defineOptions({ name: 'ScreenHome' });

const kpis = ref<HomeKpi[]>(createHomeKpis());
const heroCore = ref(createHomeHeroCore());
const queueRanking = ref(createHomeQueueRanking());
const liveFeed = ref<HomeLiveFeedItem[]>(createHomeLiveFeed());
const agentSummary = ref(createHomeAgentSummary());
const trendHours = ref(createHomeTrendHours());
const skillGroups = ref(createHomeSkillGroups());

const trendChartRef = ref<HTMLDivElement>();
const skillChartRef = ref<HTMLDivElement>();

let trendChart: echarts.ECharts | undefined;
let skillChart: echarts.ECharts | undefined;
let refreshTimer: number | undefined;
const liveDataOk = ref(false);

const RING_R = 52;
const ringLength = 2 * Math.PI * RING_R;
const displayAnswerRate = computed(() => Math.round(Number(heroCore.value.answerRate) || 0));
const ringOffset = computed(() => ringLength * (1 - Math.min(100, Math.max(0, displayAnswerRate.value)) / 100));

const agentBars = computed(() => {
  const items = agentSummary.value.items || [];
  const idle = Number(items[0]?.value || 0);
  const talking = Number(items[1]?.value || 0);
  const wrap = Number(items[2]?.value || 0);
  const away = Number(items[3]?.value || 0);
  return [
    { label: text.agentIdle, value: idle, color: '#34d399' },
    { label: text.agentBusy, value: talking + wrap, color: '#38bdf8' },
    { label: text.agentOffline, value: away, color: '#fbbf24' }
  ];
});

const ensureChart = (el: HTMLDivElement | undefined, chart?: echarts.ECharts) => {
  if (!el) return undefined;
  if (chart && !chart.isDisposed()) return chart;
  return echarts.init(el);
};

const renderTrendChart = () => {
  trendChart = ensureChart(trendChartRef.value, trendChart);
  if (!trendChart) return;

  const inboundData = trendHours.value.map((item) => item.inbound);
  let peakIndex = 0;
  let peakValue = inboundData[0] || 0;
  inboundData.forEach((value, index) => {
    if (value > peakValue) {
      peakValue = value;
      peakIndex = index;
    }
  });

  trendChart.setOption(
    {
      color: ['#2ecbff', '#9b7bff', '#3dd6a5'],
      tooltip: screenTooltip,
      legend: screenLegend,
      grid: screenGrid,
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: trendHours.value.map((item) => item.hour),
        ...screenAxisStyle
      },
      yAxis: { type: 'value', minInterval: 1, ...screenAxisStyle },
      series: [
        {
          name: text.chartInbound,
          type: 'line',
          smooth: true,
          showSymbol: true,
          symbolSize: (_: number, params: { dataIndex: number }) => (params.dataIndex === peakIndex ? 8 : 0),
          markPoint:
            peakValue > 0
              ? {
                  data: [{ name: text.peakMark, coord: [trendHours.value[peakIndex]?.hour, peakValue], value: peakValue }],
                  label: { formatter: '{b}', color: '#eaf6ff', fontSize: 10 },
                  itemStyle: { color: '#2ecbff' }
                }
              : undefined,
          lineStyle: { width: 2, shadowColor: 'rgba(46, 203, 255, 0.35)', shadowBlur: 8 },
          areaStyle: buildAreaStyle('#2ecbff'),
          data: inboundData
        },
        {
          name: text.chartOutbound,
          type: 'line',
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 2 },
          areaStyle: buildAreaStyle('#9b7bff'),
          data: trendHours.value.map((item) => item.outbound)
        },
        {
          name: text.chartAnswered,
          type: 'line',
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 3, shadowColor: 'rgba(61, 214, 165, 0.4)', shadowBlur: 8 },
          areaStyle: buildAreaStyle('#34d399'),
          data: trendHours.value.map((item) => item.answered)
        }
      ]
    },
    { notMerge: true }
  );
};

const renderSkillChart = () => {
  if (!skillGroups.value.length) {
    skillChart?.clear();
    return;
  }
  skillChart = ensureChart(skillChartRef.value, skillChart);
  if (!skillChart) return;

  const names = skillGroups.value.map((item) => item.name);
  const rates = skillGroups.value.map((item) => Math.round(Number(item.rate) || 0));

  skillChart.clear();
  skillChart.setOption(
    {
      color: ['#2ecbff'],
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        ...screenTooltip
      },
      grid: { ...screenGrid, top: 8, right: 44 },
      xAxis: {
        type: 'value',
        max: 100,
        axisLabel: { formatter: '{value}%', color: 'rgba(110,160,195,0.72)', fontSize: 11 },
        splitLine: { lineStyle: { color: 'rgba(40, 100, 160, 0.1)', type: 'dashed' } },
        axisLine: { show: false }
      },
      yAxis: {
        type: 'category',
        data: names,
        axisLabel: { color: '#9ec0d8', fontSize: 11 },
        axisTick: { show: false },
        axisLine: { show: false }
      },
      series: [
        {
          type: 'bar',
          barWidth: 11,
          data: rates,
          itemStyle: {
            borderRadius: [0, 0, 0, 0],
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: '#0d4a9a' },
              { offset: 1, color: '#2ecbff' }
            ]),
            shadowColor: 'rgba(46, 203, 255, 0.3)',
            shadowBlur: 8
          },
          label: {
            show: true,
            position: 'right',
            color: '#c8e4f5',
            fontSize: 11,
            formatter: (params: { value: number }) => `${params.value}%`
          }
        }
      ]
    },
    { notMerge: true }
  );
};

const renderCharts = () => {
  renderTrendChart();
  renderSkillChart();
};

const applyMock = (randomize = false) => {
  kpis.value = createHomeKpis(randomize);
  heroCore.value = createHomeHeroCore(randomize);
  queueRanking.value = createHomeQueueRanking(randomize);
  liveFeed.value = createHomeLiveFeed(randomize);
  agentSummary.value = createHomeAgentSummary(randomize);
  trendHours.value = createHomeTrendHours(randomize);
  skillGroups.value = createHomeSkillGroups(randomize);
};

const applyDashboard = (data: HomeScreenDashboard) => {
  kpis.value = (data.kpis || []).map((item) => ({
    label: item.label,
    value: item.value,
    extra: item.extra,
    tone: item.tone === 'is-up' || item.tone === 'is-down' ? item.tone : undefined
  }));
  const hero = data.heroCore || createHomeHeroCore();
  heroCore.value = {
    inbound: String(hero.inbound ?? '0'),
    inboundExtra: hero.inboundExtra || '',
    inboundTone: hero.inboundTone === 'is-up' || hero.inboundTone === 'is-down' ? hero.inboundTone : undefined,
    answerRate: Math.round(Number(hero.answerRate ?? 0))
  };
  agentSummary.value = data.agentSummary?.items?.length
    ? {
        total: data.agentSummary.total || data.agentSummary.items.reduce((s, i) => s + i.value, 0),
        items: data.agentSummary.items
      }
    : { total: 0, items: [] };
  queueRanking.value = Array.isArray(data.queueRanking) ? data.queueRanking : [];
  skillGroups.value = (data.skillGroups || []).map((item) => ({
    name: item.name,
    rate: Math.round(Number(item.rate) || 0)
  }));
  trendHours.value = data.trendHours?.length ? data.trendHours : createHomeTrendHours();
  liveFeed.value = Array.isArray(data.liveFeed) ? data.liveFeed : [];
};

const loadDashboard = async () => {
  try {
    const res = await getHomeScreenDashboard();
    const payload = (res as any)?.data ?? res;
    if (!payload || typeof payload !== 'object') {
      throw new Error('empty dashboard');
    }
    applyDashboard(payload as HomeScreenDashboard);
    liveDataOk.value = true;
    nextTick(renderCharts);
  } catch {
    if (!liveDataOk.value) {
      applyMock(false);
      nextTick(renderCharts);
    }
  }
};

const handleResize = () => {
  trendChart?.resize();
  skillChart?.resize();
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
  trendChart?.dispose();
  skillChart?.dispose();
});
</script>

<style scoped lang="scss">
@import '../styles/screen-common.scss';
@import '../styles/screen-themes.scss';

.home-page {
  gap: 8px;
}

.home-page :deep(.screen-panel-sub) {
  display: none;
}

.home-page :deep(.screen-panel-head) {
  padding-bottom: 4px;
}

.home-cols {
  flex: 1;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  align-items: stretch;
}

.home-col-side,
.home-col-center {
  min-height: 0;
  overflow: hidden;
  gap: 10px;
}

.home-panel-trend,
.home-panel-skill,
.home-panel-queue,
.home-panel-feed {
  flex: 1 1 0;
  min-height: 0;
  overflow: hidden;
}

/* 左右上下块比例对齐，避免一边上头大下头小、另一边相反 */
.home-panel-trend,
.home-panel-queue {
  flex: 1.55;
}

.home-panel-skill,
.home-panel-feed {
  flex: 1;
}

.home-hero {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  border-color: rgba(46, 203, 255, 0.3);
  background:
    radial-gradient(ellipse 78% 58% at 50% 36%, rgba(0, 150, 220, 0.18), transparent 64%),
    linear-gradient(180deg, rgba(4, 36, 72, 0.48) 0%, rgba(2, 14, 34, 0.92) 100%);
}

.home-hero-body {
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  height: 100%;
  min-height: 0;
  padding: 12px 16px 14px !important;
  box-sizing: border-box;
  gap: 12px;
}

.home-hero-main {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: clamp(16px, 2.4vw, 28px);
  min-height: 0;
  overflow: hidden;
}

.home-hero-glow {
  position: absolute;
  left: 50%;
  top: 46%;
  width: min(92%, 420px);
  height: min(76%, 240px);
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background:
    radial-gradient(ellipse at center, rgba(46, 203, 255, 0.16), transparent 68%),
    radial-gradient(ellipse at 50% 80%, rgba(0, 80, 160, 0.2), transparent 70%);
  pointer-events: none;
}

.home-hero-floor {
  position: absolute;
  left: 50%;
  bottom: 6%;
  width: min(78%, 340px);
  height: 24px;
  transform: translateX(-50%);
  border-radius: 50%;
  background: radial-gradient(ellipse at center, rgba(46, 203, 255, 0.2), transparent 72%);
  filter: blur(1px);
  pointer-events: none;
}

.home-rate-stage {
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  width: clamp(140px, 34%, 200px);
  aspect-ratio: 1;
}

.home-orbit {
  position: absolute;
  inset: 0;
  pointer-events: none;

  i {
    position: absolute;
    inset: 0;
    border: 1px solid rgba(46, 203, 255, 0.14);
    border-radius: 50%;
  }

  i:nth-child(1) {
    inset: 2%;
    border-style: dashed;
    animation: home-orbit-spin 18s linear infinite;
  }

  i:nth-child(2) {
    inset: -6%;
    opacity: 0.55;
    border-color: rgba(46, 203, 255, 0.1);
  }
}

.home-rate-wrap {
  position: relative;
  z-index: 1;
  width: 78%;
  aspect-ratio: 1;
  filter: drop-shadow(0 0 16px rgba(46, 203, 255, 0.32));
  animation: home-ring-pulse 3.6s ease-in-out infinite;
}

.home-rate-svg {
  display: block;
  width: 100%;
  height: 100%;
}

.home-rate-track,
.home-rate-progress {
  fill: none;
  stroke-width: 9;
  stroke-linecap: round;
}

.home-rate-track {
  stroke: rgba(46, 203, 255, 0.16);
}

.home-rate-progress {
  stroke: #2ecbff;
  transition: stroke-dashoffset 0.8s ease;
}

.home-rate-hole {
  position: absolute;
  inset: 18%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 40%, rgba(20, 60, 100, 0.55), rgba(4, 16, 36, 0.92));
  text-align: center;
}

.home-rate-value {
  color: #eaf6ff;
  font-size: clamp(28px, 3vw, 40px);
  font-weight: 700;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.home-rate-label {
  margin-top: 6px;
  color: rgba(140, 190, 220, 0.78);
  font-size: 12px;
  letter-spacing: 1px;
}

.home-hero-copy {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  max-width: 240px;
}

.home-hero-kicker {
  color: rgba(140, 190, 220, 0.82);
  font-size: 13px;
  letter-spacing: 1px;
}

.home-hero-inbound {
  color: #eaf6ff;
  font-size: clamp(48px, 5.6vw, 76px);
  font-weight: 700;
  line-height: 0.95;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 0 24px rgba(46, 203, 255, 0.28);
}

.home-hero-extra {
  color: rgba(140, 190, 220, 0.78);
  font-size: 13px;

  &.is-up {
    color: #3dd6a5;
  }

  &.is-down {
    color: #ff7a6e;
  }
}

.home-target-row {
  display: grid;
  gap: 6px;
  margin-top: 6px;
  color: rgba(120, 170, 200, 0.72);
  font-size: 11px;
  letter-spacing: 0.5px;
}

.home-target-track {
  position: relative;
  height: 6px;
  overflow: hidden;
  border: 1px solid rgba(46, 203, 255, 0.2);
  background: rgba(4, 24, 52, 0.65);
}

.home-target-fill {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #0d6a9a, #2ecbff);
  transition: width 0.8s ease;
}

.home-target-mark {
  position: absolute;
  top: -3px;
  bottom: -3px;
  left: 85%;
  width: 2px;
  background: rgba(255, 184, 77, 0.9);
  box-shadow: 0 0 8px rgba(255, 184, 77, 0.55);
}

.home-agent-strip {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
  padding-top: 4px;
  border-top: 1px solid rgba(46, 203, 255, 0.14);
}

.home-agent-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  color: rgba(140, 190, 220, 0.82);
  font-size: 12px;
  letter-spacing: 0.5px;

  strong {
    color: rgba(200, 230, 250, 0.9);
    font-weight: 600;
  }
}

.home-agent-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border: 1px solid rgba(46, 203, 255, 0.16);
  background: linear-gradient(180deg, rgba(8, 36, 68, 0.5), rgba(4, 18, 40, 0.4));
}

.home-agent-item {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding: 14px 16px;

  &:not(:last-child) {
    border-right: 1px solid rgba(46, 203, 255, 0.12);
  }
}

.home-agent-dot {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  box-shadow: 0 0 8px currentColor;
}

.home-agent-name {
  color: rgba(140, 180, 210, 0.85);
  font-size: 13px;
  white-space: nowrap;
}

.home-agent-num {
  margin-left: auto;
  color: #eaf6ff;
  font-size: 22px;
  font-weight: 700;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.home-feed-wrap {
  min-height: 0;
}

.home-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  height: 100%;
  color: rgba(120, 170, 200, 0.5);
  font-size: 12px;
  letter-spacing: 1px;
}

.home-empty-line {
  width: 28px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(46, 203, 255, 0.35), transparent);
}

@keyframes home-ring-pulse {
  0%,
  100% {
    filter: drop-shadow(0 0 10px rgba(46, 203, 255, 0.2));
  }
  50% {
    filter: drop-shadow(0 0 18px rgba(46, 203, 255, 0.42));
  }
}

@keyframes home-orbit-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1360px) {
  .home-hero-main {
    gap: 14px;
  }

  .home-rate-stage {
    width: clamp(140px, 36%, 180px);
  }

  .home-agent-item {
    padding: 12px 12px;
  }

  .home-agent-num {
    font-size: 20px;
  }
}
</style>
