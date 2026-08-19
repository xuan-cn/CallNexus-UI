<template>
  <div class="knowledge-page">
    <el-row :gutter="14" class="knowledge-row">
      <el-col :span="6" class="knowledge-col">
        <el-card shadow="never" class="knowledge-side">
          <template #header>
            <div class="side-header">
              <div>
                <strong>知识库</strong>
                <small>选择后管理文档与 FAQ</small>
              </div>
              <el-button type="primary" plain size="small" icon="Plus" @click="editBase()">新增</el-button>
            </div>
          </template>
          <div class="base-list">
            <button
              v-for="row in bases"
              :key="row.id"
              type="button"
              class="base-item"
              :class="{ active: String(current?.id) === String(row.id) }"
              @click="selectBase(row)"
            >
              <span class="base-avatar">{{ (row.knowledgeName || '?').trim().charAt(0) }}</span>
              <div class="base-item-main">
                <strong>{{ row.knowledgeName }}</strong>
                <small>{{ row.knowledgeCode }}</small>
              </div>
              <div class="base-item-meta">
                <el-tag size="small" :type="statusType(row.status)" effect="light" round>{{ statusText(row.status) }}</el-tag>
                <el-dropdown trigger="click" @click.stop>
                  <el-button link type="primary" class="base-ops" @click.stop>操作</el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item @click="editBase(row)">修改</el-dropdown-item>
                      <el-dropdown-item @click="openRebuild(row)">重建索引</el-dropdown-item>
                      <el-dropdown-item @click="toggleBase(row)">{{ row.enabled ? '停用' : '启用' }}</el-dropdown-item>
                      <el-dropdown-item divided @click="removeBase(row)">删除</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </button>
            <el-empty v-if="!bases.length" description="暂无知识库" :image-size="56" />
          </div>
          <pagination
            v-show="baseTotal > 0"
            v-model:page="baseQuery.pageNum"
            v-model:limit="baseQuery.pageSize"
            :total="baseTotal"
            layout="prev, pager, next"
            :pager-count="5"
            :auto-scroll="false"
            class="side-pagination"
            @pagination="loadBases"
          />
        </el-card>
      </el-col>
      <el-col :span="18" class="knowledge-col">
        <el-card v-if="current" shadow="never" class="knowledge-main">
          <div class="main-hero">
            <div class="main-hero-copy">
              <span class="hero-eyebrow">当前知识库</span>
              <strong>{{ current.knowledgeName }}</strong>
              <div class="main-stats">
                <span>文档 {{ current.documentCount }}</span>
                <span>FAQ {{ current.faqCount }}</span>
                <span>切片 {{ current.chunkCount }}</span>
              </div>
            </div>
            <el-tag effect="light" round type="info">{{ current.embeddingModelName || '未配置向量模型' }}</el-tag>
          </div>
          <el-tabs v-model="tab" class="knowledge-tabs" @tab-change="loadDetail">
            <el-tab-pane label="文档" name="document">
              <div class="panel-body">
                <div class="panel-toolbar">
                  <el-upload :show-file-list="false" :http-request="upload" accept=".txt,.md,.pdf,.docx,.xlsx">
                    <el-button type="primary" plain icon="Upload">上传文档</el-button>
                  </el-upload>
                </div>
                <el-table :data="documents" class="panel-table" max-height="calc(100vh - 340px)">
                  <el-table-column label="文档" prop="documentName" min-width="180" show-overflow-tooltip />
                  <el-table-column label="类型" prop="documentType" width="80" />
                  <el-table-column label="版本" width="70"><template #default="{ row }">v{{ row.versionNo || 1 }}</template></el-table-column>
                  <el-table-column label="状态" width="100">
                    <template #default="{ row }"><el-tag :type="statusType(row.status)">{{ statusText(row.status) }}</el-tag></template>
                  </el-table-column>
                  <el-table-column label="切片" prop="chunkCount" width="70" />
                  <el-table-column label="失败原因" prop="failureReason" min-width="140" show-overflow-tooltip />
                  <el-table-column label="操作" width="120">
                    <template #default="{ row }">
                      <el-button link type="primary" @click="showChunks(row)">切片</el-button>
                      <el-button link type="danger" @click="removeDocument(row)">删除</el-button>
                    </template>
                  </el-table-column>
                </el-table>
                <pagination
                  v-show="documentTotal > 0"
                  v-model:page="documentQuery.pageNum"
                  v-model:limit="documentQuery.pageSize"
                  :total="documentTotal"
                  :auto-scroll="false"
                  class="panel-pagination"
                  @pagination="loadDetail"
                />
              </div>
            </el-tab-pane>
            <el-tab-pane label="FAQ" name="faq">
              <div class="panel-body">
                <div class="panel-toolbar">
                  <el-button type="primary" plain icon="Plus" @click="editFaq()">新增 FAQ</el-button>
                  <el-button plain icon="Download" @click="downloadTemplate">下载导入模板</el-button>
                  <el-upload :show-file-list="false" :http-request="importFaq" accept=".xlsx">
                    <el-button plain icon="Upload">Excel 导入</el-button>
                  </el-upload>
                  <el-button plain icon="MagicStick" @click="openExtraction">AI 解析文档</el-button>
                  <el-button plain icon="Tickets" @click="openCandidateDrawer()">候选审核</el-button>
                </div>
                <el-table :data="faqs" class="panel-table" max-height="calc(100vh - 340px)">
                  <el-table-column label="标准问题" prop="standardQuestion" min-width="180" show-overflow-tooltip />
                  <el-table-column label="标准答案" prop="standardAnswer" min-width="200" show-overflow-tooltip />
                  <el-table-column label="相似问法" width="90"><template #default="{ row }">{{ row.aliases?.length || 0 }}</template></el-table-column>
                  <el-table-column label="模式" width="100">
                    <template #default="{ row }">{{ row.answerMode === 'DIRECT' ? '直接回答' : '模型组织' }}</template>
                  </el-table-column>
                  <el-table-column label="状态" width="90">
                    <template #default="{ row }"><el-tag :type="statusType(row.status)">{{ statusText(row.status) }}</el-tag></template>
                  </el-table-column>
                  <el-table-column label="操作" width="150">
                    <template #default="{ row }">
                      <el-button link type="primary" @click="editFaq(row)">修改</el-button>
                      <el-button link type="primary" @click="toggleFaq(row)">{{ row.enabled ? '停用' : '启用' }}</el-button>
                      <el-button link type="danger" @click="removeFaq(row)">删除</el-button>
                    </template>
                  </el-table-column>
                </el-table>
                <pagination
                  v-show="faqTotal > 0"
                  v-model:page="faqQuery.pageNum"
                  v-model:limit="faqQuery.pageSize"
                  :total="faqTotal"
                  :auto-scroll="false"
                  class="panel-pagination"
                  @pagination="loadDetail"
                />
              </div>
            </el-tab-pane>
            <el-tab-pane label="索引任务" name="task">
              <div class="panel-body">
                <div class="panel-toolbar task-toolbar">
                  <span>后台索引与重建任务，约每 5 秒自动刷新</span>
                </div>
                <el-table :data="tasks" class="panel-table" max-height="calc(100vh - 300px)">
                  <el-table-column label="任务" min-width="140">
                    <template #default="{ row }">{{ taskTypeText(row.taskType) }}</template>
                  </el-table-column>
                  <el-table-column label="状态" width="100">
                    <template #default="{ row }"><el-tag :type="statusType(row.status)">{{ statusText(row.status) }}</el-tag></template>
                  </el-table-column>
                  <el-table-column label="进度" width="120">
                    <template #default="{ row }">{{ row.progressCompleted }} / {{ row.progressTotal }}</template>
                  </el-table-column>
                  <el-table-column label="重试" prop="retryCount" width="70" />
                  <el-table-column label="失败原因" prop="failureReason" min-width="180" show-overflow-tooltip />
                  <el-table-column label="操作" width="80">
                    <template #default="{ row }">
                      <el-button v-if="row.status === 'FAILED'" link type="primary" @click="retry(row)">重试</el-button>
                      <span v-else class="muted-dash">-</span>
                    </template>
                  </el-table-column>
                </el-table>
              </div>
            </el-tab-pane>
            <el-tab-pane label="检索测试" name="search">
              <div class="panel-body">
                <div class="search-panel">
                  <el-form inline>
                    <el-form-item label="问题">
                      <el-input v-model="searchForm.query" style="width: 320px" placeholder="输入要检索的问题" @keyup.enter="search" />
                    </el-form-item>
                    <el-form-item label="来源">
                      <el-select v-model="searchForm.sourceType" style="width: 120px">
                        <el-option label="文档" value="DOCUMENT" />
                        <el-option label="FAQ" value="FAQ" />
                      </el-select>
                    </el-form-item>
                    <el-button type="primary" @click="search">检索</el-button>
                  </el-form>
                </div>
                <el-table :data="searchHits" class="panel-table" max-height="calc(100vh - 320px)">
                  <el-table-column label="来源" prop="sourceType" width="90" />
                  <el-table-column label="相似度" width="90">
                    <template #default="{ row }">{{ Number(row.score).toFixed(4) }}</template>
                  </el-table-column>
                  <el-table-column label="标题" prop="title" min-width="140" show-overflow-tooltip />
                  <el-table-column label="位置" prop="location" min-width="110" show-overflow-tooltip />
                  <el-table-column label="内容" prop="content" min-width="240" show-overflow-tooltip />
                </el-table>
              </div>
            </el-tab-pane>
          </el-tabs>
        </el-card>
        <el-card v-else shadow="never" class="knowledge-empty">
          <el-empty description="请选择或创建知识库" />
        </el-card>
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
const taskTypeText=(v:string)=>({DOCUMENT_INDEX:'文档索引',FAQ_INDEX:'FAQ 索引',DELETE_INDEX:'删除索引',REBUILD_INDEX:'重建索引',EMBEDDING_REBUILD:'向量重建'}[v]||v);
let timer:number|undefined;onMounted(async()=>{await loadBases();timer=window.setInterval(()=>{if(tab.value==='task')loadDetail();if(candidateDrawer.value)loadCandidateBatches();},5000);});onUnmounted(()=>timer&&clearInterval(timer));
</script>
<style scoped lang="scss">
.knowledge-page {
  box-sizing: border-box;
  height: calc(100vh - 84px);
  padding: 12px 14px;
  overflow: hidden;
}

.knowledge-row,
.knowledge-col {
  height: 100%;
}

.knowledge-col {
  display: flex;
  flex-direction: column;
}

.knowledge-side,
.knowledge-main,
.knowledge-empty {
  display: flex;
  flex: 1;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  border: 1px solid #dce8f6;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 10px 24px rgba(28, 48, 78, 0.05);
}

.knowledge-side {
  background:
    linear-gradient(180deg, rgba(247, 251, 255, 0.95), rgba(255, 255, 255, 0.98)),
    #fff;
}

.knowledge-side :deep(.el-card__header) {
  flex: none;
  padding: 14px 14px 12px 16px;
  border-bottom: 1px solid #eef3f8;
  background: transparent;
}

.knowledge-side :deep(.el-card__body) {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  padding: 12px 12px 12px 14px;
  overflow: hidden;
}

.knowledge-main :deep(.el-card__body),
.knowledge-empty :deep(.el-card__body) {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  padding: 14px 16px;
  overflow: hidden;
}

.side-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;

  strong {
    display: block;
    color: #15233d;
    font-size: 15px;
    line-height: 1.3;
  }

  small {
    display: block;
    margin-top: 2px;
    color: #7b8798;
    font-size: 12px;
  }
}

.base-list {
  display: grid;
  flex: 1;
  gap: 8px;
  align-content: start;
  min-height: 0;
  overflow: auto;
  padding-right: 2px;
}

.base-item {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  width: 100%;
  padding: 10px 10px 10px 12px;
  text-align: left;
  cursor: pointer;
  border: 1px solid #e4ecf6;
  border-radius: 12px;
  background: #fff;
  transition: border-color 0.16s ease, background 0.16s ease, box-shadow 0.16s ease;
}

.base-item:hover {
  border-color: #c9dbf8;
  background: #f8fbff;
}

.base-item.active {
  border-color: #c9ddf7;
  background: linear-gradient(90deg, #eef6ff, #f7fbff);
  box-shadow: inset 3px 0 0 #3b82f6;
}

.base-avatar {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  color: #3f5270;
  font-size: 14px;
  font-weight: 700;
  border-radius: 10px;
  background: #eef3f9;

  .base-item.active & {
    color: #1d4ed8;
    background: #dbeafe;
  }
}

.base-item-main {
  display: grid;
  gap: 10px;
  min-width: 0;

  strong {
    overflow: hidden;
    color: #15233d;
    font-size: 13px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  small {
    overflow: hidden;
    color: #8b97aa;
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.base-item-meta {
  display: flex;
  flex: none;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 52px;
}

.base-item-meta :deep(.el-tag) {
  justify-content: center;
  min-width: 44px;
  margin: 0;
  padding: 0 8px;
  line-height: 20px;
  text-align: center;
}

.base-item-meta :deep(.el-dropdown) {
  display: flex;
  justify-content: center;
  width: 100%;
}

.base-ops {
  display: inline-flex;
  justify-content: center;
  width: 100%;
  height: auto;
  margin: 0;
  padding: 0;
  font-size: 12px;
  line-height: 1.2;
  text-align: center;
}

.side-pagination {
  flex: none;
  margin-top: 10px !important;
  padding: 8px 0 0 !important;
  border-top: 1px solid #eef3f8;
}

.main-hero {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  padding: 14px 16px;
  border: 1px solid #dce8f8;
  border-radius: 14px;
  background:
    radial-gradient(circle at 100% 0%, rgba(56, 189, 248, 0.12), transparent 42%),
    linear-gradient(135deg, #f4f9ff, #eef5ff);
}

.hero-eyebrow {
  color: #6b7c93;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.main-hero-copy {
  display: grid;
  gap: 8px;
  min-width: 0;

  strong {
    color: #15233d;
    font-size: 18px;
    line-height: 1.25;
  }
}

.main-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;

  span {
    padding: 3px 10px;
    color: #5b6b82;
    font-size: 12px;
    border: 1px solid #d7e4f5;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.85);
  }
}

.knowledge-tabs {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;

  :deep(.el-tabs__header) {
    flex: none;
    margin-bottom: 10px;
  }

  :deep(.el-tabs__nav-wrap::after) {
    height: 1px;
    background: #eef3f8;
  }

  :deep(.el-tabs__item) {
    font-weight: 600;
  }

  :deep(.el-tabs__content) {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  :deep(.el-tab-pane) {
    height: 100%;
  }
}

.panel-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.panel-toolbar,
.search-panel {
  display: flex;
  flex: none;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  padding: 10px 12px;
  border: 1px solid #e8eef6;
  border-radius: 12px;
  background: #f7faff;
}

.task-toolbar {
  color: #7b8798;
  font-size: 12px;
}

.search-panel :deep(.el-form-item) {
  margin-bottom: 0;
}

.panel-table {
  width: 100%;
}

.panel-pagination {
  flex: none;
  margin-top: 0 !important;
  padding: 0 !important;
}

.muted-dash {
  color: #c0c4cc;
}

.knowledge-empty {
  display: grid;
  place-items: center;
}
</style>
