<template>
  <ScreenShell
    theme="ops"
    :title="text.title"
    subtitle="CALL CENTER OPERATIONS DASHBOARD"
    :footer-text="text.footer"
    :badge-tone="liveDataOk ? 'live' : loadFailed ? 'demo' : 'loading'"
    :switch-links="[{ label: text.switchAi, path: '/screen/ai' }]"
  >
    <div
      class="screen-page home-page theme-ops"
      :class="{ 'is-bootstrapping': isBootstrapping }"
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
          <article class="screen-panel screen-panel-side home-panel-ticket">
            <div class="screen-panel-head">
              <div>
                <div class="screen-panel-title">{{ text.ticketTitle }}</div>
                <div class="screen-panel-sub">{{ text.ticketSub }}</div>
              </div>
              <strong v-if="!isBootstrapping && hasTicketData" class="home-panel-meta">
                {{ text.ticketPending }} {{ ticketPendingTotal }}
              </strong>
            </div>
            <div class="screen-panel-body">
              <div v-if="isBootstrapping" class="screen-skel-panel">
                <span class="screen-skel-line is-long" />
                <span class="screen-skel-line is-mid" />
                <span class="screen-skel-line is-short" />
              </div>
              <div v-else-if="hasTicketData" class="home-ticket-list">
                <div v-for="item in ticketBars" :key="item.key" class="home-ticket-row">
                  <div class="home-ticket-head">
                    <span class="home-ticket-dot" :style="{ background: item.color }" />
                    <span class="home-ticket-name">{{ item.label }}</span>
                    <strong class="home-ticket-num">{{ item.value }}</strong>
                  </div>
                  <div class="home-ticket-track">
                    <span :style="{ width: item.barWidth, background: item.color }" />
                  </div>
                </div>
              </div>
              <div v-else class="home-empty">
                <span class="home-empty-line" />
                <span>{{ text.emptyTicket }}</span>
                <span class="home-empty-line" />
              </div>
            </div>
          </article>
        </div>

        <div class="screen-col home-col-center">
          <article class="screen-panel screen-panel-side home-hero">
            <div class="home-hero-body">
              <div class="home-hero-main">
                <ScreenHeroOrb
                  theme="ops"
                  :percent="displayAnswerRate"
                  :value-text="`${isBootstrapping ? '00' : displayAnswerRate}%`"
                  :label="text.heroRate"
                  :sub="isBootstrapping ? '----' : text.heroRateSub"
                  :satellites="heroSatellites"
                />
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
          <article class="screen-panel screen-panel-side home-panel-customer">
            <div class="screen-panel-head">
              <div>
                <div class="screen-panel-title">{{ text.customerTitle }}</div>
                <div class="screen-panel-sub">{{ text.customerSub }}</div>
              </div>
            </div>
            <div class="screen-panel-body home-customer-body">
              <div v-if="isBootstrapping" class="screen-skel-panel">
                <span class="screen-skel-line is-long" />
                <span class="screen-skel-line is-mid" />
                <span class="screen-skel-line is-long" />
                <span class="screen-skel-line is-short" />
              </div>
              <template v-else-if="hasCustomerData">
                <div class="home-customer-stats">
                  <div v-for="item in customerStatCards" :key="item.label" class="home-customer-stat">
                    <span class="home-customer-stat-label">{{ item.label }}</span>
                    <strong class="home-customer-stat-value">{{ item.value }}</strong>
                  </div>
                </div>
                <div v-if="customerRecent.length" class="home-customer-recent">
                  <div class="home-customer-recent-title">{{ text.customerRecent }}</div>
                  <div class="screen-rank-list home-customer-list">
                    <div v-for="(item, index) in customerRecent" :key="item.id" class="screen-rank-item" :class="{ 'is-top': index < 3 }">
                      <span class="screen-rank-no">{{ index + 1 }}</span>
                      <span class="screen-rank-name" :title="item.name">{{ item.name || '-' }}</span>
                      <span class="screen-rank-value home-customer-phone">{{ item.phone || '-' }}</span>
                      <span class="home-customer-time">{{ item.time || '-' }}</span>
                    </div>
                  </div>
                </div>
              </template>
              <div v-else class="home-empty">
                <span class="home-empty-line" />
                <span>{{ text.emptyCustomer }}</span>
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
  type HomeScreenCustomerRecent,
  type HomeScreenCustomerSummary,
  type HomeScreenDashboard,
  type HomeScreenFeedItem,
  type HomeScreenHeroCore,
  type HomeScreenKpi,
  type HomeScreenTicketSummary,
  type HomeScreenTrendPoint
} from '@/api/screen/home';
import ScreenShell from '../components/ScreenShell.vue';
import ScreenHeroOrb from '../components/ScreenHeroOrb.vue';
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

const emptyTicketSummary = (): HomeScreenTicketSummary => ({
  open: 0,
  processing: 0,
  resolved: 0,
  closed: 0
});

const emptyCustomerSummary = (): HomeScreenCustomerSummary => ({
  todayNew: 0,
  total: 0,
  unassigned: 0,
  recent: []
});

const kpis = ref<HomeScreenKpi[]>(emptyKpis());
const heroCore = ref(emptyHeroCore());
const liveFeed = ref<HomeScreenFeedItem[]>([]);
const agentSummary = ref(emptyAgentSummary());
const trendHours = ref(emptyTrendHours());
const ticketSummary = ref<HomeScreenTicketSummary>(emptyTicketSummary());
const customerSummary = ref<HomeScreenCustomerSummary>(emptyCustomerSummary());
const ticketSummaryReady = ref(false);
const customerSummaryReady = ref(false);

const displayKpis = computed(() => {
  const base = emptyKpis();
  const current = kpis.value || [];
  return base.map((item, index) => ({
    ...item,
    ...(current[index] || {})
  }));
});

const trendChartRef = ref<HTMLDivElement>();

let trendChart: echarts.ECharts | undefined;
let refreshTimer: number | undefined;
const liveDataOk = ref(false);
const loadFailed = ref(false);
const chartsReady = ref(false);
const isBootstrapping = computed(() => !liveDataOk.value && !loadFailed.value);

const displayAnswerRate = computed(() => Math.round(Number(heroCore.value.answerRate) || 0));

const heroSatellites = computed(() => [
  {
    label: text.heroInbound,
    value: isBootstrapping.value ? '00' : String(heroCore.value.inbound || '0')
  },
  {
    label: text.heroOnline,
    value: isBootstrapping.value ? '00' : String(displayKpis.value[0]?.value ?? '0')
  },
  {
    label: text.heroQueue,
    value: isBootstrapping.value ? '00' : String(displayKpis.value[1]?.value ?? '0')
  },
  {
    label: text.heroTarget,
    value: '85%'
  }
]);

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

const ticketPendingTotal = computed(
  () => Number(ticketSummary.value.open || 0) + Number(ticketSummary.value.processing || 0)
);

const hasTicketData = computed(() => ticketSummaryReady.value);

const ticketBars = computed(() => {
  const open = Math.max(0, Math.round(Number(ticketSummary.value.open) || 0));
  const processing = Math.max(0, Math.round(Number(ticketSummary.value.processing) || 0));
  const resolved = Math.max(0, Math.round(Number(ticketSummary.value.resolved) || 0));
  const closed = Math.max(0, Math.round(Number(ticketSummary.value.closed) || 0));
  const maxVal = Math.max(1, open, processing, resolved, closed);
  const toWidth = (value: number) => `${Math.max(value > 0 ? 8 : 0, Math.round((value / maxVal) * 100))}%`;
  return [
    { key: 'open', label: text.ticketOpen, value: open, color: '#ffb84d', barWidth: toWidth(open) },
    { key: 'processing', label: text.ticketProcessing, value: processing, color: '#2ecbff', barWidth: toWidth(processing) },
    { key: 'resolved', label: text.ticketResolved, value: resolved, color: '#3dd6a5', barWidth: toWidth(resolved) },
    { key: 'closed', label: text.ticketClosed, value: closed, color: '#6aa8ff', barWidth: toWidth(closed) }
  ];
});

const hasCustomerData = computed(() => customerSummaryReady.value);

const customerStatCards = computed(() => [
  { label: text.customerTodayNew, value: Math.max(0, Math.round(Number(customerSummary.value.todayNew) || 0)) },
  { label: text.customerTotal, value: Math.max(0, Math.round(Number(customerSummary.value.total) || 0)) },
  { label: text.customerUnassigned, value: Math.max(0, Math.round(Number(customerSummary.value.unassigned) || 0)) }
]);

const customerRecent = computed((): HomeScreenCustomerRecent[] =>
  Array.isArray(customerSummary.value.recent) ? customerSummary.value.recent.slice(0, 6) : []
);

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
      animation: false,
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
    { lazyUpdate: true }
  );
};

const renderCharts = () => {
  renderTrendChart();
};

const normalizeTicketSummary = (raw?: HomeScreenTicketSummary | null): HomeScreenTicketSummary | null => {
  if (!raw || typeof raw !== 'object') return null;
  return {
    open: Math.max(0, Math.round(Number(raw.open) || 0)),
    processing: Math.max(0, Math.round(Number(raw.processing) || 0)),
    resolved: Math.max(0, Math.round(Number(raw.resolved) || 0)),
    closed: Math.max(0, Math.round(Number(raw.closed) || 0))
  };
};

const normalizeCustomerSummary = (raw?: HomeScreenCustomerSummary | null): HomeScreenCustomerSummary | null => {
  if (!raw || typeof raw !== 'object') return null;
  const recent = Array.isArray(raw.recent)
    ? raw.recent.map((item, index) => ({
        id: String(item?.id ?? `customer-${index}`),
        name: String(item?.name ?? ''),
        phone: String(item?.phone ?? ''),
        time: String(item?.time ?? '')
      }))
    : [];
  return {
    todayNew: Math.max(0, Math.round(Number(raw.todayNew) || 0)),
    total: Math.max(0, Math.round(Number(raw.total) || 0)),
    unassigned: Math.max(0, Math.round(Number(raw.unassigned) || 0)),
    recent
  };
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
  trendHours.value = data.trendHours?.length ? data.trendHours : emptyTrendHours();
  liveFeed.value = Array.isArray(data.liveFeed) ? data.liveFeed : [];

  const tickets = normalizeTicketSummary(data.ticketSummary);
  ticketSummaryReady.value = !!tickets;
  ticketSummary.value = tickets || emptyTicketSummary();

  const customers = normalizeCustomerSummary(data.customerSummary);
  customerSummaryReady.value = !!customers;
  customerSummary.value = customers || emptyCustomerSummary();
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
    loadFailed.value = false;
    nextTick(() => {
      renderCharts();
      if (!chartsReady.value) {
        chartsReady.value = true;
        requestAnimationFrame(handleResize);
      }
    });
  } catch {
    // 轮询失败时保留上一帧；仅首次失败进入异常态，不清成误导性的 0
    if (!liveDataOk.value) {
      loadFailed.value = true;
      nextTick(() => {
        renderCharts();
        if (!chartsReady.value) {
          chartsReady.value = true;
          requestAnimationFrame(handleResize);
        }
      });
    }
  }
};

const handleResize = () => {
  trendChart?.resize();
};

onMounted(() => {
  window.addEventListener('resize', handleResize);
  loadDashboard();
  refreshTimer = window.setInterval(loadDashboard, 15000);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  if (refreshTimer) window.clearInterval(refreshTimer);
  trendChart?.dispose();
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
  min-height: 56px;
}

.home-page :deep(.screen-kpi-value),
.home-agent-num,
.home-ticket-num,
.home-customer-stat-value {
  font-variant-numeric: tabular-nums;
}

.home-page :deep(.screen-panel-sub) {
  display: none;
}

.home-page :deep(.screen-panel-head) {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  padding-bottom: 4px;
}

.home-panel-meta {
  flex-shrink: 0;
  color: rgba(200, 230, 250, 0.88);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.4px;
  white-space: nowrap;
}

.home-cols {
  flex: 1;
  grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.16fr) minmax(0, 0.92fr);
  gap: 8px;
  align-items: stretch;
}

.home-col-side,
.home-col-center {
  min-height: 0;
  overflow: hidden;
  gap: 10px;
}

.home-panel-trend,
.home-panel-ticket,
.home-panel-customer,
.home-panel-feed {
  flex: 1 1 0;
  min-height: 0;
  overflow: hidden;
}

/* 左右上下块比例对齐，避免一边上头大下头小、另一边相反 */
.home-panel-trend,
.home-panel-customer {
  flex: 1.55;
}

.home-panel-ticket,
.home-panel-feed {
  flex: 1;
}

.home-ticket-list {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 10px;
  height: 100%;
  min-height: 0;
  padding: 4px 2px;
  box-sizing: border-box;
}

.home-ticket-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.home-ticket-head {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.home-ticket-dot {
  flex-shrink: 0;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  box-shadow: 0 0 8px currentColor;
}

.home-ticket-name {
  color: rgba(140, 180, 210, 0.88);
  font-size: 12px;
  white-space: nowrap;
}

.home-ticket-num {
  margin-left: auto;
  color: #eaf6ff;
  font-size: 16px;
  font-weight: 700;
  line-height: 1;
}

.home-ticket-track {
  height: 4px;
  overflow: hidden;
  background: rgba(0, 50, 100, 0.45);
  border-radius: 2px;

  span {
    display: block;
    height: 100%;
    border-radius: 2px;
    box-shadow: 0 0 10px rgba(0, 210, 255, 0.35);
    transition: width 0.45s ease;
  }
}

.home-customer-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
}

.home-customer-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border: 1px solid rgba(46, 203, 255, 0.2);
  background:
    linear-gradient(180deg, rgba(12, 42, 76, 0.55), rgba(4, 18, 40, 0.45));
  box-shadow: inset 0 1px 0 rgba(140, 220, 255, 0.06);
  flex-shrink: 0;
}

.home-customer-stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  padding: 8px 10px;

  &:not(:last-child) {
    border-right: 1px solid rgba(46, 203, 255, 0.12);
  }
}

.home-customer-stat-label {
  color: rgba(140, 180, 210, 0.78);
  font-size: 11px;
  letter-spacing: 0.4px;
  white-space: nowrap;
}

.home-customer-stat-value {
  color: #eaf6ff;
  font-size: 20px;
  font-weight: 700;
  line-height: 1;
}

.home-customer-recent {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 0;
  flex: 1;
}

.home-customer-recent-title {
  color: rgba(140, 190, 220, 0.75);
  font-size: 11px;
  letter-spacing: 0.6px;
  flex-shrink: 0;
}

.home-customer-list {
  min-height: 0;
  overflow: auto;
}

.home-customer-list .screen-rank-item {
  grid-template-columns: 22px minmax(0, 1fr) auto auto;
  gap: 6px 8px;
}

.home-customer-list .screen-rank-bar {
  display: none;
}

.home-customer-phone {
  color: rgba(160, 210, 235, 0.85) !important;
  font-weight: 500 !important;
}

.home-customer-time {
  color: rgba(110, 160, 195, 0.72);
  font-size: 11px;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.home-hero {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.home-hero-body {
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  height: 100%;
  min-height: 0;
  padding: 4px 6px 8px !important;
  box-sizing: border-box;
  gap: 4px;
}

.home-hero-main {
  position: relative;
  min-height: 0;
  overflow: hidden;
}

.home-agent-strip {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex-shrink: 0;
  padding: 6px 2px 0;
  border-top: 1px solid rgba(46, 203, 255, 0.16);
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
  border: 1px solid rgba(46, 203, 255, 0.2);
  background:
    linear-gradient(180deg, rgba(12, 42, 76, 0.55), rgba(4, 18, 40, 0.45));
  box-shadow: inset 0 1px 0 rgba(140, 220, 255, 0.06);
}

.home-agent-item {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  padding: 5px 10px;

  &:not(:last-child) {
    border-right: 1px solid rgba(46, 203, 255, 0.12);
  }
}

.home-agent-dot {
  flex-shrink: 0;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  box-shadow: 0 0 8px currentColor;
}

.home-agent-name {
  color: rgba(140, 180, 210, 0.85);
  font-size: 12px;
  white-space: nowrap;
}

.home-agent-num {
  margin-left: auto;
  color: #eaf6ff;
  font-size: 18px;
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

@media (max-width: 1360px) {
  .home-agent-item {
    padding: 12px 12px;
  }

  .home-agent-num {
    font-size: 20px;
  }
}
</style>
