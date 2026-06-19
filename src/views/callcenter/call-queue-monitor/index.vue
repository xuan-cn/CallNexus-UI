<template>
  <div class="queue-monitor-page">
    <el-card shadow="never" class="summary-card">
      <div class="summary-header">
        <div>
          <h2>队列实时监控</h2>
          <p>每 10 秒自动刷新，展示队列排队、坐席和当天接通情况。</p>
        </div>
        <div class="summary-actions">
          <el-button plain @click="explainVisible = true">统计说明</el-button>
          <el-button type="primary" :loading="loading" @click="loadData">刷新</el-button>
        </div>
      </div>
      <div class="summary-grid">
        <div v-for="item in summaryItems" :key="item.label" class="summary-item">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
          <small>{{ item.extra }}</small>
        </div>
      </div>
    </el-card>

    <el-card shadow="never">
      <el-table v-loading="loading" :data="queues" row-key="queueId">
        <el-table-column label="队列" min-width="190">
          <template #default="{ row }">
            <div class="queue-name">
              <strong>{{ row.queueName }}</strong>
              <span>{{ row.queueCode }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="健康状态" width="120">
          <template #default="{ row }">
            <el-tag :type="healthTagType(row.healthStatus)" effect="light">{{ row.healthText }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="当前排队" width="100" align="center" prop="waitingCount" />
        <el-table-column label="振铃中" width="90" align="center" prop="ringingCount" />
        <el-table-column label="坐席" min-width="160">
          <template #default="{ row }">
            <span>空闲 {{ row.idleAgentCount }} / 在线 {{ row.onlineAgentCount }} / 总 {{ row.totalAgentCount }}</span>
          </template>
        </el-table-column>
        <el-table-column label="今日进入" width="100" align="center" prop="enteredCount" />
        <el-table-column label="接通率" width="100" align="center">
          <template #default="{ row }">{{ row.answerRate }}%</template>
        </el-table-column>
        <el-table-column label="放弃率" width="100" align="center">
          <template #default="{ row }">{{ row.abandonRate }}%</template>
        </el-table-column>
        <el-table-column label="平均等待" width="110" align="center">
          <template #default="{ row }">{{ formatSeconds(row.averageWaitSeconds) }}</template>
        </el-table-column>
        <el-table-column label="最长等待" width="110" align="center">
          <template #default="{ row }">{{ formatSeconds(row.longestWaitSeconds) }}</template>
        </el-table-column>
        <el-table-column label="同步状态" width="130">
          <template #default="{ row }">
            <el-tooltip :disabled="!hasSyncError(row)" :content="row.syncError" placement="top">
              <el-tag :type="syncTagType(row.syncStatus)" effect="plain">{{ syncLabel(row.syncStatus) }}</el-tag>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-drawer v-model="detailVisible" :title="detailTitle" size="72%" append-to-body destroy-on-close @close="closeDetail">
      <div v-if="currentQueue" class="detail-summary">
        <div>
          <span>当前排队</span><strong>{{ currentQueue.waitingCount }}</strong>
        </div>
        <div>
          <span>空闲坐席</span><strong>{{ currentQueue.idleAgentCount }}</strong>
        </div>
        <div>
          <span>今日接通</span><strong>{{ currentQueue.answeredCount }}</strong>
        </div>
        <div>
          <span>今日放弃</span><strong>{{ currentQueue.abandonedCount }}</strong>
        </div>
        <div>
          <span>最长等待</span><strong>{{ formatSeconds(currentQueue.longestWaitSeconds) }}</strong>
        </div>
      </div>
      <el-tabs v-model="activeTab" class="detail-tabs">
        <el-tab-pane label="实时坐席" name="agents">
          <el-table v-loading="detailLoading" :data="agents">
            <el-table-column label="坐席" min-width="180">
              <template #default="{ row }">
                <strong>{{ row.agentName }}</strong>
                <span class="muted">（{{ row.agentCode }}）</span>
              </template>
            </el-table-column>
            <el-table-column label="分机" width="110" prop="extension" />
            <el-table-column label="状态" width="110">
              <template #default="{ row }">
                <el-tag :type="agentTagType(row.status)" effect="light">{{ row.statusText }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="可分配" width="90">
              <template #default="{ row }">
                <el-tag :type="row.assignable ? 'success' : 'info'" effect="plain">{{ row.assignable ? '是' : '否' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="最近接听" width="180" prop="lastAnsweredAt" />
            <el-table-column label="状态更新时间" width="180" prop="updatedAt" />
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="小时趋势" name="trend">
          <div v-loading="detailLoading" class="trend-list">
            <div v-for="item in trend" :key="item.hour" class="trend-row">
              <span>{{ padHour(item.hour) }}:00</span>
              <div class="trend-bars">
                <i class="entered" :style="{ width: trendWidth(item.enteredCount) }"></i>
                <i class="answered" :style="{ width: trendWidth(item.answeredCount) }"></i>
              </div>
              <em>进入 {{ item.enteredCount }}，接通 {{ item.answeredCount }}，放弃 {{ item.abandonedCount }}，超时 {{ item.timeoutCount }}</em>
            </div>
          </div>
        </el-tab-pane>
        <el-tab-pane label="最近事件" name="events">
          <el-timeline v-loading="detailLoading">
            <el-timeline-item v-for="item in events" :key="item.eventId" :timestamp="item.occurredAt" placement="top">
              <el-card shadow="never">
                <strong>{{ item.eventText }}</strong>
                <p>主叫：{{ item.callerNumber || '-' }}，被叫：{{ item.calledNumber || '-' }}</p>
                <p>
                  坐席：{{ item.agentExtension || '-' }}，等待：{{ formatSeconds(item.waitSeconds) }}，挂断原因：{{
                    hangupCauseLabel(item.hangupCause)
                  }}
                </p>
                <p v-if="item.fromTarget || item.toTarget">从 {{ item.fromTarget || '-' }} 到 {{ item.toTarget || '-' }}</p>
              </el-card>
            </el-timeline-item>
          </el-timeline>
          <el-empty v-if="!detailLoading && events.length === 0" description="暂无队列事件" />
        </el-tab-pane>
        <el-tab-pane label="最近通话" name="calls">
          <el-table v-loading="detailLoading" :data="calls">
            <el-table-column label="通话ID" min-width="170" prop="sessionId" />
            <el-table-column label="客户号码" min-width="140">
              <template #default="{ row }">{{ row.callerNumber || row.calledNumber || '-' }}</template>
            </el-table-column>
            <el-table-column label="坐席分机" width="110" prop="agentExtension" />
            <el-table-column label="开始时间" width="180" prop="startedAt" />
            <el-table-column label="等待" width="90">
              <template #default="{ row }">{{ formatSeconds(row.waitSeconds) }}</template>
            </el-table-column>
            <el-table-column label="接通时长" width="100">
              <template #default="{ row }">{{ formatSeconds(row.billableSeconds) }}</template>
            </el-table-column>
            <el-table-column label="状态" width="100">
              <template #default="{ row }">{{ callStatusLabel(row.callStatus) }}</template>
            </el-table-column>
            <el-table-column label="挂断原因" min-width="150">
              <template #default="{ row }">{{ hangupCauseLabel(row.hangupCause) }}</template>
            </el-table-column>
            <el-table-column label="录音" width="90">
              <template #default="{ row }">{{ recordingStatusLabel(row.recordingStatus) }}</template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!detailLoading && calls.length === 0" description="暂无队列通话" />
        </el-tab-pane>
      </el-tabs>
    </el-drawer>

    <el-dialog v-model="explainVisible" title="队列监控统计说明" width="680px" append-to-body>
      <div class="metric-explain">
        <p><strong>进入队列：</strong>通话执行队列路由并落库 QUEUE_IN。</p>
        <p><strong>接通：</strong>坐席和客户桥接成功，落库 AGENT_ANSWER。</p>
        <p><strong>客户放弃：</strong>客户在队列最大等待时间前挂机，落库 ABANDON。</p>
        <p><strong>队列超时：</strong>等待达到队列最大等待时间仍未接通，落库 QUEUE_TIMEOUT。</p>
        <p><strong>平均等待：</strong>只统计已接通通话，从进入队列到坐席接通的时间。</p>
        <p><strong>最长等待：</strong>当前仍在队列中且未接通通话的最长等待时间。</p>
      </div>
    </el-dialog>
  </div>
</template>

<script setup name="CallQueueMonitor" lang="ts">
import {
  getCallQueueMonitor,
  getCallQueueMonitorOverview,
  listCallQueueAgents,
  listCallQueueMonitor,
  listCallQueueRecentCalls,
  listCallQueueRecentEvents,
  listCallQueueTrend
} from '@/api/callcenter/call-queue-monitor';
import type {
  AgentRuntimeStatus,
  CallQueueAgentStatusVO,
  CallQueueMonitorOverviewVO,
  CallQueueMonitorVO,
  CallQueueRecentCallVO,
  CallQueueRecentEventVO,
  CallQueueTrendPointVO,
  QueueHealthStatus
} from '@/api/callcenter/call-queue-monitor/types';
import { hangupCauseLabel } from '@/api/callcenter/call-record/display';

const loading = ref(false);
const detailLoading = ref(false);
const detailVisible = ref(false);
const explainVisible = ref(false);
const activeTab = ref('agents');
const queues = ref<CallQueueMonitorVO[]>([]);
const overview = ref<CallQueueMonitorOverviewVO>();
const currentQueue = ref<CallQueueMonitorVO>();
const agents = ref<CallQueueAgentStatusVO[]>([]);
const trend = ref<CallQueueTrendPointVO[]>([]);
const events = ref<CallQueueRecentEventVO[]>([]);
const calls = ref<CallQueueRecentCallVO[]>([]);
let timer: ReturnType<typeof setInterval> | undefined;

const detailTitle = computed(() => (currentQueue.value ? `${currentQueue.value.queueName} - 监控详情` : '队列监控详情'));
const summaryItems = computed(() => [
  { label: '当前排队', value: overview.value?.currentWaitingCount || 0, extra: `振铃中 ${overview.value?.currentRingingCount || 0}` },
  { label: '空闲坐席', value: overview.value?.idleAgentCount || 0, extra: `在线 ${overview.value?.onlineAgentCount || 0}` },
  { label: '今日进入', value: overview.value?.todayEnteredCount || 0, extra: `接通 ${overview.value?.todayAnsweredCount || 0}` },
  { label: '今日放弃', value: overview.value?.todayAbandonedCount || 0, extra: `超时 ${overview.value?.todayTimeoutCount || 0}` },
  {
    label: '平均等待',
    value: formatSeconds(overview.value?.averageWaitSeconds || 0),
    extra: `最长 ${formatSeconds(overview.value?.longestWaitSeconds || 0)}`
  },
  { label: '健康队列', value: overview.value?.healthyQueueCount || 0, extra: `异常 ${overview.value?.abnormalQueueCount || 0}` }
]);

const loadData = async () => {
  loading.value = true;
  try {
    const [listRes, overviewRes] = await Promise.all([listCallQueueMonitor(), getCallQueueMonitorOverview()]);
    queues.value = listRes.data || [];
    overview.value = overviewRes.data;
    if (currentQueue.value) {
      const fresh = queues.value.find((item) => item.queueId === currentQueue.value?.queueId);
      if (fresh) currentQueue.value = fresh;
    }
  } finally {
    loading.value = false;
  }
};

const openDetail = async (row: CallQueueMonitorVO) => {
  currentQueue.value = row;
  detailVisible.value = true;
  activeTab.value = 'agents';
  await loadDetail(row.queueId);
};

const loadDetail = async (queueId: string | number) => {
  detailLoading.value = true;
  try {
    const today = new Date().toISOString().slice(0, 10);
    const [detailRes, agentRes, trendRes, eventRes, callRes] = await Promise.all([
      getCallQueueMonitor(queueId),
      listCallQueueAgents(queueId),
      listCallQueueTrend(queueId, today),
      listCallQueueRecentEvents(queueId, 30),
      listCallQueueRecentCalls(queueId, 20)
    ]);
    currentQueue.value = detailRes.data;
    agents.value = agentRes.data || [];
    trend.value = trendRes.data || [];
    events.value = eventRes.data || [];
    calls.value = callRes.data || [];
  } finally {
    detailLoading.value = false;
  }
};

const closeDetail = () => {
  agents.value = [];
  trend.value = [];
  events.value = [];
  calls.value = [];
  currentQueue.value = undefined;
};

const startTimer = () => {
  stopTimer();
  timer = setInterval(() => {
    if (!document.hidden) {
      loadData();
      if (detailVisible.value && currentQueue.value) {
        loadDetail(currentQueue.value.queueId);
      }
    }
  }, 10000);
};

const stopTimer = () => {
  if (timer) {
    clearInterval(timer);
    timer = undefined;
  }
};

const formatSeconds = (seconds?: number) => {
  const value = Math.max(0, seconds || 0);
  if (value < 60) return `${value}秒`;
  return `${Math.floor(value / 60)}分${value % 60}秒`;
};

const healthTagType = (status: QueueHealthStatus) => {
  if (status === 'NORMAL') return 'success';
  if (status === 'WARNING') return 'warning';
  return 'danger';
};

const syncTagType = (status?: string) => {
  if (status === 'SYNCED') return 'success';
  if (status === 'PARTIAL') return 'warning';
  if (status === 'FAILED') return 'danger';
  return 'info';
};

const hasSyncError = (row: CallQueueMonitorVO) => ['FAILED', 'PARTIAL'].includes(row.syncStatus || '') && !!row.syncError;

const syncLabel = (status?: string) => {
  const labels: Record<string, string> = {
    NOT_SYNCED: '未同步',
    SYNCED: '已同步',
    PARTIAL: '部分同步',
    FAILED: '同步失败'
  };
  return labels[status || ''] || status || '-';
};

const agentTagType = (status: AgentRuntimeStatus) => {
  if (status === 'IDLE') return 'success';
  if (status === 'BUSY') return 'primary';
  if (status === 'AFTER_CALL') return 'warning';
  return 'info';
};

const callStatusLabel = (status?: string) => {
  const labels: Record<string, string> = {
    CREATED: '已创建',
    RINGING: '振铃中',
    ANSWERED: '已接听',
    BRIDGED: '通话中',
    ENDED: '已结束'
  };
  return labels[status || ''] || status || '-';
};

const recordingStatusLabel = (status?: string) => {
  const labels: Record<string, string> = {
    NONE: '无',
    PENDING: '上传中',
    UPLOADED: '已上传',
    FAILED: '失败'
  };
  return labels[status || ''] || status || '-';
};

const padHour = (hour: number) => String(hour).padStart(2, '0');
const trendWidth = (value: number) => {
  const maxValue = Math.max(1, ...trend.value.map((item) => Math.max(item.enteredCount, item.answeredCount)));
  return `${Math.max(4, Math.round((value / maxValue) * 100))}%`;
};

onMounted(() => {
  loadData();
  startTimer();
});

onBeforeUnmount(() => {
  stopTimer();
});
</script>

<style lang="scss" scoped>
.queue-monitor-page {
  display: grid;
  gap: 14px;
  padding: 12px;
}

.summary-card {
  :deep(.el-card__body) {
    padding: 18px;
  }
}

.summary-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;

  h2 {
    margin: 0 0 6px;
    font-size: 20px;
    color: #10233f;
  }

  p {
    margin: 0;
    color: #7b8798;
    font-size: 13px;
  }
}

.summary-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(130px, 1fr));
  gap: 12px;
}

.summary-item {
  padding: 14px;
  border: 1px solid #e6edf5;
  border-radius: 12px;
  background: #f8fbff;

  span,
  small {
    display: block;
    color: #7b8798;
    font-size: 12px;
  }

  strong {
    display: block;
    margin: 6px 0 4px;
    color: #053b70;
    font-size: 24px;
  }
}

.queue-name {
  display: grid;
  gap: 2px;

  strong {
    color: #172033;
  }

  span {
    color: #8993a6;
    font-size: 12px;
  }
}

.detail-summary {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
  margin-bottom: 14px;

  div {
    padding: 12px;
    border: 1px solid #e6edf5;
    border-radius: 10px;
    background: #f8fbff;
  }

  span {
    display: block;
    color: #7b8798;
    font-size: 12px;
  }

  strong {
    color: #053b70;
    font-size: 22px;
  }
}

.muted {
  color: #8b95a7;
}

.trend-list {
  display: grid;
  gap: 8px;
}

.trend-row {
  display: grid;
  grid-template-columns: 56px minmax(180px, 1fr) 260px;
  align-items: center;
  gap: 12px;
  color: #566176;
  font-size: 13px;
}

.trend-bars {
  display: grid;
  gap: 4px;

  i {
    display: block;
    height: 8px;
    min-width: 4px;
    border-radius: 999px;
  }

  .entered {
    background: #2f6bff;
  }

  .answered {
    background: #18b78c;
  }
}

.trend-row em {
  color: #7b8798;
  font-style: normal;
}

.metric-explain {
  display: grid;
  gap: 10px;
  color: #4d5a70;
  line-height: 1.7;

  p {
    margin: 0;
  }

  strong {
    color: #053b70;
  }
}

@media (max-width: 1200px) {
  .summary-grid,
  .detail-summary {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>
