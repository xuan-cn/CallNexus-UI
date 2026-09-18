<template>
  <el-drawer v-model="visible" title="通话记录详情" size="76%" append-to-body destroy-on-close>
    <div v-loading="loading" class="call-detail-drawer">
      <el-tabs v-if="detail" v-model="activeTab">
        <el-tab-pane label="基本信息" name="basic">
          <div class="call-hero">
            <div><span>业务通话</span><strong>{{ detail.businessCallId || '-' }}</strong></div>
            <div class="hero-tags">
              <el-tag effect="light">{{ directionLabel(detail.direction) }}</el-tag>
              <el-tag type="info" effect="light">{{ statusLabel(detail.callStatus) }}</el-tag>
              <el-tag v-if="detail.handlingQueueName" type="info" effect="plain">{{ detail.handlingQueueName }}</el-tag>
            </div>
          </div>
          <el-descriptions :column="3" border size="small">
            <el-descriptions-item label="主叫号码">{{ detail.callerNumber || '-' }}</el-descriptions-item>
            <el-descriptions-item label="被叫号码">{{ detail.calledNumber || '-' }}</el-descriptions-item>
            <el-descriptions-item label="坐席分机">{{ detail.agentExtension || '-' }}</el-descriptions-item>
            <el-descriptions-item label="开始时间">{{ detail.startedAt || '-' }}</el-descriptions-item>
            <el-descriptions-item label="接听时间">{{ detail.answeredAt || '-' }}</el-descriptions-item>
            <el-descriptions-item label="结束时间">{{ detail.endedAt || '-' }}</el-descriptions-item>
            <el-descriptions-item label="通话总时长">{{ duration(detail.durationSeconds) }}</el-descriptions-item>
            <el-descriptions-item label="接通时长">{{ duration(detail.billableSeconds) }}</el-descriptions-item>
            <el-descriptions-item label="挂断原因">{{ hangupCauseLabel(detail.hangupCause) }}</el-descriptions-item>
            <el-descriptions-item label="满意度评价">
              <el-rate v-if="detail.satisfaction?.status === 'SUBMITTED'" :model-value="detail.satisfaction.score" disabled />
              <span v-else>{{ detail.satisfaction ? '未评价' : '-' }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="关联客户ID">{{ detail.customerId || '-' }}</el-descriptions-item>
            <el-descriptions-item label="关联工单ID">{{ detail.ticketId || '-' }}</el-descriptions-item>
          </el-descriptions>
        </el-tab-pane>
        <el-tab-pane label="通话录音" name="recording">
          <div v-if="detail.recordingUrl" class="recording-panel">
            <AudioWaveform :src="detail.recordingUrl" />
            <el-button v-if="detail.recordingStatus === 'UPLOADED'" type="primary" plain @click="downloadRecording">下载录音</el-button>
          </div>
          <el-empty v-else :description="recordingStatusLabel(detail.recordingStatus)" :image-size="70" />
        </el-tab-pane>
        <el-tab-pane label="语音转写" name="transcript">
          <div v-if="transcriptSegments.length" class="transcript-list">
            <div v-for="segment in transcriptSegments" :key="segmentKey(segment)" class="transcript-item" :class="speakerClass(segment.speaker)">
              <span>{{ speakerLabel(segment.speaker) }}</span><p>{{ segment.textContent || '-' }}</p>
            </div>
          </div>
          <el-empty v-else description="暂无语音转写" :image-size="70" />
        </el-tab-pane>
        <el-tab-pane label="事件记录" name="events">
          <el-table :data="detail.events || []" size="small" max-height="520">
            <el-table-column label="时间" prop="occurredAt" width="168" />
            <el-table-column label="事件" prop="eventType" width="150" />
            <el-table-column label="来源" prop="fromTarget" min-width="100" show-overflow-tooltip />
            <el-table-column label="目标" prop="toTarget" min-width="100" show-overflow-tooltip />
            <el-table-column label="说明" prop="description" min-width="220" show-overflow-tooltip />
          </el-table>
        </el-tab-pane>
      </el-tabs>
      <el-empty v-else-if="!loading" description="未找到通话记录" />
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import FileSaver from 'file-saver';
import { computed, ref, watch } from 'vue';
import { downloadCallRecording, getCallRecord } from '@/api/callcenter/call-record';
import { hangupCauseLabel } from '@/api/callcenter/call-record/display';
import type { CallRecordVO } from '@/api/callcenter/call-record/types';
import { getCallTranscript } from '@/api/callcenter/ai-speech';
import type { AiCallTranscriptSegmentVO } from '@/api/callcenter/ai-speech/types';
import AudioWaveform from '@/components/AudioWaveform/index.vue';

const props = defineProps<{ modelValue: boolean; sessionId?: string | number }>();
const emit = defineEmits<{ (event: 'update:modelValue', value: boolean): void }>();
const visible = computed({ get: () => props.modelValue, set: (value) => emit('update:modelValue', value) });
const loading = ref(false);
const activeTab = ref('basic');
const detail = ref<CallRecordVO>();
const transcriptSegments = ref<AiCallTranscriptSegmentVO[]>([]);

const directionLabel = (value?: string) => ({ INBOUND: '呼入', OUTBOUND: '呼出', INTERNAL: '内部通话', UNKNOWN: '未知' })[value || 'UNKNOWN'] || value || '-';
const statusLabel = (value?: string) => ({ CREATED: '已创建', RINGING: '振铃中', ANSWERED: '已接听', BRIDGED: '已桥接', ENDED: '已结束' })[value || ''] || value || '-';
const recordingStatusLabel = (value?: CallRecordVO['recordingStatus']) =>
  ({ NONE: '暂无录音', PENDING: '录音正在上传', UPLOADED: '录音已上传', FAILED: '录音上传失败' })[value || 'NONE'];
const duration = (seconds?: number) => {
  const value = Math.max(0, Number(seconds || 0));
  const minutes = Math.floor(value / 60);
  const remain = value % 60;
  return minutes ? `${minutes}分${remain}秒` : `${remain}秒`;
};
const speakerLabel = (value?: string) => ({ CUSTOMER: '客户', AGENT: '坐席', AI: 'AI', SYSTEM: '系统', UNKNOWN: '未知' })[value || 'UNKNOWN'] || value || '未知';
const speakerClass = (value?: string) => `is-${String(value || 'UNKNOWN').toLowerCase()}`;
const segmentKey = (segment: AiCallTranscriptSegmentVO) => String(segment.id || `${segment.speaker}-${segment.sentenceIndex}-${segment.startMs}`);

const load = async () => {
  if (!props.sessionId) return;
  loading.value = true;
  detail.value = undefined;
  transcriptSegments.value = [];
  activeTab.value = 'basic';
  try {
    const detailResponse = await getCallRecord(props.sessionId);
    detail.value = detailResponse.data;
    try {
      const transcriptResponse = await getCallTranscript(props.sessionId);
      transcriptSegments.value = [...(transcriptResponse.data?.segments || [])].sort(
        (left, right) => (left.startMs ?? Number.MAX_SAFE_INTEGER) - (right.startMs ?? Number.MAX_SAFE_INTEGER)
      );
    } catch {
      transcriptSegments.value = [];
    }
  } finally {
    loading.value = false;
  }
};
const downloadRecording = async () => {
  if (!detail.value) return;
  const blob = await downloadCallRecording(detail.value.id);
  FileSaver.saveAs(blob, detail.value.recordingFileName || `通话录音_${detail.value.businessCallId || detail.value.id}.wav`);
};
watch(() => [props.modelValue, props.sessionId] as const, ([opened]) => { if (opened) void load(); });
</script>

<style scoped lang="scss">
.call-detail-drawer { min-height: 360px; font-size: 12px; }
.call-hero { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; padding: 14px 16px; border-radius: 10px; background: var(--el-fill-color-lighter); }
.call-hero span, .call-hero strong { display: block; }.call-hero span { color: var(--el-text-color-secondary); font-size: 11px; }.call-hero strong { margin-top: 4px; font-size: 17px; font-weight: 500; }
.hero-tags { display: flex; gap: 6px; }.recording-panel { display: flex; flex-direction: column; align-items: flex-start; gap: 12px; padding: 12px 0; }
.recording-panel > :first-child { width: 100%; }.transcript-list { display: flex; flex-direction: column; gap: 8px; max-height: 540px; padding: 4px 6px; overflow: auto; }
.transcript-item { max-width: 72%; padding: 9px 12px; border-radius: 9px; background: var(--el-fill-color-lighter); }.transcript-item span { color: var(--el-text-color-secondary); font-size: 10px; }.transcript-item p { margin: 4px 0 0; line-height: 1.6; }
.transcript-item.is-agent, .transcript-item.is-ai { align-self: flex-end; background: var(--el-color-primary-light-9); }
:deep(.el-descriptions__label), :deep(.el-descriptions__content), :deep(.el-table) { font-size: 11px; }:deep(.el-rate) { height: 18px; white-space: nowrap; }:deep(.el-rate__icon) { margin-right: 0; font-size: 14px; }
</style>
