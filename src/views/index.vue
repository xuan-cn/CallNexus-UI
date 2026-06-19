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

const agentToolbarRef = inject<Ref<{ simulateIncomingCall: () => void } | null>>('agentToolbarRef');
const router = useRouter();

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

const quickActions = [
  { label: '新建坐席', tone: 'blue', icon: Plus, path: '/callcenter/callcenter-operation/agent' },
  { label: '队列监控', tone: 'cyan', icon: UserFilled, path: '/callcenter/callcenter-operation/call-queue-monitor' },
  { label: '通话记录', tone: 'purple', icon: Document, path: '/callcenter/callcenter-operation/call-record' },
  { label: '系统配置', tone: 'orange', icon: Setting, path: '/callcenter/callcenter-routing/callcenter-config' },
  { label: '语音留言', tone: 'red', icon: Bell, path: '/callcenter/callcenter-routing/voicemail' },
  { label: '运营报表', tone: 'green', icon: DataAnalysis, path: '/callcenter/callcenter-operation/call-queue-monitor' }
];

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
  router.push('/callcenter/callcenter-operation/call-queue-monitor');
};

const openUnhandledVoiceMail = () => {
  router.push({ path: '/callcenter/callcenter-routing/voicemail', query: { status: 'UNHANDLED' } });
};

const handleTodo = (todo: TodoItem) => {
  if (todo.action === 'UNHANDLED_VOICEMAIL') openUnhandledVoiceMail();
  if (todo.action === 'QUEUE_MONITOR') openQueueMonitor();
};

const handleQuickAction = (action: { path: string; label: string }) => {
  if (action.path) {
    router.push(action.path);
  } else {
    ElMessage.info(`${action.label}功能将在对应业务模块开放`);
  }
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
  background: #f4f7fb;
}

.hero-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 27px 30px;
  margin-bottom: 18px;
  overflow: hidden;
  color: #fff;
  border-radius: 16px;
  background: radial-gradient(circle at 78% -90%, rgba(67, 211, 255, 0.55), transparent 42%), linear-gradient(120deg, #102b62, #2459cf 68%, #2879df);
  box-shadow: 0 14px 35px rgba(28, 73, 158, 0.18);

  h1 {
    margin: 7px 0 6px;
    font-size: 26px;
  }

  p {
    margin: 0;
    color: rgba(255, 255, 255, 0.72);
    font-size: 13px;
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
  color: #bcefe2;
  font-size: 12px;
  font-weight: 600;
}

.live-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #59e0b1;
  box-shadow: 0 0 0 5px rgba(89, 224, 177, 0.15);
}

.hero-meta {
  gap: 20px;
  white-space: nowrap;
  color: rgba(255, 255, 255, 0.75);
  font-size: 13px;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

.metric-card,
.panel {
  border: 1px solid #e8edf5;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 5px 18px rgba(28, 48, 78, 0.04);
}

.metric-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 21px;
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
}

.metric-content {
  display: grid;
  gap: 3px;

  span {
    color: #778196;
    font-size: 12px;
  }

  strong {
    font-size: 24px;
    line-height: 1.1;
  }

  small {
    color: #8993a6;
    font-size: 11px;
  }

  small.positive {
    color: #119b75;
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
}

.panel-header {
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 20px;

  h2 {
    margin: 3px 0 0;
    font-size: 16px;
  }
}

.panel-kicker {
  color: #98a2b3;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.2px;
}

.queue-overview-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;

  div {
    padding: 18px;
    border-radius: 12px;
    background: #f8fbff;
    border: 1px solid #e7edf6;
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
  }
}

.total-agents {
  color: #7c879b;
  font-size: 11px;
}

.agent-ring {
  display: grid;
  place-items: center;
  width: 150px;
  height: 150px;
  margin: 3px auto 22px;
  border-radius: 50%;
  background: conic-gradient(#2f6bff 0 43%, #18b78c 43% 65%, #f59e0b 65% 74%, #e5e9f0 74% 100%);
  position: relative;
}

.agent-ring::after {
  position: absolute;
  width: 112px;
  height: 112px;
  content: '';
  border-radius: 50%;
  background: #fff;
}

.ring-center {
  z-index: 1;
  display: grid;
  text-align: center;

  strong {
    font-size: 29px;
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
    color: #6f7b90;
    font-size: 11px;
  }

  strong {
    color: #273248;
  }

  i {
    display: inline-block;
    width: 7px;
    height: 7px;
    margin-right: 7px;
    border-radius: 50%;
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
  border-bottom: 1px solid #f0f3f7;
}

.todo-item.is-action {
  cursor: pointer;
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
  }
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;

  button {
    display: grid;
    place-items: center;
    gap: 7px;
    min-height: 78px;
    padding: 8px;
    color: #5f6b80;
    font: inherit;
    font-size: 10px;
    cursor: pointer;
    border: 1px solid #edf0f5;
    border-radius: 10px;
    background: #fff;
    transition: 0.2s;
  }

  button:hover {
    color: #245dcc;
    border-color: #cfdcff;
  }

  span {
    width: 31px;
    height: 31px;
    font-size: 14px;
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
