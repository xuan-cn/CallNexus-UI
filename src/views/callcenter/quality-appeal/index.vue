<template>
  <div class="p-2 quality-appeal-page">
    <el-card shadow="never" class="mb-2">
      <el-form :model="query" inline size="small">
        <el-form-item label="关键词"><el-input v-model="query.keyword" clearable placeholder="坐席/申诉理由" @keyup.enter="search" /></el-form-item>
        <el-form-item label="状态"
          ><el-select v-model="query.status" clearable style="width: 150px"
            ><el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select
        ></el-form-item>
        <el-form-item
          ><el-button type="primary" icon="Search" @click="search">查询</el-button
          ><el-button icon="Refresh" @click="reset">重置</el-button></el-form-item
        >
      </el-form>
    </el-card>
    <el-card shadow="never">
      <template #header
        ><div class="page-head">
          <div>
            <h3>申诉复核</h3>
            <span>核对原始证据，维持结果、重新评分或退回重新质检</span>
          </div>
        </div></template
      >
      <el-table v-loading="loading" :data="rows">
        <el-table-column label="任务编号" prop="taskCode" min-width="155" /><el-table-column
          label="申诉坐席"
          prop="appellantName"
          width="110"
        /><el-table-column label="原得分" width="105"
          ><template #default="{ row }"
            ><strong>{{ row.originalScore }}</strong
            ><el-tag class="ml-1" size="small" :type="row.originalQualified ? 'success' : 'danger'">{{
              row.originalQualified ? '合格' : '不合格'
            }}</el-tag></template
          ></el-table-column
        >
        <el-table-column label="申诉理由" prop="appealReason" min-width="260" show-overflow-tooltip /><el-table-column
          label="提交时间"
          prop="appealedAt"
          width="170"
        /><el-table-column label="状态" width="120"
          ><template #default="{ row }"
            ><el-tag :type="statusType(row.status)">{{ statusLabel(row.status) }}</el-tag></template
          ></el-table-column
        ><el-table-column label="复核人" prop="reviewerName" width="110"
          ><template #default="{ row }">{{ row.reviewerName || '-' }}</template></el-table-column
        >
        <el-table-column label="操作" width="100" fixed="right"
          ><template #default="{ row }"
            ><el-button link type="primary" @click="open(row)">{{ row.status === 'SUBMITTED' ? '复核' : '查看' }}</el-button></template
          ></el-table-column
        >
      </el-table>
      <pagination
        v-show="total > 0"
        v-model:page="query.pageNum"
        v-model:limit="query.pageSize"
        :total="total"
        :auto-scroll="false"
        @pagination="load"
      />
    </el-card>
    <el-card shadow="never" class="mt-2 calibration-card">
      <template #header>
        <div class="page-head">
          <div>
            <h3>评分一致性校准</h3>
            <span>调整率用于发现评分口径偏差，需结合申诉样本人工复盘</span>
          </div>
        </div>
      </template>
      <el-table :data="calibrationRows" size="small">
        <el-table-column label="质检员" prop="reviewerName" min-width="130" />
        <el-table-column label="已发布" prop="reviewedCount" width="100" />
        <el-table-column label="平均分" prop="averageScore" width="100" />
        <el-table-column label="被申诉" prop="appealedCount" width="100" />
        <el-table-column label="调整结果" prop="adjustedCount" width="100" />
        <el-table-column label="调整率" width="130"
          ><template #default="{ row }">{{ Number(row.adjustmentRate || 0).toFixed(2) }}%</template></el-table-column
        >
      </el-table>
    </el-card>

    <el-drawer v-model="drawer" title="质检申诉复核" size="82%" append-to-body destroy-on-close>
      <div v-if="detail" v-loading="detailLoading" class="review-layout">
        <main>
          <el-descriptions :column="3" border size="small"
            ><el-descriptions-item label="申诉坐席">{{ detail.appellantName }}</el-descriptions-item
            ><el-descriptions-item label="任务编号">{{ detail.taskCode }}</el-descriptions-item
            ><el-descriptions-item label="原始得分">{{ detail.originalScore }} / {{ detail.task.templateTotalScore }}</el-descriptions-item
            ><el-descriptions-item label="申诉理由" :span="3">{{ detail.appealReason }}</el-descriptions-item
            ><el-descriptions-item v-if="detail.reviewConclusion" label="复核结论" :span="3">{{
              detail.reviewConclusion
            }}</el-descriptions-item></el-descriptions
          >
          <section>
            <h4>通话录音</h4>
            <AudioWaveform v-if="detail.task.call?.recordingUrl" :src="detail.task.call.recordingUrl" compact /><el-empty
              v-else
              description="无可播放录音"
              :image-size="50"
            />
          </section>
          <section v-if="detail.attachmentOssIds">
            <h4>申诉附件</h4>
            <file-upload v-model="detail.attachmentOssIds" disabled />
          </section>
          <section>
            <h4>原质检总结</h4>
            <p>{{ detail.originalResult.summary || '-' }}</p>
            <small>{{ detail.originalResult.improvementSuggestion || '-' }}</small>
          </section>
        </main>
        <aside>
          <div class="score-head">
            <span>复核评分</span><strong>{{ scorePreview }}</strong
            ><em>/ {{ detail.task.templateTotalScore }}</em>
          </div>
          <el-scrollbar class="score-scroll"
            ><div v-for="(item, index) in detail.task.templateItems" :key="item.id" class="score-item">
              <div>
                <span>{{ item.dimensionName }}</span
                ><strong>{{ item.itemName }}</strong
                ><em>{{ item.itemType === 'AWARD' ? '+' : '-' }}{{ item.scoreValue }}</em>
              </div>
              <p v-if="item.ruleDescription">{{ item.ruleDescription }}</p>
              <el-radio-group v-model="review.items[index].result" size="small"
                ><el-radio-button label="PASSED">通过</el-radio-button><el-radio-button label="FAILED">不通过</el-radio-button
                ><el-radio-button v-if="item.allowNotApplicable" label="NOT_APPLICABLE">不适用</el-radio-button></el-radio-group
              ><el-input
                v-if="review.items[index].result === 'FAILED'"
                v-model="review.items[index].reason"
                type="textarea"
                :rows="2"
                placeholder="扣分原因"
              /><el-input
                v-if="item.evidenceRequired && review.items[index].result === 'FAILED'"
                v-model="review.items[index].evidenceJson"
                placeholder="证据"
              />
            </div>
            <el-input v-model="review.summary" type="textarea" :rows="2" placeholder="复核后的质检总结" /><el-input
              v-model="review.improvementSuggestion"
              type="textarea"
              :rows="2"
              placeholder="复核后的改进建议" /><el-input
              v-model="review.reviewConclusion"
              type="textarea"
              :rows="3"
              maxlength="2000"
              show-word-limit
              placeholder="复核结论（必填）"
          /></el-scrollbar>
          <div v-if="detail.status === 'SUBMITTED'" class="actions">
            <el-button :loading="submitting" @click="decide('reject')">维持原结果</el-button
            ><el-button :loading="submitting" type="warning" plain @click="decide('recheck')">退回重新质检</el-button
            ><el-button :loading="submitting" type="primary" @click="decide('accept')">确认调整评分</el-button>
          </div>
        </aside>
      </div>
    </el-drawer>
  </div>
</template>

<script setup name="QualityAppeal" lang="ts">
import AudioWaveform from '@/components/AudioWaveform/index.vue';
import {
  acceptQualityAppeal,
  getQualityAppeal,
  getQualityCalibration,
  pageQualityAppeals,
  recheckQualityAppeal,
  rejectQualityAppeal
} from '@/api/callcenter/quality';
import type {
  QualityAppealAcceptForm,
  QualityAppealDetailVO,
  QualityAppealQuery,
  QualityAppealVO,
  QualityCalibrationVO,
  QualityItemResultVO
} from '@/api/callcenter/quality/types';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;
const loading = ref(false),
  detailLoading = ref(false),
  submitting = ref(false),
  drawer = ref(false),
  total = ref(0);
const rows = ref<QualityAppealVO[]>([]),
  calibrationRows = ref<QualityCalibrationVO[]>([]),
  detail = ref<QualityAppealDetailVO>();
const query = reactive<QualityAppealQuery>({ pageNum: 1, pageSize: 10, keyword: '', status: '' });
const review = reactive<QualityAppealAcceptForm>({ reviewConclusion: '', summary: '', improvementSuggestion: '', items: [] });
const statusOptions = [
  { label: '待复核', value: 'SUBMITTED' },
  { label: '已调整', value: 'ACCEPTED' },
  { label: '维持原结果', value: 'REJECTED' },
  { label: '重新质检中', value: 'RECHECK_REQUESTED' }
];
const labels: Record<string, string> = { SUBMITTED: '待复核', ACCEPTED: '已调整', REJECTED: '维持原结果', RECHECK_REQUESTED: '重新质检中' };
const statusLabel = (value: string) => labels[value] || value;
const statusType = (value: string) =>
  ({ SUBMITTED: 'warning', ACCEPTED: 'success', REJECTED: 'info', RECHECK_REQUESTED: 'primary' })[value] || 'info';
const load = async () => {
  loading.value = true;
  try {
    const response = await pageQualityAppeals(query);
    rows.value = response.rows;
    total.value = response.total;
  } finally {
    loading.value = false;
  }
};
const search = () => {
  query.pageNum = 1;
  load();
};
const reset = () => {
  query.keyword = '';
  query.status = '';
  search();
};
const open = async (row: QualityAppealVO) => {
  drawer.value = true;
  detailLoading.value = true;
  try {
    detail.value = (await getQualityAppeal(row.id)).data;
    const source = detail.value.reviewResult || detail.value.originalResult;
    review.summary = source.summary || '';
    review.improvementSuggestion = source.improvementSuggestion || '';
    review.reviewConclusion = detail.value.reviewConclusion || '';
    review.items = detail.value.task.templateItems.map((item) => {
      const old = source.items.find((value) => String(value.templateItemId) === String(item.id));
      return {
        templateItemId: item.id!,
        result: old?.result === 'NEEDS_MANUAL_REVIEW' ? '' : old?.result || 'PASSED',
        scoreChange: old?.scoreChange,
        reason: old?.reason || '',
        evidenceJson: old?.evidenceJson || '',
        modificationReason: old?.modificationReason || '申诉复核调整'
      } as QualityItemResultVO;
    });
  } finally {
    detailLoading.value = false;
  }
};
const scorePreview = computed(() => {
  if (!detail.value) return 0;
  const items = detail.value.task.templateItems;
  let score = detail.value.task.templateTotalScore || 100;
  score -= items.filter((item) => item.itemType === 'AWARD').reduce((sum, item) => sum + Math.abs(item.scoreValue || 0), 0);
  review.items.forEach((value, index) => {
    const item = items[index];
    if (!item || value.result === 'NOT_APPLICABLE') return;
    if (item.itemType === 'MANUAL') score += value.scoreChange || 0;
    else if (item.itemType === 'AWARD' && value.result === 'PASSED') score += Math.abs(item.scoreValue || 0);
    else if (item.itemType === 'DEDUCTION' && value.result === 'FAILED') score -= Math.abs(item.scoreValue || 0);
  });
  return Math.max(0, Math.min(detail.value.task.templateTotalScore || 100, score));
});
const decide = async (action: 'reject' | 'recheck' | 'accept') => {
  if (!detail.value || !review.reviewConclusion.trim()) return proxy?.$modal.msgWarning('请填写复核结论');
  if (action === 'accept' && review.items.some((item) => !item.result)) return proxy?.$modal.msgWarning('请完成全部评分项');
  const message =
    action === 'reject' ? '确认维持原质检结果？' : action === 'recheck' ? '确认退回并由当前账号重新质检？' : '确认生成新的复核评分版本？';
  await proxy?.$modal.confirm(message);
  submitting.value = true;
  try {
    if (action === 'reject') await rejectQualityAppeal(detail.value.id, review.reviewConclusion);
    else if (action === 'recheck') await recheckQualityAppeal(detail.value.id, review.reviewConclusion);
    else await acceptQualityAppeal(detail.value.id, review);
    proxy?.$modal.msgSuccess('复核处理完成');
    drawer.value = false;
    await load();
  } finally {
    submitting.value = false;
  }
};
onMounted(load);
onMounted(async () => {
  calibrationRows.value = (await getQualityCalibration()).data;
});
</script>

<style scoped>
.page-head h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
}
.page-head span {
  color: #8492a6;
  font-size: 12px;
}
.review-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(390px, 0.72fr);
  gap: 16px;
  height: calc(100vh - 120px);
}
.review-layout main {
  overflow: auto;
}
.review-layout section {
  margin-top: 14px;
  padding: 14px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}
.review-layout h4 {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 500;
}
.review-layout section p {
  white-space: pre-wrap;
}
.review-layout section small {
  color: #64748b;
}
.review-layout aside {
  display: flex;
  min-height: 0;
  flex-direction: column;
  padding: 14px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}
.score-head {
  padding-bottom: 12px;
  border-bottom: 1px solid #e5e7eb;
}
.score-head strong {
  margin-left: 12px;
  color: #0b5cab;
  font-size: 30px;
  font-weight: 500;
}
.score-head em,
.score-item em {
  color: #94a3b8;
  font-style: normal;
}
.score-scroll {
  flex: 1;
  margin: 10px 0;
}
.score-item {
  padding: 12px 2px;
  border-bottom: 1px solid #eef2f7;
}
.score-item > div {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 3px 10px;
}
.score-item > div span {
  grid-column: 1;
  color: #64748b;
  font-size: 11px;
}
.score-item > div strong {
  grid-column: 1;
  font-size: 13px;
  font-weight: 500;
}
.score-item > div em {
  grid-column: 2;
  grid-row: 1 / span 2;
}
.score-item p {
  color: #64748b;
  font-size: 12px;
}
.score-item :deep(.el-textarea),
.score-scroll > :deep(.el-textarea) {
  margin-top: 8px;
}
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 10px;
  border-top: 1px solid #e5e7eb;
}
@media (max-width: 1000px) {
  .review-layout {
    grid-template-columns: 1fr;
    height: auto;
  }
}
</style>
