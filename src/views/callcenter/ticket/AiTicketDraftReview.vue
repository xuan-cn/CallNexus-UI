<template>
  <div>
    <el-card class="mb-2" shadow="never">
      <el-form :model="query" inline class="draft-query">
        <el-form-item label="审核状态">
          <el-select v-model="query.status" clearable style="width: 160px">
            <el-option label="待审核" value="PENDING_REVIEW" /><el-option label="低置信度" value="LOW_CONFIDENCE" />
            <el-option label="已建单" value="CREATED" /><el-option label="已驳回" value="REJECTED" />
            <el-option label="生成中" value="GENERATING" /><el-option label="失败" value="FAILED" />
          </el-select>
        </el-form-item>
        <el-form-item label="客户号码"><el-input v-model="query.callerNumber" clearable @keyup.enter="load" /></el-form-item>
        <el-form-item><el-button type="primary" @click="load">查询</el-button><el-button @click="reset">重置</el-button></el-form-item>
      </el-form>
    </el-card>
    <el-card shadow="never">
      <div class="batch-toolbar">
        <div class="batch-selection">已选择 <strong>{{ selectedRows.length }}</strong> 条待审核草稿</div>
        <div>
          <el-button v-hasPermi="['callcenter:ai-ticket-draft:review']" type="primary" plain :disabled="!selectedRows.length" :loading="batchLoading" @click="batchApprove">批量通过</el-button>
          <el-button v-hasPermi="['callcenter:ai-ticket-draft:review']" type="danger" plain :disabled="!selectedRows.length" :loading="batchLoading" @click="batchReject">批量驳回</el-button>
        </div>
      </div>
      <el-table v-loading="loading || batchLoading" :data="rows" @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="48" :selectable="isRowReviewable" />
        <el-table-column label="草稿标题" min-width="220"><template #default="{ row }"><el-button link type="primary" @click="open(row)">{{ row.title || '未命名草稿' }}</el-button></template></el-table-column>
        <el-table-column label="客户号码" prop="callerNumber" width="145" />
        <el-table-column label="置信度" width="100"><template #default="{ row }">{{ confidence(row.confidence) }}</template></el-table-column>
        <el-table-column label="状态" width="115"><template #default="{ row }"><el-tag :type="statusType(row.status)">{{ statusText(row.status) }}</el-tag></template></el-table-column>
        <el-table-column label="来源通话" prop="sourceCallId" min-width="210" show-overflow-tooltip />
        <el-table-column label="生成时间" prop="createTime" width="170" />
        <el-table-column label="操作" fixed="right" width="100"><template #default="{ row }"><el-button link type="primary" @click="open(row)">审核</el-button></template></el-table-column>
      </el-table>
      <pagination v-show="total > 0" v-model:page="query.pageNum" v-model:limit="query.pageSize" :total="total" @pagination="load" />
    </el-card>

    <el-drawer v-model="visible" title="AI 工单草稿审核" size="92%" destroy-on-close @closed="releaseRecordingUrl">
      <div v-if="current" v-loading="detailLoading" class="draft-detail">
        <el-alert v-if="current.missingFields?.length" type="warning" :closable="false" :title="`缺少必填字段：${current.missingFields.join('、')}`" />
        <div class="review-layout">
          <div class="review-left">
            <section class="review-panel recording-section">
              <div class="section-title"><h4>通话录音</h4><span>{{ current.recordingFileName }}</span></div>
              <div v-if="current.recordingOssId" v-loading="recordingLoading" class="native-player">
                <audio v-if="recordingUrl" ref="audioRef" :src="recordingUrl" controls preload="metadata" />
                <el-empty v-else-if="!recordingLoading" description="录音加载失败" :image-size="54" />
                <div v-if="recordingUrl" class="playback-rate">
                  <span>播放速度</span>
                  <el-segmented v-model="playbackRate" :options="playbackRateOptions" size="small" @change="changePlaybackRate" />
                </div>
              </div>
              <el-empty v-else description="暂无通话录音" :image-size="54" />
            </section>
            <section class="review-panel conversation-section">
              <h4>通话对话</h4>
              <div class="conversation">{{ current.conversation || '暂无可用转写' }}</div>
            </section>
          </div>
          <div class="review-right">
            <section class="review-panel"><h4>模型提取</h4><el-form label-position="top">
              <el-form-item label="草稿标题"><el-input v-model="current.title" maxlength="256" /></el-form-item>
              <el-form-item label="问题摘要"><el-input v-model="current.summary" type="textarea" :rows="4" maxlength="4000" show-word-limit /></el-form-item>
            </el-form></section>
            <section class="review-panel"><div class="section-title"><h4>工单信息</h4><span>{{ template?.templateName }}</span></div>
              <el-form label-position="top"><el-row :gutter="16"><el-col v-for="field in template?.fields || []" :key="field.fieldCode" :span="field.layoutSpan || 12">
                <el-form-item :label="field.fieldName" :required="field.required">
                   <el-input v-if="field.fieldType === 'INPUT'" v-model="current.formData[field.fieldCode]" />
                   <el-input v-else-if="field.fieldType === 'TEXTAREA'" v-model="current.formData[field.fieldCode]" type="textarea" :rows="3" />
                   <el-input-number v-else-if="field.fieldType === 'NUMBER'" v-model="current.formData[field.fieldCode]" style="width:100%" />
                   <file-upload v-else-if="field.fieldType === 'FILE'" v-model="current.formData[field.fieldCode]" :limit="5" :file-size="20" />
                   <el-date-picker v-else-if="field.fieldType === 'DATE' || field.fieldType === 'DATETIME'" v-model="current.formData[field.fieldCode]" :type="field.fieldType === 'DATE' ? 'date' : 'datetime'" value-format="YYYY-MM-DD HH:mm:ss" style="width:100%" />
                  <el-radio-group v-else-if="field.fieldType === 'RADIO'" v-model="current.formData[field.fieldCode]"><el-radio v-for="option in field.options" :key="option.value" :value="option.value">{{ option.label }}</el-radio></el-radio-group>
                  <el-checkbox-group v-else-if="field.fieldType === 'CHECKBOX'" v-model="current.formData[field.fieldCode]"><el-checkbox v-for="option in field.options" :key="option.value" :value="option.value">{{ option.label }}</el-checkbox></el-checkbox-group>
                  <el-select v-else v-model="current.formData[field.fieldCode]" :multiple="field.fieldType === 'MULTI_SELECT'" style="width:100%"><el-option v-for="option in field.options" :key="option.value" :label="option.label" :value="option.value" /></el-select>
                </el-form-item></el-col></el-row></el-form>
            </section>
          </div>
        </div>
      </div>
      <template #footer><div class="drawer-actions">
        <el-button @click="visible=false">关闭</el-button>
        <el-button v-if="canRegenerate" v-hasPermi="['callcenter:ai-ticket-draft:regenerate']" @click="regenerate">重新生成</el-button>
        <el-button v-if="reviewable" v-hasPermi="['callcenter:ai-ticket-draft:review']" type="danger" plain @click="reject">驳回</el-button>
        <el-button v-if="reviewable" v-hasPermi="['callcenter:ai-ticket-draft:edit']" @click="save">保存修改</el-button>
        <el-button v-if="reviewable" v-hasPermi="['callcenter:ai-ticket-draft:review']" type="primary" @click="approve">确认并创建工单</el-button>
      </div></template>
    </el-drawer>

    <el-dialog v-model="batchResultVisible" title="批量审核结果" width="760px" append-to-body>
      <el-alert
        :title="`共处理 ${batchResult?.total || 0} 条，成功 ${batchResult?.success || 0} 条，失败 ${batchResult?.failed || 0} 条`"
        :type="batchResult?.failed ? 'warning' : 'success'"
        :closable="false"
        show-icon
      />
      <el-table :data="batchResult?.items || []" class="batch-result-table" max-height="420">
        <el-table-column label="草稿ID" prop="draftId" min-width="165" show-overflow-tooltip />
        <el-table-column label="结果" width="90"><template #default="{ row }"><el-tag :type="row.success ? 'success' : 'danger'">{{ row.success ? '成功' : '失败' }}</el-tag></template></el-table-column>
        <el-table-column label="正式工单ID" prop="ticketId" min-width="165"><template #default="{ row }">{{ row.ticketId || '-' }}</template></el-table-column>
        <el-table-column label="处理说明" prop="message" min-width="220" show-overflow-tooltip />
      </el-table>
      <template #footer>
        <el-button @click="exportBatchResult">导出结果</el-button>
        <el-button v-if="batchResult?.failed" type="warning" :loading="batchLoading" @click="retryFailed">重试失败项</el-button>
        <el-button type="primary" @click="batchResultVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { getFormTemplate } from '@/api/callcenter/form-template';
import type { FormTemplate } from '@/api/callcenter/form-template/types';
import { approveAiTicketDraft, batchApproveAiTicketDrafts, batchRejectAiTicketDrafts, getAiTicketDraft, listAiTicketDrafts, regenerateAiTicketDraft, rejectAiTicketDraft, updateAiTicketDraft, type AiTicketDraftBatchItem, type AiTicketDraftBatchResult, type AiTicketDraftQuery, type AiTicketDraftVO } from '@/api/callcenter/ai-ticket-draft';
import { globalHeaders } from '@/utils/request';
import axios from 'axios';
import { ElMessage, ElMessageBox } from 'element-plus';
const emit = defineEmits<{ openTicket: [id: string | number] }>();
const query = reactive<AiTicketDraftQuery>({ pageNum: 1, pageSize: 10, status: 'PENDING_REVIEW' });
const rows = ref<AiTicketDraftVO[]>([]); const total = ref(0); const loading = ref(false); const visible = ref(false); const detailLoading = ref(false);
const current = ref<AiTicketDraftVO>(); const template = ref<FormTemplate>();
const selectedRows = ref<AiTicketDraftVO[]>([]);
const batchLoading = ref(false);
const batchResultVisible = ref(false);
const batchResult = ref<AiTicketDraftBatchResult>();
const lastBatchAction = ref<'approve' | 'reject'>('approve');
const lastBatchReason = ref('');
const lastBatchItems = ref<AiTicketDraftBatchItem[]>([]);
const audioRef = ref<HTMLAudioElement>();
const recordingUrl = ref('');
const recordingLoading = ref(false);
const playbackRate = ref(1);
const playbackRateOptions = [
  { label: '0.75x', value: 0.75 },
  { label: '1.0x', value: 1 },
  { label: '1.25x', value: 1.25 },
  { label: '1.5x', value: 1.5 },
  { label: '2.0x', value: 2 }
];
const reviewable = computed(() => ['PENDING_REVIEW','LOW_CONFIDENCE'].includes(current.value?.status || ''));
const canRegenerate = computed(() => [...['PENDING_REVIEW','LOW_CONFIDENCE'], 'FAILED'].includes(current.value?.status || ''));
const isRowReviewable = (row: AiTicketDraftVO) => ['PENDING_REVIEW', 'LOW_CONFIDENCE'].includes(row.status);
const handleSelectionChange = (selection: AiTicketDraftVO[]) => { selectedRows.value = selection; };
const selectedBatchItems = () => selectedRows.value.map(({ id, version }) => ({ id, version }));
const load = async () => { loading.value=true; try { const r=await listAiTicketDrafts(query); rows.value=r.rows || []; total.value=r.total || 0; } finally { loading.value=false; } };
const reset = () => { Object.assign(query,{pageNum:1,pageSize:10,status:'PENDING_REVIEW',callerNumber:undefined}); load(); };
const releaseRecordingUrl = () => {
  if (recordingUrl.value) URL.revokeObjectURL(recordingUrl.value);
  recordingUrl.value = '';
  playbackRate.value = 1;
};
const loadRecording = async (ossId?: string | number) => {
  releaseRecordingUrl();
  if (ossId == null) return;
  recordingLoading.value = true;
  try {
    const response = await axios.get(`${import.meta.env.VITE_APP_BASE_API}/resource/oss/download/${ossId}`, {
      headers: globalHeaders(),
      responseType: 'blob'
    });
    recordingUrl.value = URL.createObjectURL(response.data);
  } catch (error) {
    console.error('加载工单草稿录音失败', error);
    ElMessage.warning('通话录音加载失败');
  } finally {
    recordingLoading.value = false;
  }
};
const changePlaybackRate = (rate: string | number | boolean) => {
  if (audioRef.value) audioRef.value.playbackRate = Number(rate);
};
const executeBatch = async (action: 'approve' | 'reject', items: AiTicketDraftBatchItem[], reason: string) => {
  if (!items.length) return;
  batchLoading.value = true;
  try {
    const response = action === 'approve'
      ? await batchApproveAiTicketDrafts(items, reason)
      : await batchRejectAiTicketDrafts(items, reason);
    batchResult.value = response.data;
    lastBatchAction.value = action;
    lastBatchReason.value = reason;
    lastBatchItems.value = items;
    batchResultVisible.value = true;
    await load();
  } finally {
    batchLoading.value = false;
  }
};
const batchApprove = async () => {
  const items = selectedBatchItems();
  await ElMessageBox.confirm(`确认通过选中的 ${items.length} 条草稿并分别创建正式工单吗？`, '批量通过', { type: 'warning' });
  await executeBatch('approve', items, '批量审核通过');
};
const batchReject = async () => {
  const items = selectedBatchItems();
  const { value } = await ElMessageBox.prompt(`将驳回选中的 ${items.length} 条草稿，请填写统一原因`, '批量驳回', {
    inputType: 'textarea',
    inputValidator: value => Boolean(value?.trim()) || '请输入驳回原因'
  });
  await executeBatch('reject', items, value.trim());
};
const retryFailed = async () => {
  if (!batchResult.value) return;
  const failedIds = new Set(batchResult.value.items.filter(item => !item.success).map(item => String(item.draftId)));
  const items = lastBatchItems.value.filter(item => failedIds.has(String(item.id)));
  await executeBatch(lastBatchAction.value, items, lastBatchReason.value);
};
const csvCell = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
const exportBatchResult = () => {
  if (!batchResult.value) return;
  const resultRows = batchResult.value.items.map(item => [item.draftId, item.success ? '成功' : '失败', item.ticketId || '', item.message]);
  const csv = ['草稿ID,处理结果,正式工单ID,处理说明', ...resultRows.map(row => row.map(csvCell).join(','))].join('\r\n');
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `AI工单批量审核结果_${Date.now()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};
const open = async (row: AiTicketDraftVO) => {
  if (row?.id == null) {
    ElMessage.error('草稿数据缺少ID，请刷新列表后重试');
    return;
  }
  visible.value = true;
  detailLoading.value = true;
  try {
    const draftResponse = await getAiTicketDraft(row.id);
    current.value = draftResponse.data;
    await loadRecording(current.value?.recordingOssId);
    if (current.value?.ticketTemplateId == null) {
      throw new Error('草稿未关联工单模板');
    }
    const templateResponse = await getFormTemplate(current.value.ticketTemplateId);
    template.value = templateResponse.data;
  } finally {
    detailLoading.value = false;
  }
};
const save = async () => { if(!current.value)return; await updateAiTicketDraft(current.value.id,{version:current.value.version,title:current.value.title,summary:current.value.summary,formData:current.value.formData}); ElMessage.success('草稿已保存'); await open(current.value); await load(); };
const approve = async () => { if(!current.value)return; await ElMessageBox.confirm('确认按当前内容创建正式工单吗？','创建工单',{type:'warning'}); await save(); if(!current.value)return; const response=await approveAiTicketDraft(current.value.id,current.value.version); const id=response.data; ElMessage.success('正式工单已创建'); visible.value=false; await load(); emit('openTicket',id); };
const reject = async () => { if(!current.value)return; const {value}=await ElMessageBox.prompt('请输入驳回原因','驳回草稿',{inputValidator:v=>Boolean(v?.trim())||'请输入驳回原因'}); await rejectAiTicketDraft(current.value.id,current.value.version,value); ElMessage.success('已驳回'); visible.value=false; await load(); };
const regenerate = async () => { if(!current.value)return; await ElMessageBox.confirm('重新生成会覆盖当前草稿内容，是否继续？','重新生成',{type:'warning'}); await regenerateAiTicketDraft(current.value.id,current.value.version); ElMessage.success('已提交重新生成'); visible.value=false; await load(); };
const confidence=(v?:number)=>v==null?'-':`${Math.round(v*100)}%`; const statusText=(s:string)=>({PENDING_REVIEW:'待审核',LOW_CONFIDENCE:'低置信度',CREATED:'已建单',REJECTED:'已驳回',GENERATING:'生成中',FAILED:'失败'} as Record<string,string>)[s]||s;
const statusType=(s:string)=>(s==='CREATED'?'success':s==='REJECTED'||s==='FAILED'?'danger':s==='LOW_CONFIDENCE'?'warning':'primary') as any;
onMounted(load); defineExpose({load});
</script>
<style scoped>
.draft-query { margin-bottom: -18px; }
.batch-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 12px; }
.batch-selection { color: var(--el-text-color-secondary); font-size: 13px; }
.batch-selection strong { color: var(--el-color-primary); }
.batch-result-table { margin-top: 16px; }
.draft-detail { min-height: calc(100vh - 170px); }
.review-layout { display: grid; grid-template-columns: minmax(360px, 42%) minmax(520px, 58%); gap: 18px; align-items: start; margin-top: 16px; }
.review-left, .review-right { display: flex; min-width: 0; flex-direction: column; gap: 18px; }
.review-panel { padding: 16px; border: 1px solid var(--el-border-color-lighter); border-radius: 10px; background: var(--el-bg-color); }
.draft-detail h4 { margin: 0 0 12px; font-size: 15px; }
.section-title { display: flex; justify-content: space-between; gap: 12px; color: var(--el-text-color-secondary); }
.section-title span { overflow: hidden; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.native-player audio { display: block; width: 100%; height: 40px; }
.playback-rate { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 12px; color: var(--el-text-color-secondary); font-size: 12px; }
.conversation { max-height: calc(100vh - 390px); min-height: 300px; overflow: auto; padding: 14px; border-radius: 8px; background: var(--el-fill-color-light); color: var(--el-text-color-regular); font-size: 13px; line-height: 1.65; white-space: pre-wrap; overflow-wrap: anywhere; }
.drawer-actions { display: flex; justify-content: flex-end; }
@media (max-width: 1200px) {
  .review-layout { grid-template-columns: 1fr; }
  .conversation { min-height: 220px; max-height: 360px; }
}
</style>
