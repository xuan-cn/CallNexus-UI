<template>
  <div class="p-2">
    <el-card class="mb-2" shadow="hover">
      <el-form ref="queryFormRef" :model="queryParams" :inline="true">
        <el-form-item label="主叫号码" prop="callerNumber">
          <el-input v-model="queryParams.callerNumber" clearable @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item label="被叫号码" prop="calledNumber">
          <el-input v-model="queryParams.calledNumber" clearable @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item label="呼叫方向" prop="direction">
          <el-select v-model="queryParams.direction" clearable style="width: 130px">
            <el-option v-for="item in directionOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态" prop="callStatus">
          <el-select v-model="queryParams.callStatus" clearable style="width: 130px">
            <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
          <el-button icon="Refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="hover">
      <el-table v-loading="loading" :data="recordList">
        <el-table-column label="呼叫方向" width="100">
          <template #default="{ row }">
            <el-tag :type="directionTag(row.direction)">{{ directionLabel(row.direction) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="主叫号码" prop="callerNumber" min-width="130" />
        <el-table-column label="主叫归属地" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">{{ formatNumberLocation(row, 'caller') }}</template>
        </el-table-column>
        <el-table-column label="被叫号码" prop="calledNumber" min-width="130" />
        <el-table-column label="被叫归属地" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">{{ formatNumberLocation(row, 'called') }}</template>
        </el-table-column>
        <el-table-column label="坐席分机" prop="agentExtension" width="110" />
        <el-table-column label="接听队列" prop="handlingQueueName" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">
            <el-tag v-if="row.handlingQueueName" type="info" size="small">{{ row.handlingQueueName }}</el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">{{ statusLabel(row.callStatus) }}</template>
        </el-table-column>
        <el-table-column label="开始时间" prop="startedAt" min-width="170" />
        <el-table-column label="通话时长" width="110">
          <template #default="{ row }">{{ formatDuration(row.billableSeconds) }}</template>
        </el-table-column>
        <el-table-column label="总时长" width="110">
          <template #default="{ row }">{{ formatDuration(row.durationSeconds) }}</template>
        </el-table-column>
        <el-table-column label="挂断原因" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">{{ hangupCauseLabel(row.hangupCause) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="80" align="center">
          <template #default="{ row }">
            <el-button v-hasPermi="['callcenter:call-record:query']" link type="primary" @click="handleDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
      <pagination v-show="total > 0" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" :total="total" @pagination="getList" />
    </el-card>

    <el-dialog v-model="detailVisible" title="通话记录详情" width="1280px" append-to-body>
      <el-tabs v-if="detail" v-model="detailTab" class="detail-tabs">
        <el-tab-pane label="基本信息" name="basic">
          <el-descriptions :column="3" border>
            <el-descriptions-item label="业务通话ID" :span="3">{{ detail.businessCallId || '-' }}</el-descriptions-item>
            <el-descriptions-item label="呼叫方向">{{ directionLabel(detail.direction) }}</el-descriptions-item>
            <el-descriptions-item label="状态">{{ statusLabel(detail.callStatus) }}</el-descriptions-item>
            <el-descriptions-item label="坐席分机">{{ detail.agentExtension || '-' }}</el-descriptions-item>
            <el-descriptions-item label="主叫号码">{{ detail.callerNumber || '-' }}</el-descriptions-item>
            <el-descriptions-item label="被叫号码">{{ detail.calledNumber || '-' }}</el-descriptions-item>
            <el-descriptions-item label="主叫归属地">{{ formatNumberLocation(detail, 'caller') }}</el-descriptions-item>
            <el-descriptions-item label="被叫归属地">{{ formatNumberLocation(detail, 'called') }}</el-descriptions-item>
            <el-descriptions-item label="挂断原因">{{ hangupCauseLabel(detail.hangupCause) }}</el-descriptions-item>
            <el-descriptions-item label="接听队列">
              <el-tag v-if="detail.handlingQueueName" type="info" size="small">{{ detail.handlingQueueName }}</el-tag>
              <span v-else>-</span>
            </el-descriptions-item>
            <el-descriptions-item label="关联客户ID">
              <el-button v-if="detail.customerId" link type="primary" class="id-link" @click="openCustomerDetail(detail.customerId)">
                {{ detail.customerId }}
              </el-button>
              <span v-else>-</span>
            </el-descriptions-item>
            <el-descriptions-item label="关联工单ID">
              <el-button v-if="detail.ticketId" link type="primary" class="id-link" @click="openTicketDetail(detail.ticketId)">
                {{ detail.ticketId }}
              </el-button>
              <span v-else>-</span>
            </el-descriptions-item>
            <el-descriptions-item label="开始时间">{{ detail.startedAt || '-' }}</el-descriptions-item>
            <el-descriptions-item label="振铃时间">{{ detail.ringingAt || '-' }}</el-descriptions-item>
            <el-descriptions-item label="接听时间">{{ detail.answeredAt || '-' }}</el-descriptions-item>
            <el-descriptions-item label="结束时间">{{ detail.endedAt || '-' }}</el-descriptions-item>
          </el-descriptions>
          <div class="metric-grid">
            <div v-for="item in summaryMetrics" :key="item.label" class="metric-item">
              <span>{{ item.label }}</span>
              <div v-if="item.rating !== undefined" class="satisfaction-rating">
                <el-rate :model-value="item.rating" :max="5" disabled />
              </div>
              <strong v-else>{{ item.value }}</strong>
            </div>
          </div>
        </el-tab-pane>
        <el-tab-pane label="通话录音" name="recording">
          <div v-if="detail.recordingUrl" class="recording-player">
            <AudioWaveform :src="detail.recordingUrl" />
          </div>
          <el-empty v-else :description="recordingStatusLabel(detail.recordingStatus)" :image-size="70" />
        </el-tab-pane>
        <el-tab-pane label="语音转写" name="transcript">
          <div class="transcript-toolbar">
            <div>
              <strong>通话语音转写</strong>
              <span>按说话人展示客户、坐席和 AI 的对话内容；无法识别来源时显示为未知。</span>
            </div>
            <el-button type="primary" :loading="transcriptLoading" :disabled="!detail.recordingUrl" @click="handleTranscribe">
              {{ transcript?.status === 'SUCCESS' ? '重新转写' : '开始转写' }}
            </el-button>
          </div>
          <el-alert
            v-if="!detail.recordingUrl"
            type="warning"
            show-icon
            :closable="false"
            title="当前通话还没有可播放录音，录音上传完成后才能转写。"
          />
          <el-alert
            v-else-if="transcript?.status === 'FAILED'"
            class="mb-2"
            type="error"
            show-icon
            :closable="false"
            :title="transcript.failureReason || '转写失败'"
          />
          <div v-if="transcript?.status === 'SUCCESS'" class="transcript-content">
            <div v-if="transcriptSegments.length" class="transcript-chat">
              <div
                v-for="segment in transcriptSegments"
                :key="String(segment.id || segment.sentenceIndex || segment.textContent)"
                class="transcript-message"
                :class="speakerClass(segment.speaker)"
              >
                <div class="transcript-avatar">{{ speakerInitial(segment.speaker) }}</div>
                <div class="transcript-bubble-wrap">
                  <div class="transcript-meta">
                    <span>{{ speakerLabel(segment.speaker) }}</span>
                    <span>{{ formatMilliseconds(segment.startMs) }} - {{ formatMilliseconds(segment.endMs) }}</span>
                    <span v-if="segment.confidence !== undefined">置信度 {{ formatConfidence(segment.confidence) }}</span>
                  </div>
                  <div class="transcript-bubble">{{ segment.textContent || '-' }}</div>
                </div>
              </div>
            </div>
            <el-empty v-else description="暂无转写分句" :image-size="70" />
            <el-collapse v-if="transcript.fullText" class="transcript-raw">
              <el-collapse-item title="查看完整文本" name="fullText">
                <div class="transcript-full-text">{{ transcript.fullText }}</div>
              </el-collapse-item>
            </el-collapse>
          </div>
          <el-empty v-else-if="!transcriptLoading && detail.recordingUrl && !transcript" description="暂无转写结果" :image-size="70" />
        </el-tab-pane>
        <el-tab-pane label="语音留言" name="voicemail">
          <div v-if="detail.voicemailMessages?.length" class="voicemail-list">
            <el-card v-for="message in detail.voicemailMessages" :key="String(message.id)" class="voicemail-card" shadow="never">
              <template #header>
                <div class="voicemail-header">
                  <div>
                    <strong>留言 #{{ message.id }}</strong>
                    <span>{{ message.createTime || '-' }}</span>
                  </div>
                  <div class="voicemail-actions">
                    <el-tag :type="voicemailStatusTag(message.status)" size="small">{{ voicemailStatusLabel(message.status) }}</el-tag>
                    <el-button v-if="message.status !== 'HANDLED'" link type="success" @click="handleVoiceMail(message.id)">标记已处理</el-button>
                  </div>
                </div>
              </template>
              <el-descriptions :column="3" border size="small">
                <el-descriptions-item label="留言箱ID">{{ message.voicemailBoxId || '-' }}</el-descriptions-item>
                <el-descriptions-item label="主叫号码">{{ message.callerNumber || '-' }}</el-descriptions-item>
                <el-descriptions-item label="被叫号码">{{ message.calledNumber || '-' }}</el-descriptions-item>
                <el-descriptions-item label="留言时长">{{ formatMilliseconds(message.durationMs) }}</el-descriptions-item>
                <el-descriptions-item label="处理人">{{ message.handledBy || '-' }}</el-descriptions-item>
                <el-descriptions-item label="处理时间">{{ message.handledAt || '-' }}</el-descriptions-item>
                <el-descriptions-item label="处理备注" :span="3">{{ message.handleRemark || '-' }}</el-descriptions-item>
              </el-descriptions>
              <div v-if="message.playbackUrl" class="voicemail-player">
                <AudioWaveform :src="message.playbackUrl" />
              </div>
              <el-empty v-else description="留言录音不可播放" :image-size="60" />
            </el-card>
          </div>
          <el-empty v-else description="暂无语音留言" :image-size="70" />
        </el-tab-pane>
        <el-tab-pane label="处理时间线" name="timeline">
          <div v-if="timelineEvents.length" class="timeline-layout">
            <div class="timeline-list">
              <div v-for="event in timelineEvents" :key="String(event.id)" class="timeline-row">
                <time>{{ formatClock(event.occurredAt) }}</time>
                <div class="timeline-marker" :class="event.tone || eventTone(event.eventType)"></div>
                <div class="timeline-content">
                  <strong>{{ event.title || eventLabel(event.eventType) }}</strong>
                  <span>{{ event.fromTarget || '-' }} → {{ event.toTarget || '-' }}</span>
                </div>
              </div>
            </div>
            <div class="flow-panel">
              <h4>通话流程图</h4>
              <div class="flow-track">
                <template v-for="(node, index) in flowNodes" :key="`flow-${index}`">
                  <div v-if="node.gapLabel" class="flow-gap" :class="node.gapTone">
                    <span>{{ node.gapLabel }}</span>
                  </div>
                  <div class="flow-node" :class="node.tone">
                    <div class="flow-node-marker">
                      <el-icon :size="16"><component :is="node.icon" /></el-icon>
                    </div>
                    <div class="flow-node-body">
                      <strong>{{ node.label }}</strong>
                      <span v-if="node.detail">{{ node.detail }}</span>
                    </div>
                  </div>
                </template>
                <el-empty v-if="!flowNodes.length" description="暂无可绘制的主链路事件" :image-size="60" />
              </div>
            </div>
          </div>
          <el-empty v-else description="暂无处理时间线" :image-size="70" />
          <div class="metric-grid timeline-metrics">
            <div v-for="item in summaryMetrics" :key="`timeline-${item.label}`" class="metric-item">
              <span>{{ item.label }}</span>
              <div v-if="item.rating !== undefined" class="satisfaction-rating">
                <el-rate :model-value="item.rating" :max="5" disabled />
              </div>
              <strong v-else>{{ item.value }}</strong>
            </div>
          </div>
        </el-tab-pane>
        <el-tab-pane label="底层通话腿" name="legs">
          <el-table :data="detail.legs || []" size="small">
            <el-table-column label="主叫" prop="callerNumber" min-width="120" />
            <el-table-column label="被叫" prop="calledNumber" min-width="120" />
            <el-table-column label="坐席分机" prop="agentExtension" width="100" />
            <el-table-column label="状态" width="90">
              <template #default="{ row }">{{ statusLabel(row.callStatus) }}</template>
            </el-table-column>
            <el-table-column label="开始时间" prop="startedAt" min-width="165" />
            <el-table-column label="通话时长" width="100">
              <template #default="{ row }">{{ formatDuration(row.billableSeconds) }}</template>
            </el-table-column>
            <el-table-column label="挂断原因" min-width="210" show-overflow-tooltip>
              <template #default="{ row }">{{ hangupCauseLabel(row.hangupCause) }}</template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="技术诊断" name="diagnostics">
          <el-alert
            class="diagnostic-tip"
            type="info"
            show-icon
            :closable="false"
            title="这里展示业务通话、FreeSWITCH 通话腿 UUID、桥接关系和坐席参与记录，主要用于排查转接、静音、DTMF、无声和状态残留问题。"
          />
          <el-collapse class="diagnostic-collapse" model-value="legs">
            <el-collapse-item title="通话腿" name="legs">
              <el-table :data="detail.diagnosticLegs || []" size="small" border>
                <el-table-column label="角色" width="110">
                  <template #default="{ row }">{{ legRoleLabel(row.legRole) }}</template>
                </el-table-column>
                <el-table-column label="UUID" prop="legUuid" min-width="260" show-overflow-tooltip />
                <el-table-column label="坐席" width="120">
                  <template #default="{ row }">{{ row.agentExtension || row.agentId || '-' }}</template>
                </el-table-column>
                <el-table-column label="主叫" prop="callerNumber" min-width="120" />
                <el-table-column label="被叫" prop="calledNumber" min-width="120" />
                <el-table-column label="状态" prop="legState" width="110" />
                <el-table-column label="活跃" width="80">
                  <template #default="{ row }">
                    <el-tag :type="row.active ? 'success' : 'info'" size="small">{{ row.active ? '是' : '否' }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="振铃" prop="ringingAt" min-width="165" />
                <el-table-column label="接听" prop="answeredAt" min-width="165" />
                <el-table-column label="桥接" prop="bridgedAt" min-width="165" />
                <el-table-column label="保持" prop="heldAt" min-width="165" />
                <el-table-column label="结束" prop="endedAt" min-width="165" />
                <el-table-column label="挂断原因" min-width="180" show-overflow-tooltip>
                  <template #default="{ row }">{{ hangupCauseLabel(row.hangupCause) }}</template>
                </el-table-column>
              </el-table>
            </el-collapse-item>
            <el-collapse-item title="桥接关系" name="bridges">
              <el-table :data="detail.diagnosticBridges || []" size="small" border>
                <el-table-column label="类型" width="110">
                  <template #default="{ row }">{{ bridgeTypeLabel(row.bridgeType) }}</template>
                </el-table-column>
                <el-table-column label="状态" prop="bridgeState" width="120" />
                <el-table-column label="左腿 UUID" prop="leftLegUuid" min-width="260" show-overflow-tooltip />
                <el-table-column label="右腿 UUID" prop="rightLegUuid" min-width="260" show-overflow-tooltip />
                <el-table-column label="开始时间" prop="startedAt" min-width="165" />
                <el-table-column label="结束时间" prop="endedAt" min-width="165" />
              </el-table>
            </el-collapse-item>
            <el-collapse-item title="坐席参与" name="agents">
              <el-table :data="detail.agentSessions || []" size="small" border>
                <el-table-column label="角色" width="130">
                  <template #default="{ row }">{{ agentRoleLabel(row.role) }}</template>
                </el-table-column>
                <el-table-column label="坐席" width="150">
                  <template #default="{ row }">{{ row.agentExtension || row.agentId || '-' }}</template>
                </el-table-column>
                <el-table-column label="坐席腿 UUID" prop="agentLegUuid" min-width="260" show-overflow-tooltip />
                <el-table-column label="状态" prop="sessionState" width="110" />
                <el-table-column label="前端可见" width="90">
                  <template #default="{ row }">
                    <el-tag :type="row.visible ? 'success' : 'info'" size="small">{{ row.visible ? '是' : '否' }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="加入时间" prop="joinedAt" min-width="165" />
                <el-table-column label="离开时间" prop="leftAt" min-width="165" />
              </el-table>
            </el-collapse-item>
            <el-collapse-item title="原始事件" name="events">
              <el-table :data="detail.events || []" size="small" border>
                <el-table-column label="事件" width="150">
                  <template #default="{ row }">{{ eventLabel(row.eventType) }}</template>
                </el-table-column>
                <el-table-column label="通道 UUID" prop="channelUuid" min-width="260" show-overflow-tooltip />
                <el-table-column label="关联 UUID" prop="relatedChannelUuid" min-width="260" show-overflow-tooltip />
                <el-table-column label="来源" prop="fromTarget" min-width="120" />
                <el-table-column label="目标" prop="toTarget" min-width="120" />
                <el-table-column label="时间" prop="occurredAt" min-width="165" />
              </el-table>
            </el-collapse-item>
          </el-collapse>
        </el-tab-pane>
      </el-tabs>
    </el-dialog>

    <CallCenterBusinessDetail v-model="customerDetailVisible" business-type="CUSTOMER" :business-id="customerDetailId" />
    <CallCenterBusinessDetail v-model="ticketDetailVisible" business-type="TICKET" :business-id="ticketDetailId" />
  </div>
</template>

<script setup name="CallRecord" lang="ts">
import { getCallRecord, listCallRecords } from '@/api/callcenter/call-record';
import { hangupCauseLabel } from '@/api/callcenter/call-record/display';
import { getCallTranscript, transcribeCallRecording } from '@/api/callcenter/ai-speech';
import { AiCallTranscriptSegmentVO, AiCallTranscriptVO } from '@/api/callcenter/ai-speech/types';
import { handleVoiceMailMessage } from '@/api/callcenter/voicemail';
import CallCenterBusinessDetail from '@/components/CallCenterBusinessDetail/index.vue';
import { CallDirection, CallRecordQuery, CallRecordVO, CallStatus } from '@/api/callcenter/call-record/types';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Connection, Bell, CircleCheck, SwitchButton, Download, Upload, Warning, CircleClose } from '@element-plus/icons-vue';

const loading = ref(false);
const total = ref(0);
const detailVisible = ref(false);
const detail = ref<CallRecordVO>();
const detailTab = ref('basic');
const transcript = ref<AiCallTranscriptVO>();
const transcriptLoading = ref(false);
const normalizeTranscriptResponse = (response: any): AiCallTranscriptVO | undefined => {
  const data = response?.data && response?.status === undefined ? response.data : response;
  if (!data) {
    return undefined;
  }
  return {
    ...data,
    segments: Array.isArray(data.segments) ? data.segments : []
  };
};
const transcriptSegments = computed<AiCallTranscriptSegmentVO[]>(() => {
  const current = transcript.value;
  const segments =
    current?.segments && current.segments.length > 0
      ? current.segments
      : current?.status === 'SUCCESS' && current.fullText
        ? [
            {
              id: `${current.id || current.callSessionId || 'transcript'}-full`,
              speaker: 'UNKNOWN',
              sourceType: 'RECORDING_ASR',
              sentenceIndex: 0,
              textContent: current.fullText,
              finalResult: true
            } as AiCallTranscriptSegmentVO
          ]
        : [];
  return [...segments].sort((left, right) => {
    const leftStart = left.startMs ?? Number.MAX_SAFE_INTEGER;
    const rightStart = right.startMs ?? Number.MAX_SAFE_INTEGER;
    if (leftStart !== rightStart) {
      return leftStart - rightStart;
    }
    return (left.sentenceIndex ?? 0) - (right.sentenceIndex ?? 0);
  });
});
const recordList = ref<CallRecordVO[]>([]);
const queryFormRef = ref<ElFormInstance>();
// 客户详情弹窗：点击「关联客户ID」后展示客户详细资料
const customerDetailVisible = ref(false);
const customerDetailId = ref<string | number>();
const ticketDetailVisible = ref(false);
const ticketDetailId = ref<string | number>();
let recordingPollTimer: ReturnType<typeof setTimeout> | undefined;
const directionOptions: Array<{ label: string; value: CallDirection }> = [
  { label: '呼入', value: 'INBOUND' },
  { label: '呼出', value: 'OUTBOUND' },
  { label: '内部通话', value: 'INTERNAL' },
  { label: '未知', value: 'UNKNOWN' }
];
const statusOptions: Array<{ label: string; value: CallStatus }> = [
  { label: '已创建', value: 'CREATED' },
  { label: '振铃中', value: 'RINGING' },
  { label: '已接听', value: 'ANSWERED' },
  { label: '已桥接', value: 'BRIDGED' },
  { label: '已结束', value: 'ENDED' }
];
const queryParams = reactive<CallRecordQuery>({
  pageNum: 1,
  pageSize: 10,
  callerNumber: '',
  calledNumber: '',
  direction: undefined,
  callStatus: undefined,
  hangupCause: ''
});

const directionLabel = (value: CallDirection) => directionOptions.find((item) => item.value === value)?.label || value;
const statusLabel = (value: CallStatus) => statusOptions.find((item) => item.value === value)?.label || value;
const formatNumberLocation = (record: Partial<CallRecordVO> | undefined, side: 'caller' | 'called') => {
  if (!record) return '-';
  const prefix = side === 'caller' ? 'caller' : 'called';
  const location = [
    record[`${prefix}Province` as keyof CallRecordVO],
    record[`${prefix}City` as keyof CallRecordVO],
    record[`${prefix}Carrier` as keyof CallRecordVO]
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join(' ');
  return location || '-';
};
const recordingStatusLabel = (value?: CallRecordVO['recordingStatus']) =>
  ({ NONE: '暂无录音', PENDING: '录音正在上传', UPLOADED: '录音已上传', FAILED: '录音上传失败' })[value || 'NONE'];
const voicemailStatusLabel = (value?: string) =>
  ({ UNHANDLED: '未处理', HANDLED: '已处理', INVALID: '无效留言' })[value || 'UNHANDLED'] || value || '-';
const voicemailStatusTag = (value?: string) => ({ UNHANDLED: 'warning', HANDLED: 'success', INVALID: 'info' })[value || 'UNHANDLED'] as any;
const speakerLabel = (value?: string) =>
  ({ CUSTOMER: '客户', AGENT: '坐席', AI: 'AI', SYSTEM: '系统', UNKNOWN: '未知' })[value || 'UNKNOWN'] || value || '-';
const speakerInitial = (value?: string) => ({ CUSTOMER: '客', AGENT: '席', AI: 'AI', SYSTEM: '系', UNKNOWN: '?' })[value || 'UNKNOWN'] || '?';
const speakerClass = (value?: string) =>
  ({ CUSTOMER: 'is-customer', AGENT: 'is-agent', AI: 'is-ai', SYSTEM: 'is-system', UNKNOWN: 'is-unknown' })[value || 'UNKNOWN'] || 'is-unknown';
const formatConfidence = (value?: number) => (value === undefined || value === null ? '-' : `${Math.round(value * 100)}%`);
const directionTag = (value: CallDirection) => ({ INBOUND: 'success', OUTBOUND: 'primary', INTERNAL: 'warning', UNKNOWN: 'info' })[value] as any;
const eventLabel = (eventType: string) =>
  ({
    CALL_LEG_CREATED: '创建通话环节',
    RINGING: '开始振铃',
    ANSWERED: '接听通话',
    BRIDGED: '桥接通话',
    TRANSFERRED: '转接通话',
    UNBRIDGED: '解除桥接',
    HELD: '通话保持',
    UNHELD: '恢复通话',
    CALL_LEG_ENDED: '结束通话环节',
    QUEUE_IN: '进入队列',
    QUEUE_WAIT: '排队等待',
    AGENT_RING: '坐席振铃',
    AGENT_ANSWER: '坐席接听',
    AGENT_NO_ANSWER: '坐席未接',
    QUEUE_DTMF: '队列按键采集',
    QUEUE_SATISFACTION: '满意度评价',
    QUEUE_TIMEOUT: '队列超时',
    ABANDON: '主叫放弃',
    VOICEMAIL_RECORDED: '语音留言已录制'
  })[eventType] || eventType;
const legRoleLabel = (role?: string) =>
  ({
    CUSTOMER: '客户腿',
    AGENT: '坐席腿',
    CONSULT_AGENT: '咨询腿',
    TRANSFER_AGENT: '转接腿'
  })[role || ''] ||
  role ||
  '-';
const bridgeTypeLabel = (type?: string) =>
  ({
    NORMAL: '普通桥接',
    CONSULT: '咨询桥接',
    TRANSFER: '转接桥接',
    BLIND_TRANSFER: '盲转桥接'
  })[type || ''] ||
  type ||
  '-';
const agentRoleLabel = (role?: string) =>
  ({
    OWNER: '主控坐席',
    CONSULT_TARGET: '咨询目标',
    TRANSFER_TARGET: '转接目标'
  })[role || ''] ||
  role ||
  '-';
const formatDuration = (seconds?: number) => {
  const value = Math.max(0, seconds || 0);
  const minutes = Math.floor(value / 60);
  const remainSeconds = value % 60;
  return minutes > 0 ? `${minutes}分${remainSeconds}秒` : `${remainSeconds}秒`;
};
const formatMilliseconds = (milliseconds?: number) => formatDuration(Math.ceil((milliseconds || 0) / 1000));
const secondsBetween = (start?: string, end?: string) => {
  if (!start || !end) return 0;
  return Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000));
};
const queueWaitSeconds = computed(() => {
  const events = detail.value?.events || [];
  const queueIn = events.find((event) => event.eventType === 'QUEUE_IN');
  const agentAnswer = events.find((event) => event.eventType === 'AGENT_ANSWER');
  if (!queueIn || !agentAnswer) return 0;
  return secondsBetween(queueIn.occurredAt, agentAnswer.occurredAt);
});
const summaryMetrics = computed(() => [
  { label: '通话总时长', value: formatDuration(detail.value?.durationSeconds) },
  { label: '振铃时长', value: formatDuration(secondsBetween(detail.value?.ringingAt, detail.value?.answeredAt || detail.value?.endedAt)) },
  { label: '接通时长', value: formatDuration(detail.value?.billableSeconds) },
  { label: '等待时长', value: formatDuration(secondsBetween(detail.value?.startedAt, detail.value?.answeredAt || detail.value?.endedAt)) },
  { label: '队列等待', value: queueWaitSeconds.value > 0 ? formatDuration(queueWaitSeconds.value) : '-' },
  { label: '挂断原因', value: hangupCauseLabel(detail.value?.hangupCause) },
  {
    label: '满意度评价',
    value: detail.value?.satisfaction ? (detail.value.satisfaction.status === 'SUBMITTED' ? `${detail.value.satisfaction.score} 分` : '未评价') : '-',
    rating: detail.value?.satisfaction?.status === 'SUBMITTED' && detail.value.satisfaction.score ? detail.value.satisfaction.score : undefined
  }
]);
const timelineEvents = computed(() => {
  const businessTimeline = detail.value?.businessTimeline || [];
  if (businessTimeline.length) {
    return businessTimeline.map((event) => ({
      ...event,
      eventType: event.type,
      fromTarget: event.actor,
      toTarget: event.target
    }));
  }
  return detail.value?.events || [];
});
// 流程图节点定义：主链路事件类型 → 节点图标、色调、文案映射。
// 顺序即展示顺序，多个 AGENT_RING 在组装阶段合并为一个节点。
const FLOW_NODE_META: Record<string, { icon: any; tone: string; label: string }> = {
  CALL_LEG_CREATED: { icon: Connection, tone: 'primary', label: '呼入开始' },
  QUEUE_IN: { icon: Download, tone: 'warning', label: '进入队列' },
  AGENT_RING: { icon: Bell, tone: 'warning', label: '坐席振铃' },
  AGENT_ANSWER: { icon: CircleCheck, tone: 'success', label: '坐席接听' },
  ANSWERED: { icon: CircleCheck, tone: 'success', label: '接听通话' },
  BRIDGED: { icon: CircleCheck, tone: 'success', label: '桥接通话' },
  TRANSFERRED: { icon: Upload, tone: 'primary', label: '转接通话' },
  QUEUE_TIMEOUT: { icon: Warning, tone: 'danger', label: '队列超时' },
  ABANDON: { icon: CircleClose, tone: 'danger', label: '主叫放弃' },
  VOICEMAIL_RECORDED: { icon: Upload, tone: 'primary', label: '语音留言' },
  QUEUE_SATISFACTION: { icon: CircleCheck, tone: 'success', label: '满意度评价' },
  CALL_LEG_ENDED: { icon: SwitchButton, tone: 'danger', label: '通话结束' }
};
// 耗时药丸文案：相邻两种事件类型之间的耗时展示文案。
const GAP_LABELS: Array<{ from: string; to: string; label: string; tone: string }> = [
  { from: 'CALL_LEG_CREATED', to: 'QUEUE_IN', label: '进队前', tone: 'muted' },
  { from: 'QUEUE_IN', to: 'AGENT_RING', label: '排队等待', tone: 'warning' },
  { from: 'QUEUE_IN', to: 'AGENT_ANSWER', label: '队列总等待', tone: 'warning' },
  { from: 'AGENT_RING', to: 'AGENT_ANSWER', label: '振铃', tone: 'warning' },
  { from: 'AGENT_ANSWER', to: 'CALL_LEG_ENDED', label: '通话', tone: 'success' },
  { from: 'ANSWERED', to: 'CALL_LEG_ENDED', label: '通话', tone: 'success' },
  { from: 'BRIDGED', to: 'CALL_LEG_ENDED', label: '通话', tone: 'success' }
];
const flowNodes = computed(() => {
  const events = timelineEvents.value;
  if (!events.length) return [] as Array<{ label: string; detail?: string; tone: string; icon: any; gapLabel?: string; gapTone?: string }>;
  // 选取主链路事件（带节点元数据的），保留原始顺序
  const mainEvents = events.filter((event) => FLOW_NODE_META[event.eventType]);
  if (!mainEvents.length) return [];
  // 合并连续的相同主链路事件：
  // - AGENT_RING：多次振铃不同坐席，汇总坐席列表
  // - 其他类型（CALL_LEG_ENDED/ANSWERED/BRIDGED 等）：多腿会产生重复，只保留首个
  const merged: Array<{ eventType: string; occurredAt: string; details: string[] }> = [];
  for (const event of mainEvents) {
    const last = merged[merged.length - 1];
    if (event.eventType === 'AGENT_RING' && last && last.eventType === 'AGENT_RING') {
      if (event.toTarget) last.details.push(event.toTarget);
    } else if (last && last.eventType === event.eventType) {
      // 同类型连续重复（多腿挂断/接听等），跳过，避免流程图出现重复节点
      continue;
    } else {
      merged.push({
        eventType: event.eventType,
        occurredAt: event.occurredAt,
        details: event.eventType === 'AGENT_RING' ? (event.toTarget ? [event.toTarget] : []) : []
      });
    }
  }
  // 组装节点和耗时药丸
  const nodes: Array<{ label: string; detail?: string; tone: string; icon: any; gapLabel?: string; gapTone?: string }> = [];
  for (let i = 0; i < merged.length; i++) {
    const current = merged[i];
    const meta = FLOW_NODE_META[current.eventType];
    if (!meta) continue;
    // 计算与前一节点之间的耗时药丸
    if (i > 0) {
      const prev = merged[i - 1];
      const gap = GAP_LABELS.find((item) => item.from === prev.eventType && item.to === current.eventType);
      if (gap) {
        const seconds = secondsBetween(prev.occurredAt, current.occurredAt);
        nodes.push({ label: '', icon: Connection, tone: '', gapLabel: `${gap.label} ${formatDuration(seconds)}`, gapTone: gap.tone });
      }
    }
    // 节点详情：振铃节点展示合并后的坐席列表，其它节点展示 from→to
    let detail: string | undefined;
    if (current.eventType === 'AGENT_RING') {
      detail = current.details.length ? current.details.join('、') : undefined;
    } else {
      const sourceEvent = mainEvents.find((event) => event.eventType === current.eventType && event.occurredAt === current.occurredAt);
      if (sourceEvent) {
        const parts: string[] = [];
        if (sourceEvent.fromTarget) parts.push(sourceEvent.fromTarget);
        if (sourceEvent.toTarget) parts.push(sourceEvent.toTarget);
        detail = parts.length ? parts.join(' → ') : undefined;
      }
    }
    nodes.push({ label: meta.label, detail, tone: meta.tone, icon: meta.icon });
  }
  return nodes;
});
const formatClock = (value?: string) => value?.split(' ')[1] || value || '-';
const eventTone = (eventType: string) => {
  if (['ANSWERED', 'BRIDGED', 'AGENT_ANSWER'].includes(eventType)) return 'success';
  if (['CALL_LEG_ENDED', 'QUEUE_TIMEOUT', 'ABANDON', 'AGENT_NO_ANSWER'].includes(eventType)) return 'danger';
  if (['RINGING', 'AGENT_RING', 'QUEUE_IN'].includes(eventType)) return 'warning';
  if (eventType === 'QUEUE_DTMF') return 'primary';
  if (eventType === 'QUEUE_SATISFACTION') return 'success';
  return 'primary';
};
const getList = async () => {
  loading.value = true;
  try {
    const res = await listCallRecords(queryParams);
    recordList.value = res.rows;
    total.value = res.total;
  } finally {
    loading.value = false;
  }
};
const handleQuery = () => {
  queryParams.pageNum = 1;
  getList();
};
const resetQuery = () => {
  queryFormRef.value?.resetFields();
  handleQuery();
};
const stopRecordingPoll = () => {
  if (recordingPollTimer) clearTimeout(recordingPollTimer);
  recordingPollTimer = undefined;
};
const loadDetail = async (id: string | number) => {
  const res = await getCallRecord(id);
  detail.value = res.data;
  await loadTranscript(id);
  stopRecordingPoll();
  if (detailVisible.value && detail.value.recordingStatus === 'PENDING') {
    recordingPollTimer = setTimeout(() => loadDetail(id), 3000);
  }
};
const loadTranscript = async (id: string | number) => {
  try {
    const res = await getCallTranscript(id);
    transcript.value = normalizeTranscriptResponse(res);
  } catch {
    transcript.value = undefined;
  }
};
const handleDetail = async (row: CallRecordVO) => {
  detailTab.value = 'basic';
  transcript.value = undefined;
  detailVisible.value = true;
  await loadDetail(row.id);
};
const handleTranscribe = async () => {
  if (!detail.value?.id) return;
  transcriptLoading.value = true;
  try {
    const res = await transcribeCallRecording(detail.value.id);
    transcript.value = normalizeTranscriptResponse(res);
    ElMessage.success('语音转写完成');
  } finally {
    transcriptLoading.value = false;
  }
};
const handleVoiceMail = async (id: string | number) => {
  const { value } = await ElMessageBox.prompt('填写本次留言处理备注', '标记语音留言已处理', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputType: 'textarea',
    inputPlaceholder: '例如：已回拨客户，已创建工单',
    inputValidator: (text) => (text && text.length > 500 ? '处理备注不能超过 500 个字符' : true)
  });
  await handleVoiceMailMessage(id, { status: 'HANDLED', handleRemark: value });
  ElMessage.success('语音留言已标记处理');
  if (detail.value?.id) {
    await loadDetail(detail.value.id);
  }
};
// 打开客户详情弹窗：先赋 ID 再置 visible，保证组件 watch 触发时 businessId 已是新值
const openCustomerDetail = (id: string | number) => {
  customerDetailId.value = id;
  customerDetailVisible.value = true;
};
const openTicketDetail = (id: string | number) => {
  ticketDetailId.value = id;
  ticketDetailVisible.value = true;
};
watch(detailVisible, (visible) => {
  if (!visible) stopRecordingPoll();
});
onMounted(getList);
onBeforeUnmount(stopRecordingPoll);
</script>

<style scoped>
.detail-tabs {
  min-height: 560px;
}
.metric-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  padding: 16px;
  margin-top: 16px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
}
.metric-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: #909399;
}
.metric-item strong {
  color: #303133;
}
.satisfaction-rating {
  min-height: 24px;
  display: flex;
  align-items: center;
}
.satisfaction-rating :deep(.el-rate__icon) {
  margin-right: 2px;
  font-size: 20px;
}
.timeline-layout {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr);
  gap: 16px;
}
.timeline-list,
.flow-panel {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
}
.timeline-row {
  display: grid;
  grid-template-columns: 105px 20px 1fr;
  gap: 14px;
  align-items: center;
  min-height: 76px;
  padding: 0 20px;
  border-bottom: 1px solid #ebeef5;
}
.timeline-row:last-child {
  border-bottom: 0;
}
.timeline-row time {
  color: #606266;
}
.timeline-marker {
  width: 14px;
  height: 14px;
  border: 4px solid #d9e7ff;
  border-radius: 50%;
  background: #409eff;
}
.timeline-marker.success {
  border-color: #d9f3e7;
  background: #20b26b;
}
.timeline-marker.warning {
  border-color: #fdf0d5;
  background: #e6a23c;
}
.timeline-marker.danger {
  border-color: #fde2e2;
  background: #f56c6c;
}
.timeline-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.timeline-content span {
  color: #606266;
  font-size: 13px;
}
.flow-panel {
  padding: 16px;
}
.flow-panel h4 {
  margin: 0 0 16px;
}
.flow-track {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
}
/* 节点：左侧圆形图标 + 右侧文案 */
.flow-node {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 14px 16px;
  margin-top: 18px;
  border-radius: 10px;
  background: #f5f9ff;
  border: 1px solid #d6e4ff;
}
/* 第一个节点不留顶部间距 */
.flow-node:first-child {
  margin-top: 0;
}
.flow-node-marker {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: #409eff;
  color: #fff;
}
.flow-node-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 6px;
  min-width: 0;
}
.flow-node-body strong {
  font-size: 14px;
  color: #303133;
}
.flow-node-body span {
  color: #606266;
  font-size: 12px;
  line-height: 1.5;
  word-break: break-all;
}
/* 节点色调 */
.flow-node.success {
  background: #f0fbf6;
  border-color: #a8e5c8;
}
.flow-node.success .flow-node-marker {
  background: #20b26b;
}
.flow-node.warning {
  background: #fffaf0;
  border-color: #f5d49b;
}
.flow-node.warning .flow-node-marker {
  background: #e6a23c;
}
.flow-node.danger {
  background: #fff5f5;
  border-color: #f7b2b2;
}
.flow-node.danger .flow-node-marker {
  background: #f56c6c;
}
.flow-node.primary .flow-node-marker {
  background: #409eff;
}
/* 节点之间的连接线：圆心对齐 */
.flow-node:not(:first-child)::before {
  content: '';
  position: absolute;
  top: -18px;
  left: 30px;
  width: 2px;
  height: 18px;
  background: #d6e4ff;
}
/* 耗时药丸：穿插在节点之间 */
.flow-gap {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 14px 0 0 49px;
  padding: 4px 14px;
  align-self: flex-start;
  border-radius: 12px;
  background: #f4f4f5;
  color: #909399;
  font-size: 12px;
  position: relative;
}
/* 药丸上方与节点的连接线 */
.flow-gap::before {
  content: '';
  position: absolute;
  top: -14px;
  left: 50%;
  width: 2px;
  height: 14px;
  background: #d6e4ff;
  transform: translateX(-50%);
}
.flow-gap.warning {
  background: #fdf6ec;
  color: #e6a23c;
}
.flow-gap.success {
  background: #f0fbf6;
  color: #20b26b;
}
.flow-gap.danger {
  background: #fef0f0;
  color: #f56c6c;
}
.flow-gap.muted {
  background: #f4f4f5;
  color: #909399;
}
.timeline-metrics {
  margin-top: 16px;
}
.recording-player {
  padding: 20px 0;
}
.transcript-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  margin-bottom: 14px;
  border: 1px solid #e4e7ed;
  border-radius: 10px;
  background: #f8fbff;
}
.transcript-toolbar > div {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.transcript-toolbar span {
  color: #909399;
  font-size: 13px;
}
.transcript-content {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.transcript-chat {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  border-radius: 10px;
  background: #f5f7fb;
}
.transcript-message {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  max-width: 78%;
}
.transcript-message.is-agent,
.transcript-message.is-ai {
  align-self: flex-end;
  flex-direction: row-reverse;
}
.transcript-message.is-customer,
.transcript-message.is-system,
.transcript-message.is-unknown {
  align-self: flex-start;
}
.transcript-avatar {
  flex: 0 0 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #909399;
  color: #fff;
  font-weight: 600;
  font-size: 13px;
}
.transcript-message.is-customer .transcript-avatar {
  background: #0b4a7a;
}
.transcript-message.is-agent .transcript-avatar {
  background: #1f9d55;
}
.transcript-message.is-ai .transcript-avatar {
  background: #7c3aed;
}
.transcript-message.is-system .transcript-avatar {
  background: #e6a23c;
}
.transcript-bubble-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.transcript-message.is-agent .transcript-bubble-wrap,
.transcript-message.is-ai .transcript-bubble-wrap {
  align-items: flex-end;
}
.transcript-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  color: #909399;
  font-size: 12px;
}
.transcript-message.is-agent .transcript-meta,
.transcript-message.is-ai .transcript-meta {
  justify-content: flex-end;
}
.transcript-meta span:first-child {
  color: #606266;
  font-weight: 600;
}
.transcript-bubble {
  padding: 10px 14px;
  border-radius: 12px;
  line-height: 1.7;
  white-space: pre-wrap;
  background: #fff;
  color: #303133;
  box-shadow: 0 4px 14px rgba(31, 45, 61, 0.06);
}
.transcript-message.is-agent .transcript-bubble {
  color: #fff;
  background: #0b4a7a;
}
.transcript-message.is-ai .transcript-bubble {
  color: #fff;
  background: #7c3aed;
}
.transcript-message.is-system .transcript-bubble,
.transcript-message.is-unknown .transcript-bubble {
  background: #f4f4f5;
}
.transcript-raw {
  border-radius: 10px;
  overflow: hidden;
}
.transcript-full-text {
  white-space: pre-wrap;
  line-height: 1.8;
  color: #303133;
  padding: 4px 0;
}
.voicemail-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.voicemail-card {
  border-radius: 10px;
}
.voicemail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.voicemail-header > div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.voicemail-header span {
  color: #909399;
  font-size: 12px;
}
.voicemail-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
.voicemail-player {
  padding-top: 14px;
}
.recording-file {
  margin-top: 12px;
  color: #606266;
  font-size: 13px;
}
.diagnostic-tip {
  margin-bottom: 12px;
}
.diagnostic-collapse {
  border-top: 1px solid #ebeef5;
  border-bottom: 1px solid #ebeef5;
}
.diagnostic-collapse :deep(.el-collapse-item__content) {
  padding-bottom: 18px;
}
/* 描述项内的可点击 ID 链接：去除 button 默认内边距，贴合单元格 */
.id-link {
  padding: 0;
  height: auto;
  vertical-align: baseline;
  font-weight: inherit;
}
</style>
