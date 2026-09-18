<template>
  <div class="quality-workbench">
    <aside class="task-panel">
      <div class="panel-title">
        <div>
          <strong>质检工作台</strong><span>{{ taskTotal }} 个任务</span>
        </div>
        <el-button circle text icon="Refresh" @click="loadTasks" />
      </div>
      <el-input v-model="taskQuery.keyword" clearable size="small" placeholder="搜索任务或通话" @keyup.enter="loadTasks" />
      <el-radio-group v-model="taskQuery.status" size="small" class="status-filter" @change="loadTasks"
        ><el-radio-button label="">全部</el-radio-button><el-radio-button label="PENDING">待领取</el-radio-button
        ><el-radio-button label="ASSIGNED">待评分</el-radio-button></el-radio-group
      >
      <el-scrollbar class="task-scroll">
        <button
          v-for="task in tasks"
          :key="task.id"
          class="task-card"
          :class="{ active: String(task.id) === String(selectedId) }"
          @click="selectTask(task.id)"
        >
          <div>
            <strong>{{ task.taskCode }}</strong
            ><el-tag size="small" :type="task.status === 'PENDING' ? 'warning' : 'primary'">{{ statusLabel(task.status) }}</el-tag>
          </div>
          <span>{{ task.queueName || '未关联队列' }} · 分机 {{ task.agentExtension || '-' }}</span>
          <small>{{ task.templateName }} · {{ task.createTime || '-' }}</small>
        </button>
        <el-empty v-if="!taskLoading && !tasks.length" description="暂无待质检任务" :image-size="56" />
      </el-scrollbar>
      <pagination
        v-show="taskTotal > taskQuery.pageSize"
        v-model:page="taskQuery.pageNum"
        v-model:limit="taskQuery.pageSize"
        small
        layout="prev, pager, next"
        :total="taskTotal"
        :auto-scroll="false"
        @pagination="loadTasks"
      />
    </aside>

    <main v-loading="detailLoading" class="call-panel">
      <template v-if="detail">
        <div class="call-header">
          <div>
            <strong>{{ detail.businessCallId || detail.callSessionId }}</strong
            ><span
              >{{ directionLabel(detail.call?.direction) }} · {{ detail.call?.callerNumber || '-' }} → {{ detail.call?.calledNumber || '-' }}</span
            >
          </div>
          <el-tag>{{ detail.queueName || '无队列' }}</el-tag>
        </div>
        <section class="recording-section">
          <div class="section-title">
            <strong>通话录音</strong><span>{{ duration(detail.call?.billableSeconds) }}</span>
          </div>
          <AudioWaveform
            v-if="detail.call?.recordingUrl"
            ref="audioWaveformRef"
            :src="detail.call.recordingUrl"
            :height="42"
            compact
            show-playback-rate
          /><el-empty v-else description="当前通话没有可播放录音" :image-size="55" />
        </section>
        <section class="transcript-section">
          <div class="section-title">
            <strong>通话对话</strong><span>{{ transcriptMessages.length }} 条对话 · {{ transcriptSegments.length }} 条分句</span>
          </div>
          <el-scrollbar class="transcript-scroll"
            ><div v-if="transcriptMessages.length" class="transcript-list">
              <div v-for="message in transcriptMessages" :key="message.key" class="message" :class="speakerClass(message.speaker)">
                <span>{{ speakerLabel(message.speaker) }}</span>
                <p>{{ message.textContent }}</p>
                <small v-if="message.startMs !== undefined">{{ millisecondTime(message.startMs) }}</small>
              </div>
            </div>
            <el-empty v-else description="暂无语音转写，可先依据录音人工质检" :image-size="58"
          /></el-scrollbar>
        </section>
      </template>
      <el-empty v-else-if="!detailLoading" description="请从左侧选择质检任务" />
    </main>

    <aside class="score-panel">
      <template v-if="detail">
        <div class="score-summary">
          <div>
            <span>当前评分</span><strong>{{ scorePreview }}</strong
            ><small>/ {{ templateTotal }}</small>
          </div>
          <div class="score-summary-actions">
            <el-tag :type="qualifiedPreview ? 'success' : 'danger'">{{ qualifiedPreview ? '预计合格' : '预计不合格' }}</el-tag>
            <el-button
              v-if="detail.aiReviewEnabled"
              v-hasPermi="['callcenter:quality-task:ai-review']"
              size="small"
              type="primary"
              plain
              :loading="aiTriggering"
              :disabled="aiReviewRunning"
              @click="runAiReview"
              >{{ detail.aiResult ? '重新 AI 初审' : 'AI 初审' }}</el-button
            >
          </div>
        </div>
        <el-alert v-if="aiReviewRunning" class="ai-review-alert" type="info" :closable="false" title="AI 正在异步分析通话，完成后将自动刷新。" />
        <el-alert
          v-else-if="detail.aiReviewStatus === 'RETRY'"
          class="ai-review-alert"
          type="warning"
          :closable="false"
          :title="`AI 初审等待自动重试：${detail.aiReviewError || '模型调用暂时失败'}`"
        />
        <el-alert
          v-else-if="detail.aiReviewStatus === 'FAILED'"
          class="ai-review-alert"
          type="error"
          :closable="false"
          :title="`AI 初审失败：${detail.aiReviewError || '未知错误'}`"
        />
        <el-alert v-if="detail.status === 'PENDING'" type="warning" :closable="false" title="该任务尚未领取，领取后才能提交评分。"
          ><template #default
            ><el-button v-hasPermi="['callcenter:quality-task:claim']" type="primary" size="small" @click="claim">领取任务</el-button></template
          ></el-alert
        >
        <el-scrollbar class="score-scroll">
          <div v-for="(item, index) in detail.templateItems" :key="item.id" class="score-item">
            <div class="score-item-head">
              <div>
                <span>{{ item.dimensionName }}</span
                ><strong>{{ item.itemName }}</strong>
              </div>
              <div>
                <el-tag v-if="item.fatalFlag" size="small" type="danger">致命项</el-tag
                ><em>{{ item.itemType === 'AWARD' ? '+' : '-' }}{{ item.scoreValue }}</em>
              </div>
            </div>
            <p v-if="item.ruleDescription">{{ item.ruleDescription }}</p>
            <div v-if="aiItem(item.id)" class="ai-suggestion">
              <div>
                <span>AI 初审</span>
                <el-tag size="small" :type="aiResultTag(aiItem(item.id)?.result)">{{ aiResultLabel(aiItem(item.id)?.result) }}</el-tag>
                <small>置信度 {{ confidencePercent(aiItem(item.id)?.confidence) }}</small>
              </div>
              <p>{{ aiItem(item.id)?.reason || '未提供判断理由' }}</p>
              <div v-if="evidenceList(aiItem(item.id)?.evidenceJson).length" class="evidence-list">
                <el-button
                  v-for="evidence in evidenceList(aiItem(item.id)?.evidenceJson)"
                  :key="`${evidence.segmentId}-${evidence.startMs}`"
                  link
                  type="primary"
                  size="small"
                  @click="seekEvidence(evidence.startMs)"
                  >{{ millisecondTime(evidence.startMs || 0) }} {{ evidence.quote }}</el-button
                >
              </div>
            </div>
            <el-radio-group v-model="review.items[index].result" size="small"
              ><el-radio-button label="PASSED">通过</el-radio-button><el-radio-button label="FAILED">不通过</el-radio-button
              ><el-radio-button v-if="item.allowNotApplicable" label="NOT_APPLICABLE">不适用</el-radio-button></el-radio-group
            >
            <el-input-number
              v-if="item.itemType === 'MANUAL'"
              v-model="review.items[index].scoreChange"
              :min="-templateTotal"
              :max="templateTotal"
              :controls="false"
              placeholder="分值变化"
            />
            <el-input
              v-if="review.items[index].result === 'FAILED'"
              v-model="review.items[index].reason"
              type="textarea"
              :rows="2"
              placeholder="填写扣分原因"
            />
            <el-input
              v-if="item.evidenceRequired && review.items[index].result === 'FAILED'"
              v-model="review.items[index].evidenceJson"
              placeholder="填写证据，如 00:32 客户投诉未回应"
            />
            <el-input
              v-if="isModifiedFromAi(index)"
              v-model="review.items[index].modificationReason"
              placeholder="已修改 AI 初审结论，请填写修改原因"
            />
          </div>
          <div class="review-notes">
            <el-input v-model="review.summary" type="textarea" :rows="3" maxlength="2000" show-word-limit placeholder="质检总结" /><el-input
              v-model="review.improvementSuggestion"
              type="textarea"
              :rows="3"
              maxlength="2000"
              show-word-limit
              placeholder="改进建议"
            />
          </div>
        </el-scrollbar>
        <div class="score-actions">
          <el-button v-if="detail.status === 'SUBMITTED'" v-hasPermi="['callcenter:quality-task:publish']" type="success" plain @click="publish"
            >发布结果</el-button
          ><el-button
            v-if="!['PUBLISHED', 'CLOSED', 'CANCELLED', 'PENDING'].includes(detail.status)"
            v-hasPermi="['callcenter:quality-task:submit']"
            type="primary"
            :loading="submitting"
            @click="submit"
            >提交评分</el-button
          ><el-tag v-if="detail.status === 'PUBLISHED'" type="success">结果已发布</el-tag>
        </div>
      </template>
    </aside>
  </div>
</template>

<script setup name="QualityWorkbench" lang="ts">
import AudioWaveform from '@/components/AudioWaveform/index.vue';
import {
  claimQualityTask,
  getQualityTask,
  pageQualityTasks,
  publishQualityResult,
  submitQualityReview,
  triggerQualityAiReview
} from '@/api/callcenter/quality';
import type { QualityItemResultVO, QualityReviewForm, QualityTaskDetailVO, QualityTaskQuery, QualityTaskVO } from '@/api/callcenter/quality/types';
import type { AiCallTranscriptSegmentVO } from '@/api/callcenter/ai-speech/types';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;
const route = useRoute();
const router = useRouter();
const taskLoading = ref(false),
  detailLoading = ref(false),
  submitting = ref(false),
  aiTriggering = ref(false),
  taskTotal = ref(0);
const tasks = ref<QualityTaskVO[]>([]);
const audioWaveformRef = ref<{ seekTo: (milliseconds: number) => void }>();
const selectedId = ref<string | number>();
const detail = ref<QualityTaskDetailVO>();
const taskQuery = reactive<QualityTaskQuery>({ pageNum: 1, pageSize: 20, status: '' });
const review = reactive<QualityReviewForm>({ summary: '', improvementSuggestion: '', items: [] });
const transcriptSegments = computed(() => [...(detail.value?.transcript?.segments || [])].sort((a, b) => (a.startMs ?? 0) - (b.startMs ?? 0)));
type TranscriptMessage = {
  key: string;
  speaker: string;
  textContent: string;
  startMs?: number;
  endMs?: number;
  lastSegment: AiCallTranscriptSegmentVO;
};
const transcriptMergeGapMs = 3000;
const appendTranscriptText = (current: string, next: string) => {
  const left = current.trim();
  const right = next.trim();
  if (!left) return right;
  if (!right) return left;
  const separator = /[A-Za-z0-9]$/.test(left) && /^[A-Za-z0-9]/.test(right) ? ' ' : '';
  return `${left}${separator}${right}`;
};
const segmentGapMs = (previous: AiCallTranscriptSegmentVO, current: AiCallTranscriptSegmentVO) => {
  if (previous.endMs !== undefined && current.startMs !== undefined) return current.startMs - previous.endMs;
  const previousTime = previous.messageTime ? Date.parse(previous.messageTime) : NaN;
  const currentTime = current.messageTime ? Date.parse(current.messageTime) : NaN;
  return Number.isNaN(previousTime) || Number.isNaN(currentTime) ? undefined : currentTime - previousTime;
};
const transcriptMessages = computed<TranscriptMessage[]>(() => {
  const messages: TranscriptMessage[] = [];
  transcriptSegments.value.forEach((segment) => {
    const previous = messages.at(-1);
    const gap = previous ? segmentGapMs(previous.lastSegment, segment) : undefined;
    const shouldMerge = previous && previous.speaker === segment.speaker && (gap === undefined || (gap >= 0 && gap <= transcriptMergeGapMs));
    if (shouldMerge) {
      previous.textContent = appendTranscriptText(previous.textContent, segment.textContent);
      previous.endMs = segment.endMs ?? previous.endMs;
      previous.lastSegment = segment;
      previous.key = `${previous.key}-${segmentKey(segment)}`;
      return;
    }
    messages.push({
      key: segmentKey(segment),
      speaker: segment.speaker,
      textContent: segment.textContent,
      startMs: segment.startMs,
      endMs: segment.endMs,
      lastSegment: segment
    });
  });
  return messages;
});
const templateTotal = computed(() => detail.value?.templateTotalScore || 100);
const failedItems = computed(() => review.items.filter((item) => item.result === 'FAILED'));
const aiReviewRunning = computed(() => ['PENDING', 'PROCESSING'].includes(detail.value?.aiReviewStatus || ''));
const aiItems = computed(() => new Map((detail.value?.aiResult?.items || []).map((item) => [String(item.templateItemId), item])));
type Evidence = { segmentId?: string | number; startMs?: number; endMs?: number; quote?: string };
const aiItem = (id?: string | number) => aiItems.value.get(String(id));
const evidenceList = (value?: string): Evidence[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};
const confidencePercent = (value?: number) => `${Math.round(Number(value || 0) * 100)}%`;
const aiResultLabel = (value?: string) =>
  ({ PASSED: '通过', FAILED: '不通过', NOT_APPLICABLE: '不适用', NEEDS_MANUAL_REVIEW: '需人工判断' })[value || ''] || value || '-';
const aiResultTag = (value?: string) =>
  ({ PASSED: 'success', FAILED: 'danger', NOT_APPLICABLE: 'info', NEEDS_MANUAL_REVIEW: 'warning' })[value || ''] || 'info';
const seekEvidence = (startMs?: number) => audioWaveformRef.value?.seekTo(Number(startMs || 0));
const scorePreview = computed(() => {
  if (!detail.value) return 0;
  let value =
    templateTotal.value -
    detail.value.templateItems.filter((item) => item.itemType === 'AWARD').reduce((sum, item) => sum + Math.abs(item.scoreValue || 0), 0);
  detail.value.templateItems.forEach((item, index) => {
    const result = review.items[index];
    const points = Math.abs(item.scoreValue || 0);
    if (item.itemType === 'AWARD' && result?.result === 'PASSED') value += points;
    else if (item.itemType === 'DEDUCTION' && result?.result === 'FAILED') value -= points;
    else if (item.itemType === 'MANUAL' && result?.result !== 'NOT_APPLICABLE') value += Number(result?.scoreChange || 0);
  });
  return Math.max(0, Math.min(templateTotal.value, value));
});
const qualifiedPreview = computed(
  () =>
    scorePreview.value >= (detail.value?.templateQualifiedScore || 80) &&
    !detail.value?.templateItems.some((item, index) => item.fatalFlag && review.items[index]?.result === 'FAILED')
);
const statusLabel = (value: string) =>
  (({ PENDING: '待领取', ASSIGNED: '待评分', REVIEWING: '评分中', SUBMITTED: '已提交', PUBLISHED: '已发布' }) as Record<string, string>)[value] ||
  value;
const directionLabel = (value?: string) =>
  (({ INBOUND: '呼入', OUTBOUND: '呼出', INTERNAL: '内部' }) as Record<string, string>)[value || ''] || value || '-';
const duration = (seconds?: number) => {
  const value = Math.max(0, Number(seconds || 0));
  return value >= 60 ? `${Math.floor(value / 60)}分${value % 60}秒` : `${value}秒`;
};
const speakerLabel = (value?: string) =>
  (({ CUSTOMER: '客户', AGENT: '坐席', AI: 'AI', SYSTEM: '系统', UNKNOWN: '未知' }) as Record<string, string>)[value || 'UNKNOWN'] || value || '未知';
const speakerClass = (value?: string) => `is-${String(value || 'UNKNOWN').toLowerCase()}`;
const segmentKey = (value: AiCallTranscriptSegmentVO) => String(value.id || `${value.speaker}-${value.sentenceIndex}-${value.startMs}`);
const millisecondTime = (value: number) =>
  `${String(Math.floor(value / 60000)).padStart(2, '0')}:${String(Math.floor((value % 60000) / 1000)).padStart(2, '0')}`;
const loadTasks = async () => {
  taskLoading.value = true;
  try {
    const response = await pageQualityTasks(taskQuery);
    tasks.value = response.rows || [];
    taskTotal.value = response.total || 0;
    if (!selectedId.value && tasks.value.length) await selectTask(tasks.value[0].id);
  } finally {
    taskLoading.value = false;
  }
};
const initializeReview = (value: QualityTaskDetailVO) => {
  const source = value.result || value.aiResult;
  const existing = new Map((source?.items || []).map((item) => [String(item.templateItemId), item]));
  review.items = value.templateItems.map((item) => {
    const existingItem = existing.get(String(item.id));
    return {
      ...existingItem,
      templateItemId: item.id!,
      result: existingItem?.result === 'NEEDS_MANUAL_REVIEW' ? '' : existingItem?.result || 'PASSED',
      reason: existingItem?.reason || '',
      evidenceJson: existingItem?.evidenceJson || '',
      modificationReason: value.result ? existingItem?.modificationReason || '' : ''
    } as QualityItemResultVO;
  });
  review.summary = source?.summary || '';
  review.improvementSuggestion = source?.improvementSuggestion || '';
};
const isModifiedFromAi = (index: number) => {
  const templateItem = detail.value?.templateItems[index];
  const ai = aiItem(templateItem?.id);
  const current = review.items[index];
  return (
    !!ai &&
    ai.result !== 'NEEDS_MANUAL_REVIEW' &&
    (ai.result !== current?.result || Number(ai.scoreChange || 0) !== Number(current?.scoreChange || 0))
  );
};
const selectTask = async (id: string | number) => {
  selectedId.value = id;
  detailLoading.value = true;
  try {
    detail.value = (await getQualityTask(id)).data;
    initializeReview(detail.value);
    if (String(route.query.taskId || '') !== String(id)) await router.replace({ query: { ...route.query, taskId: String(id) } });
  } finally {
    detailLoading.value = false;
  }
};
const claim = async () => {
  if (!detail.value) return;
  await claimQualityTask(detail.value.id);
  proxy?.$modal.msgSuccess('任务已领取');
  await selectTask(detail.value.id);
  await loadTasks();
};
const submit = async () => {
  if (!detail.value) return;
  if (review.items.some((item) => !item.result)) return proxy?.$modal.msgError('请人工判断所有待确认的评分项');
  if (failedItems.value.some((item) => !item.reason?.trim())) return proxy?.$modal.msgError('不通过的评分项必须填写原因');
  if (review.items.some((_, index) => isModifiedFromAi(index) && !review.items[index].modificationReason?.trim())) {
    return proxy?.$modal.msgError('修改 AI 初审结论时必须填写修改原因');
  }
  submitting.value = true;
  try {
    await submitQualityReview(detail.value.id, review);
    proxy?.$modal.msgSuccess('质检评分已提交');
    await selectTask(detail.value.id);
    await loadTasks();
  } finally {
    submitting.value = false;
  }
};
const runAiReview = async () => {
  if (!detail.value) return;
  const taskId = detail.value.id;
  aiTriggering.value = true;
  try {
    await triggerQualityAiReview(taskId);
    detail.value.aiReviewStatus = 'PENDING';
    proxy?.$modal.msgSuccess('AI 初审任务已提交');
  } finally {
    aiTriggering.value = false;
  }
  for (let attempt = 0; attempt < 120 && String(selectedId.value) === String(taskId); attempt++) {
    await new Promise((resolve) => window.setTimeout(resolve, 1000));
    const value = (await getQualityTask(taskId)).data;
    detail.value = value;
    if (!['PENDING', 'PROCESSING'].includes(value.aiReviewStatus || '')) {
      if (value.aiReviewStatus === 'SUCCESS') initializeReview(value);
      return;
    }
  }
  proxy?.$modal.msgWarning('AI 初审仍在后台执行，可稍后刷新任务查看结果');
};
const publish = async () => {
  if (!detail.value) return;
  await proxy?.$modal.confirm('确定发布当前质检结果吗？');
  await publishQualityResult(detail.value.id);
  proxy?.$modal.msgSuccess('质检结果已发布');
  await selectTask(detail.value.id);
  await loadTasks();
};
onMounted(async () => {
  const id = route.query.taskId;
  if (id) selectedId.value = String(id);
  await loadTasks();
  if (selectedId.value) await selectTask(selectedId.value);
});
</script>

<style scoped lang="scss">
.quality-workbench {
  display: grid;
  grid-template-columns: 260px minmax(420px, 1fr) 430px;
  gap: 10px;
  height: calc(100vh - 94px);
  padding: 8px;
  background: var(--el-bg-color-page);
  font-size: 12px;
}
.task-panel,
.call-panel,
.score-panel {
  min-height: 0;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  background: var(--el-bg-color);
  overflow: hidden;
}
.task-panel {
  display: flex;
  flex-direction: column;
  padding: 12px;
}
.panel-title,
.call-header,
.section-title,
.score-summary,
.score-item-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.panel-title {
  margin-bottom: 10px;
}
.panel-title div {
  display: flex;
  flex-direction: column;
}
.panel-title strong {
  font-size: 15px;
  font-weight: 500;
}
.panel-title span,
.call-header span,
.section-title span,
.task-card span,
.task-card small {
  color: var(--el-text-color-secondary);
  font-size: 10px;
}
.status-filter {
  margin: 10px 0;
}
.task-scroll {
  flex: 1;
  min-height: 0;
}
.task-card {
  display: block;
  width: 100%;
  margin-bottom: 7px;
  padding: 10px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: transparent;
  text-align: left;
  cursor: pointer;
}
.task-card.active {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}
.task-card > div {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.task-card strong,
.task-card span,
.task-card small {
  display: block;
  margin-bottom: 5px;
}
.call-panel {
  display: flex;
  flex-direction: column;
  padding: 14px;
}
.call-header {
  padding-bottom: 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}
.call-header div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.call-header strong {
  font-size: 16px;
  font-weight: 500;
}
.recording-section {
  padding: 10px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}
.section-title {
  margin-bottom: 10px;
}
.transcript-section {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
  padding-top: 14px;
}
.transcript-scroll {
  flex: 1;
}
.transcript-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 2px 6px;
}
.message {
  max-width: 78%;
  padding: 9px 11px;
  border-radius: 8px;
  background: var(--el-fill-color-light);
}
.message.is-agent,
.message.is-ai {
  align-self: flex-end;
  background: var(--el-color-primary-light-9);
}
.message span,
.message small {
  font-size: 10px;
  color: var(--el-text-color-secondary);
}
.message p {
  margin: 4px 0;
  line-height: 1.55;
}
.score-panel {
  display: flex;
  flex-direction: column;
  padding: 12px;
  font-size: 11px;
}
.score-summary {
  padding-bottom: 10px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}
.score-summary > div {
  display: flex;
  align-items: baseline;
  gap: 4px;
}
.score-summary strong {
  font-size: 22px;
  font-weight: 500;
  color: var(--el-color-primary);
}
.score-summary span,
.score-summary small {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}
.score-summary-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ai-review-alert {
  margin-top: 10px;
}
.score-scroll {
  flex: 1;
  min-height: 0;
  margin-top: 8px;
}
.score-item {
  padding: 9px 4px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}
.score-item-head > div:first-child {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.score-item-head span,
.score-item p {
  font-size: 10px;
  color: var(--el-text-color-secondary);
}
.score-item-head strong {
  font-size: 13px;
  font-weight: 500;
}
.score-item-head em {
  margin-left: 6px;
  color: var(--el-color-danger);
  font-size: 12px;
  font-style: normal;
}
.score-item p {
  margin: 6px 0;
}
.ai-suggestion {
  margin: 7px 0;
  padding: 7px 9px;
  border: 1px solid var(--el-color-primary-light-7);
  border-radius: 7px;
  background: var(--el-color-primary-light-9);
}
.ai-suggestion > div:first-child {
  display: flex;
  align-items: center;
  gap: 7px;
}
.ai-suggestion span {
  font-size: 12px;
}
.ai-suggestion small {
  font-size: 10px;
  color: var(--el-text-color-secondary);
}
.ai-suggestion p {
  font-size: 11px;
  color: var(--el-text-color-regular);
}
.evidence-list {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.evidence-list .el-button {
  overflow: hidden;
  max-width: 100%;
  margin-left: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
}
.score-panel :deep(.el-tag),
.score-panel :deep(.el-button),
.score-panel :deep(.el-radio-button__inner),
.score-panel :deep(.el-input__inner),
.score-panel :deep(.el-textarea__inner) {
  font-size: 11px;
}
.score-panel :deep(.el-radio-button__inner) {
  padding: 6px 11px;
}
.score-panel :deep(.el-alert__title) {
  font-size: 11px;
  line-height: 16px;
}
.score-item :deep(.el-textarea),
.score-item :deep(.el-input) {
  margin-top: 7px;
}
.review-notes {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 2px;
}
.score-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid var(--el-border-color-lighter);
}
@media (max-width: 1280px) {
  .quality-workbench {
    grid-template-columns: 220px minmax(360px, 1fr) 370px;
  }
}
</style>
