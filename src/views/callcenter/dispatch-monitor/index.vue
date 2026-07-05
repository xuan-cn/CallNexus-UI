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
            v-hasPermi="['callcenter:dispatch-control:intercom']"
            type="primary"
            :disabled="selectedExtensions.length !== 1"
            @click="handleStartIntercom"
            >对讲</el-button
          >
          <el-button
            v-hasPermi="['callcenter:dispatch-control:group-call']"
            type="success"
            :disabled="selectedExtensions.length < 2"
            @click="handleGroupCall"
            >组呼</el-button
          >
          <el-button
            v-hasPermi="['callcenter:dispatch-control:broadcast']"
            type="warning"
            :disabled="selectedExtensions.length === 0"
            @click="openBroadcastDialog"
            >预录音广播</el-button
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
          <span class="task-tip">单呼、组呼和广播都使用独立目标电话腿 UUID，广播不会创建组呼会议。</span>
        </div>
      </template>
      <el-table v-loading="taskLoading" :data="tasks" row-key="id" max-height="320">
        <el-table-column label="类型" width="90">
          <template #default="{ row }">{{ taskTypeLabel(row.taskType) }}</template>
        </el-table-column>
        <el-table-column label="调度分机" width="110" prop="operatorExtension" />
        <el-table-column label="广播媒体" min-width="150" show-overflow-tooltip prop="mediaName" />
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
              v-if="row.taskType === 'INTERCOM' && (row.taskState === 'STARTING' || row.taskState === 'RUNNING')"
              v-hasPermi="['callcenter:dispatch-control:intercom-talk']"
              link
              type="primary"
              @click="openIntercomTask(row.id)"
              >打开对讲</el-button
            >
            <el-button
              v-if="row.taskType === 'BROADCAST' && (row.taskState === 'STARTING' || row.taskState === 'RUNNING')"
              v-hasPermi="['callcenter:dispatch-control:stop-broadcast']"
              link
              type="danger"
              @click="handleTerminateBroadcast(row)"
              >终止广播</el-button
            >
            <el-button
              v-if="row.taskType === 'INTERCOM' && (row.taskState === 'STARTING' || row.taskState === 'RUNNING')"
              v-hasPermi="['callcenter:dispatch-control:stop-intercom']"
              link
              type="danger"
              @click="handleTerminateIntercom(row)"
              >结束对讲</el-button
            >
            <el-button
              v-if="
                row.taskType !== 'BROADCAST' &&
                row.taskType !== 'INTERCOM' &&
                (row.taskState === 'STARTING' || row.taskState === 'RUNNING' || row.taskState === 'PARTIAL')
              "
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

    <el-dialog v-model="broadcastDialogVisible" title="发起预录音广播" width="620px" append-to-body destroy-on-close>
      <el-alert title="目标分机接听后将播放节点本地音频，播放结束后自动挂断。" type="info" :closable="false" show-icon />
      <el-form label-width="100px" class="broadcast-form">
        <el-form-item label="广播声音" required>
          <el-select v-model="broadcastMediaAssetId" filterable placeholder="选择已发布声音媒体" style="width: 100%">
            <el-option
              v-for="item in broadcastMediaOptions"
              :key="item.id"
              :label="`${item.assetName} (v${item.latestVersionNo || 1})`"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="目标分机">
          <el-tag v-for="item in selectedExtensions" :key="item.sipAccountId" class="broadcast-target-tag">{{ item.extension }}</el-tag>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="broadcastDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="broadcastSubmitting" :disabled="!broadcastMediaAssetId" @click="handleStartBroadcast">开始广播</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="intercomDialogVisible"
      title="单目标调度对讲"
      width="520px"
      append-to-body
      destroy-on-close
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :before-close="handleIntercomDialogClose"
    >
      <div v-if="intercomTask" class="intercom-panel">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="调度分机">{{ intercomTask.operatorExtension }}</el-descriptions-item>
          <el-descriptions-item label="目标分机">{{ intercomTarget?.targetExtension || '-' }}</el-descriptions-item>
          <el-descriptions-item label="连接状态">
            <el-tag :type="intercomReady ? 'success' : intercomTaskEnded ? 'info' : 'warning'">
              {{ intercomTaskEnded ? '已结束' : intercomReady ? '已连接' : '等待双方接听' }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>
        <el-button
          v-hasPermi="['callcenter:dispatch-control:intercom-talk']"
          class="ptt-button"
          :class="{ talking: intercomTalkDesired }"
          :disabled="!intercomReady || intercomTaskEnded"
          @pointerdown.prevent="handleIntercomPress"
          @pointerup.prevent="handleIntercomRelease"
          @pointercancel.prevent="handleIntercomRelease"
          @pointerleave="handleIntercomRelease"
        >
          {{ intercomTalkDesired ? '正在讲话，松开静音' : intercomReady ? '按住说话' : '等待连接' }}
        </el-button>
        <p class="intercom-tip">目标分机默认静音；终端支持自动应答时会直接接通，否则请在目标话机手动接听。</p>
      </div>
      <template #footer>
        <el-button v-if="intercomTaskEnded" @click="closeEndedIntercomDialog">关闭</el-button>
        <el-button v-else type="danger" :loading="intercomTerminating" @click="handleTerminateIntercomTask">结束对讲</el-button>
      </template>
    </el-dialog>

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
          <el-descriptions-item label="任务类型">{{ taskTypeLabel(currentTask.taskType) }}</el-descriptions-item>
          <el-descriptions-item label="任务状态">{{ taskStateLabel(currentTask.taskState) }}</el-descriptions-item>
          <el-descriptions-item label="调度分机">{{ currentTask.operatorExtension }}</el-descriptions-item>
          <el-descriptions-item label="业务通话ID" :span="2">{{ currentTask.businessCallId }}</el-descriptions-item>
          <el-descriptions-item label="调度电话腿UUID">{{ currentTask.operatorLegUuid }}</el-descriptions-item>
          <el-descriptions-item v-if="currentTask.taskType === 'BROADCAST'" label="广播媒体">{{ currentTask.mediaName || '-' }}</el-descriptions-item>
          <el-descriptions-item v-if="currentTask.taskType === 'BROADCAST'" label="节点本地路径" :span="2">{{
            currentTask.mediaPath || '-'
          }}</el-descriptions-item>
          <el-descriptions-item v-if="currentTask.taskType === 'INTERCOM'" label="发言状态">{{
            currentTask.intercomTalking ? '调度分机发言中' : '静音'
          }}</el-descriptions-item>
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
  startDispatchBroadcast,
  startDispatchIntercom,
  listDispatchCallTasks,
  getDispatchCallTask,
  stopDispatchUnansweredTargets,
  terminateDispatchBroadcast,
  setDispatchIntercomTalking,
  terminateDispatchIntercom
} from '@/api/callcenter/dispatch-control';
import type { DispatchCallTaskVO } from '@/api/callcenter/dispatch-control';
import { listMediaAssets } from '@/api/callcenter/media-asset';
import type { MediaAssetVO } from '@/api/callcenter/media-asset/types';

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
const broadcastDialogVisible = ref(false);
const broadcastSubmitting = ref(false);
const broadcastMediaAssetId = ref<string | number>();
const broadcastMediaOptions = ref<MediaAssetVO[]>([]);
const intercomDialogVisible = ref(false);
const intercomTerminating = ref(false);
const intercomTalkDesired = ref(false);
const intercomTask = ref<DispatchCallTaskVO>();
let intercomCommandQueue: Promise<void> = Promise.resolve();
let timer: ReturnType<typeof setInterval> | undefined;
let intercomTimer: ReturnType<typeof setInterval> | undefined;
let intercomPolling = false;

const bridgedCount = computed(() => calls.value.filter((item) => item.activeBridgeCount > 0).length);
const activeLegCount = computed(() => calls.value.reduce((total, item) => total + (item.activeLegCount || 0), 0));
const staleCount = computed(() => calls.value.filter((item) => item.topologyStatus === 'STALE').length);
const registeredExtensionCount = computed(() => extensions.value.filter((item) => item.registrationStatus === 'REGISTERED').length);
const unregisteredExtensionCount = computed(() => extensions.value.filter((item) => item.registrationStatus === 'UNREGISTERED').length);
const idleExtensionCount = computed(() => extensions.value.filter((item) => item.callStatus === 'IDLE').length);
const availableOperatorExtensions = computed(() => extensions.value.filter((item) => item.enabled && item.registrationStatus === 'REGISTERED'));
const intercomTarget = computed(() => intercomTask.value?.targets?.[0]);
const intercomTaskEnded = computed(() => ['SUCCESS', 'PARTIAL', 'FAILED', 'CANCELLED'].includes(intercomTask.value?.taskState || ''));
const intercomReady = computed(
  () => !intercomTaskEnded.value && Boolean(intercomTarget.value?.answered) && intercomTarget.value?.targetState === 'ANSWERED'
);

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
    if (intercomDialogVisible.value && intercomTask.value?.id) {
      await loadIntercomTask(intercomTask.value.id);
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

const handleStartIntercom = async () => {
  if (!requireOperatorExtension() || selectedExtensions.value.length !== 1) return;
  const target = selectedExtensions.value[0];
  await ElMessageBox.confirm(`确认向分机 ${target.extension} 发起对讲吗？目标支持自动应答时会直接接通，否则需要手动接听。`, '发起单目标对讲', {
    type: 'warning',
    confirmButtonText: '开始对讲',
    cancelButtonText: '取消'
  });
  const response = await startDispatchIntercom({ targetExtension: target.extension });
  intercomTask.value = response.data;
  intercomTalkDesired.value = false;
  intercomDialogVisible.value = true;
  startIntercomTimer();
  await loadDispatchData();
};

const loadIntercomTask = async (taskId: string | number) => {
  if (intercomPolling) return;
  intercomPolling = true;
  try {
    const response = await getDispatchCallTask(taskId);
    intercomTask.value = response.data;
    if (intercomTaskEnded.value) {
      intercomTalkDesired.value = false;
      stopIntercomTimer();
    }
  } finally {
    intercomPolling = false;
  }
};

const openIntercomTask = async (taskId: string | number) => {
  await loadIntercomTask(taskId);
  intercomTalkDesired.value = Boolean(intercomTask.value?.intercomTalking);
  intercomDialogVisible.value = true;
  startIntercomTimer();
};

const startIntercomTimer = () => {
  stopIntercomTimer();
  intercomTimer = setInterval(() => {
    if (intercomDialogVisible.value && intercomTask.value?.id && !document.hidden) {
      void loadIntercomTask(intercomTask.value.id);
    }
  }, 1000);
};

const stopIntercomTimer = () => {
  if (intercomTimer) clearInterval(intercomTimer);
  intercomTimer = undefined;
};

const queueIntercomTalk = (talking: boolean) => {
  const taskId = intercomTask.value?.id;
  if (!taskId || intercomTaskEnded.value) return Promise.resolve();
  intercomTalkDesired.value = talking;
  intercomCommandQueue = intercomCommandQueue
    .catch(() => undefined)
    .then(async () => {
      await setDispatchIntercomTalking(taskId, { talking });
      if (intercomTask.value?.id === taskId) intercomTask.value.intercomTalking = talking;
    })
    .catch(() => {
      intercomTalkDesired.value = false;
    });
  return intercomCommandQueue;
};

const handleIntercomPress = (event: PointerEvent) => {
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  if (!intercomReady.value || intercomTalkDesired.value) return;
  void queueIntercomTalk(true);
};

const handleIntercomRelease = () => {
  if (!intercomTalkDesired.value) return;
  void queueIntercomTalk(false);
};

const openBroadcastDialog = async () => {
  if (!requireOperatorExtension() || selectedExtensions.value.length === 0) return;
  const response = await listMediaAssets({ pageNum: 1, pageSize: 1000, enabled: true });
  broadcastMediaOptions.value = (response.rows || []).filter(
    (item) => item.category !== 'CALL_RECORDING' && item.publishStatus !== undefined && ['PUBLISHED', 'PARTIAL'].includes(item.publishStatus)
  );
  if (broadcastMediaOptions.value.length === 0) {
    ElMessage.warning('暂无可用的已发布声音媒体，请先完成媒体发布和节点同步');
    return;
  }
  broadcastMediaAssetId.value = undefined;
  broadcastDialogVisible.value = true;
};

const handleStartBroadcast = async () => {
  if (!broadcastMediaAssetId.value || selectedExtensions.value.length === 0) return;
  broadcastSubmitting.value = true;
  try {
    const response = await startDispatchBroadcast({
      mediaAssetId: broadcastMediaAssetId.value,
      targetExtensions: selectedExtensions.value.map((item) => item.extension)
    });
    broadcastDialogVisible.value = false;
    ElMessage.success(`广播任务已提交，目标 ${response.data.totalCount} 个`);
    await loadDispatchData();
  } finally {
    broadcastSubmitting.value = false;
  }
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

const handleTerminateBroadcast = async (row: DispatchCallTaskVO) => {
  await ElMessageBox.confirm('确认立即终止该广播吗？正在振铃或播放的目标分机都会被挂断。', '终止预录音广播', {
    type: 'warning',
    confirmButtonText: '确认终止',
    cancelButtonText: '取消'
  });
  await terminateDispatchBroadcast(row.id);
  ElMessage.success('广播终止命令已提交');
  await loadDispatchData();
};

const terminateCurrentIntercom = async () => {
  if (!intercomTask.value?.id || intercomTaskEnded.value) return;
  intercomTerminating.value = true;
  try {
    if (intercomTalkDesired.value) await queueIntercomTalk(false);
    await terminateDispatchIntercom(intercomTask.value.id);
    await loadIntercomTask(intercomTask.value.id);
    await loadDispatchData();
  } finally {
    intercomTerminating.value = false;
  }
};

const handleTerminateIntercomTask = async () => {
  await ElMessageBox.confirm('确认结束当前对讲吗？调度分机和目标分机都会挂断。', '结束调度对讲', {
    type: 'warning',
    confirmButtonText: '确认结束',
    cancelButtonText: '取消'
  });
  await terminateCurrentIntercom();
};

const handleTerminateIntercom = async (row: DispatchCallTaskVO) => {
  await ElMessageBox.confirm('确认结束该对讲任务吗？', '结束调度对讲', {
    type: 'warning',
    confirmButtonText: '确认结束',
    cancelButtonText: '取消'
  });
  await terminateDispatchIntercom(row.id);
  if (intercomTask.value?.id === row.id) await loadIntercomTask(row.id);
  await loadDispatchData();
};

const handleIntercomDialogClose = async (done: () => void) => {
  if (intercomTaskEnded.value) {
    done();
    return;
  }
  try {
    await ElMessageBox.confirm('关闭面板前需要结束当前对讲，是否继续？', '结束调度对讲', {
      type: 'warning',
      confirmButtonText: '结束并关闭',
      cancelButtonText: '继续对讲'
    });
    await terminateCurrentIntercom();
    stopIntercomTimer();
    done();
  } catch {
    // 用户选择继续对讲时保留面板。
  }
};

const closeEndedIntercomDialog = () => {
  stopIntercomTimer();
  intercomDialogVisible.value = false;
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
const taskTypeLabel = (value?: string) => ({ SINGLE: '单呼', GROUP: '组呼', BROADCAST: '预录音广播', INTERCOM: '对讲' })[value || ''] || value || '-';
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
onBeforeUnmount(() => {
  stopTimer();
  stopIntercomTimer();
});
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
.broadcast-form {
  margin-top: 20px;
}
.broadcast-target-tag {
  margin: 0 8px 8px 0;
}
.intercom-panel {
  text-align: center;
}
.ptt-button {
  width: 220px;
  height: 220px;
  margin: 28px auto 16px;
  border-radius: 50%;
  border: 8px solid #d9e7f5;
  background: #053b70;
  color: #fff;
  font-size: 22px;
  font-weight: 600;
  touch-action: none;
  user-select: none;
}
.ptt-button:hover,
.ptt-button:focus {
  background: #064a8c;
  color: #fff;
}
.ptt-button.talking {
  border-color: #fbc4c4;
  background: #e34d59;
}
.intercom-tip {
  margin: 0;
  color: #909399;
  line-height: 1.7;
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
