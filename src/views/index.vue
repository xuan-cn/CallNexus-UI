<template>
  <div class="dashboard">
    <section class="hero-panel">
      <div>
        <div class="eyebrow"><span class="live-dot"></span> 系统运行正常</div>
        <h1>呼叫中心运营概览</h1>
        <p>早上好，今天的服务水平保持稳定。当前数据为首页演示数据，接入呼叫链路后将自动更新。</p>
      </div>
      <div class="hero-meta">
        <span>{{ currentDate }}</span>
        <el-button type="primary" :icon="Refresh" @click="refreshDashboard">刷新数据</el-button>
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
            <span class="panel-kicker">今日趋势</span>
            <h2>呼入与接通量</h2>
          </div>
          <div class="legend">
            <span><i class="legend-line incoming"></i>呼入</span>
            <span><i class="legend-line answered"></i>接通</span>
          </div>
        </div>
        <div class="chart-area">
          <svg viewBox="0 0 760 245" preserveAspectRatio="none" aria-label="今日呼叫趋势图">
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#2f6bff" stop-opacity=".22" />
                <stop offset="100%" stop-color="#2f6bff" stop-opacity="0" />
              </linearGradient>
            </defs>
            <line v-for="y in [35, 85, 135, 185, 235]" :key="y" x1="0" :y1="y" x2="760" :y2="y" class="grid-line" />
            <path
              d="M0 205 C65 196 72 160 135 166 S228 99 290 123 S382 75 445 94 S544 44 610 65 S698 27 760 45 L760 245 L0 245 Z"
              fill="url(#areaGradient)"
            />
            <path d="M0 205 C65 196 72 160 135 166 S228 99 290 123 S382 75 445 94 S544 44 610 65 S698 27 760 45" class="chart-line incoming-line" />
            <path
              d="M0 220 C60 207 80 184 138 188 S225 126 292 149 S380 102 445 119 S544 71 610 91 S698 58 760 70"
              class="chart-line answered-line"
            />
          </svg>
          <div class="chart-labels"><span>08:00</span><span>10:00</span><span>12:00</span><span>14:00</span><span>16:00</span><span>18:00</span></div>
        </div>
      </article>

      <article class="panel agent-panel">
        <div class="panel-header">
          <div>
            <span class="panel-kicker">实时状态</span>
            <h2>坐席概况</h2>
          </div>
          <span class="total-agents">共 42 人</span>
        </div>
        <div class="agent-ring">
          <div class="ring-center"><strong>31</strong><span>在线坐席</span></div>
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
          <el-tag type="success" effect="light" round>全部正常</el-tag>
        </div>
        <div class="service-list">
          <div v-for="service in services" :key="service.name" class="service-item">
            <span class="service-mark" :class="service.tone"
              ><el-icon><component :is="service.icon" /></el-icon
            ></span>
            <div>
              <strong>{{ service.name }}</strong
              ><small>{{ service.description }}</small>
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
            <span class="todo-icon" :class="todo.tone"
              ><el-icon><component :is="todo.icon" /></el-icon
            ></span>
            <div>
              <strong>{{ todo.title }}</strong
              ><small>{{ todo.description }}</small>
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
          <button v-for="action in quickActions" :key="action.label" type="button" @click="handleQuickAction(action.label)">
            <span :class="action.tone"
              ><el-icon><component :is="action.icon" /></el-icon
            ></span>
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
import { ElMessage } from 'element-plus';
import type { Component, Ref } from 'vue';

// 获取 layout 提供的 agentToolbarRef
const agentToolbarRef = inject<Ref<{ simulateIncomingCall: () => void } | null>>('agentToolbarRef');
const router = useRouter();

const currentDate = new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }).format(new Date());
const unhandledVoiceMailCount = ref(0);

const metrics = [
  { label: '今日呼叫量', value: '1,286', change: '较昨日 +12.6%', positive: true, tone: 'blue', icon: Phone },
  { label: '当前通话', value: '18', change: '3 通排队等待', positive: false, tone: 'cyan', icon: Headset },
  { label: '接通率', value: '91.8%', change: '较昨日 +2.4%', positive: true, tone: 'green', icon: DataAnalysis },
  { label: '平均等待', value: '18s', change: '目标值低于 30s', positive: true, tone: 'orange', icon: Timer }
];

const agentStatuses = [
  { label: '通话中', value: 18, color: '#2f6bff' },
  { label: '空闲', value: 9, color: '#18b78c' },
  { label: '话后处理', value: 4, color: '#f59e0b' },
  { label: '离线', value: 11, color: '#d8dee9' }
];

const services = [
  { name: 'FreeSWITCH', description: '媒体与通话控制', state: '运行中', tone: 'blue', icon: Phone },
  { name: 'ESL 连接', description: '事件监听与命令通道', state: '已连接', tone: 'green', icon: Connection },
  { name: 'WebSocket', description: '实时状态推送', state: '运行中', tone: 'purple', icon: SwitchButton }
];

type TodoAction = 'UNHANDLED_VOICEMAIL';
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
  { title: '未接来电待回拨', description: '最早一条等待 16 分钟', count: '8 条', tone: 'orange', tagType: 'warning' as const, icon: Phone },
  {
    title: '未处理语音留言',
    description: unhandledVoiceMailCount.value > 0 ? '客户留言需要跟进处理' : '暂无待处理留言',
    count: `${unhandledVoiceMailCount.value} 条`,
    tone: 'purple',
    tagType: unhandledVoiceMailCount.value > 0 ? 'warning' : 'info',
    icon: Bell,
    action: 'UNHANDLED_VOICEMAIL'
  },
  { title: '异常呼叫待排查', description: '呼叫失败率出现波动', count: '3 条', tone: 'red', tagType: 'danger' as const, icon: Warning },
  { title: '坐席状态异常', description: '长时间处于话后处理状态', count: '2 人', tone: 'blue', tagType: 'primary' as const, icon: User }
]);

const quickActions = [
  { label: '新建坐席', tone: 'blue', icon: Plus },
  { label: '坐席管理', tone: 'cyan', icon: UserFilled },
  { label: '呼叫记录', tone: 'purple', icon: Document },
  { label: '系统配置', tone: 'orange', icon: Setting },
  { label: '告警中心', tone: 'red', icon: Bell },
  { label: '运营报表', tone: 'green', icon: DataAnalysis }
];

const loadUnhandledVoiceMailCount = async () => {
  try {
    const res = await listVoiceMailMessages({ pageNum: 1, pageSize: 1, status: 'UNHANDLED' });
    unhandledVoiceMailCount.value = res.total || 0;
  } catch (error) {
    console.warn('加载未处理语音留言数量失败', error);
  }
};

const openUnhandledVoiceMail = () => {
  router.push({ path: '/callcenter/callcenter-routing/voicemail', query: { status: 'UNHANDLED' } });
};

const handleTodo = (todo: TodoItem) => {
  if (todo.action === 'UNHANDLED_VOICEMAIL') {
    openUnhandledVoiceMail();
  }
};

const refreshDashboard = async () => {
  await loadUnhandledVoiceMailCount();
  ElMessage.success('首页数据已刷新');
};
const handleQuickAction = (label: string) => ElMessage.info(`${label}功能将在对应业务模块接入后开放`);
const simulateIncomingCall = () => {
  if (agentToolbarRef?.value?.simulateIncomingCall) {
    agentToolbarRef.value.simulateIncomingCall();
  } else {
    ElMessage.warning('坐席工具栏未就绪');
  }
};

onMounted(() => {
  loadUnhandledVoiceMailCount();
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
    letter-spacing: -0.4px;
  }
  p {
    margin: 0;
    color: rgba(255, 255, 255, 0.72);
    font-size: 13px;
  }
}
.eyebrow {
  display: flex;
  align-items: center;
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
  display: flex;
  align-items: center;
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
.metric-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 21px;
  border: 1px solid #e8edf5;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 5px 18px rgba(28, 48, 78, 0.04);
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
  border: 1px solid #e8edf5;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 5px 18px rgba(28, 48, 78, 0.04);
}
.panel-header {
  display: flex;
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
  text-transform: uppercase;
}
.legend {
  display: flex;
  gap: 18px;
  color: #758096;
  font-size: 11px;
}
.legend-line {
  display: inline-block;
  width: 18px;
  height: 3px;
  margin: 0 6px 3px 0;
  border-radius: 4px;
}
.legend-line.incoming {
  background: #2f6bff;
}
.legend-line.answered {
  background: #14b88b;
}
.chart-area {
  height: 255px;
  svg {
    width: 100%;
    height: 225px;
    overflow: visible;
  }
}
.grid-line {
  stroke: #edf1f6;
  stroke-width: 1;
}
.chart-line {
  fill: none;
  stroke-width: 3;
  stroke-linecap: round;
}
.incoming-line {
  stroke: #2f6bff;
}
.answered-line {
  stroke: #14b88b;
  stroke-dasharray: 5 7;
}
.chart-labels {
  display: flex;
  justify-content: space-between;
  color: #9aa4b5;
  font-size: 10px;
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
  display: flex;
  align-items: center;
  gap: 11px;
  min-height: 50px;
  padding-bottom: 11px;
  border-bottom: 1px solid #f0f3f7;
}
.todo-item.is-action {
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    transform 0.2s ease;
}
.todo-item.is-action:hover {
  background: #f7faff;
  transform: translateX(2px);
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
    transform: translateY(-2px);
    box-shadow: 0 7px 16px rgba(45, 91, 177, 0.08);
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
  .quick-grid {
    grid-template-columns: repeat(6, 1fr);
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
  .bottom-grid .panel:last-child {
    grid-column: auto;
  }
  .hero-panel {
    align-items: flex-start;
    flex-direction: column;
  }
}
@media (max-width: 560px) {
  .dashboard {
    padding: 12px;
  }
  .metric-grid {
    grid-template-columns: 1fr;
  }
  .quick-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  .hero-meta {
    align-items: flex-start;
    flex-direction: column;
    gap: 10px;
  }
}
</style>
