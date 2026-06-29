<template>
  <div class="dispatch-monitor-page">
    <el-card shadow="never" class="overview-card">
      <div class="page-header">
        <div>
          <h2>调度通话监控</h2>
          <p>第一阶段测试页：以业务通话为入口查看实时电话腿、桥接关系和坐席参与状态。</p>
        </div>
        <div class="header-actions">
          <el-switch v-model="autoRefresh" active-text="5秒自动刷新" />
          <el-button type="primary" :loading="loading" @click="loadCalls">刷新</el-button>
        </div>
      </div>
      <div class="overview-grid">
        <div><span>活动通话</span><strong>{{ calls.length }}</strong></div>
        <div><span>通话中</span><strong>{{ bridgedCount }}</strong></div>
        <div><span>活动电话腿</span><strong>{{ activeLegCount }}</strong></div>
        <div><span>拓扑异常</span><strong :class="{ danger: staleCount > 0 }">{{ staleCount }}</strong></div>
      </div>
    </el-card>

    <el-card shadow="never">
      <el-table v-loading="loading" :data="calls" row-key="businessCallId">
        <el-table-column label="业务通话" min-width="230" show-overflow-tooltip prop="businessCallId" />
        <el-table-column label="方向" width="90">
          <template #default="{ row }">{{ directionLabel(row.direction) }}</template>
        </el-table-column>
        <el-table-column label="主叫" min-width="130" prop="callerNumber" />
        <el-table-column label="被叫" min-width="130" prop="calledNumber" />
        <el-table-column label="坐席" min-width="130">
          <template #default="{ row }">{{ row.agentExtensions?.join('、') || row.ownerAgentExtension || '-' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }"><el-tag effect="light">{{ callStatusLabel(row.callStatus) }}</el-tag></template>
        </el-table-column>
        <el-table-column label="持续时间" width="100" align="center">
          <template #default="{ row }">{{ formatSeconds(row.elapsedSeconds) }}</template>
        </el-table-column>
        <el-table-column label="电话腿/桥接" width="120" align="center">
          <template #default="{ row }">{{ row.activeLegCount }} / {{ row.activeBridgeCount }}</template>
        </el-table-column>
        <el-table-column label="拓扑状态" min-width="160">
          <template #default="{ row }">
            <el-tooltip :content="row.topologyMessage" placement="top">
              <el-tag :type="topologyTagType(row.topologyStatus)" effect="light">{{ topologyLabel(row.topologyStatus) }}</el-tag>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="开始时间" width="175" prop="startedAt" />
        <el-table-column label="操作" width="90" fixed="right">
          <template #default="{ row }"><el-button link type="primary" @click="openTopology(row)">拓扑</el-button></template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!loading && calls.length === 0" description="当前没有活动通话" />
    </el-card>

    <el-drawer v-model="drawerVisible" title="实时通话拓扑" size="76%" append-to-body destroy-on-close>
      <template v-if="topology">
        <el-alert
          :title="topology.call.topologyMessage"
          :type="topology.call.topologyStatus === 'STALE' ? 'error' : topology.call.topologyStatus === 'SYNCING' ? 'warning' : 'success'"
          :closable="false"
          show-icon
        />
        <el-descriptions class="call-summary" :column="3" border>
          <el-descriptions-item label="业务通话ID" :span="2">{{ topology.call.businessCallId }}</el-descriptions-item>
          <el-descriptions-item label="FreeSWITCH节点">{{ topology.call.nodeId || '-' }}</el-descriptions-item>
          <el-descriptions-item label="主叫">{{ topology.call.callerNumber || '-' }}</el-descriptions-item>
          <el-descriptions-item label="被叫">{{ topology.call.calledNumber || '-' }}</el-descriptions-item>
          <el-descriptions-item label="当前归属坐席">{{ topology.call.ownerAgentExtension || '-' }}</el-descriptions-item>
        </el-descriptions>

        <h3>电话腿</h3>
        <el-table :data="topology.legs" row-key="legUuid" border>
          <el-table-column label="角色" width="120" prop="legRole" />
          <el-table-column label="分机" width="100" prop="agentExtension" />
          <el-table-column label="UUID" min-width="270" show-overflow-tooltip prop="legUuid" />
          <el-table-column label="主叫" min-width="130" prop="callerNumber" />
          <el-table-column label="被叫" min-width="130" prop="calledNumber" />
          <el-table-column label="状态" width="110" prop="legState" />
          <el-table-column label="活动" width="80">
            <template #default="{ row }"><el-tag :type="row.active ? 'success' : 'info'">{{ row.active ? '是' : '否' }}</el-tag></template>
          </el-table-column>
          <el-table-column label="保持时间" width="175" prop="heldAt" />
        </el-table>

        <h3>桥接关系</h3>
        <el-table :data="topology.bridges" row-key="id" border>
          <el-table-column label="类型" width="130" prop="bridgeType" />
          <el-table-column label="左侧电话腿" min-width="270" show-overflow-tooltip prop="leftLegUuid" />
          <el-table-column label="右侧电话腿" min-width="270" show-overflow-tooltip prop="rightLegUuid" />
          <el-table-column label="状态" width="120" prop="bridgeState" />
          <el-table-column label="开始时间" width="175" prop="startedAt" />
          <el-table-column label="结束时间" width="175" prop="endedAt" />
        </el-table>

        <h3>坐席参与记录</h3>
        <el-table :data="topology.agentSessions" row-key="id" border>
          <el-table-column label="坐席分机" width="120" prop="agentExtension" />
          <el-table-column label="角色" width="140" prop="role" />
          <el-table-column label="坐席电话腿" min-width="270" show-overflow-tooltip prop="agentLegUuid" />
          <el-table-column label="状态" width="120" prop="sessionState" />
          <el-table-column label="前端可见" width="100">
            <template #default="{ row }">{{ row.visible ? '是' : '否' }}</template>
          </el-table-column>
          <el-table-column label="加入时间" width="175" prop="joinedAt" />
          <el-table-column label="离开时间" width="175" prop="leftAt" />
        </el-table>
      </template>
    </el-drawer>
  </div>
</template>

<script setup name="DispatchMonitor" lang="ts">
import { getDispatchCallTopology, listDispatchActiveCalls } from '@/api/callcenter/dispatch-monitor';
import type { DispatchActiveCallVO, DispatchCallTopologyVO, DispatchTopologyStatus } from '@/api/callcenter/dispatch-monitor/types';

const loading = ref(false);
const detailLoading = ref(false);
const autoRefresh = ref(true);
const drawerVisible = ref(false);
const calls = ref<DispatchActiveCallVO[]>([]);
const topology = ref<DispatchCallTopologyVO>();
let timer: ReturnType<typeof setInterval> | undefined;

const bridgedCount = computed(() => calls.value.filter((item) => item.activeBridgeCount > 0).length);
const activeLegCount = computed(() => calls.value.reduce((total, item) => total + (item.activeLegCount || 0), 0));
const staleCount = computed(() => calls.value.filter((item) => item.topologyStatus === 'STALE').length);

const loadCalls = async () => {
  loading.value = true;
  try {
    const response = await listDispatchActiveCalls();
    calls.value = response.data || [];
    if (drawerVisible.value && topology.value?.call.businessCallId) {
      await loadTopology(topology.value.call.businessCallId);
    }
  } finally {
    loading.value = false;
  }
};

const loadTopology = async (businessCallId: string) => {
  detailLoading.value = true;
  try {
    const response = await getDispatchCallTopology(businessCallId);
    topology.value = response.data;
  } finally {
    detailLoading.value = false;
  }
};

const openTopology = async (row: DispatchActiveCallVO) => {
  drawerVisible.value = true;
  topology.value = undefined;
  await loadTopology(row.businessCallId);
};

const formatSeconds = (seconds?: number) => {
  const value = Math.max(0, seconds || 0);
  const minutes = Math.floor(value / 60);
  const rest = value % 60;
  return minutes > 0 ? `${minutes}分${rest}秒` : `${rest}秒`;
};

const directionLabel = (value?: string) => ({ INBOUND: '呼入', OUTBOUND: '呼出', INTERNAL: '内部' })[value || ''] || value || '-';
const callStatusLabel = (value?: string) => ({ CREATED: '创建', RINGING: '振铃', ANSWERED: '已接听', BRIDGED: '通话中' })[value || ''] || value || '-';
const topologyLabel = (value: DispatchTopologyStatus) => ({ NORMAL: '正常', SYNCING: '同步中', STALE: '疑似残留' })[value] || value;
const topologyTagType = (value: DispatchTopologyStatus) => (value === 'NORMAL' ? 'success' : value === 'SYNCING' ? 'warning' : 'danger');

const startTimer = () => {
  stopTimer();
  timer = setInterval(() => {
    if (autoRefresh.value && !document.hidden) loadCalls();
  }, 5000);
};
const stopTimer = () => {
  if (timer) clearInterval(timer);
  timer = undefined;
};

onMounted(() => {
  loadCalls();
  startTimer();
});
onBeforeUnmount(stopTimer);
</script>

<style scoped lang="scss">
.dispatch-monitor-page { padding: 16px; }
.overview-card { margin-bottom: 16px; }
.page-header { display: flex; align-items: center; justify-content: space-between; gap: 20px; }
.page-header h2 { margin: 0 0 8px; color: #053b70; }
.page-header p { margin: 0; color: #909399; }
.header-actions { display: flex; align-items: center; gap: 16px; }
.overview-grid { display: grid; grid-template-columns: repeat(4, minmax(140px, 1fr)); gap: 16px; margin-top: 20px; }
.overview-grid > div { padding: 18px; border: 1px solid #e5eaf2; border-radius: 10px; background: #f8fbff; }
.overview-grid span { display: block; color: #909399; }
.overview-grid strong { display: block; margin-top: 8px; font-size: 28px; color: #053b70; }
.overview-grid strong.danger { color: #f56c6c; }
.call-summary { margin: 16px 0 22px; }
h3 { margin: 24px 0 12px; color: #053b70; }
@media (max-width: 900px) {
  .overview-grid { grid-template-columns: repeat(2, 1fr); }
  .page-header { align-items: flex-start; flex-direction: column; }
}
</style>
