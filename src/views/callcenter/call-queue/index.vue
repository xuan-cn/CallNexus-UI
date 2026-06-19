<template>
  <div class="p-2">
    <el-card shadow="hover">
      <template #header>
        <el-button v-hasPermi="['callcenter:call-queue:create']" type="primary" plain icon="Plus" @click="handleAdd">新增队列</el-button>
      </template>
      <el-table v-loading="loading" :data="queues">
        <el-table-column label="队列编码" prop="queueCode" min-width="140" />
        <el-table-column label="队列名称" prop="queueName" min-width="160" />
        <el-table-column label="技能组" prop="skillGroupName" min-width="160" />
        <el-table-column label="节点组" prop="nodeGroupName" min-width="160" />
        <el-table-column label="分配策略" min-width="140"
          ><template #default="{ row }">{{ strategyLabel(row.strategy) }}</template></el-table-column
        >
        <el-table-column label="最大等待" width="100"
          ><template #default="{ row }">{{ row.maxWaitSeconds }} 秒</template></el-table-column
        >
        <el-table-column label="同步状态" width="140">
          <template #default="{ row }">
            <el-tooltip :disabled="!hasSyncError(row)" :content="row.syncError" placement="top">
              <el-tag :type="syncTagType(row.syncStatus)" :class="{ 'sync-error-tag': hasSyncError(row) }" @click="showSyncError(row)">
                {{ syncLabel(row.syncStatus) }}
              </el-tag>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }"
            ><el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '停用' }}</el-tag></template
          >
        </el-table-column>
        <el-table-column label="操作" width="200" align="center">
          <template #default="{ row }">
            <el-button v-hasPermi="['callcenter:call-queue:update']" link type="primary" icon="Edit" @click="handleUpdate(row)" />
            <el-button v-hasPermi="['callcenter:call-queue:update']" link type="success" :loading="syncingId === row.id" @click="handleSync(row)">
              同步
            </el-button>
            <el-button v-hasPermi="['callcenter:call-queue:delete']" link type="danger" icon="Delete" @click="handleDelete(row)" />
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-drawer v-model="dialog.visible" :title="dialog.title" size="82%" append-to-body destroy-on-close>
      <el-alert class="queue-drawer-tip" type="info" :closable="false" title="队列将来电按分配策略送给技能组中的在线坐席。" />
      <div class="queue-dialog-layout">
        <div class="queue-form-panel">
          <el-form ref="formRef" :model="form" :rules="rules" label-width="120px">
        <el-row :gutter="16">
          <el-col :span="12"
            ><el-form-item label="队列编码" prop="queueCode"><el-input v-model="form.queueCode" placeholder="例如 SUPPORT_QUEUE" /></el-form-item
          ></el-col>
          <el-col :span="12"
            ><el-form-item label="队列名称" prop="queueName"><el-input v-model="form.queueName" /></el-form-item
          ></el-col>
          <el-col :span="12"
            ><el-form-item label="FreeSWITCH节点组" prop="nodeGroupId"
              ><el-select v-model="form.nodeGroupId" style="width: 100%"
                ><el-option v-for="item in nodeGroups" :key="item.id" :label="item.groupName" :value="item.id" /></el-select></el-form-item
          ></el-col>
          <el-col :span="12"
            ><el-form-item label="接听技能组" prop="skillGroupId"
              ><el-select v-model="form.skillGroupId" style="width: 100%"
                ><el-option v-for="item in skillGroups" :key="item.id" :label="item.groupName" :value="item.id" /></el-select></el-form-item
          ></el-col>
          <el-col :span="12"
            ><el-form-item label="分配策略" prop="strategy"
              ><el-select v-model="form.strategy" style="width: 100%"
                ><el-option v-for="item in strategies" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item
          ></el-col>
          <el-col :span="12"
            ><el-form-item label="队列等待音"
              ><el-select v-model="form.waitMediaId" clearable style="width: 100%"
                ><el-option v-for="item in mediaOptions" :key="item.id" :label="item.assetName" :value="item.id" /></el-select></el-form-item
          ></el-col>
          <el-col :span="12">
            <el-form-item label="默认主叫">
              <el-select v-model="form.callerNumberId" clearable filterable style="width: 100%" placeholder="队列回呼/后续外呼使用">
                <el-option v-for="item in callerNumberOptions" :key="item.id" :label="callerNumberLabel(item)" :value="item.id" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-collapse>
          <el-collapse-item title="分配与超时" name="routing">
            <el-row :gutter="16">
              <el-col :span="12"
                ><el-form-item label="最大等待"
                  ><el-input-number v-model="form.maxWaitSeconds" :min="10" :max="86400" /><span class="unit"
                    >秒，逐个分配时必须大于振铃超时</span
                  ></el-form-item
                ></el-col
              >
              <el-col :span="12"
                ><el-form-item label="振铃超时"
                  ><el-input-number v-model="form.ringTimeoutSeconds" :min="5" :max="300" /><span class="unit"
                    >秒，写入 FreeSWITCH leg_timeout</span
                  ></el-form-item
                ></el-col
              >
              <el-col :span="12"
                ><el-form-item label="最大未接次数"
                  ><el-input-number v-model="form.maxNoAnswer" :min="0" :max="100" /><span class="unit">由 CallNexus 控制</span></el-form-item
                ></el-col
              >
              <el-col :span="12"
                ><el-form-item label="话后整理"
                  ><el-input-number v-model="form.wrapUpSeconds" :min="0" :max="3600" /><span class="unit"
                    >秒，结束后自动示闲；0 表示立即示闲</span
                  ></el-form-item
                ></el-col
              >
              <el-col :span="12">
                <el-form-item label="坐席未接">
                  <el-select v-model="form.agentNoAnswerAction" style="width: 100%">
                    <el-option label="继续找下一个坐席" value="NEXT_AGENT" />
                    <el-option label="坐席置忙/暂停分配" value="BREAK_AGENT" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
          </el-collapse-item>
          <el-collapse-item title="等待与退出处理" name="exit">
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="强制等待">
                  <el-input-number v-model="form.forceWaitSeconds" :min="0" :max="3600" />
                  <span class="unit">秒，入队前先等待</span>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="超时处理">
                  <el-select v-model="form.timeoutAction" style="width: 100%" @change="form.timeoutTarget = undefined">
                    <el-option label="直接挂机" value="HANGUP" />
                    <el-option label="继续等待" value="CONTINUE" />
                    <el-option label="转语音留言" value="VOICEMAIL" />
                    <el-option label="转 IVR" value="IVR" />
                    <el-option label="转固定分机" value="EXTENSION" />
                    <el-option label="转其他队列" value="QUEUE" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col v-if="needsTarget(form.timeoutAction)" :span="12">
                <el-form-item label="超时目标">
                  <el-select v-if="form.timeoutAction === 'VOICEMAIL'" v-model="form.timeoutTarget" filterable style="width: 100%">
                    <el-option v-for="item in voiceMailBoxes" :key="item.id" :label="item.boxName" :value="String(item.id)" />
                  </el-select>
                  <el-select v-else-if="form.timeoutAction === 'IVR'" v-model="form.timeoutTarget" filterable style="width: 100%">
                    <el-option v-for="item in ivrFlows" :key="item.id" :label="item.flowName" :value="String(item.id)" />
                  </el-select>
                  <el-select v-else-if="form.timeoutAction === 'QUEUE'" v-model="form.timeoutTarget" filterable style="width: 100%">
                    <el-option v-for="item in queues" :key="item.id" :label="item.queueName" :value="String(item.id)" />
                  </el-select>
                  <el-input v-else v-model="form.timeoutTarget" placeholder="请输入目标分机" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="无坐席处理">
                  <el-select v-model="form.noAgentAction" style="width: 100%" @change="form.noAgentTarget = undefined">
                    <el-option label="继续等待" value="WAIT" />
                    <el-option label="直接挂机" value="HANGUP" />
                    <el-option label="转语音留言" value="VOICEMAIL" />
                    <el-option label="转 IVR" value="IVR" />
                    <el-option label="转固定分机" value="EXTENSION" />
                    <el-option label="转其他队列" value="QUEUE" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col v-if="needsTarget(form.noAgentAction)" :span="12">
                <el-form-item label="无坐席目标">
                  <el-select v-if="form.noAgentAction === 'VOICEMAIL'" v-model="form.noAgentTarget" filterable style="width: 100%">
                    <el-option v-for="item in voiceMailBoxes" :key="item.id" :label="item.boxName" :value="String(item.id)" />
                  </el-select>
                  <el-select v-else-if="form.noAgentAction === 'IVR'" v-model="form.noAgentTarget" filterable style="width: 100%">
                    <el-option v-for="item in ivrFlows" :key="item.id" :label="item.flowName" :value="String(item.id)" />
                  </el-select>
                  <el-select v-else-if="form.noAgentAction === 'QUEUE'" v-model="form.noAgentTarget" filterable style="width: 100%">
                    <el-option v-for="item in queues" :key="item.id" :label="item.queueName" :value="String(item.id)" />
                  </el-select>
                  <el-input v-else v-model="form.noAgentTarget" placeholder="请输入目标分机" />
                </el-form-item>
              </el-col>
            </el-row>
          </el-collapse-item>
          <el-collapse-item title="高级体验" name="experience">
            <el-row :gutter="16">
              <el-col :span="12"><el-form-item label="隐藏来电"><el-switch v-model="form.maskCallerNumber" /></el-form-item></el-col>
              <el-col :span="12"><el-form-item label="手动接听"><el-switch v-model="form.manualAnswer" /></el-form-item></el-col>
              <el-col :span="12">
                <el-form-item label="排队提醒">
                  <el-switch v-model="form.queueAnnounceEnabled" />
                  <span class="form-tip">启用后按间隔播放提醒音</span>
                </el-form-item>
              </el-col>
              <el-col v-if="form.queueAnnounceEnabled" :span="12">
                <el-form-item label="提醒间隔">
                  <el-input-number v-model="form.queueAnnounceInterval" :min="5" :max="3600" /><span class="unit">秒</span>
                </el-form-item>
              </el-col>
              <el-col v-if="form.queueAnnounceEnabled" :span="12">
                <el-form-item label="提醒语音">
                  <el-select v-model="form.queueAnnounceMediaId" clearable style="width: 100%">
                    <el-option v-for="item in mediaOptions" :key="item.id" :label="item.assetName" :value="item.id" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="接通动作">
                  <el-select v-model="form.answerAction" style="width: 100%">
                    <el-option label="无动作" value="NONE" />
                    <el-option label="播报工号" value="PLAY_AGENT_NUMBER" />
                    <el-option label="播放语音" value="PLAY_MEDIA" />
                  </el-select>
                  <span class="form-tip">第一版保存配置，后续接通事件链路执行</span>
                </el-form-item>
              </el-col>
              <el-col v-if="form.answerAction === 'PLAY_MEDIA'" :span="12">
                <el-form-item label="接通语音">
                  <el-select v-model="form.answerMediaId" clearable style="width: 100%">
                    <el-option v-for="item in promptMediaOptions" :key="item.id" :label="item.assetName" :value="item.id" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="挂机按键">
                  <el-select v-model="form.hangupKeyAction" style="width: 100%">
                    <el-option label="不采集" value="NONE" />
                    <el-option label="采集坐席按键" value="AGENT" />
                    <el-option label="采集客户按键" value="CALLER" />
                  </el-select>
                  <span class="form-tip">第一版保存配置，满意度/按键流后续执行</span>
                </el-form-item>
              </el-col>
            </el-row>
          </el-collapse-item>
          <el-collapse-item title="预留能力" name="reserved">
            <el-row :gutter="16">
              <el-col :span="12"><el-form-item label="遇忙转手机"><el-switch v-model="form.busyTransferMobile" /></el-form-item></el-col>
              <el-col v-if="form.busyTransferMobile" :span="12"><el-form-item label="手机号码"><el-input v-model="form.busyTransferNumber" /></el-form-item></el-col>
              <el-col :span="12"><el-form-item label="超时转手机"><el-switch v-model="form.agentTimeoutTransferMobile" /></el-form-item></el-col>
              <el-col v-if="form.agentTimeoutTransferMobile" :span="12"><el-form-item label="超时手机"><el-input v-model="form.agentTimeoutTransferNumber" /></el-form-item></el-col>
              <el-col :span="12"><el-form-item label="记忆坐席"><el-switch v-model="form.stickyAgentEnabled" /></el-form-item></el-col>
            </el-row>
          </el-collapse-item>
        </el-collapse>
        <el-form-item class="mt-4" label="状态"><el-switch v-model="form.enabled" active-text="启用" inactive-text="停用" /></el-form-item>
        <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" :rows="3" maxlength="500" /></el-form-item>
          </el-form>
        </div>
        <aside class="queue-guide-panel">
          <div class="guide-card">
            <div class="guide-title">执行流程</div>
            <ol class="flow-list">
              <li v-for="(step, index) in queueExecutionSteps" :key="index">
                <span class="flow-index">{{ index + 1 }}</span>
                <span>{{ step }}</span>
              </li>
            </ol>
          </div>
          <div class="guide-card">
            <div class="guide-title">当前配置说明</div>
            <div class="guide-item">
              <span class="guide-label">分配策略</span>
              <span>{{ strategyGuide }}</span>
            </div>
            <div class="guide-item">
              <span class="guide-label">等待音</span>
              <span>{{ selectedWaitMediaName || '未选择，使用 FreeSWITCH 默认等待音' }}</span>
            </div>
            <div class="guide-item">
              <span class="guide-label">排队提醒</span>
              <span>{{ queueAnnounceGuide }}</span>
            </div>
            <div class="guide-item">
              <span class="guide-label">超时去向</span>
              <span>{{ timeoutGuide }}</span>
            </div>
            <div class="guide-item">
              <span class="guide-label">无坐席</span>
              <span>{{ noAgentGuide }}</span>
            </div>
          </div>
          <div class="guide-card">
            <div class="guide-title">已生效能力</div>
            <div class="capability-list">
              <el-tag v-for="item in activeCapabilities" :key="item" size="small" type="success">{{ item }}</el-tag>
            </div>
          </div>
          <div class="reserved-note">
            <div class="reserved-note-title">部分高级项是预留配置</div>
            <div class="reserved-note-content">
              手动接听、遇忙转手机、接通后播报/播放语音、挂机按键采集、坐席超时转手机和记忆坐席当前只保存配置，后续接入事件链路后再执行。
            </div>
          </div>
        </aside>
      </div>
      <template #footer>
        <div class="drawer-footer">
          <el-button @click="dialog.visible = false">取消</el-button>
          <el-button type="primary" @click="submit">保存</el-button>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup name="CallQueue" lang="ts">
import { createCallQueue, deleteCallQueue, getCallQueue, listCallQueues, syncCallQueue, updateCallQueue } from '@/api/callcenter/call-queue';
import { CallQueueForm, CallQueueVO, QueueStrategy } from '@/api/callcenter/call-queue/types';
import { listSkillGroups } from '@/api/callcenter/skill-group';
import { SkillGroupVO } from '@/api/callcenter/skill-group/types';
import { listNodeGroups } from '@/api/callcenter/freeswitch-node-group';
import { NodeGroupVO } from '@/api/callcenter/freeswitch-node-group/types';
import { listMediaAssets } from '@/api/callcenter/media-asset';
import { MediaAssetVO } from '@/api/callcenter/media-asset/types';
import { getCallCenterConfigGroup } from '@/api/callcenter/callcenter-config';
import { listPhoneNumbers } from '@/api/callcenter/phone-number';
import type { PhoneNumberVO } from '@/api/callcenter/phone-number/types';
import { listIvrFlows } from '@/api/callcenter/ivr-flow';
import type { IvrFlowVO } from '@/api/callcenter/ivr-flow/types';
import { listVoiceMailBoxes } from '@/api/callcenter/voicemail';
import type { VoiceMailBoxVO } from '@/api/callcenter/voicemail/types';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;
const loading = ref(false);
const syncingId = ref<string | number>();
const queues = ref<CallQueueVO[]>([]);
const skillGroups = ref<SkillGroupVO[]>([]);
const nodeGroups = ref<NodeGroupVO[]>([]);
const mediaOptions = ref<MediaAssetVO[]>([]);
const promptMediaOptions = ref<MediaAssetVO[]>([]);
const ivrFlows = ref<IvrFlowVO[]>([]);
const voiceMailBoxes = ref<VoiceMailBoxVO[]>([]);
const callerNumberOptions = ref<PhoneNumberVO[]>([]);
const formRef = ref<ElFormInstance>();
const dialog = reactive({ visible: false, title: '' });
const strategies: Array<{ label: string; value: QueueStrategy }> = [
  { label: '最长空闲坐席', value: 'LONGEST_IDLE_AGENT' },
  { label: '轮询', value: 'ROUND_ROBIN' },
  { label: '按优先级顺序', value: 'TOP_DOWN' },
  { label: '全部振铃', value: 'RING_ALL' }
];
const queueDefaults = reactive({
  maxWaitSeconds: 300,
  ringTimeoutSeconds: 20,
  maxNoAnswer: 3,
  wrapUpSeconds: 10
});
const initialForm = (): CallQueueForm => ({
  id: undefined,
  queueCode: '',
  queueName: '',
  nodeGroupId: '',
  skillGroupId: '',
  strategy: 'LONGEST_IDLE_AGENT',
  waitMediaId: undefined,
  callerNumberId: undefined,
  maskCallerNumber: false,
  manualAnswer: false,
  busyTransferMobile: false,
  busyTransferNumber: '',
  forceWaitSeconds: 0,
  answerAction: 'NONE',
  answerMediaId: undefined,
  hangupKeyAction: 'NONE',
  timeoutAction: 'HANGUP',
  timeoutTarget: undefined,
  noAgentAction: 'WAIT',
  noAgentTarget: undefined,
  agentNoAnswerAction: 'NEXT_AGENT',
  agentTimeoutTransferMobile: false,
  agentTimeoutTransferNumber: '',
  stickyAgentEnabled: false,
  queueAnnounceEnabled: false,
  queueAnnounceInterval: 30,
  queueAnnounceMediaId: undefined,
  maxWaitSeconds: queueDefaults.maxWaitSeconds,
  ringTimeoutSeconds: queueDefaults.ringTimeoutSeconds,
  maxNoAnswer: queueDefaults.maxNoAnswer,
  wrapUpSeconds: queueDefaults.wrapUpSeconds,
  enabled: true,
  remark: '',
  version: undefined
});
const form = reactive<CallQueueForm>(initialForm());
const rules = {
  queueCode: [{ required: true, pattern: /^[A-Za-z0-9_-]{2,32}$/, message: '请输入合法队列编码', trigger: 'blur' }],
  queueName: [{ required: true, message: '请输入队列名称', trigger: 'blur' }],
  nodeGroupId: [{ required: true, message: '请选择 FreeSWITCH 节点组', trigger: 'change' }],
  skillGroupId: [{ required: true, message: '请选择接听技能组', trigger: 'change' }],
  strategy: [{ required: true, message: '请选择分配策略', trigger: 'change' }]
};
const strategyLabel = (value: QueueStrategy) => strategies.find((item) => item.value === value)?.label || value;
const syncLabel = (value: CallQueueVO['syncStatus']) =>
  ({ NOT_SYNCED: '未同步', SYNCED: '已同步', PARTIAL: '部分成功', FAILED: '失败' })[value] || value;
const syncTagType = (value: CallQueueVO['syncStatus']) =>
  value === 'SYNCED' ? 'success' : value === 'PARTIAL' ? 'warning' : value === 'FAILED' ? 'danger' : 'info';
const hasSyncError = (row: CallQueueVO) => ['FAILED', 'PARTIAL'].includes(row.syncStatus || '') && !!row.syncError;
const numberConfigValue = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const callerNumberLabel = (item: PhoneNumberVO) => `${item.number} - ${item.numberName || item.gatewayName || '主叫号码'}`;
const needsTarget = (action?: string) => ['VOICEMAIL', 'IVR', 'EXTENSION', 'QUEUE'].includes(action || '');
const actionLabelMap: Record<string, string> = {
  HANGUP: '直接挂机',
  CONTINUE: '继续等待',
  VOICEMAIL: '转语音留言',
  IVR: '转 IVR',
  EXTENSION: '转固定分机',
  QUEUE: '转其他队列',
  WAIT: '继续等待'
};
const selectedWaitMediaName = computed(() => mediaOptions.value.find((item) => item.id === form.waitMediaId)?.assetName);
const selectedQueueAnnounceName = computed(() => mediaOptions.value.find((item) => item.id === form.queueAnnounceMediaId)?.assetName);
const targetName = (action?: string, target?: string) => {
  if (!target) return '';
  if (action === 'VOICEMAIL') return voiceMailBoxes.value.find((item) => String(item.id) === String(target))?.boxName || target;
  if (action === 'IVR') return ivrFlows.value.find((item) => String(item.id) === String(target))?.flowName || target;
  if (action === 'QUEUE') return queues.value.find((item) => String(item.id) === String(target))?.queueName || target;
  return target;
};
const strategyGuide = computed(() => {
  const map: Record<QueueStrategy, string> = {
    LONGEST_IDLE_AGENT: '优先分配给空闲时间最长的坐席，适合均衡坐席工作量。',
    ROUND_ROBIN: '按顺序轮流分配坐席，适合简单公平分配。',
    TOP_DOWN: '按技能组成员顺序从前往后分配，适合有明确优先级的队伍。',
    RING_ALL: '同时振铃所有可用坐席，谁先接听谁处理。'
  };
  return map[form.strategy] || strategyLabel(form.strategy);
});
const queueAnnounceGuide = computed(() => {
  if (!form.queueAnnounceEnabled) return '未开启，客户只听队列等待音。';
  return `每 ${form.queueAnnounceInterval || 30} 秒插播一次${selectedQueueAnnounceName.value ? `「${selectedQueueAnnounceName.value}」` : '提醒音'}。`;
});
const timeoutGuide = computed(() => {
  const action = actionLabelMap[form.timeoutAction] || form.timeoutAction;
  const target = targetName(form.timeoutAction, form.timeoutTarget);
  return target ? `${form.maxWaitSeconds} 秒未接通后，${action}：${target}` : `${form.maxWaitSeconds} 秒未接通后，${action}`;
});
const noAgentGuide = computed(() => {
  const action = actionLabelMap[form.noAgentAction] || form.noAgentAction;
  const target = targetName(form.noAgentAction, form.noAgentTarget);
  const suffix = target ? `：${target}` : '';
  if (form.noAgentAction === 'WAIT') {
    return '没有可用坐席时继续播放等待音，等待坐席签入或示闲。';
  }
  return `没有可用坐席时，计划执行「${action}${suffix}」。第一版已保存配置并校验目标，运行时精确分流需要结合队列事件继续增强。`;
});
const activeCapabilities = computed(() => {
  const items = ['等待音', '坐席分配', '最大等待超时'];
  if (form.maskCallerNumber) items.push('隐藏来电');
  if ((form.forceWaitSeconds || 0) > 0) items.push('强制等待');
  if (form.queueAnnounceEnabled) items.push('排队提醒');
  if (form.agentNoAnswerAction === 'BREAK_AGENT') items.push('未接置忙');
  if (form.timeoutAction !== 'HANGUP') items.push('超时转接');
  return items;
});
const queueExecutionSteps = computed(() => {
  const steps: string[] = [];
  steps.push('来电命中号码、IVR 或工作时间路由后进入该队列。');
  if (form.maskCallerNumber) {
    steps.push('系统先隐藏主叫号码，坐席侧不会直接看到客户真实号码。');
  }
  if ((form.forceWaitSeconds || 0) > 0) {
    steps.push(`进入队列前先强制等待 ${form.forceWaitSeconds} 秒。`);
  }
  steps.push(selectedWaitMediaName.value ? `客户开始听等待音「${selectedWaitMediaName.value}」。` : '客户开始听 FreeSWITCH 默认等待音。');
  if (form.queueAnnounceEnabled) {
    steps.push(queueAnnounceGuide.value);
  }
  steps.push(`系统按「${strategyLabel(form.strategy)}」把来电分配给技能组内可用坐席。`);
  steps.push(noAgentGuide.value);
  steps.push(`每个坐席最多振铃 ${form.ringTimeoutSeconds} 秒；未接时${form.agentNoAnswerAction === 'BREAK_AGENT' ? '将该坐席置忙/暂停分配' : '继续找下一个坐席'}。`);
  steps.push(timeoutGuide.value);
  return steps;
});
const showSyncError = (row: CallQueueVO) => {
  if (!hasSyncError(row)) return;
  ElMessageBox.alert(row.syncError, `${row.queueName}同步失败原因`, {
    confirmButtonText: '关闭',
    type: 'error'
  });
};
const loadQueueDefaults = async () => {
  try {
    const { data } = await getCallCenterConfigGroup('QUEUE');
    const valueOf = (key: string) => data.items.find((item) => item.configKey === key)?.effectiveValue;
    queueDefaults.maxWaitSeconds = numberConfigValue(valueOf('queue.defaultMaxWaitSeconds'), queueDefaults.maxWaitSeconds);
    queueDefaults.ringTimeoutSeconds = numberConfigValue(valueOf('queue.defaultRingTimeoutSeconds'), queueDefaults.ringTimeoutSeconds);
    queueDefaults.maxNoAnswer = numberConfigValue(valueOf('queue.defaultMaxNoAnswer'), queueDefaults.maxNoAnswer);
  } catch {
    return;
  }

  try {
    const { data } = await getCallCenterConfigGroup('AGENT');
    const valueOf = (key: string) => data.items.find((item) => item.configKey === key)?.effectiveValue;
    queueDefaults.wrapUpSeconds = numberConfigValue(valueOf('agent.defaultAfterCallSeconds'), queueDefaults.wrapUpSeconds);
  } catch {
    return;
  }
};
const load = async () => {
  loading.value = true;
  try {
    const [queueRes, skillRes, nodeRes, mediaRes, promptMediaRes, ivrRes, voiceMailRes, callerRes] = await Promise.all([
      listCallQueues(),
      listSkillGroups(),
      listNodeGroups(),
      listMediaAssets({ pageNum: 1, pageSize: 1000, category: 'QUEUE_WAIT_MUSIC', enabled: true }),
      listMediaAssets({ pageNum: 1, pageSize: 1000, category: 'IVR_PROMPT', enabled: true }),
      listIvrFlows(),
      listVoiceMailBoxes({ pageNum: 1, pageSize: 1000, enabled: true }),
      listPhoneNumbers({ pageNum: 1, pageSize: 1000, enabled: true })
    ]);
    queues.value = queueRes.data;
    skillGroups.value = skillRes.data.filter((item) => item.enabled);
    nodeGroups.value = nodeRes.data.filter((item) => item.enabled);
    mediaOptions.value = mediaRes.rows.filter((item) => item.publishStatus === 'PUBLISHED');
    promptMediaOptions.value = promptMediaRes.rows.filter((item) => item.publishStatus === 'PUBLISHED');
    ivrFlows.value = ivrRes.data.filter((item) => item.enabled && item.publishStatus === 'PUBLISHED');
    voiceMailBoxes.value = voiceMailRes.rows.filter((item) => item.enabled);
    callerNumberOptions.value = callerRes.rows.filter((item) => ['CALLER_ID', 'BOTH'].includes(item.numberType) && !!item.gatewayId);
  } finally {
    loading.value = false;
  }
};
const reset = () => Object.assign(form, initialForm());
const handleAdd = () => {
  reset();
  dialog.title = '新增呼叫队列';
  dialog.visible = true;
};
const handleUpdate = async (row: CallQueueVO) => {
  reset();
  Object.assign(form, (await getCallQueue(row.id)).data);
  dialog.title = '修改呼叫队列';
  dialog.visible = true;
};
const submit = () =>
  formRef.value?.validate(async (valid) => {
    if (!valid) return;
    if (form.strategy !== 'RING_ALL' && form.maxWaitSeconds <= form.ringTimeoutSeconds) {
      proxy?.$modal.msgError('逐个分配坐席时，队列最大等待时间必须大于单个坐席振铃超时时间');
      return;
    }
    form.id ? await updateCallQueue(form) : await createCallQueue(form);
    proxy?.$modal.msgSuccess('保存成功');
    dialog.visible = false;
    await load();
  });
const handleDelete = async (row: CallQueueVO) => {
  await proxy?.$modal.confirm(`确认删除呼叫队列“${row.queueName}”吗？`);
  await deleteCallQueue(row.id);
  proxy?.$modal.msgSuccess('删除成功');
  await load();
};
const handleSync = async (row: CallQueueVO) => {
  syncingId.value = row.id;
  try {
    await syncCallQueue(row.id);
    proxy?.$modal.msgSuccess('已同步到 FreeSWITCH');
  } finally {
    syncingId.value = undefined;
    await load();
  }
};
onMounted(async () => {
  await loadQueueDefaults();
  await load();
});
</script>

<style scoped>
.unit {
  margin-left: 8px;
  color: var(--el-text-color-secondary);
}

.sync-error-tag {
  cursor: pointer;
}

.queue-drawer-tip {
  margin-bottom: 18px;
}

.queue-dialog-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 330px;
  gap: 18px;
  align-items: flex-start;
  height: calc(100vh - 170px);
}

.queue-form-panel {
  min-width: 0;
  height: 100%;
  padding-right: 4px;
  padding-bottom: 24px;
  overflow-y: auto;
}

.queue-guide-panel {
  position: sticky;
  top: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  padding-bottom: 32px;
  overflow-y: auto;
}

.guide-card {
  padding: 14px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 12px;
  background: linear-gradient(180deg, #f8fbff 0%, #ffffff 100%);
}

.guide-title {
  margin-bottom: 10px;
  font-size: 15px;
  font-weight: 700;
  color: #053b70;
}

.flow-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.flow-list li {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  gap: 8px;
  font-size: 13px;
  line-height: 1.55;
  color: var(--el-text-color-regular);
}

.flow-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  font-size: 12px;
  font-weight: 700;
  color: #053b70;
  background: #e7f0ff;
  border-radius: 50%;
}

.guide-item {
  display: flex;
  gap: 10px;
  padding: 8px 0;
  font-size: 13px;
  line-height: 1.5;
  border-bottom: 1px dashed var(--el-border-color-lighter);
}

.guide-item:last-child {
  border-bottom: 0;
}

.guide-label {
  flex: 0 0 72px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
}

.capability-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.form-tip {
  margin-left: 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.reserved-note {
  padding: 12px 14px;
  margin-bottom: 12px;
  line-height: 1.55;
  color: #7a4b00;
  background: #fff7e8;
  border: 1px solid #ffe1ad;
  border-radius: 12px;
}

.reserved-note-title {
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 700;
}

.reserved-note-content {
  font-size: 12px;
  white-space: normal;
  word-break: break-word;
}

.drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
