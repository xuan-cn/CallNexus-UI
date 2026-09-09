<template>
  <div class="agent-monitor-page">
    <el-card class="overview-card" shadow="never">
      <div class="page-head">
        <div>
          <h2>坐席监控</h2>
          <p>实时状态每 10 秒刷新，统计范围 {{ dateRangeLabel }}。</p>
        </div>
        <div class="head-actions">
          <span>更新时间 {{ refreshedAt || '-' }}</span>
          <el-button icon="Refresh" :loading="manualRefreshing" @click="handleManualRefresh">刷新</el-button>
        </div>
      </div>
      <div class="overview-grid">
        <div v-for="item in overviewItems" :key="item.label" class="overview-item" :class="item.tone">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
          <small>{{ item.extra }}</small>
        </div>
      </div>
    </el-card>

    <el-card class="list-card" shadow="never">
      <el-form ref="queryFormRef" :model="queryParams" inline class="query-form" @submit.prevent>
        <el-form-item label="统计日期">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            value-format="YYYY-MM-DD"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            :clearable="false"
            style="width: 240px"
          />
        </el-form-item>
        <el-form-item label="坐席">
          <el-input v-model="queryParams.keyword" clearable placeholder="工号、姓名或分机" @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item label="技能组">
          <el-select v-model="queryParams.skillGroupId" clearable filterable placeholder="全部技能组" style="width: 180px">
            <el-option v-for="item in skillGroups" :key="item.id" :label="item.groupName" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="实时状态">
          <el-select v-model="queryParams.status" clearable placeholder="全部状态" style="width: 130px">
            <el-option label="空闲" value="IDLE" />
            <el-option label="示忙" value="NOT_READY" />
            <el-option label="通话中" value="BUSY" />
            <el-option label="话后整理" value="AFTER_CALL" />
            <el-option label="离线" value="OFFLINE" />
          </el-select>
        </el-form-item>
        <el-form-item label="启用状态">
          <el-select v-model="queryParams.enabled" clearable placeholder="全部" style="width: 110px">
            <el-option label="启用" :value="true" />
            <el-option label="停用" :value="false" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Search" @click="handleQuery">查询</el-button>
          <el-button icon="Refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>

      <div v-loading="initialLoading" class="agent-card-scroll">
        <div v-if="agents.length" class="agent-card-grid">
          <article v-for="agent in agents" :key="agent.agentId" class="agent-monitor-card">
            <div class="agent-card-head">
              <div class="agent-avatar">{{ agentInitial(agent) }}</div>
              <div class="agent-identity">
                <span class="agent-name">{{ agent.agentName || '-' }}</span>
                <small>{{ agent.agentCode }}<template v-if="agent.extension"> · 分机 {{ agent.extension }}</template></small>
              </div>
              <el-tag :type="statusTagType(agent.status)" effect="light" size="small">{{ agent.statusText }}</el-tag>
            </div>

            <div class="agent-skill" :title="agent.skillGroupNames || ''">
              <span>技能组</span>
              <strong>{{ agent.skillGroupNames || '未分组' }}</strong>
            </div>

            <div class="call-panel" :class="{ active: agent.currentBusinessCallId }">
              <template v-if="agent.currentBusinessCallId">
                <div>
                  <span>{{ directionLabel(agent.currentDirection) }} · {{ callStateLabel(agent.currentCallState) }}</span>
                  <strong>{{ agent.currentPeerNumber || '-' }}</strong>
                </div>
                <em>{{ elapsedText(agent.currentCallStartedAt) }}</em>
              </template>
              <template v-else>
                <span>当前通话</span>
                <strong>暂无通话</strong>
              </template>
            </div>

            <div class="agent-metrics">
              <div><span>处理量</span><strong>{{ agent.todayHandledCount }}</strong></div>
              <div><span>呼入接听</span><strong>{{ agent.inboundAnsweredCount }}</strong></div>
              <div><span>外呼接通</span><strong>{{ agent.outboundAnsweredCount }}</strong></div>
              <div><span>振铃未接</span><strong :class="{ warning: agent.missedOfferCount > 0 }">{{ agent.missedOfferCount }}</strong></div>
              <div><span>平均通话</span><strong>{{ formatDuration(agent.averageTalkSeconds) }}</strong></div>
              <div><span>累计通话</span><strong>{{ formatDuration(agent.totalTalkSeconds) }}</strong></div>
              <div><span>在线时长</span><strong>{{ formatDuration(agent.onlineSeconds) }}</strong></div>
              <div><span>利用率</span><strong>{{ agent.utilizationRate || 0 }}%</strong></div>
            </div>

            <div class="agent-card-foot">
              <span>签入 {{ agent.signedInAt || '-' }}</span>
              <el-button v-hasPermi="['callcenter:agent-monitor:query']" link type="primary" @click="openDetail(agent)">查看详情</el-button>
            </div>
          </article>
        </div>
        <el-empty v-else :image-size="72" description="暂无符合条件的坐席" />
      </div>
      <pagination
        v-show="total > 0"
        v-model:page="queryParams.pageNum"
        v-model:limit="queryParams.pageSize"
        :total="total"
        @pagination="loadAgents"
      />
    </el-card>

    <el-drawer v-model="detailVisible" :title="detailTitle" size="760px" append-to-body class="agent-monitor-drawer">
      <div v-if="currentAgent" class="detail-metrics">
        <div><span>处理量</span><strong>{{ currentAgent.todayHandledCount }}</strong></div>
        <div><span>呼入接听</span><strong>{{ currentAgent.inboundAnsweredCount }}</strong></div>
        <div><span>外呼接通</span><strong>{{ currentAgent.outboundAnsweredCount }}</strong></div>
        <div><span>振铃未接</span><strong>{{ currentAgent.missedOfferCount }}</strong></div>
        <div><span>平均通话</span><strong>{{ formatDuration(currentAgent.averageTalkSeconds) }}</strong></div>
        <div><span>累计通话</span><strong>{{ formatDuration(currentAgent.totalTalkSeconds) }}</strong></div>
        <div><span>在线时长</span><strong>{{ formatDuration(currentAgent.onlineSeconds) }}</strong></div>
        <div><span>空闲时长</span><strong>{{ formatDuration(currentAgent.idleSeconds) }}</strong></div>
        <div><span>示忙时长</span><strong>{{ formatDuration(currentAgent.notReadySeconds) }}</strong></div>
        <div><span>通话状态</span><strong>{{ formatDuration(currentAgent.busySeconds) }}</strong></div>
        <div><span>话后整理</span><strong>{{ formatDuration(currentAgent.afterCallSeconds) }}</strong></div>
        <div><span>状态利用率</span><strong>{{ currentAgent.utilizationRate || 0 }}%</strong></div>
      </div>
      <el-tabs v-model="detailTab" @tab-change="handleDetailTabChange">
        <el-tab-pane label="状态轨迹" name="presence">
          <el-table v-loading="presenceLoading" :data="presenceLogs">
            <el-table-column label="状态" width="95">
              <template #default="{ row }"><el-tag :type="statusTagType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag></template>
            </el-table-column>
            <el-table-column label="来源" width="100">
              <template #default="{ row }">{{ sourceLabel(row.source) }}</template>
            </el-table-column>
            <el-table-column label="开始时间" width="165" prop="startedAt" />
            <el-table-column label="结束时间" width="165">
              <template #default="{ row }">{{ row.endedAt || '进行中' }}</template>
            </el-table-column>
            <el-table-column label="持续时长" min-width="100" align="right">
              <template #default="{ row }">{{ formatDuration(row.durationSeconds) }}</template>
            </el-table-column>
          </el-table>
          <pagination
            v-show="presenceTotal > 0"
            v-model:page="presenceQuery.pageNum"
            v-model:limit="presenceQuery.pageSize"
            :total="presenceTotal"
            @pagination="() => loadPresenceLogs()"
          />
        </el-tab-pane>
        <el-tab-pane label="近期通话" name="calls">
          <el-table v-loading="detailLoading" :data="calls">
        <el-table-column label="方向" width="75">
          <template #default="{ row }">{{ directionLabel(row.direction) }}</template>
        </el-table-column>
        <el-table-column label="客户号码" min-width="135" prop="customerNumber" show-overflow-tooltip />
        <el-table-column label="振铃时间" width="165" prop="ringingAt" />
        <el-table-column label="接听时间" width="165" prop="answeredAt">
          <template #default="{ row }">{{ row.answeredAt || '未接听' }}</template>
        </el-table-column>
        <el-table-column label="通话时长" width="95" align="right">
          <template #default="{ row }">{{ formatDuration(row.talkSeconds) }}</template>
        </el-table-column>
        <el-table-column label="结果" min-width="110" show-overflow-tooltip>
          <template #default="{ row }">{{ row.hangupCause || callStateLabel(row.legState) }}</template>
        </el-table-column>
          </el-table>
          <pagination
            v-show="callTotal > 0"
            v-model:page="callQuery.pageNum"
            v-model:limit="callQuery.pageSize"
            :total="callTotal"
            @pagination="() => loadCalls()"
          />
        </el-tab-pane>
      </el-tabs>
    </el-drawer>
  </div>
</template>

<script setup name="AgentMonitor" lang="ts">
import {
  getAgentMonitorOverview,
  listAgentMonitor,
  listAgentMonitorCalls,
  listAgentMonitorPresenceLogs,
  listAgentMonitorSkillGroups
} from '@/api/callcenter/agent-monitor';
import type {
  AgentMonitorCallVO,
  AgentMonitorOverviewVO,
  AgentMonitorPresenceLogVO,
  AgentMonitorQuery,
  AgentMonitorSkillGroupVO,
  AgentMonitorStatus,
  AgentMonitorVO
} from '@/api/callcenter/agent-monitor/types';

const initialLoading = ref(false);
const manualRefreshing = ref(false);
const refreshing = ref(false);
const detailLoading = ref(false);
const detailVisible = ref(false);
const presenceLoading = ref(false);
const detailTab = ref('presence');
const refreshedAt = ref('');
const total = ref(0);
const callTotal = ref(0);
const presenceTotal = ref(0);
const agents = ref<AgentMonitorVO[]>([]);
const calls = ref<AgentMonitorCallVO[]>([]);
const presenceLogs = ref<AgentMonitorPresenceLogVO[]>([]);
const skillGroups = ref<AgentMonitorSkillGroupVO[]>([]);
const overview = ref<AgentMonitorOverviewVO>();
const currentAgent = ref<AgentMonitorVO>();
const queryFormRef = ref<ElFormInstance>();
const now = new Date();
const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
const dateRange = ref<[string, string]>([today, today]);
const queryParams = reactive<AgentMonitorQuery>({ pageNum: 1, pageSize: 20, beginDate: today, endDate: today });
const callQuery = reactive<PageQuery>({ pageNum: 1, pageSize: 10 });
const presenceQuery = reactive<PageQuery>({ pageNum: 1, pageSize: 10 });
let timer: ReturnType<typeof setInterval> | undefined;

const detailTitle = computed(() => currentAgent.value ? `${currentAgent.value.agentName}（${currentAgent.value.agentCode}）` : '坐席详情');
const dateRangeLabel = computed(() => dateRange.value[0] === dateRange.value[1] ? dateRange.value[0] : `${dateRange.value[0]} 至 ${dateRange.value[1]}`);
const overviewItems = computed(() => [
  { label: '坐席总数', value: overview.value?.totalAgentCount || 0, extra: `在线 ${overview.value?.onlineAgentCount || 0} · 离线 ${overview.value?.offlineAgentCount || 0}`, tone: 'tone-total' },
  { label: '空闲坐席', value: overview.value?.idleAgentCount || 0, extra: `示忙 ${overview.value?.notReadyAgentCount || 0} · 通话 ${overview.value?.busyAgentCount || 0}`, tone: 'tone-idle' },
  { label: '处理量', value: overview.value?.todayHandledCount || 0, extra: `呼入 ${overview.value?.inboundAnsweredCount || 0}`, tone: 'tone-handled' },
  { label: '外呼接通', value: overview.value?.outboundAnsweredCount || 0, extra: `振铃未接 ${overview.value?.missedOfferCount || 0}`, tone: 'tone-outbound' },
  { label: '平均通话', value: formatDuration(overview.value?.averageTalkSeconds || 0), extra: `累计 ${formatDuration(overview.value?.totalTalkSeconds || 0)}`, tone: 'tone-talk' },
  { label: '在线时长', value: formatDuration(overview.value?.onlineSeconds || 0), extra: `利用率 ${overview.value?.utilizationRate || 0}%`, tone: 'tone-offline' }
]);

const syncDateRange = () => {
  queryParams.beginDate = dateRange.value[0];
  queryParams.endDate = dateRange.value[1];
};

const loadOverview = async () => {
  const res = await getAgentMonitorOverview({ beginDate: queryParams.beginDate, endDate: queryParams.endDate });
  overview.value = res.data;
};

const loadAgents = async () => {
  const res = await listAgentMonitor(queryParams);
  agents.value = res.rows || [];
  total.value = res.total || 0;
  if (currentAgent.value) {
    currentAgent.value = agents.value.find((item) => String(item.agentId) === String(currentAgent.value?.agentId)) || currentAgent.value;
  }
};

const refreshAll = async (options: { initial?: boolean; manual?: boolean } = {}) => {
  if (refreshing.value) return;
  refreshing.value = true;
  if (options.initial) initialLoading.value = true;
  if (options.manual) manualRefreshing.value = true;
  try {
    const requests: Promise<unknown>[] = [loadOverview(), loadAgents()];
    if (detailVisible.value && detailTab.value === 'presence') requests.push(loadPresenceLogs(true));
    if (detailVisible.value && detailTab.value === 'calls') requests.push(loadCalls(true));
    await Promise.all(requests);
    refreshedAt.value = new Date().toLocaleTimeString('zh-CN', { hour12: false });
  } finally {
    refreshing.value = false;
    initialLoading.value = false;
    manualRefreshing.value = false;
  }
};

const handleManualRefresh = () => refreshAll({ manual: true });

const handleQuery = () => {
  syncDateRange();
  queryParams.pageNum = 1;
  refreshAll();
};

const resetQuery = () => {
  queryFormRef.value?.resetFields();
  dateRange.value = [today, today];
  Object.assign(queryParams, { pageNum: 1, pageSize: 20, keyword: undefined, skillGroupId: undefined, status: undefined, enabled: undefined, beginDate: today, endDate: today });
  refreshAll();
};

const openDetail = async (row: AgentMonitorVO) => {
  currentAgent.value = row;
  callQuery.pageNum = 1;
  presenceQuery.pageNum = 1;
  detailTab.value = 'presence';
  detailVisible.value = true;
  await loadPresenceLogs();
};

const loadPresenceLogs = async (silent = false) => {
  if (!currentAgent.value) return;
  if (!silent) presenceLoading.value = true;
  try {
    const res = await listAgentMonitorPresenceLogs(currentAgent.value.agentId, {
      ...presenceQuery,
      beginDate: queryParams.beginDate,
      endDate: queryParams.endDate
    });
    presenceLogs.value = res.rows || [];
    presenceTotal.value = res.total || 0;
  } finally {
    if (!silent) presenceLoading.value = false;
  }
};

const handleDetailTabChange = (name: string | number) => {
  if (name === 'calls' && calls.value.length === 0) loadCalls();
  if (name === 'presence') loadPresenceLogs();
};

const loadCalls = async (silent = false) => {
  if (!currentAgent.value) return;
  if (!silent) detailLoading.value = true;
  try {
    const res = await listAgentMonitorCalls(currentAgent.value.agentId, callQuery);
    calls.value = res.rows || [];
    callTotal.value = res.total || 0;
  } finally {
    if (!silent) detailLoading.value = false;
  }
};

function formatDuration(seconds?: number) {
  const value = Math.max(0, seconds || 0);
  if (value < 60) return `${value}秒`;
  if (value < 3600) return `${Math.floor(value / 60)}分${value % 60}秒`;
  return `${Math.floor(value / 3600)}时${Math.floor((value % 3600) / 60)}分`;
}

function elapsedText(startedAt?: string) {
  if (!startedAt) return '-';
  return formatDuration(Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
}

function directionLabel(direction?: string) {
  return direction === 'INBOUND' ? '呼入' : direction === 'OUTBOUND' ? '外呼' : '内部';
}

function callStateLabel(state?: string) {
  const labels: Record<string, string> = { CREATED: '已创建', RINGING: '振铃中', ANSWERED: '已接听', BRIDGED: '通话中', HELD: '保持中', ENDED: '已结束' };
  return labels[state || ''] || state || '-';
}

function statusTagType(status: AgentMonitorStatus) {
  if (status === 'IDLE') return 'success';
  if (status === 'BUSY') return 'primary';
  if (status === 'NOT_READY') return 'danger';
  if (status === 'AFTER_CALL') return 'warning';
  return 'info';
}

function agentInitial(agent: AgentMonitorVO) {
  const name = agent.agentName?.trim() || agent.agentCode?.trim() || '?';
  return name.slice(0, 1).toUpperCase();
}

function statusLabel(status: AgentMonitorStatus) {
  return { IDLE: '空闲', NOT_READY: '示忙', BUSY: '通话中', AFTER_CALL: '话后整理', OFFLINE: '离线' }[status] || status;
}

function sourceLabel(source: string) {
  const labels: Record<string, string> = {
    SIGN_IN: '签入',
    SIGN_OUT: '签出',
    MANUAL: '人工',
    API: '接口',
    TELEPHONY_EVENT: '电话事件',
    SYSTEM_AUTO: '系统自动'
  };
  return labels[source] || source;
}

onMounted(async () => {
  const groupRes = await listAgentMonitorSkillGroups();
  skillGroups.value = groupRes.data || [];
  await refreshAll({ initial: true });
  timer = setInterval(() => {
    if (!document.hidden) refreshAll();
  }, 10000);
});

onBeforeUnmount(() => {
  if (timer) clearInterval(timer);
});
</script>

<style scoped lang="scss">
.agent-monitor-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  padding: 10px 12px;
  box-sizing: border-box;
  overflow: hidden;
}

.overview-card,
.list-card {
  border: 0;
  border-radius: 14px;
}

.overview-card {
  flex: none;
  :deep(.el-card__body) { padding: 14px 16px; }
}

.page-head,
.head-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.page-head h2 { margin: 0 0 3px; font-size: 17px; font-weight: 500; color: #17243a; }
.page-head p,
.head-actions span { margin: 0; color: #8490a3; font-size: 12px; }

.overview-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(120px, 1fr));
  gap: 10px;
  margin-top: 12px;
}

.overview-item {
  padding: 11px 13px;
  border: 0;
  border-radius: 10px;
  background: var(--el-fill-color-lighter);
}
.overview-item span,
.overview-item small { display: block; color: #8490a3; font-size: 12px; }
.overview-item strong { display: block; margin: 4px 0 2px; color: #17243a; font-size: 21px; font-weight: 500; }
.list-card {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  :deep(.el-card__body) { display: flex; flex-direction: column; height: 100%; padding: 12px 14px; box-sizing: border-box; }
}
.query-form { flex: none; }
.query-form :deep(.el-form-item) { margin-bottom: 10px; }
.query-form :deep(.el-input) { width: 190px; }
.agent-card-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 2px 3px 8px;
}

.agent-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 8px;
}

.agent-monitor-card {
  position: relative;
  padding: 10px;
  overflow: hidden;
  border: 0;
  border-radius: 10px;
  background: var(--el-fill-color-lighter);
  transition: background-color 0.2s, transform 0.2s;
}

.agent-monitor-card:hover {
  background: var(--el-fill-color-light);
  transform: translateY(-1px);
}

.agent-card-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.agent-avatar {
  display: grid;
  flex: 0 0 32px;
  height: 32px;
  place-items: center;
  border-radius: 8px;
  color: #fff;
  font-size: 13px;
  background: #8b97a8;
}

.agent-identity {
  display: grid;
  flex: 1;
  min-width: 0;
  gap: 2px;
}

.agent-name {
  overflow: hidden;
  color: var(--el-text-color-primary);
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agent-identity small,
.agent-card-foot,
.agent-skill span,
.call-panel span,
.agent-metrics span {
  color: var(--el-text-color-secondary);
  font-size: 11px;
}

.agent-skill {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 7px;
  min-width: 0;
}

.agent-skill strong {
  overflow: hidden;
  color: var(--el-text-color-regular);
  font-size: 12px;
  font-weight: 400;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.call-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 34px;
  margin-top: 7px;
  padding: 6px 8px;
  border: 0;
  border-radius: 9px;
  background: var(--el-fill-color-lighter);
}

.call-panel div { display: grid; gap: 2px; }
.call-panel strong { color: var(--el-text-color-primary); font-size: 12px; font-weight: 500; }
.call-panel em { color: var(--el-color-primary); font-size: 12px; font-style: normal; }
.call-panel.active { background: var(--el-fill-color-light); }

.agent-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-top: 7px;
  gap: 4px;
}

.agent-metrics div {
  display: grid;
  gap: 3px;
  padding: 5px 3px;
  border: 0;
  border-radius: 6px;
  background: var(--el-bg-color);
  text-align: center;
}

.agent-metrics strong { color: var(--el-text-color-primary); font-size: 12px; font-weight: 500; }

.agent-card-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 20px;
  margin-top: 5px;
}

.agent-card-foot > span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.warning { color: #e67e22; }

:global(.agent-monitor-drawer .el-drawer__body) { padding: 14px 18px 18px; background: #f6f8fb; }
.detail-metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 12px; }
.detail-metrics div { padding: 11px 12px; border: 0; border-radius: 10px; background: #fff; }
.detail-metrics span { display: block; color: #8490a3; font-size: 12px; }
.detail-metrics strong { color: #17243a; font-size: 19px; font-weight: 500; }
.detail-title { margin-bottom: 10px; color: #25334a; font-size: 14px; }

@media (max-width: 1200px) {
  .overview-grid { grid-template-columns: repeat(3, 1fr); }
  .agent-card-grid { grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
}

@media (max-width: 760px) {
  .agent-card-grid { grid-template-columns: 1fr; }
  .agent-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
