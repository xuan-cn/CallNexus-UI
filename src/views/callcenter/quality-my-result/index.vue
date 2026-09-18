<template>
  <div class="p-2 quality-my-result">
    <el-card shadow="never" class="mb-2">
      <el-form :model="query" inline size="small">
        <el-form-item label="关键词"><el-input v-model="query.keyword" clearable placeholder="任务编号/通话ID" @keyup.enter="search" /></el-form-item>
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
            <h3>我的质检</h3>
            <span>查看本人已发布质检结果，并在期限内提交申诉</span>
          </div>
        </div></template
      >
      <el-table v-loading="loading" :data="rows">
        <el-table-column label="任务编号" prop="taskCode" min-width="155" />
        <el-table-column label="通话ID" prop="businessCallId" min-width="180" show-overflow-tooltip />
        <el-table-column label="评分模板" prop="templateName" min-width="140" />
        <el-table-column label="得分" width="120"
          ><template #default="{ row }"
            ><strong>{{ row.totalScore ?? '-' }}</strong
            ><el-tag class="ml-1" size="small" :type="row.qualified ? 'success' : 'danger'">{{ row.qualified ? '合格' : '不合格' }}</el-tag></template
          ></el-table-column
        >
        <el-table-column label="发布时间" prop="publishedAt" width="170" />
        <el-table-column label="申诉状态" width="110"
          ><template #default="{ row }"
            ><el-tag v-if="row.appealStatus" :type="appealType(row.appealStatus)">{{ appealLabel(row.appealStatus) }}</el-tag
            ><span v-else>-</span></template
          ></el-table-column
        >
        <el-table-column label="申诉截止" prop="appealDeadline" width="170" />
        <el-table-column label="操作" width="150" fixed="right"
          ><template #default="{ row }"
            ><el-button link type="primary" @click="openDetail(row)">查看</el-button
            ><el-button v-if="row.canAppeal" v-hasPermi="['callcenter:quality-appeal:create']" link type="warning" @click="openAppeal(row)"
              >申诉</el-button
            ></template
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

    <el-drawer v-model="detailVisible" title="质检结果详情" size="72%" append-to-body>
      <div v-loading="detailLoading" class="detail-grid" v-if="detail">
        <section class="detail-main">
          <el-descriptions :column="3" border size="small">
            <el-descriptions-item label="任务编号">{{ detail.taskCode }}</el-descriptions-item
            ><el-descriptions-item label="评分模板">{{ detail.templateName }} V{{ detail.templateVersionNo }}</el-descriptions-item
            ><el-descriptions-item label="质检员">{{ detail.reviewerName || '-' }}</el-descriptions-item>
          </el-descriptions>
          <div class="section">
            <h4>通话录音</h4>
            <AudioWaveform v-if="detail.call?.recordingUrl" :src="detail.call.recordingUrl" compact /><el-empty
              v-else
              description="无可播放录音"
              :image-size="52"
            />
          </div>
          <div class="section">
            <h4>质检总结</h4>
            <p>{{ detail.result?.summary || '未填写总结' }}</p>
            <small>{{ detail.result?.improvementSuggestion || '未填写改进建议' }}</small>
          </div>
        </section>
        <section class="result-list">
          <div class="score">
            <span>最终得分</span><strong>{{ detail.result?.totalScore ?? '-' }}</strong
            ><em>/ {{ detail.templateTotalScore }}</em>
          </div>
          <div v-for="item in detail.result?.items || []" :key="item.id" class="result-item">
            <div>
              <strong>{{ item.itemName }}</strong
              ><el-tag size="small" :type="item.result === 'PASSED' ? 'success' : item.result === 'FAILED' ? 'danger' : 'info'">{{
                resultLabel(item.result)
              }}</el-tag>
            </div>
            <p v-if="item.reason">{{ item.reason }}</p>
            <small v-if="item.evidenceJson">证据：{{ item.evidenceJson }}</small>
          </div>
        </section>
      </div>
    </el-drawer>

    <el-dialog v-model="appealVisible" title="提交质检申诉" width="560px" append-to-body>
      <el-alert type="info" :closable="false" title="请说明具体争议评分项和事实依据。提交后原质检结果不会被删除。" />
      <el-form label-position="top" class="appeal-form"
        ><el-form-item label="申诉理由" required
          ><el-input v-model="appealForm.appealReason" type="textarea" :rows="6" maxlength="2000" show-word-limit /></el-form-item
        ><el-form-item label="证明附件"><file-upload v-model="appealForm.attachmentOssIds" :limit="5" :file-size="20" /></el-form-item
      ></el-form>
      <template #footer
        ><el-button @click="appealVisible = false">取消</el-button
        ><el-button type="primary" :loading="submitting" @click="submitAppeal">提交申诉</el-button></template
      >
    </el-dialog>
  </div>
</template>

<script setup name="QualityMyResult" lang="ts">
import AudioWaveform from '@/components/AudioWaveform/index.vue';
import { createQualityAppeal, getMyQualityResult, pageMyQualityResults } from '@/api/callcenter/quality';
import type { QualityAppealCreateForm, QualityMyResultVO, QualityTaskDetailVO, QualityTaskQuery } from '@/api/callcenter/quality/types';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;
const loading = ref(false),
  detailLoading = ref(false),
  submitting = ref(false),
  detailVisible = ref(false),
  appealVisible = ref(false);
const rows = ref<QualityMyResultVO[]>([]),
  total = ref(0),
  detail = ref<QualityTaskDetailVO>(),
  selectedTaskId = ref<string | number>();
const query = reactive<QualityTaskQuery>({ pageNum: 1, pageSize: 10, keyword: '' });
const appealForm = reactive<QualityAppealCreateForm>({ appealReason: '', attachmentOssIds: '' });
const appealLabels: Record<string, string> = { SUBMITTED: '待复核', REJECTED: '维持原结果', RECHECK_REQUESTED: '重新质检中', ACCEPTED: '已调整' };
const appealLabel = (status?: string) => (status ? appealLabels[status] || status : '-');
const appealType = (status: string) =>
  ({ SUBMITTED: 'warning', REJECTED: 'info', RECHECK_REQUESTED: 'primary', ACCEPTED: 'success' })[status] || 'info';
const resultLabel = (value: string) => ({ PASSED: '通过', FAILED: '不通过', NOT_APPLICABLE: '不适用' })[value] || value;
const load = async () => {
  loading.value = true;
  try {
    const response = await pageMyQualityResults(query);
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
  search();
};
const openDetail = async (row: QualityMyResultVO) => {
  detailVisible.value = true;
  detailLoading.value = true;
  try {
    detail.value = (await getMyQualityResult(row.id)).data;
  } finally {
    detailLoading.value = false;
  }
};
const openAppeal = (row: QualityMyResultVO) => {
  selectedTaskId.value = row.id;
  appealForm.appealReason = '';
  appealForm.attachmentOssIds = '';
  appealVisible.value = true;
};
const submitAppeal = async () => {
  if (!appealForm.appealReason.trim()) return proxy?.$modal.msgWarning('请填写申诉理由');
  submitting.value = true;
  try {
    await createQualityAppeal(selectedTaskId.value!, appealForm);
    proxy?.$modal.msgSuccess('申诉已提交');
    appealVisible.value = false;
    await load();
  } finally {
    submitting.value = false;
  }
};
onMounted(load);
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
.detail-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(320px, 0.7fr);
  gap: 16px;
}
.section,
.result-list {
  margin-top: 14px;
  padding: 14px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}
.section h4 {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 500;
}
.section p {
  white-space: pre-wrap;
}
.section small {
  color: #64748b;
}
.score {
  padding-bottom: 12px;
  border-bottom: 1px solid #e5e7eb;
}
.score strong {
  margin-left: 12px;
  color: #0b5cab;
  font-size: 30px;
  font-weight: 500;
}
.score em {
  color: #94a3b8;
  font-style: normal;
}
.result-item {
  padding: 12px 0;
  border-bottom: 1px solid #eef2f7;
}
.result-item > div {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}
.result-item strong {
  font-size: 13px;
  font-weight: 500;
}
.result-item p,
.result-item small {
  margin: 7px 0 0;
  color: #64748b;
  font-size: 12px;
}
.appeal-form {
  margin-top: 16px;
}
@media (max-width: 900px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>
