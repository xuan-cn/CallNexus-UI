<template>
  <div class="p-2 knowledge-page">
    <el-row :gutter="12">
      <el-col :span="7">
        <el-card shadow="never" class="h-full">
          <template #header><div class="flex justify-between items-center"><b>知识库</b><el-button type="primary" plain size="small" @click="editBase()">新增</el-button></div></template>
          <el-table :data="bases" highlight-current-row @current-change="selectBase">
            <el-table-column label="名称" min-width="150"><template #default="{row}"><div>{{row.knowledgeName}}</div><small class="text-gray-400">{{row.knowledgeCode}}</small></template></el-table-column>
            <el-table-column label="状态" width="90"><template #default="{row}"><el-tag :type="statusType(row.status)">{{ statusText(row.status) }}</el-tag></template></el-table-column>
            <el-table-column width="88"><template #default="{row}"><el-dropdown trigger="click"><el-button link type="primary">操作</el-button><template #dropdown><el-dropdown-menu><el-dropdown-item @click="editBase(row)">修改</el-dropdown-item><el-dropdown-item @click="openRebuild(row)">重建索引</el-dropdown-item><el-dropdown-item @click="toggleBase(row)">{{row.enabled?'停用':'启用'}}</el-dropdown-item><el-dropdown-item divided @click="removeBase(row)">删除</el-dropdown-item></el-dropdown-menu></template></el-dropdown></template></el-table-column>
          </el-table>
          <pagination v-show="baseTotal > 0" v-model:page="baseQuery.pageNum" v-model:limit="baseQuery.pageSize" :total="baseTotal" layout="prev, pager, next" :pager-count="5" :auto-scroll="false" @pagination="loadBases" />
        </el-card>
      </el-col>
      <el-col :span="17">
        <el-card v-if="current" shadow="never">
          <template #header><div class="flex justify-between"><div><b>{{current.knowledgeName}}</b><span class="ml-3 text-gray-400">文档 {{current.documentCount}} · FAQ {{current.faqCount}} · 切片 {{current.chunkCount}}</span></div><span>{{current.embeddingModelName}}</span></div></template>
          <el-tabs v-model="tab" @tab-change="loadDetail">
            <el-tab-pane label="文档" name="document">
              <el-upload :show-file-list="false" :http-request="upload" accept=".txt,.md,.pdf,.docx,.xlsx"><el-button type="primary" plain icon="Upload">上传文档</el-button></el-upload>
              <el-table :data="documents" class="mt-3"><el-table-column label="文档" prop="documentName" min-width="200" /><el-table-column label="类型" prop="documentType" width="80" /><el-table-column label="版本" width="70"><template #default="{row}">v{{row.versionNo||1}}</template></el-table-column><el-table-column label="状态" width="110"><template #default="{row}"><el-tag :type="statusType(row.status)">{{statusText(row.status)}}</el-tag></template></el-table-column><el-table-column label="切片" prop="chunkCount" width="80" /><el-table-column label="失败原因" prop="failureReason" min-width="160" show-overflow-tooltip /><el-table-column label="操作" width="130"><template #default="{row}"><el-button link type="primary" @click="showChunks(row)">切片</el-button><el-button link type="danger" @click="removeDocument(row)">删除</el-button></template></el-table-column></el-table>
              <pagination v-show="documentTotal > 0" v-model:page="documentQuery.pageNum" v-model:limit="documentQuery.pageSize" :total="documentTotal" :auto-scroll="false" @pagination="loadDetail" />
            </el-tab-pane>
            <el-tab-pane label="FAQ" name="faq">
              <div class="flex gap-2">
                <el-button type="primary" plain icon="Plus" @click="editFaq()">新增 FAQ</el-button>
                <el-button plain icon="Download" @click="downloadTemplate">下载导入模板</el-button>
                <el-upload :show-file-list="false" :http-request="importFaq" accept=".xlsx"><el-button plain icon="Upload">Excel 导入</el-button></el-upload>
                <el-button plain icon="MagicStick" @click="openExtraction">AI 解析文档</el-button>
                <el-button plain icon="Tickets" @click="openCandidateDrawer()">候选审核</el-button>
              </div>
              <el-table :data="faqs" class="mt-3"><el-table-column label="标准问题" prop="standardQuestion" min-width="210" show-overflow-tooltip /><el-table-column label="标准答案" prop="standardAnswer" min-width="250" show-overflow-tooltip /><el-table-column label="相似问法" width="90"><template #default="{row}">{{row.aliases?.length||0}}</template></el-table-column><el-table-column label="模式" width="100"><template #default="{row}">{{row.answerMode==='DIRECT'?'直接回答':'模型组织'}}</template></el-table-column><el-table-column label="状态" width="100"><template #default="{row}"><el-tag :type="statusType(row.status)">{{statusText(row.status)}}</el-tag></template></el-table-column><el-table-column label="操作" width="160"><template #default="{row}"><el-button link type="primary" @click="editFaq(row)">修改</el-button><el-button link type="primary" @click="toggleFaq(row)">{{row.enabled?'停用':'启用'}}</el-button><el-button link type="danger" @click="removeFaq(row)">删除</el-button></template></el-table-column></el-table>
              <pagination v-show="faqTotal > 0" v-model:page="faqQuery.pageNum" v-model:limit="faqQuery.pageSize" :total="faqTotal" :auto-scroll="false" @pagination="loadDetail" />
            </el-tab-pane>
            <el-tab-pane label="索引任务" name="task">
              <el-table :data="tasks"><el-table-column label="任务" prop="taskType" min-width="150" /><el-table-column label="状态" width="100"><template #default="{row}"><el-tag :type="statusType(row.status)">{{statusText(row.status)}}</el-tag></template></el-table-column><el-table-column label="进度" width="130"><template #default="{row}">{{row.progressCompleted}} / {{row.progressTotal}}</template></el-table-column><el-table-column label="重试" prop="retryCount" width="70" /><el-table-column label="失败原因" prop="failureReason" min-width="230" show-overflow-tooltip /><el-table-column label="操作" width="90"><template #default="{row}"><el-button v-if="row.status==='FAILED'" link type="primary" @click="retry(row)">重试</el-button></template></el-table-column></el-table>
            </el-tab-pane>
            <el-tab-pane label="检索测试" name="search">
              <el-form inline><el-form-item label="问题"><el-input v-model="searchForm.query" style="width:360px" placeholder="输入要检索的问题" @keyup.enter="search" /></el-form-item><el-form-item label="来源"><el-select v-model="searchForm.sourceType" style="width:130px"><el-option label="文档" value="DOCUMENT" /><el-option label="FAQ" value="FAQ" /></el-select></el-form-item><el-button type="primary" @click="search">检索</el-button></el-form>
              <el-table :data="searchHits"><el-table-column label="来源" prop="sourceType" width="90" /><el-table-column label="相似度" width="90"><template #default="{row}">{{Number(row.score).toFixed(4)}}</template></el-table-column><el-table-column label="标题" prop="title" min-width="160" /><el-table-column label="位置" prop="location" min-width="120" /><el-table-column label="内容" prop="content" min-width="320" show-overflow-tooltip /></el-table>
            </el-tab-pane>
          </el-tabs>
        </el-card>
        <el-empty v-else description="请选择或创建知识库" />
      </el-col>
    </el-row>

    <el-dialog v-model="baseDialog" :title="baseForm.id?'修改知识库':'新增知识库'" width="680px"><el-form :model="baseForm" label-width="110px"><el-row :gutter="16"><el-col :span="12"><el-form-item label="知识库编码"><el-input v-model="baseForm.knowledgeCode" /></el-form-item></el-col><el-col :span="12"><el-form-item label="知识库名称"><el-input v-model="baseForm.knowledgeName" /></el-form-item></el-col></el-row><el-form-item label="向量模型"><el-select v-model="baseForm.embeddingModelId" style="width:100%"><el-option v-for="m in embeddingModels" :key="m.id" :label="m.modelName" :value="m.id" /></el-select></el-form-item><el-row :gutter="16"><el-col :span="8"><el-form-item label="切片长度"><el-input-number v-model="baseForm.chunkSize" :min="200" /></el-form-item></el-col><el-col :span="8"><el-form-item label="重叠长度"><el-input-number v-model="baseForm.chunkOverlap" :min="0" /></el-form-item></el-col><el-col :span="8"><el-form-item label="默认TopK"><el-input-number v-model="baseForm.defaultTopK" :min="1" /></el-form-item></el-col></el-row><el-form-item label="命中阈值"><el-slider v-model="baseForm.scoreThreshold" :min="0" :max="1" :step="0.01" show-input /></el-form-item><el-form-item label="说明"><el-input v-model="baseForm.description" type="textarea" /></el-form-item><el-form-item label="启用"><el-switch v-model="baseForm.enabled" /></el-form-item></el-form><template #footer><el-button @click="baseDialog=false">取消</el-button><el-button type="primary" @click="saveBase">保存</el-button></template></el-dialog>
    <el-dialog v-model="faqDialog" :title="faqForm.id?'修改 FAQ':'新增 FAQ'" width="720px"><el-form :model="faqForm" label-width="110px"><el-row :gutter="16"><el-col :span="12"><el-form-item label="FAQ编码"><el-input v-model="faqForm.faqCode" /></el-form-item></el-col><el-col :span="12"><el-form-item label="FAQ名称"><el-input v-model="faqForm.faqName" /></el-form-item></el-col></el-row><el-form-item label="标准问题"><el-input v-model="faqForm.standardQuestion" /></el-form-item><el-form-item label="标准答案"><el-input v-model="faqForm.standardAnswer" type="textarea" :rows="5" /></el-form-item><el-form-item label="相似问法"><el-select v-model="faqForm.aliases" multiple filterable allow-create default-first-option style="width:100%" placeholder="输入后回车，可添加多个" /></el-form-item><el-form-item label="回答模式"><el-radio-group v-model="faqForm.answerMode"><el-radio value="DIRECT">直接返回人工答案</el-radio><el-radio value="CONTEXT">交给模型组织</el-radio></el-radio-group></el-form-item><el-form-item label="启用"><el-switch v-model="faqForm.enabled" /></el-form-item></el-form><template #footer><el-button @click="faqDialog=false">取消</el-button><el-button type="primary" @click="saveFaq">保存</el-button></template></el-dialog>
    <el-dialog v-model="extractionDialog" title="从知识文档 AI 提取 FAQ" width="620px"><el-alert type="info" :closable="false" title="AI 结果仅进入候选区，审核确认后才会发布为 FAQ。" class="mb-4" /><el-form label-width="110px"><el-form-item label="来源文档"><el-select v-model="extractionForm.documentId" style="width:100%"><el-option v-for="d in readyDocuments" :key="d.id" :label="d.documentName" :value="d.id" /></el-select></el-form-item><el-form-item label="Chat 模型"><el-select v-model="extractionForm.chatModelId" style="width:100%"><el-option v-for="m in chatModels" :key="m.id" :label="`${m.modelName}（${m.providerName||''}）`" :value="m.id" /></el-select></el-form-item></el-form><template #footer><el-button @click="extractionDialog=false">取消</el-button><el-button type="primary" @click="submitExtraction">开始提取</el-button></template></el-dialog>
    <el-drawer v-model="candidateDrawer" title="FAQ 候选审核" size="88%">
      <el-table :data="candidateBatches" highlight-current-row @current-change="selectCandidateBatch"><el-table-column label="来源" width="110"><template #default="{row}">{{row.sourceType==='EXCEL'?'Excel导入':'AI文档提取'}}</template></el-table-column><el-table-column label="文件/文档" prop="sourceFileName" min-width="180" /><el-table-column label="状态" width="110"><template #default="{row}"><el-tag :type="statusType(row.status)">{{statusText(row.status)}}</el-tag></template></el-table-column><el-table-column label="总数" prop="totalCount" width="70" /><el-table-column label="有效" prop="validCount" width="70" /><el-table-column label="无效" prop="invalidCount" width="70" /><el-table-column label="已发布" prop="confirmedCount" width="80" /><el-table-column label="失败原因" prop="failureReason" min-width="180" show-overflow-tooltip /></el-table>
      <el-divider content-position="left">候选明细</el-divider>
      <div class="mb-3 flex justify-between"><span class="text-gray-500">勾选审核通过的候选后发布</span><el-button type="primary" :disabled="!selectedCandidateIds.length" @click="confirmCandidates">发布选中 FAQ</el-button></div>
      <el-table :data="faqCandidates" @selection-change="candidateSelectionChanged"><el-table-column type="selection" width="48" :selectable="row=>row.status==='VALID'" /><el-table-column label="#" prop="rowNumber" width="60" /><el-table-column label="标准问题" prop="standardQuestion" min-width="210" show-overflow-tooltip /><el-table-column label="标准答案" prop="standardAnswer" min-width="280" show-overflow-tooltip /><el-table-column label="来源" prop="sourceLocation" width="130" /><el-table-column label="可信度" width="90"><template #default="{row}">{{row.confidence==null?'-':Number(row.confidence).toFixed(2)}}</template></el-table-column><el-table-column label="状态" width="100"><template #default="{row}"><el-tag :type="row.status==='VALID'?'success':row.status==='INVALID'?'danger':'info'">{{row.status}}</el-tag></template></el-table-column><el-table-column label="说明" prop="errorMessage" min-width="180" show-overflow-tooltip /><el-table-column label="操作" width="80" fixed="right"><template #default="{row}"><el-button v-if="row.status!=='CONFIRMED'" link type="primary" @click="editCandidate(row)">审核</el-button></template></el-table-column></el-table>
    </el-drawer>
    <el-dialog v-model="candidateEditDialog" title="审核 FAQ 候选" width="760px"><el-form :model="candidateForm" label-width="100px"><el-row :gutter="12"><el-col :span="12"><el-form-item label="FAQ编码"><el-input v-model="candidateForm.faqCode" /></el-form-item></el-col><el-col :span="12"><el-form-item label="FAQ名称"><el-input v-model="candidateForm.faqName" /></el-form-item></el-col></el-row><el-form-item label="标准问题"><el-input v-model="candidateForm.standardQuestion" /></el-form-item><el-form-item label="标准答案"><el-input v-model="candidateForm.standardAnswer" type="textarea" :rows="5" /></el-form-item><el-form-item label="相似问法"><el-select v-model="candidateForm.aliases" multiple filterable allow-create default-first-option style="width:100%" /></el-form-item><el-form-item label="回答模式"><el-radio-group v-model="candidateForm.answerMode"><el-radio value="DIRECT">直接回答</el-radio><el-radio value="CONTEXT">模型组织</el-radio></el-radio-group></el-form-item><el-form-item v-if="editingCandidate?.sourceText" label="原文依据"><el-input :model-value="editingCandidate.sourceText" type="textarea" :rows="4" readonly /></el-form-item></el-form><template #footer><el-button @click="candidateEditDialog=false">取消</el-button><el-button type="primary" @click="saveCandidate">保存审核</el-button></template></el-dialog>
    <el-dialog v-model="rebuildDialog" title="重建知识库索引" width="520px"><el-alert type="warning" :closable="false" title="重建期间继续使用旧索引；全部任务成功后才切换到目标向量模型。" class="mb-4" /><el-form label-width="100px"><el-form-item label="目标模型"><el-select v-model="rebuildModelId" style="width:100%"><el-option v-for="m in embeddingModels" :key="m.id" :label="m.modelName" :value="m.id" /></el-select></el-form-item></el-form><template #footer><el-button @click="rebuildDialog=false">取消</el-button><el-button type="primary" @click="submitRebuild">开始重建</el-button></template></el-dialog>
    <el-drawer v-model="chunkDrawer" title="文档切片" size="60%"><el-table :data="chunks"><el-table-column label="#" prop="chunkIndex" width="70" /><el-table-column label="来源位置" width="150"><template #default="{row}">{{row.pageNumber?`第${row.pageNumber}页`:row.sheetName?`${row.sheetName} ${row.rowStart||''}-${row.rowEnd||''}行`:row.titlePath||'-'}}</template></el-table-column><el-table-column label="内容" prop="textContent" min-width="400" /><el-table-column label="状态" prop="indexState" width="100" /></el-table></el-drawer>
  </div>
</template>

<script setup lang="ts">
import { confirmFaqCandidates as confirmFaqCandidateBatch, createKnowledgeBase, createKnowledgeFaq, deleteKnowledgeBase, deleteKnowledgeDocument, deleteKnowledgeFaq, downloadFaqImportTemplate, extractFaqCandidates, importFaqCandidates, listAiModels, listFaqCandidateBatches, listFaqCandidates, listKnowledgeChunks, listKnowledgeDocuments, listKnowledgeTasks, pageKnowledgeBases, pageKnowledgeDocuments, pageKnowledgeFaqs, rebuildKnowledgeBase, retryKnowledgeTask, setKnowledgeBaseEnabled, setKnowledgeFaqEnabled, testKnowledgeSearch, updateFaqCandidate, updateKnowledgeBase, updateKnowledgeFaq, uploadKnowledgeDocument } from '@/api/callcenter/ai-knowledge';
import type { AiModelVO, FaqCandidateBatchVO, FaqCandidateForm, FaqCandidateVO, Id, KnowledgeBaseForm, KnowledgeBaseVO, KnowledgeChunkVO, KnowledgeDocumentVO, KnowledgeFaqForm, KnowledgeFaqVO, KnowledgeSearchHitVO, KnowledgeTaskVO } from '@/api/callcenter/ai-knowledge/types';
import type { UploadRequestOptions } from 'element-plus';
const {proxy}=getCurrentInstance() as ComponentInternalInstance;
const bases=ref<KnowledgeBaseVO[]>([]), embeddingModels=ref<AiModelVO[]>([]), chatModels=ref<AiModelVO[]>([]), documents=ref<KnowledgeDocumentVO[]>([]), faqs=ref<KnowledgeFaqVO[]>([]), tasks=ref<KnowledgeTaskVO[]>([]), chunks=ref<KnowledgeChunkVO[]>([]), searchHits=ref<KnowledgeSearchHitVO[]>([]);
const extractionDocuments=ref<KnowledgeDocumentVO[]>([]);
const baseTotal=ref(0),documentTotal=ref(0),faqTotal=ref(0);
const baseQuery=reactive({pageNum:1,pageSize:10}),documentQuery=reactive({pageNum:1,pageSize:10}),faqQuery=reactive({pageNum:1,pageSize:10});
const candidateBatches=ref<FaqCandidateBatchVO[]>([]),faqCandidates=ref<FaqCandidateVO[]>([]),selectedCandidateIds=ref<Id[]>([]),activeCandidateBatch=ref<FaqCandidateBatchVO>();
const current=ref<KnowledgeBaseVO>(), tab=ref('document'), baseDialog=ref(false), faqDialog=ref(false), chunkDrawer=ref(false), rebuildDialog=ref(false), extractionDialog=ref(false),candidateDrawer=ref(false),candidateEditDialog=ref(false),rebuildModelId=ref<string|number>(), rebuildBaseId=ref<string|number>();
const baseDefault=():KnowledgeBaseForm=>({knowledgeCode:'',knowledgeName:'',embeddingModelId:undefined,chunkSize:800,chunkOverlap:100,defaultTopK:5,scoreThreshold:0.5,enabled:true});
const faqDefault=():KnowledgeFaqForm=>({faqCode:'',faqName:'',standardQuestion:'',standardAnswer:'',aliases:[],answerMode:'DIRECT',enabled:true});
const baseForm=ref(baseDefault()), faqForm=ref(faqDefault()), searchForm=reactive({query:'',sourceType:'DOCUMENT',limit:5}),extractionForm=reactive<{documentId?:Id;chatModelId?:Id}>({});
const candidateForm=ref<FaqCandidateForm>({faqCode:'',faqName:'',standardQuestion:'',standardAnswer:'',aliases:[],answerMode:'DIRECT'}),editingCandidate=ref<FaqCandidateVO>();
const readyDocuments=computed(()=>extractionDocuments.value.filter(item=>item.status==='READY'));
const loadBases=async()=>{const [b,m,c]=await Promise.all([pageKnowledgeBases(baseQuery),listAiModels('EMBEDDING'),listAiModels('CHAT')]);bases.value=b.rows||[];baseTotal.value=b.total||0;embeddingModels.value=m.data||[];chatModels.value=c.data||[];const selected=current.value?bases.value.find(x=>String(x.id)===String(current.value?.id)):undefined;current.value=selected;if(!current.value&&bases.value.length)selectBase(bases.value[0]);};
const selectBase=(row?:KnowledgeBaseVO)=>{if(!row)return;current.value=row;documentQuery.pageNum=1;faqQuery.pageNum=1;loadDetail();};
const loadDetail=async()=>{if(!current.value)return;const id=current.value.id;if(tab.value==='document'){const response=await pageKnowledgeDocuments(id,documentQuery);documents.value=response.rows||[];documentTotal.value=response.total||0;}if(tab.value==='faq'){const response=await pageKnowledgeFaqs(id,faqQuery);faqs.value=response.rows||[];faqTotal.value=response.total||0;}if(tab.value==='task')tasks.value=(await listKnowledgeTasks(id)).data||[];};
const editBase=(row?:KnowledgeBaseVO)=>{baseForm.value=row?{...row}:baseDefault();baseDialog.value=true;}; const saveBase=async()=>{const f=baseForm.value;f.id?await updateKnowledgeBase(f.id,f):await createKnowledgeBase(f);baseDialog.value=false;await loadBases();};
const toggleBase=async(row:KnowledgeBaseVO)=>{await setKnowledgeBaseEnabled(row.id,!row.enabled);await loadBases();}; const removeBase=async(row:KnowledgeBaseVO)=>{await proxy?.$modal.confirm(`确认删除“${row.knowledgeName}”吗？`);await deleteKnowledgeBase(row.id);bases.value=bases.value.filter(item=>String(item.id)!==String(row.id));current.value=undefined;proxy?.$modal.msgSuccess('知识库已删除');await loadBases();};
const openRebuild=(row:KnowledgeBaseVO)=>{rebuildBaseId.value=row.id;rebuildModelId.value=row.embeddingModelId;rebuildDialog.value=true;};const submitRebuild=async()=>{if(!rebuildBaseId.value||!rebuildModelId.value)return;await rebuildKnowledgeBase(rebuildBaseId.value,rebuildModelId.value);rebuildDialog.value=false;proxy?.$modal.msgSuccess('重建任务已提交，旧索引会继续提供服务');await loadBases();};
const upload=async(options:UploadRequestOptions)=>{if(!current.value)return;await uploadKnowledgeDocument(current.value.id,options.file as File);proxy?.$modal.msgSuccess('文件已提交，后台正在解析和向量化');await loadDetail();};
const removeDocument=async(row:KnowledgeDocumentVO)=>{await proxy?.$modal.confirm(`确认删除文档“${row.documentName}”吗？`);await deleteKnowledgeDocument(row.id);await loadDetail();}; const showChunks=async(row:KnowledgeDocumentVO)=>{chunks.value=(await listKnowledgeChunks(row.id)).data||[];chunkDrawer.value=true;};
const editFaq=(row?:KnowledgeFaqVO)=>{
  faqForm.value=row?{
    id:row.id,
    faqCode:row.faqCode,
    faqName:row.faqName,
    standardQuestion:row.standardQuestion||'',
    standardAnswer:row.standardAnswer||'',
    aliases:row.aliases||[],
    answerMode:row.answerMode==='CONTEXT'?'CONTEXT':'DIRECT',
    enabled:row.enabled
  }:faqDefault();
  faqDialog.value=true;
}; const saveFaq=async()=>{if(!current.value)return;const f=faqForm.value;f.id?await updateKnowledgeFaq(f.id,f):await createKnowledgeFaq(current.value.id,f);faqDialog.value=false;await loadDetail();};
const toggleFaq=async(row:KnowledgeFaqVO)=>{await setKnowledgeFaqEnabled(row.id,!row.enabled);await loadDetail();}; const removeFaq=async(row:KnowledgeFaqVO)=>{await proxy?.$modal.confirm(`确认删除 FAQ“${row.faqName}”吗？`);await deleteKnowledgeFaq(row.id);await loadDetail();}; const retry=async(row:KnowledgeTaskVO)=>{await retryKnowledgeTask(row.id);await loadDetail();};
const downloadTemplate = async () => {
  const response = await downloadFaqImportTemplate();
  const blob = response instanceof Blob ? response : response?.data;
  if (!(blob instanceof Blob)) {
    proxy?.$modal.msgError('下载 FAQ 导入模板失败，服务端未返回文件');
    return;
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'FAQ导入模板.xlsx';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
};
const importFaq=async(options:UploadRequestOptions)=>{if(!current.value)return;const response=await importFaqCandidates(current.value.id,options.file as File);proxy?.$modal.msgSuccess('Excel 预检完成，请进入候选审核');await openCandidateDrawer(response.data);};
const openExtraction=async()=>{if(!current.value)return;extractionDocuments.value=(await listKnowledgeDocuments(current.value.id)).data||[];extractionForm.documentId=readyDocuments.value[0]?.id;extractionForm.chatModelId=chatModels.value[0]?.id;extractionDialog.value=true;};
const submitExtraction=async()=>{if(!current.value||!extractionForm.documentId||!extractionForm.chatModelId){proxy?.$modal.msgWarning('请选择来源文档和 Chat 模型');return;}const response=await extractFaqCandidates(current.value.id,{documentId:extractionForm.documentId,chatModelId:extractionForm.chatModelId});extractionDialog.value=false;proxy?.$modal.msgSuccess('FAQ 提取任务已提交，可在候选审核中查看进度');await openCandidateDrawer(response.data);};
const loadCandidateBatches=async()=>{if(!current.value)return;candidateBatches.value=(await listFaqCandidateBatches(current.value.id)).data||[];if(activeCandidateBatch.value)activeCandidateBatch.value=candidateBatches.value.find(item=>String(item.id)===String(activeCandidateBatch.value?.id));};
const openCandidateDrawer=async(batchId?:Id)=>{candidateDrawer.value=true;await loadCandidateBatches();const target=batchId?candidateBatches.value.find(item=>String(item.id)===String(batchId)):candidateBatches.value[0];if(target)await selectCandidateBatch(target);};
const selectCandidateBatch=async(row?:FaqCandidateBatchVO)=>{if(!row)return;activeCandidateBatch.value=row;faqCandidates.value=(await listFaqCandidates(row.id)).data||[];selectedCandidateIds.value=[];};
const candidateSelectionChanged=(rows:FaqCandidateVO[])=>{selectedCandidateIds.value=rows.map(item=>item.id);};
const editCandidate=(row:FaqCandidateVO)=>{editingCandidate.value=row;candidateForm.value={faqCode:row.faqCode,faqName:row.faqName,standardQuestion:row.standardQuestion,standardAnswer:row.standardAnswer,aliases:[...(row.aliases||[])],answerMode:row.answerMode,version:row.version};candidateEditDialog.value=true;};
const saveCandidate=async()=>{if(!editingCandidate.value)return;await updateFaqCandidate(editingCandidate.value.id,candidateForm.value);candidateEditDialog.value=false;proxy?.$modal.msgSuccess('候选审核已保存');await selectCandidateBatch(activeCandidateBatch.value);await loadCandidateBatches();};
const confirmCandidates=async()=>{if(!activeCandidateBatch.value||!selectedCandidateIds.value.length)return;await proxy?.$modal.confirm(`确认发布选中的 ${selectedCandidateIds.value.length} 条 FAQ 吗？`);const response=await confirmFaqCandidateBatch(activeCandidateBatch.value.id,selectedCandidateIds.value);proxy?.$modal.msgSuccess(`已发布 ${response.data||0} 条 FAQ，后台正在向量化`);await selectCandidateBatch(activeCandidateBatch.value);await loadCandidateBatches();await loadDetail();};
const search=async()=>{if(!current.value||!searchForm.query.trim())return;searchHits.value=(await testKnowledgeSearch(current.value.id,searchForm)).data||[];};
const statusText=(v:string)=>({DRAFT:'草稿',INDEXING:'处理中',READY:'可用',PARTIAL:'部分可用',FAILED:'失败',PENDING:'等待',PROCESSING:'处理中',SUCCESS:'成功',RETRY_WAIT:'等待重试',REVIEW:'待审核',CONFIRMED:'已发布'}[v]||v); const statusType=(v:string)=>v==='READY'||v==='SUCCESS'||v==='CONFIRMED'?'success':v==='FAILED'?'danger':v==='PARTIAL'||v==='REVIEW'?'warning':'info';
let timer:number|undefined;onMounted(async()=>{await loadBases();timer=window.setInterval(()=>{if(tab.value==='task')loadDetail();if(candidateDrawer.value)loadCandidateBatches();},5000);});onUnmounted(()=>timer&&clearInterval(timer));
</script>
<style scoped>.knowledge-page :deep(.el-card__body){min-height:650px}</style>
