<template>
  <div class="faq-learning-page p-2">
    <div class="statistics-grid">
      <div v-for="item in statisticCards" :key="item.key" class="statistic-card" :class="`is-${item.key.toLowerCase()}`" @click="setStatus(item.key)">
        <span>{{ item.label }}</span><strong>{{ item.value }}</strong>
      </div>
    </div>

    <div class="review-layout">
      <el-card shadow="never" class="candidate-panel">
        <div class="filter-bar">
          <el-select v-model="query.status" clearable placeholder="审核状态" style="width: 130px" @change="search">
            <el-option label="待审核" value="PENDING" /><el-option label="已发布" value="APPROVED" />
            <el-option label="已合并" value="MERGED" /><el-option label="已驳回" value="REJECTED" />
          </el-select>
          <el-select v-model="query.knowledgeBaseId" clearable placeholder="知识库" style="width: 170px" @change="search">
            <el-option v-for="item in bases" :key="item.id" :label="item.knowledgeName" :value="item.id" />
          </el-select>
          <el-input v-model="query.keyword" clearable placeholder="搜索问题或回答" style="width: 220px" @keyup.enter="search" />
          <el-button type="primary" @click="search">查询</el-button><el-button @click="reset">重置</el-button>
        </div>
        <div class="batch-bar">
          <span>已选 {{ selection.length }} 条</span>
          <el-button type="primary" plain :disabled="!pendingSelection.length" @click="batchApprove">批量发布</el-button>
          <el-button type="warning" plain :disabled="!pendingSelection.length" @click="batchMerge">批量合并</el-button>
          <el-button type="danger" plain :disabled="!pendingSelection.length" @click="batchReject">批量驳回</el-button>
        </div>
        <el-table v-loading="loading" :data="rows" height="calc(100vh - 330px)" highlight-current-row @selection-change="selection = $event" @current-change="selectRow">
          <el-table-column type="selection" width="42" />
          <el-table-column label="候选问题" min-width="250">
            <template #default="{ row }"><div class="question-cell"><strong>{{ row.standardQuestion }}</strong><span>{{ row.agentName }} · {{ row.knowledgeBaseName }}</span></div></template>
          </el-table-column>
          <el-table-column label="出现" prop="occurrenceCount" width="66" align="center" />
          <el-table-column label="状态" width="86"><template #default="{ row }"><el-tag size="small" :type="statusType(row.status)">{{ statusText(row.status) }}</el-tag></template></el-table-column>
          <el-table-column label="最近出现" prop="lastOccurredAt" width="154" />
        </el-table>
        <pagination v-show="total > 0" v-model:page="query.pageNum" v-model:limit="query.pageSize" :total="total" @pagination="load" />
      </el-card>

      <el-card shadow="never" class="detail-panel">
        <template v-if="current">
          <div class="detail-header"><div><h3>审核 FAQ 候选</h3><span>{{ current.agentName }} · {{ current.sourceChannel === 'VOICE' ? 'AI语音通话' : '在线对话' }}</span></div><el-tag :type="statusType(current.status)">{{ statusText(current.status) }}</el-tag></div>
          <section class="source-section"><label>用户问题</label><div class="message user-message">{{ current.standardQuestion }}</div><label>模型兜底回答</label><div class="message assistant-message">{{ current.standardAnswer }}</div></section>
          <el-form :model="form" label-position="top" class="review-form">
            <el-row :gutter="12"><el-col :span="10"><el-form-item label="FAQ编码"><el-input v-model="form.faqCode" /></el-form-item></el-col><el-col :span="14"><el-form-item label="FAQ名称"><el-input v-model="form.faqName" /></el-form-item></el-col></el-row>
            <el-form-item label="标准问题"><el-input v-model="form.standardQuestion" type="textarea" :rows="2" /></el-form-item>
            <el-form-item label="标准答案"><el-input v-model="form.standardAnswer" type="textarea" :rows="5" /></el-form-item>
            <el-form-item label="相似问法"><el-select v-model="form.aliases" multiple filterable allow-create default-first-option style="width: 100%" /></el-form-item>
          </el-form>
          <div class="score-line"><span>出现 {{ current.occurrenceCount }} 次</span><span>FAQ最高分 {{ score(current.bestFaqScore) }}</span><span>文档最高分 {{ score(current.bestDocumentScore) }}</span></div>
          <div class="detail-actions" v-if="current.status === 'PENDING'">
            <el-button type="primary" @click="approve">审核并发布</el-button><el-button type="warning" @click="mergeOne">合并到已有FAQ</el-button><el-button type="danger" plain @click="rejectOne">驳回</el-button>
          </div>
          <div class="detail-actions" v-else><el-button @click="reopen">重新打开</el-button><span v-if="current.reviewReason" class="review-reason">原因：{{ current.reviewReason }}</span></div>
        </template>
        <el-empty v-else description="请选择左侧候选问题" />
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  approveFaqLearningCandidate, batchApproveFaqLearningCandidates, batchMergeFaqLearningCandidates,
  batchRejectFaqLearningCandidates, getFaqLearningCandidate, getFaqLearningStatistics, listKnowledgeBases,
  listKnowledgeFaqs, mergeFaqLearningCandidate, pageFaqLearningCandidates, rejectFaqLearningCandidate,
  reopenFaqLearningCandidate
} from '@/api/callcenter/ai-knowledge';
import type { FaqLearningCandidateVO, FaqLearningStatus, Id, KnowledgeBaseVO, KnowledgeFaqVO } from '@/api/callcenter/ai-knowledge/types';

const loading = ref(false), rows = ref<FaqLearningCandidateVO[]>([]), total = ref(0), bases = ref<KnowledgeBaseVO[]>([]);
const selection = ref<FaqLearningCandidateVO[]>([]), current = ref<FaqLearningCandidateVO>();
const statistics = ref({ pending: 0, approved: 0, merged: 0, rejected: 0 });
const query = reactive<{ pageNum: number; pageSize: number; status: string; knowledgeBaseId?: Id; keyword: string }>({ pageNum: 1, pageSize: 20, status: 'PENDING', keyword: '' });
const form = reactive({ faqCode: '', faqName: '', standardQuestion: '', standardAnswer: '', aliases: [] as string[], answerMode: 'DIRECT' as 'DIRECT' | 'CONTEXT' });
const pendingSelection = computed(() => selection.value.filter((item) => item.status === 'PENDING'));
const statisticCards = computed(() => [
  { key: 'PENDING', label: '待审核', value: statistics.value.pending }, { key: 'APPROVED', label: '已发布', value: statistics.value.approved },
  { key: 'MERGED', label: '已合并', value: statistics.value.merged }, { key: 'REJECTED', label: '已驳回', value: statistics.value.rejected }
]);

const load = async () => { loading.value = true; try { const response = await pageFaqLearningCandidates(query); rows.value = response.rows || []; total.value = response.total || 0; } finally { loading.value = false; } };
const loadStatistics = async () => { statistics.value = (await getFaqLearningStatistics()).data || statistics.value; };
const refresh = async () => { await Promise.all([load(), loadStatistics()]); if (current.value) { const found = rows.value.find((item) => String(item.id) === String(current.value?.id)); current.value = found; if (found) fill(found); } };
const search = () => { query.pageNum = 1; load(); };
const reset = () => { query.status = 'PENDING'; query.knowledgeBaseId = undefined; query.keyword = ''; search(); };
const setStatus = (status: string) => { query.status = status; search(); };
const fill = (value: FaqLearningCandidateVO) => Object.assign(form, { faqCode: value.faqCode, faqName: value.faqName, standardQuestion: value.standardQuestion, standardAnswer: value.standardAnswer, aliases: [...(value.aliases || [])], answerMode: value.answerMode || 'DIRECT' });
const selectRow = async (row?: FaqLearningCandidateVO) => { if (!row) return; current.value = (await getFaqLearningCandidate(row.id)).data; if (current.value) fill(current.value); };
const approve = async () => { if (!current.value) return; await approveFaqLearningCandidate(current.value.id, form); ElMessage.success('已发布到 FAQ，索引任务正在执行'); await refresh(); };
const selectFaq = async (knowledgeBaseId: Id) => { const faqs = (await listKnowledgeFaqs(knowledgeBaseId)).data || []; const values = faqs.filter((item) => item.enabled); if (!values.length) throw new Error('当前知识库没有可合并的 FAQ'); const { value } = await ElMessageBox.prompt(`请输入目标 FAQ 编码：${values.slice(0, 8).map((item) => item.faqCode).join('、')}`, '合并到已有 FAQ', { inputValidator: (code) => values.some((item) => item.faqCode === code) || '请输入列表中有效的 FAQ 编码' }); return values.find((item) => item.faqCode === value) as KnowledgeFaqVO; };
const mergeOne = async () => { if (!current.value) return; const faq = await selectFaq(current.value.knowledgeBaseId); await mergeFaqLearningCandidate(current.value.id, faq.id); ElMessage.success('已作为相似问法合并'); await refresh(); };
const rejectOne = async () => { if (!current.value) return; const { value } = await ElMessageBox.prompt('填写驳回原因', '驳回候选', { inputValidator: (text) => Boolean(text?.trim()) || '请填写原因' }); await rejectFaqLearningCandidate(current.value.id, value); ElMessage.success('已驳回'); await refresh(); };
const reopen = async () => { if (!current.value) return; await reopenFaqLearningCandidate(current.value.id); await refresh(); };
const showBatch = async (result: any) => { const value = result.data; ElMessage({ type: value.failed ? 'warning' : 'success', message: `处理完成：成功 ${value.success} 条，失败 ${value.failed} 条` }); await refresh(); };
const batchApprove = async () => { await ElMessageBox.confirm(`确认发布选中的 ${pendingSelection.value.length} 条候选吗？`, '批量发布'); await showBatch(await batchApproveFaqLearningCandidates(pendingSelection.value.map((item) => item.id))); };
const batchReject = async () => { const { value } = await ElMessageBox.prompt('填写统一驳回原因', '批量驳回', { inputValidator: (text) => Boolean(text?.trim()) || '请填写原因' }); await showBatch(await batchRejectFaqLearningCandidates(pendingSelection.value.map((item) => item.id), value)); };
const batchMerge = async () => { const knowledgeIds = [...new Set(pendingSelection.value.map((item) => String(item.knowledgeBaseId)))]; if (knowledgeIds.length !== 1) return ElMessage.warning('批量合并只能选择同一知识库的候选'); const faq = await selectFaq(pendingSelection.value[0].knowledgeBaseId); await showBatch(await batchMergeFaqLearningCandidates(pendingSelection.value.map((item) => item.id), faq.id)); };
const statusText = (status: FaqLearningStatus) => ({ PENDING: '待审核', APPROVED: '已发布', MERGED: '已合并', REJECTED: '已驳回' })[status];
const statusType = (status: FaqLearningStatus) => ({ PENDING: 'warning', APPROVED: 'success', MERGED: 'primary', REJECTED: 'info' } as const)[status];
const score = (value?: number) => value == null ? '-' : Number(value).toFixed(3);
onMounted(async () => { bases.value = (await listKnowledgeBases()).data || []; await refresh(); });
</script>

<style scoped lang="scss">
.faq-learning-page { background: #f5f7fb; min-height: calc(100vh - 84px); }
.statistics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 12px; }
.statistic-card { padding: 14px 18px; border: 1px solid #e5eaf2; border-radius: 10px; background: #fff; cursor: pointer; display: flex; justify-content: space-between; align-items: center; color: #64748b; strong { font-size: 25px; color: #0f172a; } }
.review-layout { display: grid; grid-template-columns: minmax(620px, 56%) minmax(420px, 44%); gap: 12px; }
.candidate-panel, .detail-panel { height: calc(100vh - 190px); }
.filter-bar, .batch-bar { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.batch-bar { min-height: 38px; padding: 7px 10px; background: #f6f9fd; border-radius: 8px; span { margin-right: auto; color: #64748b; } }
.question-cell { display: flex; flex-direction: column; gap: 5px; strong { color: #1e293b; font-weight: 600; } span { color: #94a3b8; font-size: 12px; } }
.detail-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #edf0f5; padding-bottom: 12px; h3 { margin: 0 0 5px; font-size: 16px; } span { color: #94a3b8; font-size: 12px; } }
.source-section { margin: 16px 0; label { display: block; color: #64748b; font-size: 13px; margin: 10px 0 6px; } }
.message { padding: 11px 13px; border-radius: 9px; font-size: 13px; line-height: 1.65; white-space: pre-wrap; max-height: 150px; overflow: auto; }
.user-message { background: #f1f5f9; } .assistant-message { background: #edf8f4; border: 1px solid #d2eee4; }
.review-form { max-height: calc(100vh - 540px); min-height: 210px; overflow: auto; padding-right: 4px; }
.score-line { display: flex; gap: 18px; padding: 9px 0; color: #64748b; font-size: 12px; }
.detail-actions { display: flex; align-items: center; border-top: 1px solid #edf0f5; padding-top: 14px; } .review-reason { margin-left: 12px; color: #64748b; }
@media (max-width: 1300px) { .review-layout { grid-template-columns: 1fr; } .candidate-panel, .detail-panel { height: auto; } }
</style>
