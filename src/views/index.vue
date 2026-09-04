<template>
  <div class="dashboard">
    <section class="page-head">
      <div class="page-head-copy">
        <div class="eyebrow"><span class="live-dot"></span>{{ periodKicker }}</div>
        <h1>呼叫中心业务看板</h1>
        <p>盯住待办、客户沉淀与话务结果；现场实时请看数据大屏。</p>
      </div>
      <div class="page-head-aside">
        <div class="page-head-meta">
          <span class="date-chip">{{ currentDate }}</span>
          <el-button type="primary" size="small" :icon="Refresh" :loading="loading" @click="refreshDashboard">
            刷新
          </el-button>
        </div>
        <div class="period-filter">
          <el-radio-group v-model="periodMode" size="small" @change="handlePeriodModeChange">
            <el-radio-button value="day">按日</el-radio-button>
            <el-radio-button value="month">按月</el-radio-button>
            <el-radio-button value="year">今年</el-radio-button>
          </el-radio-group>
          <el-date-picker
            v-model="dateRange"
            class="period-range-picker"
            type="daterange"
            size="small"
            value-format="YYYY-MM-DD"
            start-placeholder="开始"
            end-placeholder="结束"
            :clearable="false"
            @change="handleDateRangeChange"
          />
        </div>
      </div>
    </section>

    <section class="metric-grid">
      <article
        v-for="item in metrics"
        :key="item.label"
        class="metric-card"
        :class="[`is-${item.tone}`, { 'is-alert': item.alert }]"
        @click="item.onClick && item.onClick()"
      >
        <div class="metric-icon" :class="item.tone">
          <el-icon><component :is="item.icon" /></el-icon>
        </div>
        <div class="metric-content">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
          <small :class="{ positive: item.positive, warn: item.alert }">{{ item.change }}</small>
        </div>
      </article>
    </section>

    <section class="main-grid">
      <article class="panel">
        <div class="panel-header">
          <div class="panel-title">
            <h2>工单概况</h2>
          </div>
          <el-button text type="primary" @click="openTicket">查看工单</el-button>
        </div>
        <div class="stat-grid">
          <div v-for="item in ticketBars" :key="item.label" class="stat-cell">
            <span class="stat-label">
              <i class="stat-dot" :style="{ background: item.color }" />
              {{ item.label }}
            </span>
            <strong>{{ item.value }}</strong>
          </div>
        </div>
      </article>

      <article class="panel">
        <div class="panel-header">
          <div class="panel-title">
            <h2>客户概况</h2>
          </div>
          <el-button text type="primary" @click="openCustomer">查看客户</el-button>
        </div>
        <div class="stat-grid">
          <div
            v-for="item in customerStats"
            :key="item.label"
            class="stat-cell"
            :class="{ 'is-click': item.clickable }"
            :role="item.clickable ? 'button' : undefined"
            :tabindex="item.clickable ? 0 : undefined"
            @click="item.clickable && openUnassignedCustomer()"
            @keydown.enter="item.clickable && openUnassignedCustomer()"
          >
            <span class="stat-label">
              <i class="stat-dot" :style="{ background: item.color }" />
              {{ item.label }}
            </span>
            <strong :class="{ 'is-warn': item.warn }">{{ item.value }}</strong>
          </div>
        </div>
      </article>
    </section>

    <section class="panel traffic-panel">
      <div class="panel-header">
        <div class="panel-title">
          <h2>话务与任务</h2>
        </div>
        <el-button text type="primary" @click="openCallRecord">通话记录</el-button>
      </div>
      <div class="traffic-strip">
        <div
          v-for="item in trafficStats"
          :key="item.label"
          class="traffic-item"
          :class="{ 'is-click': item.clickable }"
          @click="item.clickable && openVoicemail()"
        >
          <span>{{ item.label }}</span>
          <strong :class="{ 'is-warn': item.warn }">{{ item.value }}</strong>
        </div>
      </div>
    </section>

    <section class="bottom-grid">
      <article class="panel panel-fill">
        <div class="panel-header">
          <div class="panel-title">
            <h2>待办提醒</h2>
          </div>
        </div>
        <div class="todo-list">
          <div
            v-for="todo in todos"
            :key="todo.title"
            class="todo-item is-action"
            @click="handleTodo(todo)"
          >
            <span class="todo-icon" :class="todo.tone"><el-icon><component :is="todo.icon" /></el-icon></span>
            <div>
              <strong>{{ todo.title }}</strong>
              <small>{{ todo.description }}</small>
            </div>
            <el-tag size="small" :type="todo.tagType" effect="plain" round>{{ todo.count }}</el-tag>
          </div>
        </div>
      </article>

      <article class="panel panel-fill">
        <div class="panel-header">
          <div class="panel-title">
            <h2>快捷入口</h2>
          </div>
        </div>
        <div class="quick-grid">
          <button v-for="action in quickActions" :key="action.label" type="button" @click="handleQuickAction(action)">
            <span class="quick-icon" :class="action.tone"><el-icon><component :is="action.icon" /></el-icon></span>
            <div class="quick-copy">
              <strong>{{ action.label }}</strong>
              <small>{{ action.desc }}</small>
            </div>
            <el-icon class="quick-arrow"><ArrowRight /></el-icon>
          </button>
        </div>
      </article>
    </section>
  </div>
</template>

<script setup name="Index" lang="ts">
import {
  ArrowRight,
  Bell,
  DataAnalysis,
  Document,
  Phone,
  Refresh,
  Tickets,
  User,
  UserFilled
} from '@element-plus/icons-vue';
import { getHomeBusinessOverview, type HomeBusinessOverview } from '@/api/callcenter/home-overview';
import { ElMessage } from 'element-plus';
import { computed, onMounted, ref, type Component } from 'vue';
import { usePermissionStore } from '@/store/modules/permission';
import type { RouteRecordRaw } from 'vue-router';
import { getNormalPath } from '@/utils/callnexus';

type PeriodMode = 'day' | 'month' | 'year';

const router = useRouter();
const permissionStore = usePermissionStore();

const loading = ref(false);
const overview = ref<HomeBusinessOverview>();
const currentDate = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  weekday: 'long'
}).format(new Date());

const pad2 = (value: number) => String(value).padStart(2, '0');
const formatDate = (date: Date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

const today = new Date();
const todayText = formatDate(today);
const monthStartText = formatDate(new Date(today.getFullYear(), today.getMonth(), 1));
const yearStartText = `${today.getFullYear()}-01-01`;

const periodMode = ref<PeriodMode>('day');
const dateRange = ref<[string, string]>([todayText, todayText]);

const periodRange = computed(() => ({
  beginDate: dateRange.value?.[0] || todayText,
  endDate: dateRange.value?.[1] || todayText
}));

const isSingleToday = computed(
  () => periodRange.value.beginDate === todayText && periodRange.value.endDate === todayText
);

const periodPrefix = computed(() => {
  if (periodMode.value === 'year') return '今年';
  if (periodMode.value === 'month') return '本月';
  if (isSingleToday.value) return '今日';
  return '区间';
});

const periodKicker = computed(() => {
  if (periodMode.value === 'year') return '年度业务';
  if (periodMode.value === 'month') return '月度业务';
  if (isSingleToday.value) return '今日业务';
  return '区间业务';
});

const applyPeriodPreset = (mode: PeriodMode) => {
  if (mode === 'month') {
    dateRange.value = [monthStartText, todayText];
    return;
  }
  if (mode === 'year') {
    dateRange.value = [yearStartText, todayText];
    return;
  }
  dateRange.value = [todayText, todayText];
};

const syncPeriodModeByRange = () => {
  const begin = periodRange.value.beginDate;
  const end = periodRange.value.endDate;
  if (begin === yearStartText && end === todayText) {
    periodMode.value = 'year';
    return;
  }
  if (begin === monthStartText && end === todayText) {
    periodMode.value = 'month';
    return;
  }
  periodMode.value = 'day';
};

const ticketPending = computed(
  () => Number(overview.value?.ticketOpen || 0) + Number(overview.value?.ticketProcessing || 0)
);

const openCustomer = () => router.push(resolveDashboardPath('customer'));
const openTicket = () => router.push(resolveDashboardPath('ticket'));
const openCallRecord = () => router.push(resolveDashboardPath('callRecord'));
const openOutboundTask = () => router.push(resolveDashboardPath('outboundTask'));
const openUnassignedCustomer = () => {
  router.push({ path: resolveDashboardPath('customer'), query: { assignmentState: 'UNASSIGNED' } });
};
const openVoicemail = () =>
  router.push({ path: resolveDashboardPath('voicemail'), query: { status: 'UNHANDLED' } });

const customerAssigned = computed(() =>
  Math.max(0, Number(overview.value?.customerTotal || 0) - Number(overview.value?.customerUnassigned || 0))
);

const metrics = computed(() => [
  {
    label: '待办工单',
    value: ticketPending.value,
    change: `总量 ${overview.value?.ticketTotal || 0}`,
    positive: ticketPending.value === 0,
    alert: ticketPending.value > 0,
    tone: 'orange',
    icon: Tickets,
    onClick: openTicket
  },
  {
    label: '未分配客户',
    value: overview.value?.customerUnassigned || 0,
    change: `总量 ${overview.value?.customerTotal || 0}`,
    positive: (overview.value?.customerUnassigned || 0) === 0,
    alert: (overview.value?.customerUnassigned || 0) > 0,
    tone: 'purple',
    icon: UserFilled,
    onClick: openUnassignedCustomer
  },
  {
    label: `${periodPrefix.value}新增客户`,
    value: overview.value?.customerPeriodNew || 0,
    change: `客户池 ${overview.value?.customerTotal || 0}`,
    positive: (overview.value?.customerPeriodNew || 0) > 0,
    alert: false,
    tone: 'blue',
    icon: User,
    onClick: openCustomer
  },
  {
    label: `${periodPrefix.value}接通率`,
    value: `${overview.value?.answerRate || 0}%`,
    change: `呼入 ${overview.value?.inboundCount || 0} · 呼出 ${overview.value?.outboundCount || 0}`,
    positive: (overview.value?.answerRate || 0) >= 80,
    alert: false,
    tone: 'green',
    icon: Phone,
    onClick: openCallRecord
  }
]);

const ticketBars = computed(() => [
  { label: '待处理', value: Number(overview.value?.ticketOpen || 0), color: '#f59e0b' },
  { label: '处理中', value: Number(overview.value?.ticketProcessing || 0), color: '#3b82f6' },
  { label: '已解决', value: Number(overview.value?.ticketResolved || 0), color: '#10b981' },
  { label: '已关闭', value: Number(overview.value?.ticketClosed || 0), color: '#94a3b8' }
]);

const customerStats = computed(() => [
  {
    label: '客户总量',
    value: Number(overview.value?.customerTotal || 0),
    color: '#64748b',
    warn: false,
    clickable: false
  },
  {
    label: `${periodPrefix.value}新增`,
    value: Number(overview.value?.customerPeriodNew || 0),
    color: '#3b82f6',
    warn: false,
    clickable: false
  },
  {
    label: '未分配',
    value: Number(overview.value?.customerUnassigned || 0),
    color: '#f59e0b',
    warn: Number(overview.value?.customerUnassigned || 0) > 0,
    clickable: true
  },
  {
    label: '已分配',
    value: customerAssigned.value,
    color: '#10b981',
    warn: false,
    clickable: false
  }
]);

const trafficStats = computed(() => [
  { label: `${periodPrefix.value}呼入`, value: overview.value?.inboundCount || 0, warn: false, clickable: false },
  { label: `${periodPrefix.value}呼出`, value: overview.value?.outboundCount || 0, warn: false, clickable: false },
  { label: `${periodPrefix.value}接通`, value: overview.value?.answeredCount || 0, warn: false, clickable: false },
  { label: '接通率', value: `${overview.value?.answerRate || 0}%`, warn: false, clickable: false },
  {
    label: '外呼完成率',
    value: `${overview.value?.outboundCompletionRate || 0}%`,
    warn: false,
    clickable: false
  },
  {
    label: '未处理留言',
    value: overview.value?.voicemailPending || 0,
    warn: Number(overview.value?.voicemailPending || 0) > 0,
    clickable: true
  }
]);

type TodoAction = 'TICKET' | 'CUSTOMER' | 'CALL' | 'VOICEMAIL' | 'OUTBOUND';
type TodoItem = {
  title: string;
  description: string;
  count: string;
  tone: string;
  tagType: 'success' | 'warning' | 'info' | 'primary' | 'danger';
  icon: Component;
  action?: TodoAction;
};

const todos = computed<TodoItem[]>(() => [
  {
    title: '待办工单',
    description: ticketPending.value > 0 ? '有工单等待处理或跟进' : '暂无待办工单',
    count: `${ticketPending.value} 单`,
    tone: 'orange',
    tagType: ticketPending.value > 0 ? 'warning' : 'info',
    icon: Tickets,
    action: 'TICKET'
  },
  {
    title: '未分配客户',
    description: (overview.value?.customerUnassigned || 0) > 0 ? '客户资料待分配跟进' : '客户均已分配',
    count: `${overview.value?.customerUnassigned || 0} 位`,
    tone: 'purple',
    tagType: (overview.value?.customerUnassigned || 0) > 0 ? 'warning' : 'info',
    icon: UserFilled,
    action: 'CUSTOMER'
  },
  {
    title: '未处理留言',
    description: (overview.value?.voicemailPending || 0) > 0 ? '客户留言需要回访' : '暂无待处理留言',
    count: `${overview.value?.voicemailPending || 0} 条`,
    tone: 'red',
    tagType: (overview.value?.voicemailPending || 0) > 0 ? 'danger' : 'info',
    icon: Bell,
    action: 'VOICEMAIL'
  },
  {
    title: `${periodPrefix.value}呼入 / 呼出`,
    description: `接通率 ${overview.value?.answerRate || 0}%`,
    count: `${overview.value?.inboundCount || 0} / ${overview.value?.outboundCount || 0}`,
    tone: 'cyan',
    tagType: 'info',
    icon: Phone,
    action: 'CALL'
  }
]);

type DashboardLinkKey = 'customer' | 'ticket' | 'callRecord' | 'outboundTask' | 'screenHome' | 'voicemail';
type QuickAction = {
  label: string;
  desc: string;
  tone: string;
  icon: Component;
  routeKey: DashboardLinkKey;
};

type DashboardRouteTarget = {
  titles: string[];
  names: string[];
  pathEnds: string[];
  fallbacks: string[];
};

const dashboardRouteTargets: Record<DashboardLinkKey, DashboardRouteTarget> = {
  customer: {
    titles: ['客户列表', '客户', '客户管理'],
    names: ['Customer', 'customer'],
    pathEnds: ['/customer'],
    fallbacks: ['/customer', '/biz-center/customer', '/callcenter/customer']
  },
  ticket: {
    titles: ['工单列表', '工单', '工单管理'],
    names: ['Ticket', 'ticket'],
    pathEnds: ['/ticket'],
    fallbacks: ['/ticket', '/biz-center/ticket', '/callcenter/ticket']
  },
  callRecord: {
    titles: ['通话记录'],
    names: ['call-record', 'CallRecord'],
    pathEnds: ['/call-record'],
    fallbacks: ['/call-record', '/callcenter/call-record']
  },
  outboundTask: {
    titles: ['外呼任务'],
    names: ['outbound-task', 'OutboundTask'],
    pathEnds: ['/outbound-task'],
    fallbacks: ['/outbound-task', '/callcenter/outbound-task']
  },
  screenHome: {
    titles: ['首页大屏'],
    names: ['ScreenHomeMenu', 'ScreenHome'],
    pathEnds: ['/screen/home', '/data-screen/home'],
    fallbacks: ['/screen/home', '/data-screen/home']
  },
  voicemail: {
    titles: ['语音留言'],
    names: ['voicemail', 'Voicemail'],
    pathEnds: ['/voicemail'],
    fallbacks: ['/voicemail', '/callcenter/voicemail']
  }
};

const quickActions: QuickAction[] = [
  { label: '客户管理', desc: '客户资料与跟进', tone: 'blue', icon: User, routeKey: 'customer' },
  { label: '工单管理', desc: '服务闭环处理', tone: 'orange', icon: Tickets, routeKey: 'ticket' },
  { label: '通话记录', desc: '呼入呼出明细', tone: 'cyan', icon: Document, routeKey: 'callRecord' },
  { label: '外呼任务', desc: '任务进度跟踪', tone: 'green', icon: Phone, routeKey: 'outboundTask' },
  { label: '首页大屏', desc: '现场实时监控', tone: 'purple', icon: DataAnalysis, routeKey: 'screenHome' },
  { label: '未分配客户', desc: '待分配线索', tone: 'red', icon: UserFilled, routeKey: 'customer' }
];

const normalizePath = (path?: string) => {
  if (!path) return '';
  return path.startsWith('/') ? path : `/${path}`;
};

const flattenRoutes = (routes: RouteRecordRaw[], parentPath = ''): Array<RouteRecordRaw & { resolvedPath: string }> =>
  routes.flatMap((route) => {
    const currentPath = normalizePath(route.path);
    const resolvedPath =
      currentPath.startsWith(parentPath) || currentPath === '/' ? currentPath : `${parentPath}${currentPath}`;
    const current = { ...route, resolvedPath: getNormalPath(resolvedPath) };
    const nextParent = resolvedPath === '/' ? '' : resolvedPath;
    return [current, ...flattenRoutes((route.children || []) as RouteRecordRaw[], nextParent)];
  });

const isLeafPage = (route: RouteRecordRaw & { resolvedPath: string }) => {
  if (route.children && route.children.length) return false;
  const path = route.resolvedPath || '';
  if (!path || path.includes('pathMatch') || path.includes('legacy')) return false;
  const name = String(route.name || '');
  // 隐藏的办理页/详情页，不能当成列表入口
  if (name === 'TicketWorkflowForm' || name === 'CustomerDetailWorkspace') return false;
  if (route.hidden) return false;
  // 目录菜单通常没有可渲染页面组件
  return typeof route.component === 'function' || typeof route.component === 'object';
};

const isNavigablePath = (path: string) => {
  try {
    const resolved = router.resolve(path);
    if (!resolved.matched.length) return false;
    return resolved.matched.every((m) => !String(m.path || '').includes('pathMatch'));
  } catch {
    return false;
  }
};

const resolveDashboardPath = (key: DashboardLinkKey) => {
  const target = dashboardRouteTargets[key];
  const routes = flattenRoutes([
    ...permissionStore.getSidebarRoutes(),
    ...permissionStore.getRoutes()
  ]);
  const pages = routes.filter(isLeafPage);

  const byExactPath = pages.find((route) => target.pathEnds.includes(route.resolvedPath));
  if (byExactPath?.resolvedPath) return byExactPath.resolvedPath;

  const byPath = pages.find((route) =>
    target.pathEnds.some((end) => route.resolvedPath.endsWith(end))
  );
  if (byPath?.resolvedPath) return byPath.resolvedPath;

  const byName = pages.find((route) => target.names.includes(String(route.name || '')));
  if (byName?.resolvedPath) return byName.resolvedPath;

  const byTitle = pages.find((route) => target.titles.includes(String(route.meta?.title || '')));
  if (byTitle?.resolvedPath) return byTitle.resolvedPath;

  const fallback = target.fallbacks.find((path) => isNavigablePath(path));
  return fallback || target.fallbacks[0];
};

const loadDashboard = async () => {
  loading.value = true;
  try {
    const { beginDate, endDate } = periodRange.value;
    const res = await getHomeBusinessOverview({ beginDate, endDate });
    overview.value = (res as any)?.data ?? res;
  } catch (error) {
    console.warn('加载首页统计失败', error);
  } finally {
    loading.value = false;
  }
};

const handlePeriodModeChange = (mode: PeriodMode | string | number | boolean) => {
  applyPeriodPreset(String(mode || periodMode.value) as PeriodMode);
  loadDashboard();
};

const handleDateRangeChange = () => {
  syncPeriodModeByRange();
  loadDashboard();
};

const refreshDashboard = async () => {
  await loadDashboard();
  ElMessage.success('首页数据已刷新');
};

const handleTodo = (todo: TodoItem) => {
  if (todo.action === 'TICKET') openTicket();
  if (todo.action === 'CUSTOMER') openUnassignedCustomer();
  if (todo.action === 'CALL') openCallRecord();
  if (todo.action === 'VOICEMAIL') openVoicemail();
  if (todo.action === 'OUTBOUND') openOutboundTask();
};

const handleQuickAction = (action: QuickAction) => {
  if (action.label === '未分配客户') {
    openUnassignedCustomer();
    return;
  }
  const path = resolveDashboardPath(action.routeKey);
  if (path) {
    router.push(path);
    return;
  }
  ElMessage.info(`${action.label}功能将在对应业务模块开放`);
};

onMounted(() => {
  loadDashboard();
});
</script>

<style lang="scss" scoped>
.dashboard {
  --ink: #0f172a;
  --muted: #64748b;
  --line: #e7ecf3;
  --soft: #f7f8fa;
  --cell: #ffffff;
  --cell-line: #e9eef5;
  --card: #ffffff;
  --accent: #2563eb;
  --hover: #f5f8fc;
  min-height: calc(100vh - 84px);
  padding: 16px 18px 22px;
  color: var(--ink);
  background: #f5f6f8;
}

.metric-card,
.panel {
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--card);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03), 0 8px 24px rgba(15, 23, 42, 0.03);
}

.page-head {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 16px 18px;
  margin-bottom: 12px;
  overflow: hidden;
  color: #fff;
  border: 1px solid rgba(147, 197, 253, 0.45);
  border-radius: 14px;
  background:
    radial-gradient(circle at 92% -28%, rgba(186, 230, 253, 0.28), transparent 42%),
    linear-gradient(118deg, #3b82f6 0%, #4f8ef8 58%, #5b9cf0 100%);
  box-shadow: 0 6px 16px rgba(59, 130, 246, 0.12);
}

.page-head-copy {
  min-width: 0;
  flex: 1;

  h1 {
    margin: 4px 0 2px;
    font-size: 20px;
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  p {
    margin: 0;
    max-width: 480px;
    color: rgba(226, 239, 255, 0.72);
    font-size: 13px;
    line-height: 1.45;
  }
}

.page-head-aside {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
  flex-shrink: 0;
}

.page-head-meta {
  display: flex;
  align-items: center;
  gap: 10px;

  :deep(.el-button--primary) {
    height: 30px;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.28);
    color: #fff;
    background: rgba(255, 255, 255, 0.14);
  }

  :deep(.el-button--primary:hover) {
    background: rgba(255, 255, 255, 0.22);
  }
}

.date-chip {
  padding: 5px 10px;
  color: rgba(255, 255, 255, 0.95);
  font-size: 12px;
  white-space: nowrap;
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.16);
}

.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #9ff0de;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
}

.live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #5eead4;
  box-shadow: 0 0 0 0 rgba(94, 234, 212, 0.45);
  animation: live-pulse 1.8s ease-out infinite;
}

@keyframes live-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(94, 234, 212, 0.4); }
  70% { box-shadow: 0 0 0 6px rgba(94, 234, 212, 0); }
}

.period-filter {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;

  :deep(.el-radio-button__inner) {
    min-width: 52px;
    padding: 7px 12px;
    color: rgba(255, 255, 255, 0.95);
    background: rgba(255, 255, 255, 0.14);
    border-color: rgba(255, 255, 255, 0.28);
    box-shadow: none;
  }

  :deep(.el-radio-button:first-child .el-radio-button__inner) {
    border-left-color: rgba(255, 255, 255, 0.28);
  }

  :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
    color: #1d4ed8;
    background: #fff;
    border-color: #fff;
    box-shadow: none;
  }

  :deep(.el-range-editor.el-input__wrapper) {
    height: 30px;
    padding: 0 10px;
    background: rgba(255, 255, 255, 0.16);
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.28) inset;
  }

  :deep(.el-range-input) {
    color: rgba(255, 255, 255, 0.95);
    background: transparent;
  }

  :deep(.el-range-separator),
  :deep(.el-range__icon) {
    color: rgba(255, 255, 255, 0.75);
  }
}

.period-range-picker {
  width: 240px;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 12px;
}

.metric-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 15px 16px;
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;

  &::before {
    position: absolute;
    left: 0;
    top: 14px;
    bottom: 14px;
    width: 3px;
    content: '';
    border-radius: 0 3px 3px 0;
    background: #cbd5e1;
  }

  &.is-orange::before { background: #f59e0b; }
  &.is-purple::before { background: #8b5cf6; }
  &.is-blue::before { background: #3b82f6; }
  &.is-green::before { background: #10b981; }
  &.is-cyan::before { background: #06b6d4; }

  &:hover {
    border-color: #d5e4f7;
    box-shadow: 0 10px 22px rgba(37, 99, 235, 0.07);
    transform: translateY(-1px);
  }
}

.metric-icon {
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  width: 40px;
  height: 40px;
  border-radius: 11px;
  font-size: 17px;
}

.metric-content {
  display: grid;
  gap: 2px;
  min-width: 0;

  span {
    color: var(--muted);
    font-size: 12px;
  }

  strong {
    color: var(--ink);
    font-size: 22px;
    line-height: 1.1;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
  }

  small {
    color: #94a3b8;
    font-size: 11px;
  }

  small.positive { color: #059669; }
  small.warn { color: #d97706; }
}

.blue { color: #2563eb; background: #eff6ff; }
.cyan { color: #0891b2; background: #ecfeff; }
.green { color: #059669; background: #ecfdf5; }
.orange { color: #d97706; background: #fffbeb; }
.purple { color: #7c3aed; background: #f5f3ff; }
.red { color: #dc2626; background: #fef2f2; }

.main-grid,
.bottom-grid {
  display: grid;
  gap: 12px;
  margin-bottom: 12px;
}

.main-grid {
  grid-template-columns: 1fr 1fr;
}

.bottom-grid {
  grid-template-columns: 1.1fr 1fr;
  align-items: stretch;
  margin-bottom: 0;
}

.panel {
  display: flex;
  flex-direction: column;
  padding: 16px 18px;
  min-height: 0;
}

.panel-fill {
  height: 100%;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 8px;

  &::before {
    width: 3px;
    height: 14px;
    content: '';
    border-radius: 99px;
    background: linear-gradient(180deg, #38bdf8, #2563eb);
  }

  h2 {
    margin: 0;
    color: #1e3a5f;
    font-size: 15px;
    font-weight: 700;
  }
}

.stat-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  flex: 1;
}

.stat-cell {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  min-width: 0;
  min-height: 84px;
  padding: 14px;
  border: 1px solid var(--cell-line);
  border-radius: 12px;
  background: var(--cell);
  box-sizing: border-box;
}

.stat-cell.is-click {
  cursor: pointer;
  transition: background 0.18s ease, border-color 0.18s ease;

  &:hover {
    border-color: #d4e0f0;
    background: var(--hover);
  }
}

.stat-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--muted);
  font-size: 12px;
}

.stat-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex: 0 0 auto;
}

.stat-cell strong,
.traffic-item strong {
  color: var(--ink);
  font-size: 24px;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}

.stat-cell strong.is-warn,
.traffic-item strong.is-warn {
  color: #d97706;
}

.traffic-panel {
  margin-bottom: 12px;
}

.traffic-strip {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 10px;
  width: 100%;
}

.traffic-item {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  min-width: 0;
  min-height: 76px;
  padding: 14px;
  border: 1px solid var(--cell-line);
  border-radius: 12px;
  background: var(--cell);
  box-sizing: border-box;

  span {
    color: var(--muted);
    font-size: 12px;
  }

  &.is-click {
    cursor: pointer;
    transition: background 0.18s ease, border-color 0.18s ease;

    &:hover {
      border-color: #d4e0f0;
      background: var(--hover);
    }
  }
}

.todo-list {
  display: grid;
  gap: 8px;
  flex: 1;
  grid-auto-rows: 1fr;
  align-content: stretch;
}

.todo-item {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 54px;
  padding: 10px 12px;
  border: 1px solid var(--cell-line);
  border-radius: 12px;
  background: var(--cell);

  &.is-action {
    cursor: pointer;
    transition: background 0.18s ease, border-color 0.18s ease;
  }

  &.is-action:hover {
    border-color: #d4e0f0;
    background: var(--hover);
  }

  > div {
    display: grid;
    flex: 1;
    gap: 2px;
    min-width: 0;

    strong {
      color: var(--ink);
      font-size: 13px;
    }

    small {
      color: #94a3b8;
      font-size: 11px;
    }
  }
}

.todo-icon {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  font-size: 15px;
}

.quick-grid {
  display: grid;
  flex: 1;
  grid-template-columns: 1fr 1fr;
  grid-auto-rows: 1fr;
  gap: 10px;
  min-height: 0;

  button {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    min-height: 64px;
    padding: 12px 14px;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
    border: 1px solid var(--cell-line);
    border-radius: 12px;
    background: var(--cell);
    box-sizing: border-box;
    transition: border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
  }

  button:hover {
    border-color: #d4e0f0;
    background: #f8fbff;
    box-shadow: 0 8px 16px rgba(37, 99, 235, 0.06);
    transform: translateY(-1px);
  }
}

.quick-icon {
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  font-size: 18px;
}

.quick-copy {
  display: grid;
  flex: 1;
  gap: 2px;
  min-width: 0;

  strong {
    color: var(--ink);
    font-size: 13px;
    font-weight: 700;
  }

  small {
    color: #94a3b8;
    font-size: 11px;
  }
}

.quick-arrow {
  flex: 0 0 auto;
  color: #cbd5e1;
  font-size: 14px;
}

@media (max-width: 1200px) {
  .metric-grid,
  .traffic-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .main-grid,
  .bottom-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .page-head {
    flex-direction: column;
    align-items: stretch;
  }

  .page-head-aside {
    align-items: stretch;
  }

  .page-head-meta,
  .period-filter {
    justify-content: flex-start;
  }

  .period-range-picker {
    width: 100%;
  }

  .quick-grid {
    grid-template-columns: 1fr;
  }
}
</style>
