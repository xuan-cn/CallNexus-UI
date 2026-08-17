<template>
  <div class="p-2 ai-call-record-page">
    <el-card shadow="never" class="query-card">
      <el-form :model="queryParams" inline>
        <el-form-item label="参与号码">
          <el-input v-model="queryParams.participantNumber" clearable placeholder="主叫或被叫" style="width: 180px" @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item label="坐席分机">
          <el-input v-model="queryParams.agentExtension" clearable placeholder="坐席分机" style="width: 150px" @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="queryParams.callStatus" clearable placeholder="全部状态" style="width: 140px">
            <el-option label="通话中" value="ACTIVE" />
            <el-option label="已结束" value="ENDED" />
            <el-option label="已创建" value="CREATED" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Search" @click="handleQuery">查询</el-button>
          <el-button icon="Refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <div class="ai-call-record-layout">
      <el-card shadow="never" class="record-list-card">
        <template #header>
          <div class="card-header">
            <div>
              <strong>AI 通话记录</strong>
              <span>{{ total }} 条</span>
            </div>
            <el-button circle icon="Refresh" :loading="loading" @click="getList" />
          </div>
        </template>
        <div v-loading="loading" class="record-list">
          <div
            v-for="record in records"
            :key="String(record.callSessionId)"
            class="record-item"
            :class="{ active: selectedRecord && String(selectedRecord.callSessionId) === String(record.callSessionId) }"
            @click="selectRecord(record)"
          >
            <div class="record-main">
              <span>{{ record.callerNumber || '-' }}</span>
              <el-icon><Right /></el-icon>
              <span>{{ record.calledNumber || '-' }}</span>
            </div>
            <div class="record-meta">
              <el-tag size="small" :type="directionType(record.direction)" effect="plain">{{ directionLabel(record.direction) }}</el-tag>
              <span>{{ record.startedAt || '-' }}</span>
            </div>
            <div class="record-foot">
              <span>{{ record.ownerAgentExtension || record.agentExtension || '未关联坐席' }}</span>
              <span>{{ durationLabel(record.durationSeconds) }}</span>
              <el-tag size="small" :type="transcriptType(record.transcriptStatus)">{{ transcriptLabel(record.transcriptStatus) }}</el-tag>
            </div>
          </div>
          <el-empty v-if="!records.length && !loading" description="暂无 AI 通话记录" :image-size="80" />
        </div>
        <pagination
          v-show="total > 0"
          v-model:page="queryParams.pageNum"
          v-model:limit="queryParams.pageSize"
          :total="total"
          layout="prev, pager, next"
          :pager-count="5"
          :auto-scroll="false"
          @pagination="getList"
        />
      </el-card>

      <el-card shadow="never" class="conversation-card">
        <template #header>
          <div class="conversation-header">
            <div>
              <strong>{{ selectedTitle }}</strong>
              <span v-if="selectedRecord?.businessCallId">{{ selectedRecord.businessCallId }}</span>
            </div>
            <el-space>
              <el-tag v-if="selectedRecord" :type="callStatusType(selectedRecord.callStatus)" effect="plain">
                {{ callStatusLabel(selectedRecord.callStatus) }}
              </el-tag>
              <el-tag v-if="streamActive" :type="streamConnected ? 'success' : 'info'" effect="plain">
                {{ streamConnected ? '实时接收中' : '实时连接中' }}
              </el-tag>
            </el-space>
          </div>
        </template>

        <template v-if="selectedRecord">
          <div class="record-summary">
            <div><span>开始</span>{{ selectedRecord.startedAt || '-' }}</div>
            <div><span>接听</span>{{ selectedRecord.answeredAt || '-' }}</div>
            <div><span>结束</span>{{ selectedRecord.endedAt || '-' }}</div>
            <div><span>时长</span>{{ durationLabel(selectedRecord.durationSeconds) }}</div>
          </div>
          <div v-if="selectedRecord.recordingUrl" class="recording-panel">
            <AudioWaveform :src="selectedRecord.recordingUrl" :height="42" compact />
          </div>
          <el-alert
            v-if="transcript?.status === 'FAILED'"
            class="mb-2"
            type="error"
            show-icon
            :closable="false"
            :title="transcript.failureReason || selectedRecord.transcriptFailureReason || '转写失败'"
          />
          <div ref="chatRef" class="conversation-list">
            <div v-for="segment in transcriptSegments" :key="transcriptSegmentKey(segment)" class="message" :class="speakerClass(segment.speaker)">
              <div class="avatar">{{ speakerInitial(segment.speaker) }}</div>
              <div class="bubble-wrap">
                <div class="meta">
                  <span>{{ speakerLabel(segment.speaker) }}</span>
                  <span>{{ transcriptSegmentTime(segment) }}</span>
                </div>
                <div class="bubble">{{ segment.textContent || '-' }}</div>
              </div>
            </div>
            <el-empty v-if="!transcriptSegments.length && !transcriptLoading" description="暂无对话内容" :image-size="80" />
            <div v-if="transcriptLoading" class="loading-text">正在加载对话...</div>
          </div>
        </template>
        <el-empty v-else description="请选择左侧 AI 通话记录" :image-size="100" />
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { Right } from '@element-plus/icons-vue';
import { getCallTranscript, listAiCallRecords, streamCallTranscript } from '@/api/callcenter/ai-speech';
import { AiCallRecordQuery, AiCallRecordVO, AiCallTranscriptSegmentVO, AiCallTranscriptStreamEvent, AiCallTranscriptVO } from '@/api/callcenter/ai-speech/types';

const loading = ref(false);
const transcriptLoading = ref(false);
const records = ref<AiCallRecordVO[]>([]);
const total = ref(0);
const selectedRecord = ref<AiCallRecordVO>();
const transcript = ref<AiCallTranscriptVO>();
const chatRef = ref<HTMLElement>();
const streamActive = ref(false);
const streamConnected = ref(false);
let streamController: AbortController | undefined;
let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
let transcriptRefreshTimer: ReturnType<typeof setTimeout> | undefined;
let streamSessionId: string | number | undefined;

const queryParams = reactive<AiCallRecordQuery>({
  pageNum: 1,
  pageSize: 10,
  participantNumber: '',
  agentExtension: '',
  callStatus: ''
});

const selectedTitle = computed(() => {
  if (!selectedRecord.value) return 'AI 通话详情';
  return `${selectedRecord.value.callerNumber || '-'} → ${selectedRecord.value.calledNumber || '-'}`;
});

const normalizePage = (res: any) => {
  const data = res?.rows !== undefined ? res : res?.data || {};
  return { rows: data.rows || [], total: data.total || 0 };
};

const normalizeTranscript = (res: any): AiCallTranscriptVO | undefined => {
  const data = res?.data && res?.status === undefined ? res.data : res;
  return data || undefined;
};

const directionLabel = (value?: string) => ({ INBOUND: '呼入', OUTBOUND: '呼出', INTERNAL: '内部', UNKNOWN: '未知' })[value || 'UNKNOWN'] || value || '-';
const directionType = (value?: string) => ({ INBOUND: 'success', OUTBOUND: 'primary', INTERNAL: 'warning', UNKNOWN: 'info' })[value || 'UNKNOWN'] as any;
const callStatusLabel = (value?: string) => ({ CREATED: '已创建', ACTIVE: '通话中', ENDED: '已结束' })[value || ''] || value || '-';
const callStatusType = (value?: string) => ({ CREATED: 'info', ACTIVE: 'success', ENDED: 'info' })[value || ''] as any;
const transcriptLabel = (value?: string) => ({ PROCESSING: '转写中', SUCCESS: '已转写', FAILED: '失败' })[value || ''] || '未转写';
const transcriptType = (value?: string) => ({ PROCESSING: 'warning', SUCCESS: 'success', FAILED: 'danger' })[value || ''] as any;
const speakerLabel = (value?: string) => ({ CUSTOMER: '客户', AGENT: '坐席', AI: 'AI', SYSTEM: '系统', UNKNOWN: '未知' })[value || 'UNKNOWN'] || value || '-';
const speakerInitial = (value?: string) => ({ CUSTOMER: '客', AGENT: '席', AI: 'AI', SYSTEM: '系', UNKNOWN: '?' })[value || 'UNKNOWN'] || '?';
const speakerClass = (value?: string) => ({ CUSTOMER: 'is-customer', AGENT: 'is-agent', AI: 'is-ai', SYSTEM: 'is-system', UNKNOWN: 'is-unknown' })[value || 'UNKNOWN'] || 'is-unknown';
const durationLabel = (seconds?: number) => {
  if (seconds === undefined || seconds === null) return '-';
  if (seconds < 60) return `${seconds}秒`;
  return `${Math.floor(seconds / 60)}分${seconds % 60}秒`;
};
const formatMs = (value?: number) => {
  if (value === undefined || value === null) return '--';
  const total = Math.floor(value / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};
const transcriptSegmentKey = (segment: AiCallTranscriptSegmentVO) =>
  String(segment.id || `${segment.speaker || 'UNKNOWN'}-${segment.sentenceIndex ?? ''}-${segment.startMs ?? ''}-${segment.textContent}`);
const transcriptSegmentTime = (segment: AiCallTranscriptSegmentVO) => {
  if (segment.startMs !== undefined || segment.endMs !== undefined) {
    return `${formatMs(segment.startMs)} - ${formatMs(segment.endMs)}`;
  }
  return segment.messageTime || '实时';
};
const sortSegments = (segments: AiCallTranscriptSegmentVO[]) =>
  [...segments].sort((left, right) => {
    const leftTime = left.startMs ?? Number.MAX_SAFE_INTEGER;
    const rightTime = right.startMs ?? Number.MAX_SAFE_INTEGER;
    if (leftTime !== rightTime) return leftTime - rightTime;
    return (left.sentenceIndex ?? 0) - (right.sentenceIndex ?? 0);
  });
const transcriptSegments = computed(() => sortSegments(transcript.value?.segments || []));

const scrollBottom = () => {
  void nextTick(() => {
    if (chatRef.value) chatRef.value.scrollTop = chatRef.value.scrollHeight;
  });
};

const getList = async () => {
  loading.value = true;
  try {
    const res = await listAiCallRecords(queryParams);
    const page = normalizePage(res);
    records.value = page.rows;
    total.value = page.total;
    if (!selectedRecord.value && records.value.length) {
      await selectRecord(records.value[0]);
      return;
    }
    if (selectedRecord.value && !records.value.some((item) => String(item.callSessionId) === String(selectedRecord.value?.callSessionId))) {
      selectedRecord.value = undefined;
      transcript.value = undefined;
      stopStream();
      stopTranscriptRefresh();
    }
  } finally {
    loading.value = false;
  }
};

const handleQuery = () => {
  queryParams.pageNum = 1;
  void getList();
};

const resetQuery = () => {
  queryParams.pageNum = 1;
  queryParams.participantNumber = '';
  queryParams.agentExtension = '';
  queryParams.callStatus = '';
  void getList();
};

const loadTranscript = async (record: AiCallRecordVO, silent = false) => {
  if (!silent) transcriptLoading.value = true;
  try {
    const res = await getCallTranscript(record.callSessionId);
    transcript.value = normalizeTranscript(res);
  } catch {
    if (!silent) transcript.value = undefined;
  } finally {
    if (!silent) transcriptLoading.value = false;
    scrollBottom();
  }
};

const mergeSegment = (event: AiCallTranscriptStreamEvent) => {
  if (!event.segment || String(event.callSessionId) !== String(selectedRecord.value?.callSessionId)) return;
  const current = transcript.value;
  const segments = current?.segments ? [...current.segments] : [];
  if (segments.some((item) => transcriptSegmentKey(item) === transcriptSegmentKey(event.segment!))) return;
  segments.push(event.segment);
  transcript.value = {
    ...(current || {
      id: event.transcriptId || `realtime-${event.callSessionId}`,
      callSessionId: event.callSessionId,
      businessCallId: selectedRecord.value?.businessCallId || '',
      status: 'SUCCESS'
    }),
    status: 'SUCCESS',
    segments: sortSegments(segments)
  };
  scrollBottom();
};

const stopStream = () => {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = undefined;
  streamController?.abort();
  streamController = undefined;
  streamSessionId = undefined;
  streamActive.value = false;
  streamConnected.value = false;
};

const stopTranscriptRefresh = () => {
  if (transcriptRefreshTimer) clearTimeout(transcriptRefreshTimer);
  transcriptRefreshTimer = undefined;
};

const startTranscriptRefresh = (record: AiCallRecordVO) => {
  stopTranscriptRefresh();
  if (record.callStatus === 'ENDED') return;
  const callSessionId = record.callSessionId;
  const tick = async () => {
    if (String(selectedRecord.value?.callSessionId) !== String(callSessionId)) return;
    await loadTranscript(record, true);
    if (String(selectedRecord.value?.callSessionId) !== String(callSessionId) || selectedRecord.value?.callStatus === 'ENDED') return;
    transcriptRefreshTimer = setTimeout(tick, 1500);
  };
  transcriptRefreshTimer = setTimeout(tick, 1500);
};

const startStream = (record: AiCallRecordVO) => {
  stopStream();
  if (record.callStatus === 'ENDED') return;
  const callSessionId = record.callSessionId;
  streamSessionId = callSessionId;
  streamActive.value = true;
  const connect = () => {
    if (String(streamSessionId) !== String(callSessionId)) return;
    const controller = new AbortController();
    streamController = controller;
    streamConnected.value = false;
    streamCallTranscript(
      callSessionId,
      (event, data) => {
        if (event === 'connected') {
          streamConnected.value = true;
          void loadTranscript(record, true);
        }
        if (event === 'segment') mergeSegment(data);
      },
      controller.signal
    )
      .catch((error) => {
        if (error?.name !== 'AbortError') console.warn('AI call transcript stream disconnected', error);
      })
      .finally(() => {
        streamConnected.value = false;
        if (controller.signal.aborted || String(streamSessionId) !== String(callSessionId)) return;
        reconnectTimer = setTimeout(connect, 1500);
      });
  };
  connect();
};

const selectRecord = async (record: AiCallRecordVO) => {
  selectedRecord.value = record;
  transcript.value = undefined;
  await loadTranscript(record);
  startStream(record);
  startTranscriptRefresh(record);
};

watch(
  () => transcriptSegments.value.length,
  () => scrollBottom()
);

onMounted(getList);
onBeforeUnmount(() => {
  stopStream();
  stopTranscriptRefresh();
});
</script>

<style scoped>
.ai-call-record-page {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: calc(100vh - 98px);
}
.query-card :deep(.el-card__body) {
  padding-bottom: 0;
}
.ai-call-record-layout {
  display: grid;
  grid-template-columns: 380px minmax(0, 1fr);
  gap: 10px;
  min-height: 0;
  flex: 1;
}
.record-list-card,
.conversation-card {
  min-height: 0;
}
.conversation-card {
  height: calc(100vh - 166px);
}
.record-list-card :deep(.el-card__body),
.conversation-card :deep(.el-card__body) {
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.conversation-card :deep(.el-card__body) {
  height: calc(100% - 57px);
}
.card-header,
.conversation-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.card-header div,
.conversation-header div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.card-header span,
.conversation-header span {
  color: #909399;
  font-size: 12px;
}
.record-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  min-height: 0;
  height: calc(100vh - 282px);
  padding-right: 4px;
}
.record-item {
  padding: 12px;
  border: 1px solid #edf0f5;
  border-radius: 12px;
  cursor: pointer;
  background: #fff;
  transition: all 0.16s ease;
}
.record-item:hover,
.record-item.active {
  border-color: #0b4a7a;
  background: #f5f9fd;
}
.record-main {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #1f2d3d;
  font-weight: 700;
}
.record-meta,
.record-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 9px;
  color: #909399;
  font-size: 12px;
}
.record-summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 10px;
}
.record-summary div {
  padding: 10px 12px;
  border: 1px solid #edf0f5;
  border-radius: 10px;
  color: #303133;
  background: #fafcff;
}
.record-summary span {
  display: block;
  margin-bottom: 4px;
  color: #909399;
  font-size: 12px;
}
.recording-panel {
  margin-bottom: 10px;
}
.conversation-list {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 9px;
  min-height: 0;
  overflow-y: auto;
  padding: 12px;
  border-radius: 12px;
  background: #f5f7fb;
}
.message {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  max-width: 78%;
}
.message.is-agent,
.message.is-ai {
  align-self: flex-end;
  flex-direction: row-reverse;
}
.message.is-customer,
.message.is-system,
.message.is-unknown {
  align-self: flex-start;
}
.avatar {
  display: flex;
  flex: 0 0 30px;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  background: #909399;
}
.is-customer .avatar {
  background: #0b4a7a;
}
.is-agent .avatar {
  background: #1f9d55;
}
.is-ai .avatar {
  background: #23856d;
}
.is-system .avatar {
  background: #e6a23c;
}
.bubble-wrap {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.is-agent .bubble-wrap,
.is-ai .bubble-wrap {
  align-items: flex-end;
}
.meta {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #909399;
  font-size: 10px;
}
.bubble {
  padding: 7px 10px;
  border: 1px solid #e4e7ed;
  border-radius: 10px;
  color: #303133;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  background: #fff;
  box-shadow: 0 2px 8px rgba(31, 45, 61, 0.04);
}
.is-agent .bubble {
  border-color: #d6e7f7;
  background: #eaf4fc;
}
.is-ai .bubble {
  border-color: #d4ebe3;
  background: #eaf7f2;
}
.loading-text {
  align-self: center;
  color: #909399;
  font-size: 13px;
}
</style>
