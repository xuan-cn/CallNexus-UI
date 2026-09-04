<template>
  <div class="p-2">
    <el-card shadow="never">
      <div class="page-header">
        <div>
          <h2>AI 编排</h2>
          <p>配置 AI 助手的多轮对话、意图分支和业务动作。已发布版本不会被草稿修改影响。</p>
        </div>
        <el-button v-hasPermi="['callcenter:ai-workflow:create']" type="primary" icon="Plus" @click="openForm()">新增编排</el-button>
      </div>
      <el-table v-loading="loading" :data="workflows">
        <el-table-column label="编排" min-width="220">
          <template #default="{ row }"
            ><div class="workflow-name">{{ row.workflowName }}</div>
            <div class="workflow-code">{{ row.workflowCode }}</div></template
          >
        </el-table-column>
        <el-table-column label="场景" width="125"
          ><template #default="{ row }"
            ><el-tag effect="plain">{{ sceneLabel(row.sceneType) }}</el-tag></template
          ></el-table-column
        >
        <el-table-column label="草稿" width="90"
          ><template #default="{ row }">{{ row.draftVersionNo ? `v${row.draftVersionNo}` : '-' }}</template></el-table-column
        >
        <el-table-column label="已发布" width="100"
          ><template #default="{ row }"
            ><el-tag v-if="row.publishedVersionNo" type="success">v{{ row.publishedVersionNo }}</el-tag
            ><span v-else>未发布</span></template
          ></el-table-column
        >
        <el-table-column label="助手绑定" prop="bindingCount" width="95" />
        <el-table-column label="状态" width="85"
          ><template #default="{ row }"
            ><el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '停用' }}</el-tag></template
          ></el-table-column
        >
        <el-table-column label="更新时间" prop="updateTime" min-width="165" />
        <el-table-column label="操作" width="310" fixed="right">
          <template #default="{ row }">
            <el-button v-hasPermi="['callcenter:ai-workflow:edit']" link type="primary" @click="openDesigner(row)">设计</el-button>
            <el-button v-hasPermi="['callcenter:ai-workflow:edit']" link type="primary" @click="openForm(row)">修改</el-button>
            <el-button link @click="openVersions(row)">版本</el-button>
            <el-button v-hasPermi="['callcenter:ai-workflow:edit']" link :type="row.enabled ? 'warning' : 'success'" @click="toggleEnabled(row)">{{
              row.enabled ? '停用' : '启用'
            }}</el-button>
            <el-button v-hasPermi="['callcenter:ai-workflow:delete']" link type="danger" @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="formVisible" :title="formId ? '修改 AI 编排' : '新增 AI 编排'" width="640px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="编排编码" prop="workflowCode"><el-input v-model="form.workflowCode" placeholder="例如 SALES_OUTBOUND" /></el-form-item>
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

    <el-drawer v-model="designerVisible" size="96%" :with-header="false" destroy-on-close @closed="designerReady = false">
      <div class="designer-header">
        <div>
          <strong>{{ currentWorkflow?.workflowName }}</strong
          ><span>{{ currentWorkflow?.workflowCode }}</span
          ><el-tag type="warning">草稿 v{{ draft?.versionNo }}</el-tag>
        </div>
        <div class="designer-actions">
          <el-input v-model="versionName" placeholder="版本说明" style="width: 190px" />
          <el-button @click="openVariables()">变量</el-button>
          <el-button :loading="savingDraft" @click="saveDraft">保存草稿</el-button>
          <el-button :loading="validating" @click="() => validateDraft()">校验</el-button>
          <el-button v-hasPermi="['callcenter:ai-workflow:test']" type="primary" plain :loading="startingTest" @click="openTest">测试流程</el-button>
          <el-button v-hasPermi="['callcenter:ai-workflow:publish']" type="success" :loading="publishing" @click="publishDraft">发布</el-button>
          <el-button @click="designerVisible = false">关闭</el-button>
        </div>
      </div>
      <AiWorkflowDesigner
        v-if="designerReady"
        v-model="graph"
        :intent-options="intentOptions"
        :queue-options="queueOptions"
        :customer-templates="customerTemplates"
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

    <el-dialog v-model="validationVisible" title="发布校验结果" width="680px">
      <el-result :icon="validation.valid ? 'success' : 'error'" :title="validation.valid ? '校验通过' : '校验失败'">
        <template #sub-title
          ><div class="validation-list">
            <p v-for="item in validation.errors" :key="item" class="error-item">{{ item }}</p>
            <p v-for="item in validation.warnings" :key="item" class="warning-item">{{ item }}</p>
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
import AiWorkflowDesigner from '@/components/callcenter/AiWorkflowDesigner/index.vue';
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
  publishAiWorkflow,
  saveAiWorkflowDraft,
  setAiWorkflowEnabled,
  updateAiWorkflow,
  validateAiWorkflowDraft
} from '@/api/callcenter/ai-workflow';
import type {
  AiWorkflowDefinition,
  AiWorkflowForm,
  AiWorkflowScene,
  AiWorkflowValidationVO,
  AiWorkflowVersionVO,
  AiWorkflowVO,
  Id
} from '@/api/callcenter/ai-workflow/types';
import AiWorkflowTestDrawer from './AiWorkflowTestDrawer.vue';

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
const validationVisible = ref(false);
const versionsVisible = ref(false);
const versions = ref<AiWorkflowVersionVO[]>([]);
const validation = ref<AiWorkflowValidationVO>({ valid: false, errors: [], warnings: [] });
const intentOptions = ref<AiIntentVO[]>([]);
const queueOptions = ref<CallQueueVO[]>([]);
const customerTemplates = ref<FormTemplate[]>([]);
const agentOptions = ref<AiAgentVO[]>([]);
const sceneOptions: Array<{ label: string; value: AiWorkflowScene }> = [
  { label: '呼入语音', value: 'VOICE_INBOUND' },
  { label: '外呼语音', value: 'VOICE_OUTBOUND' },
  { label: '在线客服', value: 'ONLINE_CHAT' },
  { label: '通用', value: 'COMMON' }
];
const emptyForm = (): AiWorkflowForm => ({ workflowCode: '', workflowName: '', sceneType: 'VOICE_OUTBOUND', description: '', enabled: true });
const form = ref<AiWorkflowForm>(emptyForm());
const graph = ref<AiWorkflowDefinition>({ schemaVersion: '1.0', variables: [], nodes: [], edges: [] });
const rules = {
  workflowCode: [
    { required: true, message: '请输入编排编码', trigger: 'blur' },
    { pattern: /^[A-Za-z0-9_.-]{1,64}$/, message: '只允许字母、数字、点、下划线和横线', trigger: 'blur' }
  ],
  workflowName: [{ required: true, message: '请输入编排名称', trigger: 'blur' }],
  sceneType: [{ required: true, message: '请选择适用场景', trigger: 'change' }]
};
const sceneLabel = (scene: AiWorkflowScene) => sceneOptions.find((item) => item.value === scene)?.label || scene;
const load = async () => {
  loading.value = true;
  try {
    workflows.value = (await listAiWorkflows()).data || [];
  } finally {
    loading.value = false;
  }
};
const loadDesignerOptions = async () => {
  const [intentResult, queueResult, agentResult, customerTemplateResult] = await Promise.all([
    listAiIntents(),
    listCallQueues(),
    listAiAgents(),
    listFormTemplates('CUSTOMER')
  ]);
  intentOptions.value = intentResult.data || [];
  queueOptions.value = queueResult.data || [];
  agentOptions.value = (agentResult.data || []).filter((item) => item.enabled !== false);
  customerTemplates.value = (customerTemplateResult.data || []).filter((item) => item.enabled !== false);
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
.workflow-name {
  color: #1f2937;
  font-weight: 600;
}
.workflow-code {
  margin-top: 4px;
  color: #94a3b8;
  font-size: 12px;
}
.designer-header {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 0 18px;
  border-bottom: 1px solid #e5e7eb;
}
.designer-header > div:first-child {
  display: flex;
  align-items: center;
  gap: 10px;
}
.designer-header span {
  color: #94a3b8;
  font-size: 12px;
}
.designer-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.validation-list {
  text-align: left;
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
