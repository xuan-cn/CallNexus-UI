<template>
  <div class="ai-call-record-page">
    <el-card shadow="never" class="query-card">
      <el-form :model="queryParams" inline class="query-form">
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
            <div class="card-header-copy">
              <strong>AI 通话记录</strong>
              <span>{{ total }} 条记录</span>
            </div>
            <el-button circle icon="Refresh" :loading="loading" @click="getList" />
          </div>
        </template>
        <div v-loading="loading" class="record-list">
          <button
            v-for="record in records"
            :key="String(record.callSessionId)"
            type="button"
            class="record-item"
            :class="{ active: selectedRecord && String(selectedRecord.callSessionId) === String(record.callSessionId) }"
            @click="selectRecord(record)"
          >
            <div class="record-main">
              <span class="record-avatar" :data-direction="record.direction || 'UNKNOWN'">
                {{ directionInitial(record.direction) }}
              </span>
              <div class="record-numbers">
                <strong>{{ record.callerNumber || '-' }}</strong>
                <small>
                  <el-icon><Right /></el-icon>
                  {{ record.calledNumber || '-' }}
                </small>
              </div>
              <el-tag size="small" :type="directionType(record.direction)" effect="light" round>
                {{ directionLabel(record.direction) }}
              </el-tag>
            </div>
            <div class="record-meta">
              <span>{{ record.startedAt || '-' }}</span>
              <span class="duration-chip">{{ durationLabel(record.durationSeconds) }}</span>
            </div>
            <div class="record-foot">
              <span class="agent-chip">{{ record.ownerAgentExtension || record.agentExtension || '未关联坐席' }}</span>
              <el-tag size="small" :type="transcriptType(record.transcriptStatus)" effect="light" round>
                {{ transcriptLabel(record.transcriptStatus) }}
              </el-tag>
            </div>
          </button>
          <el-empty v-if="!records.length && !loading" description="暂无 AI 通话记录" :image-size="72" />
        </div>
        <pagination
          v-show="total > 0"
          v-model:page="queryParams.pageNum"
          v-model:limit="queryParams.pageSize"
          :total="total"
          layout="prev, pager, next"
          :pager-count="5"
          :auto-scroll="false"
          class="list-pagination"
          @pagination="getList"
        />
      </el-card>

      <el-card shadow="never" class="conversation-card">
        <template #header>
          <div class="conversation-header">
            <div class="card-header-copy">
              <span class="hero-eyebrow">通话详情</span>
              <strong>{{ selectedTitle }}</strong>
              <span v-if="selectedRecord?.businessCallId">{{ selectedRecord.businessCallId }}</span>
            </div>
            <el-space wrap>
              <el-tag v-if="selectedRecord" :type="callStatusType(selectedRecord.callStatus)" effect="light" round>
                {{ callStatusLabel(selectedRecord.callStatus) }}
              </el-tag>
              <el-tag v-if="streamActive" :type="streamConnected ? 'success' : 'info'" effect="light" round>
                {{ streamConnected ? '实时接收中' : '实时连接中' }}
              </el-tag>
            </el-space>
          </div>
        </template>

        <template v-if="selectedRecord">
          <div class="record-summary">
            <div class="summary-item">
              <span>开始</span>
              <strong>{{ selectedRecord.startedAt || '-' }}</strong>
            </div>
            <div class="summary-item">
              <span>接听</span>
              <strong>{{ selectedRecord.answeredAt || '-' }}</strong>
            </div>
            <div class="summary-item">
              <span>结束</span>
              <strong>{{ selectedRecord.endedAt || '-' }}</strong>
            </div>
            <div class="summary-item">
              <span>时长</span>
              <strong>{{ durationLabel(selectedRecord.durationSeconds) }}</strong>
            </div>
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
            <el-empty v-if="!transcriptSegments.length && !transcriptLoading" description="暂无对话内容" :image-size="72" />
            <div v-if="transcriptLoading" class="loading-text">正在加载对话...</div>
          </div>
        </template>
        <div v-else class="conversation-empty">
          <el-empty description="请选择左侧 AI 通话记录" :image-size="88" />
        </div>
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
const directionInitial = (value?: string) => ({ INBOUND: '入', OUTBOUND: '出', INTERNAL: '内', UNKNOWN: '通' })[value || 'UNKNOWN'] || '通';
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

<style scoped lang="scss">
.ai-call-record-page {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: calc(100vh - 84px);
  padding: 12px 14px;
  overflow: hidden;
}

.query-card {
  flex: none;
  border: 1px solid #dce8f6;
  border-radius: 14px;
  box-shadow: 0 8px 20px rgba(28, 48, 78, 0.04);

  :deep(.el-card__body) {
    padding: 12px 16px 2px;
  }
}

.query-form :deep(.el-form-item) {
  margin-bottom: 12px;
}

.ai-call-record-layout {
  display: grid;
  flex: 1;
  grid-template-columns: minmax(320px, 380px) minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr);
  align-items: stretch;
  gap: 12px;
  min-height: 0;
}

.record-list-card,
.conversation-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  border: 1px solid #dce8f6;
  border-radius: 16px;
  box-shadow: 0 10px 24px rgba(28, 48, 78, 0.05);
}

.record-list-card {
  background:
    linear-gradient(180deg, rgba(247, 251, 255, 0.95), rgba(255, 255, 255, 0.98)),
    #fff;
}

.record-list-card :deep(.el-card__header),
.conversation-card :deep(.el-card__header) {
  flex: none;
  padding: 14px 16px;
  border-bottom: 1px solid #eef3f8;
  background: transparent;
}

.record-list-card :deep(.el-card__body),
.conversation-card :deep(.el-card__body) {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  padding: 12px 14px 14px;
  overflow: hidden;
}

.card-header,
.conversation-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.card-header-copy {
  display: grid;
  gap: 4px;
  min-width: 0;

  strong {
    overflow: hidden;
    color: #15233d;
    font-size: 15px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  span {
    overflow: hidden;
    color: #7b8798;
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.hero-eyebrow {
  color: #6b7c93;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.record-list {
  display: grid;
  flex: 1;
  gap: 8px;
  align-content: start;
  min-height: 0;
  overflow: auto;
  padding-right: 2px;
}

.record-item {
  display: grid;
  gap: 10px;
  width: 100%;
  padding: 12px;
  text-align: left;
  cursor: pointer;
  border: 1px solid #e4ecf6;
  border-radius: 12px;
  background: #fff;
  transition: border-color 0.16s ease, background 0.16s ease, box-shadow 0.16s ease;
}

.record-item:hover {
  border-color: #c9dbf8;
  background: #f8fbff;
}

.record-item.active {
  border-color: #c9ddf7;
  background: linear-gradient(90deg, #eef6ff, #f7fbff);
  box-shadow: inset 3px 0 0 #3b82f6;
}

.record-main {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
}

.record-avatar {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  color: #1d4ed8;
  font-size: 13px;
  font-weight: 700;
  border-radius: 10px;
  background: #dbeafe;

  &[data-direction='INBOUND'] {
    color: #047857;
    background: #d1fae5;
  }

  &[data-direction='OUTBOUND'] {
    color: #1d4ed8;
    background: #dbeafe;
  }

  &[data-direction='INTERNAL'] {
    color: #b45309;
    background: #fef3c7;
  }
}

.record-numbers {
  display: grid;
  gap: 4px;
  min-width: 0;

  strong {
    overflow: hidden;
    color: #15233d;
    font-size: 14px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  small {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    overflow: hidden;
    color: #7b8798;
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.record-meta,
.record-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: #7b8798;
  font-size: 12px;
}

.duration-chip,
.agent-chip {
  padding: 2px 8px;
  color: #5b6b82;
  border: 1px solid #e2eaf4;
  border-radius: 999px;
  background: #f5f8fc;
}

.list-pagination {
  flex: none;
  margin-top: 10px !important;
  padding: 8px 0 0 !important;
  border-top: 1px solid #eef3f8;
}

.record-summary {
  display: grid;
  flex: none;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 12px;
}

.summary-item {
  padding: 12px 14px;
  border: 1px solid #e4ecf6;
  border-radius: 12px;
  background: linear-gradient(180deg, #ffffff, #f7faff);

  span {
    display: block;
    margin-bottom: 6px;
    color: #7b8798;
    font-size: 12px;
  }

  strong {
    color: #15233d;
    font-size: 13px;
    font-weight: 600;
    word-break: break-all;
  }
}

.recording-panel {
  flex: none;
  margin-bottom: 12px;
  padding: 10px 12px;
  border: 1px solid #e4ecf6;
  border-radius: 12px;
  background: #f7faff;
}

.conversation-list {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  overflow-y: auto;
  padding: 14px;
  border: 1px solid #e4ecf6;
  border-radius: 14px;
  background:
    radial-gradient(circle at 100% 0%, rgba(56, 189, 248, 0.08), transparent 36%),
    linear-gradient(180deg, #f8fbff, #f4f7fb);
}

.conversation-empty {
  display: grid;
  flex: 1;
  place-items: center;
}

.message {
  display: flex;
  align-items: flex-start;
  gap: 10px;
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
  display: grid;
  flex: none;
  place-items: center;
  width: 32px;
  height: 32px;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  border-radius: 10px;
  background: #909399;
}

.is-customer .avatar {
  background: #2563eb;
}

.is-agent .avatar {
  background: #059669;
}

.is-ai .avatar {
  background: #0f766e;
}

.is-system .avatar {
  background: #d97706;
}

.bubble-wrap {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.is-agent .bubble-wrap,
.is-ai .bubble-wrap {
  align-items: flex-end;
}

.meta {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #8b97aa;
  font-size: 11px;
}

.bubble {
  padding: 10px 12px;
  border: 1px solid #e4e7ed;
  border-radius: 12px;
  color: #303133;
  font-size: 13px;
  line-height: 1.65;
  white-space: pre-wrap;
  background: #fff;
  box-shadow: 0 4px 12px rgba(28, 48, 78, 0.04);
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

@media (max-width: 1100px) {
  .ai-call-record-page {
    height: auto;
    min-height: calc(100vh - 84px);
    overflow: auto;
  }

  .ai-call-record-layout {
    grid-template-columns: 1fr;
    grid-template-rows: auto;
    height: auto;
  }

  .record-list-card,
  .conversation-card {
    height: auto;
    min-height: 480px;
  }

  .record-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
