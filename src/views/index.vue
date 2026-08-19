<template>
  <div class="dashboard">
    <section class="hero-panel">
      <div>
        <div class="eyebrow"><span class="live-dot"></span> 系统运行正常</div>
        <h1>呼叫中心运营概览</h1>
        <p>首页统计已接入真实队列监控数据，队列、坐席和留言状态会随刷新更新。</p>
      </div>
      <div class="hero-meta">
        <span>{{ currentDate }}</span>
        <el-button type="primary" :icon="Refresh" :loading="loading" @click="refreshDashboard">刷新数据</el-button>
        <el-button type="success" :icon="Phone" @click="simulateIncomingCall">模拟来电</el-button>
      </div>
    </section>

    <section class="metric-grid">
      <article v-for="item in metrics" :key="item.label" class="metric-card">
        <div class="metric-icon" :class="item.tone">
          <el-icon><component :is="item.icon" /></el-icon>
        </div>
        <div class="metric-content">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
          <small :class="{ positive: item.positive }">{{ item.change }}</small>
        </div>
      </article>
    </section>

    <section class="main-grid">
      <article class="panel trend-panel">
        <div class="panel-header">
          <div>
            <span class="panel-kicker">今日队列</span>
            <h2>队列接入概况</h2>
          </div>
          <el-button text type="primary" @click="openQueueMonitor">查看队列监控</el-button>
        </div>
        <div class="queue-overview-grid">
          <div>
            <span>当前排队</span><strong>{{ overview?.currentWaitingCount || 0 }}</strong>
          </div>
          <div>
            <span>振铃中</span><strong>{{ overview?.currentRingingCount || 0 }}</strong>
          </div>
          <div>
            <span>今日进入</span><strong>{{ overview?.todayEnteredCount || 0 }}</strong>
          </div>
          <div>
            <span>今日接通</span><strong>{{ overview?.todayAnsweredCount || 0 }}</strong>
          </div>
          <div>
            <span>今日放弃</span><strong>{{ overview?.todayAbandonedCount || 0 }}</strong>
          </div>
          <div>
            <span>今日超时</span><strong>{{ overview?.todayTimeoutCount || 0 }}</strong>
          </div>
        </div>
      </article>

      <article class="panel agent-panel">
        <div class="panel-header">
          <div>
            <span class="panel-kicker">实时状态</span>
            <h2>坐席概况</h2>
          </div>
          <span class="total-agents">共 {{ overview?.totalAgentCount || 0 }} 人</span>
        </div>
        <div class="agent-ring">
          <div class="ring-center">
            <strong>{{ overview?.onlineAgentCount || 0 }}</strong
            ><span>在线坐席</span>
          </div>
        </div>
        <div class="agent-status-list">
          <div v-for="status in agentStatuses" :key="status.label">
            <span><i :style="{ background: status.color }"></i>{{ status.label }}</span>
            <strong>{{ status.value }}</strong>
          </div>
        </div>
      </article>
    </section>

    <section class="bottom-grid">
      <article class="panel">
        <div class="panel-header">
          <div>
            <span class="panel-kicker">基础设施</span>
            <h2>服务健康</h2>
          </div>
          <el-tag :type="(overview?.abnormalQueueCount || 0) > 0 ? 'danger' : 'success'" effect="light" round>
            {{ (overview?.abnormalQueueCount || 0) > 0 ? '存在异常队列' : '队列正常' }}
          </el-tag>
        </div>
        <div class="service-list">
          <div v-for="service in services" :key="service.name" class="service-item">
            <span class="service-mark" :class="service.tone">
              <el-icon><component :is="service.icon" /></el-icon>
            </span>
            <div>
              <strong>{{ service.name }}</strong>
              <small>{{ service.description }}</small>
            </div>
            <span class="service-state"><i></i>{{ service.state }}</span>
          </div>
        </div>
      </article>

      <article class="panel">
        <div class="panel-header">
          <div>
            <span class="panel-kicker">需要关注</span>
            <h2>今日待办</h2>
          </div>
          <el-button text type="primary" @click="openUnhandledVoiceMail">查看未处理</el-button>
        </div>
        <div class="todo-list">
          <div v-for="todo in todos" :key="todo.title" class="todo-item" :class="{ 'is-action': todo.action }" @click="handleTodo(todo)">
            <span class="todo-icon" :class="todo.tone">
              <el-icon><component :is="todo.icon" /></el-icon>
            </span>
            <div>
              <strong>{{ todo.title }}</strong>
              <small>{{ todo.description }}</small>
            </div>
            <el-tag :type="todo.tagType" effect="plain" round>{{ todo.count }}</el-tag>
          </div>
        </div>
      </article>

      <article class="panel">
        <div class="panel-header">
          <div>
            <span class="panel-kicker">常用操作</span>
            <h2>快捷入口</h2>
          </div>
        </div>
        <div class="quick-grid">
          <button v-for="action in quickActions" :key="action.label" type="button" @click="handleQuickAction(action)">
            <span :class="action.tone">
              <el-icon><component :is="action.icon" /></el-icon>
            </span>
            {{ action.label }}
          </button>
        </div>
      </article>
    </section>
  </div>
</template>

<script setup name="Index" lang="ts">
import {
  Bell,
  Connection,
  DataAnalysis,
  Document,
  Headset,
  Phone,
  Plus,
  Refresh,
  Setting,
  SwitchButton,
  Timer,
  User,
  UserFilled,
  Warning
} from '@element-plus/icons-vue';
import { listVoiceMailMessages } from '@/api/callcenter/voicemail';
import { getCallQueueMonitorOverview } from '@/api/callcenter/call-queue-monitor';
import type { CallQueueMonitorOverviewVO } from '@/api/callcenter/call-queue-monitor/types';
import { ElMessage } from 'element-plus';
import { computed, inject, onMounted, ref, type Component, type Ref } from 'vue';
import { usePermissionStore } from '@/store/modules/permission';
import type { RouteRecordRaw } from 'vue-router';

const agentToolbarRef = inject<Ref<{ simulateIncomingCall: () => void } | null>>('agentToolbarRef');
const router = useRouter();
const permissionStore = usePermissionStore();

const loading = ref(false);
const overview = ref<CallQueueMonitorOverviewVO>();
const unhandledVoiceMailCount = ref(0);
const currentDate = new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }).format(new Date());

const metrics = computed(() => [
  {
    label: '今日队列进入',
    value: overview.value?.todayEnteredCount || 0,
    change: `当前排队 ${overview.value?.currentWaitingCount || 0}`,
    positive: false,
    tone: 'blue',
    icon: Phone
  },
  {
    label: '当前振铃',
    value: overview.value?.currentRingingCount || 0,
    change: `最长等待 ${formatSeconds(overview.value?.longestWaitSeconds || 0)}`,
    positive: false,
    tone: 'cyan',
    icon: Headset
  },
  {
    label: '接通率',
    value: `${overview.value?.answerRate || 0}%`,
    change: `今日接通 ${overview.value?.todayAnsweredCount || 0}`,
    positive: true,
    tone: 'green',
    icon: DataAnalysis
  },
  {
    label: '平均等待',
    value: formatSeconds(overview.value?.averageWaitSeconds || 0),
    change: `放弃率 ${overview.value?.abandonRate || 0}%`,
    positive: (overview.value?.abandonRate || 0) <= 20,
    tone: 'orange',
    icon: Timer
  }
]);

const agentStatuses = computed(() => [
  { label: '通话/整理', value: overview.value?.busyAgentCount || 0, color: '#2f6bff' },
  { label: '空闲', value: overview.value?.idleAgentCount || 0, color: '#18b78c' },
  { label: '在线', value: overview.value?.onlineAgentCount || 0, color: '#f59e0b' },
  { label: '离线', value: Math.max(0, (overview.value?.totalAgentCount || 0) - (overview.value?.onlineAgentCount || 0)), color: '#d8dee9' }
]);

const services = computed(() => [
  { name: 'FreeSWITCH 队列', description: '队列同步与运行状态', state: `${overview.value?.queueCount || 0} 个队列`, tone: 'blue', icon: Phone },
  {
    name: '坐席状态',
    description: '签入签出、忙闲和话后整理',
    state: `${overview.value?.onlineAgentCount || 0} 人在线`,
    tone: 'green',
    icon: Connection
  },
  {
    name: '队列监控',
    description: '统计排队、接通、放弃和超时',
    state: `${overview.value?.abnormalQueueCount || 0} 个异常`,
    tone: 'purple',
    icon: SwitchButton
  }
]);

type TodoAction = 'UNHANDLED_VOICEMAIL' | 'QUEUE_MONITOR';
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
    title: '队列异常待处理',
    description: (overview.value?.abnormalQueueCount || 0) > 0 ? '存在同步失败或排队异常队列' : '暂无异常队列',
    count: `${overview.value?.abnormalQueueCount || 0} 个`,
    tone: 'red',
    tagType: (overview.value?.abnormalQueueCount || 0) > 0 ? 'danger' : 'info',
    icon: Warning,
    action: 'QUEUE_MONITOR'
  },
  {
    title: '未处理语音留言',
    description: unhandledVoiceMailCount.value > 0 ? '客户留言需要跟进处理' : '暂无待处理留言',
    count: `${unhandledVoiceMailCount.value} 条`,
    tone: 'purple',
    tagType: unhandledVoiceMailCount.value > 0 ? 'warning' : 'info',
    icon: Bell,
    action: 'UNHANDLED_VOICEMAIL'
  },
  {
    title: '当前排队客户',
    description: '需要关注长时间等待客户',
    count: `${overview.value?.currentWaitingCount || 0} 人`,
    tone: 'orange',
    tagType: (overview.value?.currentWaitingCount || 0) > 0 ? 'warning' : 'info',
    icon: User
  }
]);

type DashboardLinkKey = 'agent' | 'queueMonitor' | 'callRecord' | 'callcenterConfig' | 'voicemail';
type QuickAction = {
  label: string;
  tone: string;
  icon: Component;
  routeKey: DashboardLinkKey;
};

const dashboardRouteTargets: Record<DashboardLinkKey, { titles: string[]; names: string[]; fallbacks: string[] }> = {
  agent: {
    titles: ['坐席管理'],
    names: ['agent'],
    fallbacks: ['/callcenter/agent']
  },
  queueMonitor: {
    titles: ['队列监控'],
    names: ['call-queue-monitor'],
    fallbacks: ['/callcenter/call-queue-monitor']
  },
  callRecord: {
    titles: ['通话记录'],
    names: ['call-record'],
    fallbacks: ['/callcenter/call-record']
  },
  callcenterConfig: {
    titles: ['配置中心', '系统配置'],
    names: ['callcenter-config'],
    fallbacks: ['/callcenter/callcenter-config']
  },
  voicemail: {
    titles: ['语音留言'],
    names: ['voicemail'],
    fallbacks: ['/callcenter/voicemail']
  }
};

const quickActions: QuickAction[] = [
  { label: '新建坐席', tone: 'blue', icon: Plus, routeKey: 'agent' },
  { label: '队列监控', tone: 'cyan', icon: UserFilled, routeKey: 'queueMonitor' },
  { label: '通话记录', tone: 'purple', icon: Document, routeKey: 'callRecord' },
  { label: '系统配置', tone: 'orange', icon: Setting, routeKey: 'callcenterConfig' },
  { label: '语音留言', tone: 'red', icon: Bell, routeKey: 'voicemail' },
  { label: '运营报表', tone: 'green', icon: DataAnalysis, routeKey: 'queueMonitor' }
];

const normalizePath = (path?: string) => {
  if (!path) return '';
  return path.startsWith('/') ? path : `/${path}`;
};

const flattenRoutes = (routes: RouteRecordRaw[], parentPath = ''): Array<RouteRecordRaw & { resolvedPath: string }> =>
  routes.flatMap((route) => {
    const currentPath = normalizePath(route.path);
    const resolvedPath = currentPath.startsWith(parentPath) || currentPath === '/' ? currentPath : `${parentPath}${currentPath}`;
    const current = { ...route, resolvedPath };
    return [current, ...flattenRoutes((route.children || []) as RouteRecordRaw[], resolvedPath === '/' ? '' : resolvedPath)];
  });

const resolveDashboardPath = (key: DashboardLinkKey) => {
  const target = dashboardRouteTargets[key];
  const routes = flattenRoutes(permissionStore.getRoutes());
  const matchedRoute = routes.find((route) => target.names.includes(String(route.name || '')))
    || routes.find((route) => target.titles.includes(String(route.meta?.title || '')));
  return matchedRoute?.resolvedPath || target.fallbacks[0];
};

const loadDashboard = async () => {
  loading.value = true;
  try {
    const [overviewRes, voiceMailRes] = await Promise.all([
      getCallQueueMonitorOverview(),
      listVoiceMailMessages({ pageNum: 1, pageSize: 1, status: 'UNHANDLED' })
    ]);
    overview.value = overviewRes.data;
    unhandledVoiceMailCount.value = voiceMailRes.total || 0;
  } catch (error) {
    console.warn('加载首页统计失败', error);
  } finally {
    loading.value = false;
  }
};

const refreshDashboard = async () => {
  await loadDashboard();
  ElMessage.success('首页数据已刷新');
};

const openQueueMonitor = () => {
  router.push(resolveDashboardPath('queueMonitor'));
};

const openUnhandledVoiceMail = () => {
  router.push({ path: resolveDashboardPath('voicemail'), query: { status: 'UNHANDLED' } });
};

const handleTodo = (todo: TodoItem) => {
  if (todo.action === 'UNHANDLED_VOICEMAIL') openUnhandledVoiceMail();
  if (todo.action === 'QUEUE_MONITOR') openQueueMonitor();
};

const handleQuickAction = (action: QuickAction) => {
  const path = resolveDashboardPath(action.routeKey);
  if (path) {
    router.push(path);
    return;
  }
  ElMessage.info(`${action.label}功能将在对应业务模块开放`);
};

const simulateIncomingCall = () => {
  if (agentToolbarRef?.value?.simulateIncomingCall) {
    agentToolbarRef.value.simulateIncomingCall();
  } else {
    ElMessage.warning('坐席工具栏未就绪');
  }
};

const formatSeconds = (seconds: number) => {
  if (seconds < 60) return `${seconds}秒`;
  return `${Math.floor(seconds / 60)}分${seconds % 60}秒`;
};

onMounted(() => {
  loadDashboard();
});
</script>

<style lang="scss" scoped>
.dashboard {
  min-height: calc(100vh - 84px);
  padding: 22px;
  color: #172033;
  background:
    radial-gradient(circle at 12% 0%, rgba(56, 189, 248, 0.12), transparent 28%),
    radial-gradient(circle at 88% 8%, rgba(59, 130, 246, 0.1), transparent 26%),
    linear-gradient(#f5f8fc, #eef3f9);
}

.hero-panel {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 28px 32px;
  margin-bottom: 18px;
  overflow: hidden;
  color: #fff;
  border: 1px solid rgba(125, 211, 252, 0.18);
  border-radius: 18px;
  background:
    radial-gradient(circle at 82% -40%, rgba(34, 211, 238, 0.42), transparent 38%),
    radial-gradient(circle at 8% 120%, rgba(59, 130, 246, 0.35), transparent 42%),
    linear-gradient(118deg, #0b1f46 0%, #16408c 58%, #1d6bb8 100%);
  box-shadow:
    0 18px 40px rgba(16, 52, 120, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.12);

  &::before {
    position: absolute;
    inset: 0;
    content: '';
    pointer-events: none;
    background-image:
      linear-gradient(rgba(255, 255, 255, 0.045) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.045) 1px, transparent 1px);
    background-size: 28px 28px;
    mask-image: linear-gradient(90deg, transparent, #000 18%, #000 82%, transparent);
    opacity: 0.55;
  }

  &::after {
    position: absolute;
    right: -48px;
    top: -64px;
    width: 220px;
    height: 220px;
    content: '';
    pointer-events: none;
    border: 1px solid rgba(125, 211, 252, 0.18);
    border-radius: 50%;
    box-shadow: 0 0 0 28px rgba(56, 189, 248, 0.05);
  }

  > * {
    position: relative;
    z-index: 1;
  }

  h1 {
    margin: 8px 0 7px;
    font-size: 26px;
    font-weight: 700;
    letter-spacing: 0.3px;
  }

  p {
    margin: 0;
    max-width: 560px;
    color: rgba(226, 239, 255, 0.72);
    font-size: 13px;
    line-height: 1.6;
  }

  :deep(.el-button) {
    height: 36px;
    border-radius: 10px;
  }
  :deep(.el-button--primary) {
    border: 1px solid rgba(255, 255, 255, 0.28);
    color: #fff;
    background: rgba(255, 255, 255, 0.12);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
  }
  :deep(.el-button--primary:hover) {
    background: rgba(255, 255, 255, 0.2);
  }
  :deep(.el-button--success) {
    border: none;
    color: #06263d;
    font-weight: 600;
    background: linear-gradient(90deg, #67e8f9, #38bdf8 46%, #60a5fa);
    box-shadow: 0 8px 18px rgba(34, 211, 238, 0.28);
  }
}

.eyebrow,
.hero-meta,
.panel-header,
.service-item,
.todo-item {
  display: flex;
  align-items: center;
}

.eyebrow {
  gap: 8px;
  color: #9ff0de;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.4px;
}

.live-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #5eead4;
  box-shadow: 0 0 8px rgba(94, 234, 212, 0.75);
  animation: live-pulse 1.6s ease-out infinite;
}

@keyframes live-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(94, 234, 212, 0.5);
  }
  70% {
    box-shadow: 0 0 0 7px rgba(94, 234, 212, 0);
  }
}

.hero-meta {
  gap: 16px;
  white-space: nowrap;
  color: rgba(226, 239, 255, 0.78);
  font-size: 13px;

  span {
    padding: 7px 12px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 999px;
    background: rgba(8, 24, 54, 0.22);
  }
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

.metric-card,
.panel {
  border: 1px solid #e4ecf6;
  border-radius: 16px;
  background: linear-gradient(#fff, #fbfdff);
  box-shadow: 0 8px 22px rgba(28, 48, 78, 0.045);
}

.metric-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 16px;
  overflow: hidden;
  padding: 20px 21px;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;

  &::before {
    position: absolute;
    left: 0;
    top: 18px;
    bottom: 18px;
    width: 3px;
    content: '';
    border-radius: 0 4px 4px 0;
    background: linear-gradient(#38bdf8, #2563eb);
    opacity: 0.55;
  }
}
.metric-card:hover {
  transform: translateY(-3px);
  border-color: #d3e4fb;
  box-shadow: 0 16px 28px rgba(28, 73, 158, 0.09);
}

.metric-icon,
.service-mark,
.todo-icon,
.quick-grid span {
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 12px;
}

.metric-icon {
  width: 48px;
  height: 48px;
  font-size: 22px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
}

.metric-content {
  display: grid;
  gap: 3px;

  span {
    color: #778196;
    font-size: 12px;
  }

  strong {
    color: #12203a;
    font-size: 24px;
    line-height: 1.1;
    font-variant-numeric: tabular-nums;
  }

  small {
    color: #8993a6;
    font-size: 11px;
  }

  small.positive {
    color: #0f9f78;
  }
}

.blue {
  color: #2563eb;
  background: #eaf1ff;
}
.cyan {
  color: #0789a9;
  background: #e6f8fb;
}
.green {
  color: #07956f;
  background: #e6f8f1;
}
.orange {
  color: #d98406;
  background: #fff4df;
}
.purple {
  color: #7950c6;
  background: #f1ebff;
}
.red {
  color: #d94b59;
  background: #ffebed;
}

.main-grid {
  display: grid;
  grid-template-columns: minmax(0, 2.1fr) minmax(280px, 0.9fr);
  gap: 16px;
  margin-bottom: 16px;
}

.bottom-grid {
  display: grid;
  grid-template-columns: 1.05fr 1.05fr 0.9fr;
  gap: 16px;
}

.panel {
  padding: 21px;
  transition: box-shadow 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
}
.panel:hover {
  border-color: #d5e4f8;
  box-shadow: 0 14px 28px rgba(28, 48, 78, 0.07);
}

.panel-header {
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 20px;

  h2 {
    margin: 4px 0 0;
    color: #15233d;
    font-size: 16px;
    font-weight: 700;
  }
}

.panel-kicker {
  color: #5b8fd4;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.4px;
}

.queue-overview-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;

  div {
    padding: 16px 18px;
    border-radius: 12px;
    background: linear-gradient(#f7fbff, #f3f8fd);
    border: 1px solid #e7edf6;
    transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
  }
  div:hover {
    transform: translateY(-1px);
    border-color: #c5dbf6;
    box-shadow: 0 8px 16px rgba(28, 73, 158, 0.07);
  }

  span {
    display: block;
    color: #7b8798;
    font-size: 12px;
  }

  strong {
    display: block;
    margin-top: 8px;
    color: #053b70;
    font-size: 28px;
    font-variant-numeric: tabular-nums;
  }
}

.total-agents {
  padding: 4px 10px;
  color: #5f7190;
  font-size: 11px;
  border-radius: 999px;
  background: #f3f7fc;
  border: 1px solid #e6eef8;
}

.agent-ring {
  display: grid;
  place-items: center;
  width: 150px;
  height: 150px;
  margin: 8px auto 22px;
  border-radius: 50%;
  background: conic-gradient(#2f6bff 0 43%, #18b78c 43% 65%, #f59e0b 65% 74%, #e8edf5 74% 100%);
  position: relative;
  box-shadow:
    0 0 0 10px rgba(47, 107, 255, 0.06),
    0 12px 28px rgba(36, 89, 184, 0.12);
}

.agent-ring::after {
  position: absolute;
  width: 112px;
  height: 112px;
  content: '';
  border-radius: 50%;
  background: radial-gradient(circle at 50% 40%, #fff, #f7fbff);
  box-shadow: inset 0 0 0 1px #eef3f9;
}

.ring-center {
  z-index: 1;
  display: grid;
  text-align: center;

  strong {
    color: #12203a;
    font-size: 29px;
    font-variant-numeric: tabular-nums;
  }

  span {
    color: #8b95a7;
    font-size: 11px;
  }
}

.agent-status-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 22px;

  div {
    display: flex;
    justify-content: space-between;
    padding: 6px 2px;
    color: #6f7b90;
    font-size: 11px;
  }

  strong {
    color: #273248;
    font-variant-numeric: tabular-nums;
  }

  i {
    display: inline-block;
    width: 7px;
    height: 7px;
    margin-right: 7px;
    border-radius: 50%;
    box-shadow: 0 0 0 3px rgba(47, 107, 255, 0.08);
  }
}

.service-list,
.todo-list {
  display: grid;
  gap: 11px;
}

.service-item,
.todo-item {
  gap: 11px;
  min-height: 50px;
  padding-bottom: 11px;
  border-bottom: 1px solid #eef2f7;
}

.todo-item.is-action {
  cursor: pointer;
  border-radius: 12px;
  margin: 0 -8px;
  padding: 8px 8px 11px;
  transition: background 0.2s ease, box-shadow 0.2s ease;
}
.todo-item.is-action:hover {
  background: #f5f9ff;
  box-shadow: inset 0 0 0 1px #e4eefc;
}

.service-item:last-child,
.todo-item:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}

.service-mark,
.todo-icon {
  width: 36px;
  height: 36px;
  font-size: 16px;
}

.service-item div,
.todo-item div {
  display: grid;
  flex: 1;
  gap: 3px;
  min-width: 0;

  strong {
    color: #1b2b45;
    font-size: 12px;
  }

  small {
    overflow: hidden;
    color: #929cad;
    font-size: 10px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.service-state {
  color: #16886b;
  font-size: 10px;

  i {
    display: inline-block;
    width: 6px;
    height: 6px;
    margin-right: 5px;
    border-radius: 50%;
    background: #20bd8d;
    box-shadow: 0 0 0 0 rgba(32, 189, 141, 0.45);
    animation: live-pulse 1.8s ease-out infinite;
  }
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;

  button {
    display: grid;
    place-items: center;
    gap: 8px;
    min-height: 84px;
    padding: 10px 8px;
    color: #5f6b80;
    font: inherit;
    font-size: 12px;
    cursor: pointer;
    border: 1px solid #e8eef6;
    border-radius: 12px;
    background: linear-gradient(#fff, #f8fbff);
    transition: transform 0.2s ease, border-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
  }

  button:hover {
    color: #1d4ed8;
    border-color: #c7dbff;
    transform: translateY(-3px);
    background: #fff;
    box-shadow: 0 10px 18px rgba(36, 93, 204, 0.1);
  }

  span {
    width: 34px;
    height: 34px;
    font-size: 15px;
  }
}

@media (max-width: 1200px) {
  .bottom-grid {
    grid-template-columns: 1fr 1fr;
  }

  .bottom-grid .panel:last-child {
    grid-column: 1 / -1;
  }
}

@media (max-width: 900px) {
  .metric-grid {
    grid-template-columns: 1fr 1fr;
  }

  .main-grid,
  .bottom-grid {
    grid-template-columns: 1fr;
  }

  .hero-panel {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
