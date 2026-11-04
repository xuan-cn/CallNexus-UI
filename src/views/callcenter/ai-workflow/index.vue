<template>
  <div class="p-2">
    <el-card shadow="never">
      <div class="page-header">
        <div>
          <p>配置 AI 助手的多轮对话、意图分支和业务动作。已发布版本不会被草稿修改影响。</p>
        </div>
        <el-button v-hasPermi="['callcenter:ai-workflow:create']" type="primary" icon="Plus" @click="openForm()">新增编排</el-button>
      </div>
      <WorkflowLibrary
        :workflows="workflows"
        :loading="loading"
        @design="openDesigner"
        @edit="openForm"
        @versions="openVersions"
        @toggle="toggleEnabled"
        @remove="remove"
      />
    </el-card>

    <el-dialog v-model="formVisible" :title="formId ? '修改 AI 编排' : '新增 AI 编排'" width="640px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <AutoInternalCode v-model="form.workflowCode" prefix="aiflow" />
        <el-form-item label="编排名称" prop="workflowName"><el-input v-model="form.workflowName" /></el-form-item>
        <el-form-item label="适用场景" prop="sceneType"
          ><el-select v-model="form.sceneType" style="width: 100%"
            ><el-option v-for="item in sceneOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select
        ></el-form-item>
        <el-form-item label="说明"><el-input v-model="form.description" type="textarea" :rows="4" maxlength="500" show-word-limit /></el-form-item>
        <el-form-item label="启用"><el-switch v-model="form.enabled" /></el-form-item>
      </el-form>
      <template #footer
        ><el-button @click="formVisible = false">取消</el-button
        ><el-button type="primary" :loading="saving" @click="saveForm">保存</el-button></template
      >
    </el-dialog>

    <el-drawer v-model="designerVisible" size="100%" :with-header="false" destroy-on-close @closed="designerReady = false">
      <div class="designer-header">
        <div class="designer-meta">
          <strong :title="currentWorkflow?.workflowName">{{ currentWorkflow?.workflowName }}</strong
          ><el-tag type="warning">草稿 v{{ draft?.versionNo }}</el-tag>
        </div>
        <div class="designer-actions">
          <el-dropdown trigger="click" placement="bottom-end">
            <el-button icon="Setting"
              >流程全局策略配置<el-icon class="settings-arrow"><ArrowDown /></el-icon
            ></el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item icon="ChatDotRound" @click="rulesVisible = true">对话策略</el-dropdown-item>
                <el-dropdown-item icon="Operation" @click="openFallbackSettings">未命中意图策略</el-dropdown-item>
                <el-dropdown-item icon="Collection" divided @click="openVariables()">流程变量</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <div class="draft-actions">
            <el-input v-model="versionName" aria-label="版本说明" placeholder="版本说明" class="version-input" />
            <el-button icon="DocumentChecked" :loading="savingDraft" @click="saveDraft()">保存草稿</el-button>
          </div>
          <el-button-group>
            <el-button icon="CircleCheck" :loading="validating" @click="() => validateDraft()">校验</el-button>
            <el-button v-hasPermi="['callcenter:ai-workflow:test']" icon="VideoPlay" type="primary" plain :loading="startingTest" @click="openTest"
              >测试流程</el-button
            >
          </el-button-group>
          <el-button v-hasPermi="['callcenter:ai-workflow:publish']" icon="Upload" type="primary" :loading="publishing" @click="publishDraft"
            >发布</el-button
          >
          <el-button @click="designerVisible = false">关闭</el-button>
        </div>
      </div>
      <AiWorkflowDesigner
        ref="designerRef"
        v-if="designerReady"
        v-model="graph"
        :intent-options="intentOptions"
        :queue-options="queueOptions"
        :customer-templates="customerTemplates"
        :media-options="mediaOptions"
        @manage-variables="openVariables(true)"
      />
    </el-drawer>

    <el-drawer v-model="variablesVisible" title="工作流变量" size="720px" append-to-body>
      <el-alert
        class="mb-4"
        type="info"
        :closable="false"
        title="这里只创建本流程需要临时记录的信息。填写中文名称和用途即可，系统会自动生成内部标识。"
      />
      <el-table :data="graph.variables" size="small">
        <el-table-column label="记录名称" min-width="140"
          ><template #default="{ row }"><el-input v-model="row.label" placeholder="例如：是否同意回访" /></template
        ></el-table-column>
        <el-table-column label="用途说明" min-width="180"
          ><template #default="{ row }"><el-input v-model="row.description" placeholder="例如：决定是否创建回访任务" /></template
        ></el-table-column>
        <el-table-column label="类型" width="110"
          ><template #default="{ row }"
            ><el-select v-model="row.type"
              ><el-option label="文本" value="STRING" /><el-option label="数字" value="NUMBER" /><el-option
                label="布尔"
                value="BOOLEAN" /></el-select></template
        ></el-table-column>
        <el-table-column label="必填" width="70"
          ><template #default="{ row }"><el-switch v-model="row.required" /></template
        ></el-table-column>
        <el-table-column label="默认值" min-width="120"
          ><template #default="{ row }"><el-input v-model="row.defaultValue" /></template
        ></el-table-column>
        <el-table-column label="操作" width="70"
          ><template #default="{ $index }"
            ><el-button link type="danger" @click="graph.variables.splice($index, 1)">删除</el-button></template
          ></el-table-column
        >
      </el-table>
      <el-button class="mt-4" icon="Plus" @click="addVariable">新增变量</el-button>
    </el-drawer>

    <el-drawer v-model="fallbackVisible" title="意图未命中公共策略" size="620px" append-to-body>
      <el-alert class="mb-4" type="info" :closable="false" title="意图节点选择“继承流程公共策略”后使用这里的配置；单个节点仍可独立覆盖。" />
      <el-form label-position="top">
        <el-form-item label="未命中时">
          <el-select v-model="fallbackPolicy.fallbackMode" style="width: 100%">
            <el-option label="按原方式走未命中连线" value="EDGE" />
            <el-option label="回复固定话术并重新询问" value="FIXED_RETRY" />
            <el-option label="AI 回答后重新询问" value="AI_RETRY" />
            <el-option label="回复固定话术后继续流程" value="FIXED_CONTINUE" />
            <el-option label="AI 回答后继续流程" value="AI_CONTINUE" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="['FIXED_RETRY', 'FIXED_CONTINUE'].includes(fallbackPolicy.fallbackMode)" label="回复话术">
          <el-input
            v-model="fallbackPolicy.fallbackText"
            type="textarea"
            :rows="4"
            placeholder="例如：抱歉，我没有听清。请问您是否需要办理这项业务？"
          />
        </el-form-item>
        <el-form-item v-if="['AI_RETRY', 'AI_CONTINUE'].includes(fallbackPolicy.fallbackMode)" label="AI 回答要求">
          <el-input
            v-model="fallbackPolicy.fallbackPrompt"
            type="textarea"
            :rows="4"
            placeholder="可留空，系统会要求 AI 简短回答并按当前策略继续。"
          />
        </el-form-item>
        <template v-if="['FIXED_RETRY', 'AI_RETRY'].includes(fallbackPolicy.fallbackMode)">
          <el-form-item label="最多重新询问">
            <el-input-number v-model="fallbackPolicy.maxRetries" :min="1" :max="10" style="width: 100%" />
          </el-form-item>
          <el-form-item label="达到次数上限后">
            <el-select v-model="fallbackPolicy.retryLimitAction" style="width: 100%">
              <el-option label="走“未命中后继续”统一连线" value="CONTINUE" />
              <el-option label="走原“未命中任何意图”连线" value="EDGE" />
              <el-option label="直接转技能组" value="TRANSFER_QUEUE" />
              <el-option label="直接转分机" value="TRANSFER_EXTENSION" />
              <el-option label="直接挂机" value="HANGUP" />
              <el-option label="结束编排并返回普通 AI 对话" value="END" />
            </el-select>
          </el-form-item>
          <el-alert
            v-if="['TRANSFER_QUEUE', 'TRANSFER_EXTENSION', 'HANGUP', 'END'].includes(fallbackPolicy.retryLimitAction)"
            class="mb-4"
            type="warning"
            :closable="false"
            title="选择直接动作后，继承该策略的意图节点不再需要未命中兜底连线；已有连线不会自动删除，请确认后手动整理。"
          />
          <el-form-item v-if="fallbackPolicy.retryLimitAction === 'TRANSFER_QUEUE'" label="目标技能组">
            <el-select v-model="fallbackPolicy.limitQueueCode" filterable style="width: 100%" placeholder="请选择技能组">
              <el-option v-for="item in queueOptions" :key="item.queueCode" :label="item.queueName" :value="item.queueCode" />
            </el-select>
          </el-form-item>
          <el-form-item v-if="fallbackPolicy.retryLimitAction === 'TRANSFER_EXTENSION'" label="目标分机">
            <el-input v-model="fallbackPolicy.limitExtension" placeholder="例如：1001" />
          </el-form-item>
          <el-form-item label="达到上限时的话术（可选）">
            <el-input
              v-model="fallbackPolicy.limitText"
              type="textarea"
              :rows="3"
              placeholder="例如：暂时没有确认到您的选择，现在为您转接人工服务。"
            />
          </el-form-item>
        </template>
      </el-form>
    </el-drawer>

    <el-drawer v-model="rulesVisible" title="公共对话规则" size="640px" append-to-body>
      <p>配置修改后需点击顶部“保存草稿”，发布后才影响新通话。节点可选择继承、关闭或单独覆盖。</p>
      <ConversationRulesForm
        :model-value="graph.settings?.conversationRules || []"
        :intent-options="intentOptions"
        :queue-options="queueOptions"
        @update:model-value="setConversationRules"
      />
    </el-drawer>
    <el-dialog v-model="validationVisible" title="发布校验结果" width="680px">
      <el-result :icon="validation.valid ? 'success' : 'error'" :title="validation.valid ? '校验通过' : '校验失败'">
        <template #sub-title
          ><div class="validation-list">
            <div v-for="item in validationErrors" :key="item.raw" class="validation-issue error-item">
              <p>
                {{ item.message }} <span v-if="item.count > 1">（同类提示 ×{{ item.count }}）</span>
              </p>
              <el-tooltip v-for="node in item.nodes" :key="node.id" :content="'节点 ID：' + node.id">
                <el-button link type="primary" @click="locateValidationNode(node.id)">定位：{{ node.name || node.type }}</el-button>
              </el-tooltip>
              <p v-for="edge in item.edges" :key="edge.edgeId">
                <el-button link type="danger" @click="locateValidationEdge(edge.edgeId!)"
                  >定位错误连线 · 分支编码：{{ edge.condition || '未配置' }}</el-button
                >
              </p>
            </div>
            <div v-for="item in validationWarnings" :key="item.raw" class="validation-issue warning-item">
              <p>
                {{ item.message }} <span v-if="item.count > 1">（同类提示 ×{{ item.count }}）</span>
              </p>
              <el-tooltip v-for="node in item.nodes" :key="node.id" :content="'节点 ID：' + node.id">
                <el-button link type="primary" @click="locateValidationNode(node.id)">定位：{{ node.name || node.type }}</el-button>
              </el-tooltip>
            </div>
          </div></template
        >
      </el-result>
    </el-dialog>

    <el-drawer v-model="versionsVisible" title="版本记录" size="620px">
      <el-table :data="versions"
        ><el-table-column label="版本" width="85"
          ><template #default="{ row }">v{{ row.versionNo }}</template></el-table-column
        ><el-table-column label="说明" prop="versionName" min-width="160" /><el-table-column label="状态" width="105"
          ><template #default="{ row }"
            ><el-tag :type="versionTag(row.status)">{{ versionLabel(row.status) }}</el-tag></template
          ></el-table-column
        ><el-table-column label="发布时间" prop="publishedAt" min-width="170"
      /></el-table>
    </el-drawer>

    <AiWorkflowTestDrawer
      v-model="testVisible"
      :workflow-id="currentWorkflow?.id"
      :workflow-name="currentWorkflow?.workflowName"
      :agents="agentOptions"
    />
  </div>
</template>

<script setup lang="ts">
import AutoInternalCode from '@/components/AutoInternalCode';

import AiWorkflowDesigner from '@/components/callcenter/AiWorkflowDesigner/index.vue';
import ConversationRulesForm from '@/components/callcenter/AiWorkflowDesigner/ConversationRulesForm.vue';
import { validationIssues } from './validationIssues';
import { listAiAgents, listAiIntents } from '@/api/callcenter/ai-knowledge';
import type { AiAgentVO, AiIntentVO } from '@/api/callcenter/ai-knowledge/types';
import { listCallQueues } from '@/api/callcenter/call-queue';
import type { CallQueueVO } from '@/api/callcenter/call-queue/types';
import { listFormTemplates } from '@/api/callcenter/form-template';
import type { FormTemplate } from '@/api/callcenter/form-template/types';
import {
  createAiWorkflow,
  deleteAiWorkflow,
  getAiWorkflowDraft,
  listAiWorkflows,
  listAiWorkflowVersions,
  listAiWorkflowMediaOptions,
  publishAiWorkflow,
  saveAiWorkflowDraft,
  setAiWorkflowEnabled,
  updateAiWorkflow,
  validateAiWorkflowDraft
} from '@/api/callcenter/ai-workflow';
import type {
  AiWorkflowDefinition,
  AiWorkflowForm,
  AiWorkflowIntentFallbackPolicy,
  AiWorkflowMediaOptionVO,
  AiWorkflowScene,
  AiWorkflowValidationVO,
  AiWorkflowVersionVO,
  AiWorkflowVO,
  Id
} from '@/api/callcenter/ai-workflow/types';
import AiWorkflowTestDrawer from './AiWorkflowTestDrawer.vue';
import WorkflowLibrary from './WorkflowLibrary.vue';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;
const workflows = ref<AiWorkflowVO[]>([]);
const loading = ref(false);
const saving = ref(false);
const formVisible = ref(false);
const formId = ref<Id>();
const formRef = ref();
const designerVisible = ref(false);
const designerReady = ref(false);
const currentWorkflow = ref<AiWorkflowVO>();
const draft = ref<AiWorkflowVersionVO>();
const versionName = ref('');
const savingDraft = ref(false);
const validating = ref(false);
const publishing = ref(false);
const startingTest = ref(false);
const testVisible = ref(false);
const variablesVisible = ref(false);
const fallbackVisible = ref(false);
const validationVisible = ref(false);
const rulesVisible = ref(false);
const versionsVisible = ref(false);
const versions = ref<AiWorkflowVersionVO[]>([]);
const validation = ref<AiWorkflowValidationVO>({ valid: false, errors: [], warnings: [] });
const designerRef = ref<InstanceType<typeof AiWorkflowDesigner>>();
const validationErrors = computed(() => validationIssues(validation.value.errors || [], graph.value.nodes, validation.value.issues));
const validationWarnings = computed(() => validationIssues(validation.value.warnings || [], graph.value.nodes));
const locateValidationNode = async (id: string) => {
  validationVisible.value = false;
  await nextTick();
  designerRef.value?.focusNode(id);
};
const locateValidationEdge = async (id: string) => {
  validationVisible.value = false;
  await nextTick();
  designerRef.value?.focusEdge(id);
};
const intentOptions = ref<AiIntentVO[]>([]);
const queueOptions = ref<CallQueueVO[]>([]);
const customerTemplates = ref<FormTemplate[]>([]);
const mediaOptions = ref<AiWorkflowMediaOptionVO[]>([]);
const agentOptions = ref<AiAgentVO[]>([]);
const sceneOptions: Array<{ label: string; value: AiWorkflowScene }> = [
  { label: '呼入语音', value: 'VOICE_INBOUND' },
  { label: '外呼语音', value: 'VOICE_OUTBOUND' },
  { label: '在线客服', value: 'ONLINE_CHAT' },
  { label: '通用', value: 'COMMON' }
];
const emptyForm = (): AiWorkflowForm => ({ workflowCode: '', workflowName: '', sceneType: 'VOICE_OUTBOUND', description: '', enabled: true });
const form = ref<AiWorkflowForm>(emptyForm());
const defaultFallbackPolicy = (): AiWorkflowIntentFallbackPolicy => ({
  fallbackMode: 'EDGE',
  fallbackText: '',
  fallbackPrompt: '',
  maxRetries: 2,
  retryLimitAction: 'CONTINUE',
  limitText: '',
  limitQueueCode: '',
  limitExtension: ''
});
const graph = ref<AiWorkflowDefinition>({ schemaVersion: '1.0', variables: [], nodes: [], edges: [], settings: {} });
const setConversationRules = (rules: NonNullable<AiWorkflowDefinition['settings']>['conversationRules']) => {
  graph.value.settings ||= {};
  graph.value.settings.conversationRules = rules;
};
const fallbackPolicy = computed(() => {
  graph.value.settings ||= {};
  graph.value.settings.intentFallback ||= defaultFallbackPolicy();
  return graph.value.settings.intentFallback;
});
const rules = {
  workflowCode: [
    { required: true, message: '请输入编排编码', trigger: 'blur' },
    { pattern: /^[A-Za-z0-9_.-]{1,64}$/, message: '只允许字母、数字、点、下划线和横线', trigger: 'blur' }
  ],
  workflowName: [{ required: true, message: '请输入编排名称', trigger: 'blur' }],
  sceneType: [{ required: true, message: '请选择适用场景', trigger: 'change' }]
};
const load = async () => {
  loading.value = true;
  try {
    workflows.value = (await listAiWorkflows()).data || [];
  } finally {
    loading.value = false;
  }
};
const loadDesignerOptions = async () => {
  const [intentResult, queueResult, agentResult, customerTemplateResult, mediaResult] = await Promise.all([
    listAiIntents(),
    listCallQueues(),
    listAiAgents(),
    listFormTemplates('CUSTOMER'),
    listAiWorkflowMediaOptions()
  ]);
  intentOptions.value = intentResult.data || [];
  queueOptions.value = queueResult.data || [];
  agentOptions.value = (agentResult.data || []).filter((item) => item.enabled !== false);
  customerTemplates.value = (customerTemplateResult.data || []).filter((item) => item.enabled !== false);
  mediaOptions.value = mediaResult.data || [];
};
const openForm = (row?: AiWorkflowVO) => {
  formId.value = row?.id;
  form.value = row
    ? { workflowCode: row.workflowCode, workflowName: row.workflowName, sceneType: row.sceneType, description: row.description, enabled: row.enabled }
    : emptyForm();
  formVisible.value = true;
};
const saveForm = async () => {
  await formRef.value?.validate();
  saving.value = true;
  try {
    formId.value ? await updateAiWorkflow(formId.value, form.value) : await createAiWorkflow(form.value);
    proxy?.$modal.msgSuccess('保存成功');
    formVisible.value = false;
    await load();
  } finally {
    saving.value = false;
  }
};
const toggleEnabled = async (row: AiWorkflowVO) => {
  await setAiWorkflowEnabled(row.id, !row.enabled);
  await load();
};
const remove = async (row: AiWorkflowVO) => {
  await proxy?.$modal.confirm(`确认删除 AI 编排“${row.workflowName}”吗？`);
  await deleteAiWorkflow(row.id);
  proxy?.$modal.msgSuccess('删除成功');
  await load();
};
const createVariableKey = (usedKeys: Set<string>) => {
  let key = '';
  do {
    key = `workflow.custom_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  } while (usedKeys.has(key));
  return key;
};
const ensureVariableKeys = () => {
  graph.value.variables ||= [];
  const usedKeys = new Set(graph.value.variables.map((item) => String(item.key || '').trim()).filter(Boolean));
  graph.value.variables.forEach((item) => {
    if (String(item.key || '').trim()) return;
    item.key = createVariableKey(usedKeys);
    usedKeys.add(item.key);
  });
};
const openDesigner = async (row: AiWorkflowVO) => {
  currentWorkflow.value = row;
  designerVisible.value = true;
  designerReady.value = false;
  const [draftResult] = await Promise.all([getAiWorkflowDraft(row.id), loadDesignerOptions()]);
  draft.value = draftResult.data;
  versionName.value = draft.value.versionName || `v${draft.value.versionNo} 草稿`;
  graph.value = JSON.parse(draft.value.definitionJson);
  graph.value.settings ||= {};
  ensureVariableKeys();
  await nextTick();
  designerReady.value = true;
};
const saveDraft = async (showMessage = true) => {
  if (!currentWorkflow.value) return;
  savingDraft.value = true;
  try {
    await saveAiWorkflowDraft(currentWorkflow.value.id, { versionName: versionName.value, definitionJson: JSON.stringify(graph.value) });
    if (showMessage) proxy?.$modal.msgSuccess('草稿已保存');
  } finally {
    savingDraft.value = false;
  }
};
const validateDraft = async (showResult = true) => {
  if (!currentWorkflow.value) return;
  validating.value = true;
  try {
    await saveDraft(false);
    validation.value = (await validateAiWorkflowDraft(currentWorkflow.value.id)).data;
    designerRef.value?.showValidation(
      validationErrors.value.flatMap((item) => [
        ...item.nodes.map((node) => ({ nodeId: node.id, message: item.message })),
        ...item.edges.map((edge) => ({ edgeId: edge.edgeId, message: `${item.message}；分支编码：${edge.condition || '未配置'}` }))
      ])
    );
    validationVisible.value = showResult || !validation.value.valid;
    return validation.value;
  } finally {
    validating.value = false;
  }
};
const publishDraft = async () => {
  if (!currentWorkflow.value) return;
  const result = await validateDraft(false);
  if (!result?.valid) return;
  await proxy?.$modal.confirm('发布后运行实例将固定使用该版本，确认发布吗？');
  publishing.value = true;
  try {
    await publishAiWorkflow(currentWorkflow.value.id);
    proxy?.$modal.msgSuccess('发布成功');
    designerVisible.value = false;
    await load();
  } finally {
    publishing.value = false;
  }
};
const openTest = async () => {
  if (!currentWorkflow.value) return;
  startingTest.value = true;
  try {
    const result = await validateDraft(false);
    if (!result?.valid) return;
    testVisible.value = true;
  } finally {
    startingTest.value = false;
  }
};
const openVersions = async (row: AiWorkflowVO) => {
  versions.value = (await listAiWorkflowVersions(row.id)).data || [];
  versionsVisible.value = true;
};
const addVariable = () => {
  const usedKeys = new Set(graph.value.variables.map((item) => String(item.key || '').trim()).filter(Boolean));
  graph.value.variables.push({
    key: createVariableKey(usedKeys),
    label: '',
    description: '',
    type: 'STRING',
    required: false,
    defaultValue: '',
    missingPolicy: 'USE_DEFAULT'
  });
};
const openVariables = (createIfEmpty = false) => {
  ensureVariableKeys();
  if (createIfEmpty && !graph.value.variables.length) addVariable();
  variablesVisible.value = true;
};
const openFallbackSettings = () => {
  graph.value.settings ||= {};
  graph.value.settings.intentFallback ||= defaultFallbackPolicy();
  fallbackVisible.value = true;
};
const versionLabel = (status: string) => ({ DRAFT: '草稿', PUBLISHED: '已发布', ARCHIVED: '已归档' })[status] || status;
const versionTag = (status: string) => (status === 'PUBLISHED' ? 'success' : status === 'DRAFT' ? 'warning' : 'info');
onMounted(load);
</script>

<style scoped>
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 18px;
}
.page-header h2 {
  margin: 0 0 6px;
  color: #16243a;
  font-size: 20px;
}
.page-header p {
  margin: 0;
  color: #7b8798;
  font-size: 13px;
}
.designer-header {
  min-height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 18px;
  box-sizing: border-box;
  flex-wrap: wrap;
  border-bottom: 1px solid #e5e7eb;
}
.designer-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1 1 220px;
}
.designer-meta strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 280px;
}
.workflow-code {
  color: #94a3b8;
  font-size: 12px;
}
.designer-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.designer-actions :deep(.el-button + .el-button) {
  margin-left: 0;
}
.draft-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  border-left: 1px solid #e5e7eb;
  padding-left: 12px;
}
.version-input {
  width: 148px;
}
.settings-arrow {
  margin-left: 6px;
}
@media (max-width: 1280px) {
  .designer-meta strong {
    max-width: 200px;
  }
  .workflow-code {
    display: none;
  }
  .version-input {
    width: 120px;
  }
}
@media (max-width: 900px) {
  .designer-actions {
    justify-content: flex-start;
  }
  .draft-actions {
    padding-left: 0;
    border-left: none;
  }
}
.validation-list {
  text-align: left;
  max-height: 45vh;
  overflow: auto;
  overflow-wrap: anywhere;
}
.validation-issue {
  padding: 8px 0;
  border-bottom: 1px solid #edf1f6;
}
.validation-list p {
  margin: 6px 0;
}
.error-item {
  color: #dc2626;
}
.warning-item {
  color: #d97706;
}
</style>
