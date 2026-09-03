<template>
  <ScreenShell
    :title="text.title"
    subtitle="CALL CENTER OPERATIONS DASHBOARD"
    :footer-text="text.footer"
    :badge-tone="liveDataOk ? 'live' : loadFailed ? 'demo' : 'loading'"
    :switch-links="[{ label: text.switchAi, path: '/screen/ai' }]"
  >
    <div
      class="screen-page home-page theme-ops"
      :class="{ 'is-bootstrapping': isBootstrapping, 'is-revealing': isRevealing }"
    >
      <section class="home-kpis screen-kpi-grid screen-kpi-grid-compact screen-kpi-grid-4">
        <article v-for="(item, index) in displayKpis" :key="`home-kpi-${index}`" class="screen-kpi-card" :class="`is-tone-${index}`">
          <div class="screen-kpi-label">{{ item.label }}</div>
          <div class="screen-kpi-value">{{ isBootstrapping ? '00' : item.value }}</div>
          <div class="screen-kpi-extra" :class="item.tone">{{ isBootstrapping ? '----' : item.extra }}</div>
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
            <div class="screen-panel-body home-skill-body">
              <div ref="skillChartRef" class="screen-chart" :class="{ 'is-hidden': isBootstrapping || !skillGroups.length }" />
              <div v-if="isBootstrapping" class="screen-skel-panel">
                <span class="screen-skel-line is-long" />
                <span class="screen-skel-line is-mid" />
                <span class="screen-skel-line is-short" />
              </div>
              <div v-else-if="!skillGroups.length" class="home-empty">
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
                      <div class="home-rate-value">{{ isBootstrapping ? '00' : displayAnswerRate }}%</div>
                      <div class="home-rate-label">{{ text.heroRate }}</div>
                    </div>
                  </div>
                </div>
                <div class="home-hero-copy">
                  <div class="home-hero-kicker">{{ text.heroInbound }}</div>
                  <div class="home-hero-inbound">{{ isBootstrapping ? '00' : heroCore.inbound }}</div>
                  <div v-if="!isBootstrapping && heroCore.inboundExtra" class="home-hero-extra" :class="heroCore.inboundTone">
                    {{ heroCore.inboundExtra }}
                  </div>
                  <div v-else-if="isBootstrapping" class="home-hero-extra">----</div>
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
              <div v-if="isBootstrapping" class="screen-skel-panel">
                <span class="screen-skel-line is-long" />
                <span class="screen-skel-line is-mid" />
                <span class="screen-skel-line is-long" />
                <span class="screen-skel-line is-short" />
              </div>
              <div v-else-if="queueRanking.length" class="screen-rank-list">
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
              <div v-if="isBootstrapping" class="screen-skel-panel">
                <span class="screen-skel-line is-long" />
                <span class="screen-skel-line is-mid" />
                <span class="screen-skel-line is-long" />
                <span class="screen-skel-line is-short" />
              </div>
              <table v-else-if="liveFeed.length" class="screen-scroll-table home-feed-table">
                <thead>
                  <tr>
                    <th>{{ text.thTime }}</th>
                    <th>{{ text.thType }}</th>
                    <th>{{ text.thPhone }}</th>
                    <th>{{ text.thTarget }}</th>
                    <th>{{ text.thStatus }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in liveFeed" :key="row.id">
                    <td>{{ row.time }}</td>
                    <td>{{ row.type }}</td>
                    <td>{{ row.phone }}</td>
                    <td class="home-feed-target" :title="row.target">{{ row.target || '-' }}</td>
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
import {
  getHomeScreenDashboard,
  type HomeScreenDashboard,
  type HomeScreenFeedItem,
  type HomeScreenHeroCore,
  type HomeScreenKpi,
  type HomeScreenQueueRank,
  type HomeScreenSkillRate,
  type HomeScreenTrendPoint
} from '@/api/screen/home';
import ScreenShell from '../components/ScreenShell.vue';
import { homeText as text } from '../constants/text';
import { buildAreaStyle, screenAxisStyle, screenGrid, screenLegend, screenTooltip } from '../utils/chart-theme';

defineOptions({ name: 'ScreenHome' });

const emptyHeroCore = (): HomeScreenHeroCore => ({
  inbound: '0',
  inboundExtra: '',
  inboundTone: null,
  answerRate: 0
});

const emptyKpis = (): HomeScreenKpi[] => [
  { label: '在线坐席', value: '0', extra: '签入率 0%' },
  { label: '当前排队', value: '0', extra: '正常' },
  { label: '外呼任务', value: '0', extra: '完成率 0%' },
  { label: '留言待处理', value: '0', extra: '优先处理' }
];

const emptyTrendHours = (): HomeScreenTrendPoint[] =>
  Array.from({ length: 11 }, (_, i) => ({
    hour: `${String(8 + i).padStart(2, '0')}:00`,
    inbound: 0,
    outbound: 0,
    answered: 0
  }));

const emptyAgentSummary = () => ({
  total: 0,
  items: [
    { label: '空闲', value: 0, color: '#34d399' },
    { label: '通话中', value: 0, color: '#38bdf8' },
    { label: '话后处理', value: 0, color: '#818cf8' },
    { label: '离线', value: 0, color: '#fbbf24' }
  ]
});

const kpis = ref<HomeScreenKpi[]>(emptyKpis());
const heroCore = ref(emptyHeroCore());
const queueRanking = ref<HomeScreenQueueRank[]>([]);
const liveFeed = ref<HomeScreenFeedItem[]>([]);
const agentSummary = ref(emptyAgentSummary());
const trendHours = ref(emptyTrendHours());
const skillGroups = ref<HomeScreenSkillRate[]>([]);

const displayKpis = computed(() => {
  const base = emptyKpis();
  const current = kpis.value || [];
  return base.map((item, index) => ({
    ...item,
    ...(current[index] || {})
  }));
});

const trendChartRef = ref<HTMLDivElement>();
const skillChartRef = ref<HTMLDivElement>();

let trendChart: echarts.ECharts | undefined;
let skillChart: echarts.ECharts | undefined;
let refreshTimer: number | undefined;
const liveDataOk = ref(false);
const loadFailed = ref(false);
const hasRevealed = ref(false);
const isRevealing = ref(false);
const isBootstrapping = computed(() => !liveDataOk.value && !loadFailed.value);
let revealTimer: number | undefined;

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

const renderTrendChart = (withAnimation = false) => {
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
      animation: withAnimation,
      animationDuration: withAnimation ? 650 : 0,
      animationEasing: 'cubicOut',
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
      yAxis: { type: 'value', min: 0, minInterval: 1, ...screenAxisStyle },
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

const renderSkillChart = (withAnimation = false) => {
  skillChart = ensureChart(skillChartRef.value, skillChart);
  if (!skillChart) return;
  if (!skillGroups.value.length) {
    skillChart.clear();
    return;
  }

  const names = skillGroups.value.map((item) => item.name);
  const rates = skillGroups.value.map((item) => Math.round(Number(item.rate) || 0));

  skillChart.setOption(
    {
      animation: withAnimation,
      animationDuration: withAnimation ? 550 : 0,
      animationEasing: 'cubicOut',
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

const renderCharts = (withAnimation = false) => {
  renderTrendChart(withAnimation);
  renderSkillChart(withAnimation);
};

const triggerFirstReveal = () => {
  if (hasRevealed.value) return false;
  hasRevealed.value = true;
  isRevealing.value = true;
  if (revealTimer) window.clearTimeout(revealTimer);
  revealTimer = window.setTimeout(() => {
    isRevealing.value = false;
  }, 700);
  return true;
};

const applyDashboard = (data: HomeScreenDashboard) => {
  kpis.value = (data.kpis || []).length
    ? (data.kpis || []).map((item) => ({
        label: item.label,
        value: item.value,
        extra: item.extra,
        tone: item.tone === 'is-up' || item.tone === 'is-down' ? item.tone : undefined
      }))
    : emptyKpis();
  const hero = data.heroCore || emptyHeroCore();
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
    : emptyAgentSummary();
  queueRanking.value = Array.isArray(data.queueRanking) ? data.queueRanking : [];
  skillGroups.value = (data.skillGroups || []).map((item) => ({
    name: item.name,
    rate: Math.round(Number(item.rate) || 0)
  }));
  trendHours.value = data.trendHours?.length ? data.trendHours : emptyTrendHours();
  liveFeed.value = Array.isArray(data.liveFeed) ? data.liveFeed : [];
};

const loadDashboard = async () => {
  try {
    const res = await getHomeScreenDashboard();
    const payload = (res as any)?.data ?? res;
    if (!payload || typeof payload !== 'object') {
      throw new Error('empty dashboard');
    }
    const firstReveal = triggerFirstReveal();
    applyDashboard(payload as HomeScreenDashboard);
    liveDataOk.value = true;
    loadFailed.value = false;
    nextTick(() => {
      renderCharts(firstReveal);
      requestAnimationFrame(handleResize);
    });
  } catch {
    // 轮询失败时保留上一帧；仅首次失败进入异常态，不清成误导性的 0
    if (!liveDataOk.value) {
      loadFailed.value = true;
      nextTick(() => {
        renderCharts(false);
        requestAnimationFrame(handleResize);
      });
    }
  }
};

const handleResize = () => {
  trendChart?.resize();
  skillChart?.resize();
};

onMounted(() => {
  window.addEventListener('resize', handleResize);
  loadDashboard();
  refreshTimer = window.setInterval(loadDashboard, 15000);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  if (refreshTimer) window.clearInterval(refreshTimer);
  if (revealTimer) window.clearTimeout(revealTimer);
  trendChart?.dispose();
  skillChart?.dispose();
});
</script>

<style scoped lang="scss">
@use '../styles/screen-common.scss';
@use '../styles/screen-themes.scss';

.home-page {
  gap: 8px;
}

.home-kpis {
  flex: 0 0 auto;
  min-height: 68px;
}

.home-page :deep(.screen-kpi-value),
.home-agent-num,
.home-hero-inbound,
.home-rate-value {
  font-variant-numeric: tabular-nums;
}

.home-skill-body {
  position: relative;
  height: 100%;
  min-height: 0;
}

.home-skill-body .screen-chart.is-hidden {
  position: absolute;
  inset: 0;
  visibility: hidden;
  pointer-events: none;
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
    linear-gradient(180deg, rgba(4, 36, 72, 0.92) 0%, rgba(2, 14, 34, 0.98) 100%);
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

.home-feed-table th:nth-child(1),
.home-feed-table td:nth-child(1) {
  width: 18%;
  white-space: nowrap;
}

.home-feed-table th:nth-child(2),
.home-feed-table td:nth-child(2) {
  width: 12%;
  white-space: nowrap;
}

.home-feed-table th:nth-child(4),
.home-feed-table td:nth-child(4) {
  width: 16%;
}

.home-feed-table th:nth-child(5),
.home-feed-table td:nth-child(5) {
  width: 16%;
  white-space: nowrap;
}

.home-feed-target {
  max-width: 72px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
