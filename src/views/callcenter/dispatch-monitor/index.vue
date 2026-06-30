<template>
  <div class="dispatch-monitor-page">
    <el-card shadow="never" class="overview-card">
      <div class="page-header">
        <div>
          <h2>调度台</h2>
          <p>统一查看分机注册、坐席状态、通话状态和实时通话拓扑。</p>
        </div>
        <div class="header-actions">
          <el-select v-model="operatorSipAccountId" filterable placeholder="选择本机调度分机" style="width: 250px">
            <el-option
              v-for="item in availableOperatorExtensions"
              :key="item.sipAccountId"
              :label="`${item.extension} - ${item.displayName || item.nodeName || 'SIP分机'}`"
              :value="item.sipAccountId"
            />
          </el-select>
          <el-button
            v-hasPermi="['callcenter:dispatch-control:operator-extension']"
            :disabled="!operatorSipAccountId"
            :loading="operatorSaving"
            @click="handleBindOperatorExtension"
            >绑定本机</el-button
          >
          <el-button v-hasPermi="['callcenter:dispatch-control:call']" :disabled="selectedExtensions.length !== 1" @click="handleSingleCall"
            >单呼</el-button
          >
          <el-button
            v-hasPermi="['callcenter:dispatch-control:group-call']"
            type="success"
            :disabled="selectedExtensions.length < 2"
            @click="handleGroupCall"
            >组呼</el-button
          >
          <el-switch v-model="autoRefresh" active-text="5秒自动刷新" />
          <el-button type="primary" :loading="loading || extensionLoading" @click="loadDispatchData">刷新</el-button>
        </div>
      </div>
      <div class="overview-grid">
        <div>
          <span>活动通话</span><strong>{{ calls.length }}</strong>
        </div>
        <div>
          <span>通话中</span><strong>{{ bridgedCount }}</strong>
        </div>
        <div>
          <span>活动电话腿</span><strong>{{ activeLegCount }}</strong>
        </div>
        <div>
          <span>拓扑异常</span><strong :class="{ danger: staleCount > 0 }">{{ staleCount }}</strong>
        </div>
      </div>
    </el-card>

    <el-card shadow="never" class="extension-card">
      <template #header>
        <div class="section-header">
          <strong>分机资源</strong>
          <div class="extension-summary">
            <span>总数 {{ extensions.length }}</span>
            <span class="success">已注册 {{ registeredExtensionCount }}</span>
            <span>空闲 {{ idleExtensionCount }}</span>
            <span class="danger">未注册 {{ unregisteredExtensionCount }}</span>
          </div>
        </div>
      </template>
      <el-table
        v-loading="extensionLoading"
        :data="extensions"
        row-key="sipAccountId"
        max-height="380"
        @selection-change="handleExtensionSelectionChange"
      >
        <el-table-column type="selection" width="48" :selectable="isDispatchTargetSelectable" />
        <el-table-column label="节点" min-width="150" prop="nodeName" />
        <el-table-column label="分机" width="110" prop="extension" />
        <el-table-column label="显示名称" min-width="150" prop="displayName" />
        <el-table-column label="配置" width="90" align="center">
          <template #default="{ row }"
            ><el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '停用' }}</el-tag></template
          >
        </el-table-column>
        <el-table-column label="SIP 状态" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="registrationTagType(row.registrationStatus)">{{ registrationLabel(row.registrationStatus) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="绑定坐席（可选）" min-width="150">
          <template #default="{ row }">{{ row.agentName || '未绑定' }}</template>
        </el-table-column>
        <el-table-column label="坐席状态" width="110" align="center">
          <template #default="{ row }">{{ presenceLabel(row.agentPresenceStatus) }}</template>
        </el-table-column>
        <el-table-column label="通话状态" width="110" align="center">
          <template #default="{ row }"
            ><el-tag :type="extensionCallTagType(row.callStatus)">{{ extensionCallLabel(row.callStatus) }}</el-tag></template
          >
        </el-table-column>
        <el-table-column label="操作" width="230" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.businessCallId && row.callStatus === 'TALKING'"
              v-hasPermi="['callcenter:dispatch-control:monitor']"
              link
              type="warning"
              @click="handleMonitor(row.businessCallId, row.extension)"
            >
              监听
            </el-button>
            <el-button
              v-if="row.businessCallId && row.callStatus === 'TALKING'"
              v-hasPermi="['callcenter:dispatch-control:whisper']"
              link
              type="warning"
              @click="handleWhisper(row.businessCallId, row.extension)"
            >
              耳语
            </el-button>
            <el-button
              v-if="row.businessCallId && row.callStatus === 'TALKING'"
              v-hasPermi="['callcenter:dispatch-control:barge']"
              link
              type="danger"
              @click="handleBarge(row.businessCallId, row.extension)"
            >
              强插
            </el-button>
            <el-button
              v-if="row.businessCallId && row.callStatus === 'RINGING'"
              v-hasPermi="['callcenter:dispatch-control:pickup']"
              link
              type="success"
              @click="handlePickup(row.businessCallId, row.extension)"
            >
              强接
            </el-button>
            <el-button v-if="row.businessCallId" link type="primary" @click="openTopologyById(row.businessCallId)">通话拓扑</el-button>
            <span v-else>-</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card shadow="never" class="task-card">
      <template #header>
        <div class="section-header">
          <strong>最近调度呼叫</strong>
          <span class="task-tip">单呼和组呼使用独立电话腿 UUID，点击详情可查看每个目标的振铃、接听和失败状态。</span>
        </div>
      </template>
      <el-table v-loading="taskLoading" :data="tasks" row-key="id" max-height="320">
        <el-table-column label="类型" width="90">
          <template #default="{ row }">{{ row.taskType === 'GROUP' ? '组呼' : '单呼' }}</template>
        </el-table-column>
        <el-table-column label="调度分机" width="110" prop="operatorExtension" />
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="taskStateTagType(row.taskState)">{{ taskStateLabel(row.taskState) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="目标统计" min-width="210">
          <template #default="{ row }">
            总计 {{ row.totalCount }}，接听 {{ row.answeredCount }}，失败 {{ row.failedCount }}，取消 {{ row.cancelledCount }}
          </template>
        </el-table-column>
        <el-table-column label="业务通话ID" min-width="230" show-overflow-tooltip prop="businessCallId" />
        <el-table-column label="开始时间" width="175" prop="startedAt" />
        <el-table-column label="操作" width="190" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openTaskDetail(row.id)">详情</el-button>
            <el-button
              v-if="row.taskState === 'STARTING' || row.taskState === 'RUNNING' || row.taskState === 'PARTIAL'"
              v-hasPermi="['callcenter:dispatch-control:stop-group']"
              link
              type="danger"
              @click="handleStopUnanswered(row)"
              >停止未接听</el-button
            >
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!taskLoading && tasks.length === 0" description="暂无调度呼叫任务" />
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
          <template #default="{ row }"
            ><el-tag effect="light">{{ callStatusLabel(row.callStatus) }}</el-tag></template
          >
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
        <el-table-column label="操作" width="370" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openTopology(row)">拓扑</el-button>
            <el-button
              v-if="row.agentExtensions?.length === 1"
              v-hasPermi="['callcenter:dispatch-control:monitor']"
              link
              type="warning"
              @click="handleMonitor(row.businessCallId, row.agentExtensions[0])"
            >
              监听
            </el-button>
            <el-button
              v-if="row.agentExtensions?.length === 1"
              v-hasPermi="['callcenter:dispatch-control:whisper']"
              link
              type="warning"
              @click="handleWhisper(row.businessCallId, row.agentExtensions[0])"
            >
              耳语
            </el-button>
            <el-button
              v-if="row.agentExtensions?.length === 1"
              v-hasPermi="['callcenter:dispatch-control:barge']"
              link
              type="danger"
              @click="handleBarge(row.businessCallId, row.agentExtensions[0])"
            >
              强插
            </el-button>
            <el-button
              v-if="row.callStatus === 'RINGING' && row.agentExtensions?.length === 1"
              v-hasPermi="['callcenter:dispatch-control:pickup']"
              link
              type="success"
              @click="handlePickup(row.businessCallId, row.agentExtensions[0])"
            >
              强接
            </el-button>
            <el-button v-hasPermi="['callcenter:dispatch-control:transfer']" link type="warning" @click="handleForceTransfer(row)">
              强制转接
            </el-button>
            <el-button v-hasPermi="['callcenter:dispatch-control:hangup']" link type="danger" @click="handleForceHangup(row)"> 强制挂断 </el-button>
          </template>
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
          <el-table-column label="终端分机" width="100" prop="endpointExtension" />
          <el-table-column label="UUID" min-width="270" show-overflow-tooltip prop="legUuid" />
          <el-table-column label="主叫" min-width="130" prop="callerNumber" />
          <el-table-column label="被叫" min-width="130" prop="calledNumber" />
          <el-table-column label="状态" width="110" prop="legState" />
          <el-table-column label="活动" width="80">
            <template #default="{ row }"
              ><el-tag :type="row.active ? 'success' : 'info'">{{ row.active ? '是' : '否' }}</el-tag></template
            >
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

    <el-drawer v-model="taskDrawerVisible" title="调度呼叫任务详情" size="68%" append-to-body destroy-on-close>
      <template v-if="currentTask">
        <el-descriptions :column="3" border>
          <el-descriptions-item label="任务类型">{{ currentTask.taskType === 'GROUP' ? '组呼' : '单呼' }}</el-descriptions-item>
          <el-descriptions-item label="任务状态">{{ taskStateLabel(currentTask.taskState) }}</el-descriptions-item>
          <el-descriptions-item label="调度分机">{{ currentTask.operatorExtension }}</el-descriptions-item>
          <el-descriptions-item label="业务通话ID" :span="2">{{ currentTask.businessCallId }}</el-descriptions-item>
          <el-descriptions-item label="调度电话腿UUID">{{ currentTask.operatorLegUuid }}</el-descriptions-item>
          <el-descriptions-item label="开始时间">{{ currentTask.startedAt }}</el-descriptions-item>
          <el-descriptions-item label="结束时间">{{ currentTask.endedAt || '-' }}</el-descriptions-item>
          <el-descriptions-item label="目标统计">
            {{ currentTask.totalCount }} / {{ currentTask.answeredCount }} / {{ currentTask.failedCount }} / {{ currentTask.cancelledCount }}
          </el-descriptions-item>
        </el-descriptions>
        <h3>目标电话腿</h3>
        <el-table v-loading="taskDetailLoading" :data="currentTask.targets || []" row-key="id" border>
          <el-table-column label="目标分机" width="110" prop="targetExtension" />
          <el-table-column label="状态" width="110">
            <template #default="{ row }">
              <el-tag :type="targetStateTagType(row.targetState)">{{ targetStateLabel(row.targetState) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="电话腿UUID" min-width="280" show-overflow-tooltip prop="targetLegUuid" />
          <el-table-column label="振铃时间" width="175" prop="ringingAt" />
          <el-table-column label="接听时间" width="175" prop="answeredAt" />
          <el-table-column label="结束时间" width="175" prop="endedAt" />
          <el-table-column label="失败原因" min-width="220" show-overflow-tooltip prop="failureReason" />
        </el-table>
      </template>
    </el-drawer>
  </div>
</template>

<script setup name="DispatchMonitor" lang="ts">
import {
  bindDispatchOperatorExtension,
  getDispatchCallTopology,
  getDispatchOperatorExtension,
  listDispatchActiveCalls,
  listDispatchExtensionStatuses
} from '@/api/callcenter/dispatch-monitor';
import type {
  DispatchActiveCallVO,
  DispatchCallTopologyVO,
  DispatchExtensionStatusVO,
  DispatchRegistrationStatus,
  DispatchTopologyStatus
} from '@/api/callcenter/dispatch-monitor/types';
import {
  forceHangupDispatchCall,
  forceTransferDispatchCallToExtension,
  startDispatchMonitor,
  startDispatchWhisper,
  startDispatchBarge,
  pickupDispatchCall,
  startDispatchSingleCall,
  startDispatchGroupCall,
  listDispatchCallTasks,
  getDispatchCallTask,
  stopDispatchUnansweredTargets
} from '@/api/callcenter/dispatch-control';
import type { DispatchCallTaskVO } from '@/api/callcenter/dispatch-control';

const loading = ref(false);
const extensionLoading = ref(false);
const taskLoading = ref(false);
const taskDetailLoading = ref(false);
const detailLoading = ref(false);
const autoRefresh = ref(true);
const drawerVisible = ref(false);
const calls = ref<DispatchActiveCallVO[]>([]);
const extensions = ref<DispatchExtensionStatusVO[]>([]);
const operatorSipAccountId = ref<string | number>();
const operatorSaving = ref(false);
const topology = ref<DispatchCallTopologyVO>();
const tasks = ref<DispatchCallTaskVO[]>([]);
const selectedExtensions = ref<DispatchExtensionStatusVO[]>([]);
const taskDrawerVisible = ref(false);
const currentTask = ref<DispatchCallTaskVO>();
let timer: ReturnType<typeof setInterval> | undefined;

const bridgedCount = computed(() => calls.value.filter((item) => item.activeBridgeCount > 0).length);
const activeLegCount = computed(() => calls.value.reduce((total, item) => total + (item.activeLegCount || 0), 0));
const staleCount = computed(() => calls.value.filter((item) => item.topologyStatus === 'STALE').length);
const registeredExtensionCount = computed(() => extensions.value.filter((item) => item.registrationStatus === 'REGISTERED').length);
const unregisteredExtensionCount = computed(() => extensions.value.filter((item) => item.registrationStatus === 'UNREGISTERED').length);
const idleExtensionCount = computed(() => extensions.value.filter((item) => item.callStatus === 'IDLE').length);
const availableOperatorExtensions = computed(() => extensions.value.filter((item) => item.enabled && item.registrationStatus === 'REGISTERED'));

const loadOperatorExtension = async () => {
  const response = await getDispatchOperatorExtension();
  operatorSipAccountId.value = response.data?.configured ? response.data.sipAccountId : undefined;
};

const handleBindOperatorExtension = async () => {
  if (!operatorSipAccountId.value) return;
  operatorSaving.value = true;
  try {
    const response = await bindDispatchOperatorExtension(operatorSipAccountId.value);
    operatorSipAccountId.value = response.data?.sipAccountId;
    ElMessage.success(`本机调度分机已绑定为 ${response.data?.extension || ''}`);
  } finally {
    operatorSaving.value = false;
  }
};

const loadExtensions = async () => {
  extensionLoading.value = true;
  try {
    const response = await listDispatchExtensionStatuses();
    extensions.value = response.data || [];
  } finally {
    extensionLoading.value = false;
  }
};

const loadDispatchData = async () => Promise.all([loadCalls(), loadExtensions(), loadTasks()]);

const loadTasks = async () => {
  taskLoading.value = true;
  try {
    const response = await listDispatchCallTasks();
    tasks.value = response.data || [];
    if (taskDrawerVisible.value && currentTask.value?.id) {
      await loadTaskDetail(currentTask.value.id);
    }
  } finally {
    taskLoading.value = false;
  }
};

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

const openTopologyById = async (businessCallId: string) => {
  drawerVisible.value = true;
  topology.value = undefined;
  await loadTopology(businessCallId);
};

const isDispatchTargetSelectable = (row: DispatchExtensionStatusVO) =>
  row.enabled && row.registrationStatus === 'REGISTERED' && row.callStatus === 'IDLE' && row.sipAccountId !== operatorSipAccountId.value;

const handleExtensionSelectionChange = (rows: DispatchExtensionStatusVO[]) => {
  selectedExtensions.value = rows;
};

const requireOperatorExtension = () => {
  if (!operatorSipAccountId.value) {
    ElMessage.warning('请先绑定当前调度员使用的本机分机');
    return false;
  }
  return true;
};

const handleSingleCall = async () => {
  if (!requireOperatorExtension() || selectedExtensions.value.length !== 1) return;
  const target = selectedExtensions.value[0];
  await ElMessageBox.confirm(`确认使用当前调度分机呼叫 ${target.extension} 吗？双方接听后进入同一调度通话。`, '发起调度单呼', {
    type: 'warning',
    confirmButtonText: '开始呼叫',
    cancelButtonText: '取消'
  });
  const response = await startDispatchSingleCall({ targetExtension: target.extension });
  ElMessage.success(`单呼任务已提交，任务ID：${response.data.id}`);
  await loadDispatchData();
};

const handleGroupCall = async () => {
  if (!requireOperatorExtension() || selectedExtensions.value.length < 2) return;
  const targetExtensions = selectedExtensions.value.map((item) => item.extension);
  await ElMessageBox.confirm(`确认同时呼叫 ${targetExtensions.join('、')} 吗？接听的分机将进入同一组呼会议。`, '发起调度组呼', {
    type: 'warning',
    confirmButtonText: '开始组呼',
    cancelButtonText: '取消'
  });
  const response = await startDispatchGroupCall({ targetExtensions });
  ElMessage.success(`组呼任务已提交，目标 ${response.data.totalCount} 个`);
  await loadDispatchData();
};

const loadTaskDetail = async (taskId: string | number) => {
  taskDetailLoading.value = true;
  try {
    const response = await getDispatchCallTask(taskId);
    currentTask.value = response.data;
  } finally {
    taskDetailLoading.value = false;
  }
};

const openTaskDetail = async (taskId: string | number) => {
  taskDrawerVisible.value = true;
  currentTask.value = undefined;
  await loadTaskDetail(taskId);
};

const handleStopUnanswered = async (row: DispatchCallTaskVO) => {
  await ElMessageBox.confirm('确认停止该任务中尚未接听的目标吗？已经接听并进入通话的分机不会被中断。', '停止未接听目标', {
    type: 'warning',
    confirmButtonText: '确认停止',
    cancelButtonText: '取消'
  });
  await stopDispatchUnansweredTargets(row.id);
  ElMessage.success('未接听目标停止命令已提交');
  await loadDispatchData();
};

const handleForceHangup = async (row: DispatchActiveCallVO) => {
  await ElMessageBox.confirm(`确认强制挂断业务通话 ${row.businessCallId} 吗？该操作会结束客户和全部坐席电话腿。`, '强制挂断确认', {
    type: 'warning',
    confirmButtonText: '确认挂断',
    cancelButtonText: '取消'
  });
  await forceHangupDispatchCall(row.businessCallId);
  ElMessage.success('强制挂断命令已提交');
  await loadCalls();
};

const handleMonitor = async (businessCallId: string, targetExtension: string) => {
  await ElMessageBox.confirm(`确认使用当前用户绑定的调度分机监听分机 ${targetExtension} 吗？提交后请在调度电话上接听。`, '调度监听确认', {
    type: 'warning',
    confirmButtonText: '开始监听',
    cancelButtonText: '取消'
  });
  await startDispatchMonitor(businessCallId, { targetExtension });
  ElMessage.success('监听呼叫已发送到当前调度员分机，请接听');
};

const handleWhisper = async (businessCallId: string, targetExtension: string) => {
  await ElMessageBox.confirm(`确认使用当前用户绑定的调度分机向分机 ${targetExtension} 耳语吗？客户不会听到调度员声音。`, '调度耳语确认', {
    type: 'warning',
    confirmButtonText: '开始耳语',
    cancelButtonText: '取消'
  });
  await startDispatchWhisper(businessCallId, { targetExtension });
  ElMessage.success('耳语呼叫已发送到当前调度员分机，请接听');
};

const handleBarge = async (businessCallId: string, targetExtension: string) => {
  await ElMessageBox.confirm(`确认强插坐席 ${targetExtension} 的当前通话吗？接听后调度员、坐席和客户三方均可互相通话。`, '调度强插确认', {
    type: 'error',
    confirmButtonText: '确认强插',
    cancelButtonText: '取消'
  });
  await startDispatchBarge(businessCallId, { targetExtension });
  ElMessage.success('强插呼叫已发送到当前调度员分机，请接听');
};

const handlePickup = async (businessCallId: string, targetExtension: string) => {
  await ElMessageBox.confirm(`确认将分机 ${targetExtension} 尚未接听的来电强接到当前用户绑定的调度分机吗？原分机将停止振铃。`, '调度强接确认', {
    type: 'warning',
    confirmButtonText: '确认强接',
    cancelButtonText: '取消'
  });
  await pickupDispatchCall(businessCallId, { targetExtension });
  ElMessage.success('强接呼叫已发送到当前调度员分机，请接听');
};

const handleForceTransfer = async (row: DispatchActiveCallVO) => {
  const result = await ElMessageBox.prompt('请输入目标 SIP 分机号', '强制转接', {
    confirmButtonText: '确认转接',
    cancelButtonText: '取消',
    inputPattern: /^[0-9*#+]{2,32}$/,
    inputErrorMessage: '请输入 2-32 位有效分机号'
  });
  await forceTransferDispatchCallToExtension(row.businessCallId, { targetExtension: result.value });
  ElMessage.success('强制转接命令已提交');
  await loadCalls();
};

const formatSeconds = (seconds?: number) => {
  const value = Math.max(0, seconds || 0);
  const minutes = Math.floor(value / 60);
  const rest = value % 60;
  return minutes > 0 ? `${minutes}分${rest}秒` : `${rest}秒`;
};

const directionLabel = (value?: string) => ({ INBOUND: '呼入', OUTBOUND: '呼出', INTERNAL: '内部' })[value || ''] || value || '-';
const callStatusLabel = (value?: string) =>
  ({ CREATED: '创建', RINGING: '振铃', ANSWERED: '已接听', BRIDGED: '通话中' })[value || ''] || value || '-';
const topologyLabel = (value: DispatchTopologyStatus) => ({ NORMAL: '正常', SYNCING: '同步中', STALE: '疑似残留' })[value] || value;
const topologyTagType = (value: DispatchTopologyStatus) => (value === 'NORMAL' ? 'success' : value === 'SYNCING' ? 'warning' : 'danger');
const registrationLabel = (value: DispatchRegistrationStatus) =>
  ({ REGISTERED: '已注册', UNREGISTERED: '未注册', DISABLED: '已停用', NODE_UNAVAILABLE: '节点不可达' })[value] || value;
const registrationTagType = (value: DispatchRegistrationStatus) =>
  value === 'REGISTERED' ? 'success' : value === 'UNREGISTERED' ? 'danger' : value === 'NODE_UNAVAILABLE' ? 'warning' : 'info';
const presenceLabel = (value?: string) =>
  ({ OFFLINE: '未签入', IDLE: '示闲', BUSY: '示忙', AFTER_CALL: '话后处理' })[value || ''] || (value ? value : '未绑定');
const extensionCallLabel = (value?: string) =>
  ({ IDLE: '空闲', DIALING: '呼出中', RINGING: '振铃', TALKING: '通话中', HELD: '保持' })[value || ''] || '-';
const extensionCallTagType = (value?: string) =>
  value === 'TALKING' ? 'danger' : value === 'RINGING' ? 'warning' : value === 'DIALING' ? 'success' : value === 'HELD' ? 'primary' : 'info';
const taskStateLabel = (value?: string) =>
  ({ STARTING: '启动中', RUNNING: '进行中', SUCCESS: '已完成', PARTIAL: '部分成功', FAILED: '失败', CANCELLED: '已取消' })[value || ''] ||
  value ||
  '-';
const taskStateTagType = (value?: string) =>
  value === 'SUCCESS' ? 'success' : value === 'FAILED' ? 'danger' : value === 'PARTIAL' ? 'warning' : value === 'CANCELLED' ? 'info' : 'primary';
const targetStateLabel = (value?: string) =>
  ({ PENDING: '待提交', SUBMITTED: '已提交', RINGING: '振铃中', ANSWERED: '已接听', ENDED: '已结束', FAILED: '失败', CANCELLED: '已取消' })[
    value || ''
  ] ||
  value ||
  '-';
const targetStateTagType = (value?: string) =>
  value === 'ANSWERED' ? 'success' : value === 'FAILED' ? 'danger' : value === 'RINGING' ? 'warning' : value === 'CANCELLED' ? 'info' : 'primary';

const startTimer = () => {
  stopTimer();
  timer = setInterval(() => {
    if (autoRefresh.value && !document.hidden) loadDispatchData();
  }, 5000);
};
const stopTimer = () => {
  if (timer) clearInterval(timer);
  timer = undefined;
};

onMounted(() => {
  loadDispatchData();
  loadOperatorExtension();
  startTimer();
});
onBeforeUnmount(stopTimer);
</script>

<style scoped lang="scss">
.dispatch-monitor-page {
  padding: 16px;
}
.overview-card {
  margin-bottom: 16px;
}
.extension-card {
  margin-bottom: 16px;
}
.task-card {
  margin-bottom: 16px;
}
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.extension-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  color: #606266;
  font-size: 13px;
}
.extension-summary .success {
  color: #67c23a;
}
.extension-summary .danger {
  color: #f56c6c;
}
.task-tip {
  color: #909399;
  font-size: 13px;
  font-weight: 400;
}
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}
.page-header h2 {
  margin: 0 0 8px;
  color: #053b70;
}
.page-header p {
  margin: 0;
  color: #909399;
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}
.overview-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(140px, 1fr));
  gap: 16px;
  margin-top: 20px;
}
.overview-grid > div {
  padding: 18px;
  border: 1px solid #e5eaf2;
  border-radius: 10px;
  background: #f8fbff;
}
.overview-grid span {
  display: block;
  color: #909399;
}
.overview-grid strong {
  display: block;
  margin-top: 8px;
  font-size: 28px;
  color: #053b70;
}
.overview-grid strong.danger {
  color: #f56c6c;
}
.call-summary {
  margin: 16px 0 22px;
}
h3 {
  margin: 24px 0 12px;
  color: #053b70;
}
@media (max-width: 900px) {
  .overview-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .page-header {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
