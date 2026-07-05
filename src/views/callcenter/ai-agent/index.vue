<template>
  <div class="p-2">
    <el-card shadow="never"
      ><div class="mb-3"><el-button type="primary" plain icon="Plus" @click="edit()">新增 AI 助手</el-button></div>
      <el-table :data="agents"
        ><el-table-column label="编码" prop="agentCode" min-width="130" /><el-table-column
          label="名称"
          prop="agentName"
          min-width="150"
        /><el-table-column label="Chat模型" prop="chatModelName" min-width="160" /><el-table-column label="绑定知识库" min-width="230"
          ><template #default="{ row }"
            ><el-tag v-for="name in row.knowledgeBaseNames" :key="name" class="mr-1">{{ name }}</el-tag
            ><span v-if="!row.knowledgeBaseNames.length">未绑定</span></template
          ></el-table-column
        ><el-table-column label="知识库回答" width="130"
          ><template #default="{ row }">{{ row.retrievalMode === 'DIRECT_RETRIEVAL' ? '极速原文' : '智能混合' }}</template></el-table-column
        ><el-table-column label="未命中策略" width="130"
          ><template #default="{ row }">{{ row.retrievalFailurePolicy === 'STRICT' ? '严格拒答' : '模型兜底' }}</template></el-table-column
        ><el-table-column label="系统助手" width="100"
          ><template #default="{ row }"
            ><el-tag v-if="row.systemAssistant" type="success">顶部助手</el-tag><span v-else>-</span></template
          ></el-table-column
        ><el-table-column label="状态" width="90"
          ><template #default="{ row }"
            ><el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '停用' }}</el-tag></template
          ></el-table-column
        ><el-table-column label="操作" width="220" fixed="right"
          ><template #default="{ row }"
            ><el-button link type="success" @click="openTest(row)">测试</el-button><el-button link type="primary" @click="edit(row)">修改</el-button
            ><el-button link type="primary" @click="toggle(row)">{{ row.enabled ? '停用' : '启用' }}</el-button
            ><el-button link type="danger" @click="remove(row)">删除</el-button></template
          ></el-table-column
        ></el-table
      >
    </el-card>
    <el-drawer v-model="drawer" :title="form.id ? '修改 AI 助手' : '新增 AI 助手'" size="720px"
      ><el-form :model="form" label-width="120px"
        ><el-row :gutter="16"
          ><el-col :span="12"
            ><el-form-item label="助手编码"><el-input v-model="form.agentCode" /></el-form-item></el-col
          ><el-col :span="12"
            ><el-form-item label="助手名称"><el-input v-model="form.agentName" /></el-form-item></el-col></el-row
        ><el-form-item label="Chat模型"
          ><el-select v-model="form.chatModelId" style="width: 100%"
            ><el-option v-for="m in chatModels" :key="m.id" :label="`${m.modelName}（${m.providerName}）`" :value="m.id" /></el-select></el-form-item
        ><el-form-item label="绑定知识库"
          ><el-select v-model="form.knowledgeBaseIds" multiple style="width: 100%"
            ><el-option
              v-for="k in bases"
              :key="k.id"
              :label="`${k.knowledgeName}（${k.embeddingModelName || ''}）`"
              :value="k.id" /></el-select></el-form-item
        ><el-alert
          class="mb-4"
          type="info"
          :closable="false"
          title="同一助手只能绑定使用相同 Embedding 模型的知识库；选择顺序同时作为冲突时的优先级。" /><el-form-item label="系统提示词"
          ><el-input v-model="form.systemPrompt" type="textarea" :rows="5" /></el-form-item
        ><el-form-item label="开场白"
          ><el-input v-model="form.welcomeMessage" type="textarea" :rows="3" placeholder="创建新对话时，作为 AI 的第一条消息" />
          <div class="mt-1 text-xs text-gray-400">开场白不参与知识检索，后续电话 AI 将复用该内容。</div></el-form-item
        ><el-form-item label="知识库回答"
          ><el-radio-group v-model="form.retrievalMode"
            ><el-radio value="RAG">智能混合：FAQ 直返，文档由模型整理</el-radio
            ><el-radio value="DIRECT_RETRIEVAL">极速原文：直接返回最高相似度切片</el-radio></el-radio-group
          >
          <div class="text-gray-400 text-xs mt-1">
            普通文档切片包含上下文，建议使用智能混合；极速原文适合内容已经整理成独立答案的知识库。
          </div></el-form-item
        ><el-row :gutter="16"
          ><el-col :span="12"
            ><el-form-item label="未命中处理"
              ><el-select v-model="form.retrievalFailurePolicy" style="width: 100%"
                ><el-option label="STRICT：没有依据时拒答" value="STRICT" /><el-option
                  label="FALLBACK：允许模型通用回答"
                  value="FALLBACK_MODEL" /></el-select></el-form-item></el-col
          ><el-col :span="12"
            ><el-form-item label="Top K"
              ><el-input-number v-model="form.topK" :min="1" :max="20" style="width: 100%" /></el-form-item></el-col></el-row
        ><el-form-item label="文档阈值"><el-slider v-model="form.scoreThreshold" :min="0" :max="1" :step="0.01" show-input /></el-form-item
        ><el-form-item label="FAQ阈值"><el-slider v-model="form.faqScoreThreshold" :min="0" :max="1" :step="0.01" show-input /></el-form-item
        ><el-row :gutter="16"
          ><el-col :span="8"
            ><el-form-item label="温度"><el-input-number v-model="form.temperature" :min="0" :max="2" :step="0.1" /></el-form-item></el-col
          ><el-col :span="8"
            ><el-form-item label="输出Token"><el-input-number v-model="form.maxOutputTokens" :min="1" /></el-form-item></el-col
          ><el-col :span="8"
            ><el-form-item label="历史消息数"><el-input-number v-model="form.historyMessageLimit" :min="0" /></el-form-item></el-col></el-row
        ><el-form-item label="说明"><el-input v-model="form.description" type="textarea" /></el-form-item
        ><el-form-item label="系统内部助手"
          ><el-switch v-model="form.systemAssistant" active-text="用于系统顶部 AI 助手" />
          <div class="text-gray-400 text-xs mt-1">每个租户只能指定一个；IVR 等业务助手不需要开启。</div></el-form-item
        ><el-form-item label="启用"><el-switch v-model="form.enabled" /></el-form-item></el-form
      ><template #footer
        ><el-button @click="drawer = false">取消</el-button><el-button type="primary" @click="save">保存</el-button></template
      ></el-drawer
    >
    <AiAgentTestDialog v-model="testVisible" :agent="testAgent" @saved="testSaved" />
  </div>
</template>
<script setup lang="ts">
import {
  createAiAgent,
  deleteAiAgent,
  listAiAgents,
  listAiModels,
  listKnowledgeBases,
  setAiAgentEnabled,
  updateAiAgent
} from '@/api/callcenter/ai-knowledge';
import type { AiAgentForm, AiAgentVO, AiModelVO, KnowledgeBaseVO } from '@/api/callcenter/ai-knowledge/types';
import AiAgentTestDialog from './AiAgentTestDialog.vue';
const { proxy } = getCurrentInstance() as ComponentInternalInstance;
const agents = ref<AiAgentVO[]>([]),
  chatModels = ref<AiModelVO[]>([]),
  bases = ref<KnowledgeBaseVO[]>([]),
  drawer = ref(false);
const testVisible = ref(false);
const testAgent = ref<AiAgentVO>();
const defaults = (): AiAgentForm => ({
  agentCode: '',
  agentName: '',
  description: '',
  chatModelId: '',
  systemPrompt: '你是 CallNexus 的业务助手。请依据知识库准确回答，不要编造。',
  welcomeMessage: '您好，我是 CallNexus AI 助手，请问有什么可以帮您？',
  retrievalMode: 'RAG',
  retrievalFailurePolicy: 'STRICT',
  topK: 5,
  scoreThreshold: 0.5,
  faqScoreThreshold: 0.8,
  temperature: 0.2,
  maxOutputTokens: 2048,
  historyMessageLimit: 10,
  systemAssistant: false,
  enabled: true,
  knowledgeBaseIds: []
});
const form = ref(defaults());
const numericValue = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const load = async () => {
  const [a, m, k] = await Promise.all([listAiAgents(), listAiModels('CHAT'), listKnowledgeBases()]);
  agents.value = a.data || [];
  chatModels.value = m.data || [];
  bases.value = (k.data || []).filter((item) => item.enabled);
};
const edit = (row?: AiAgentVO) => {
  form.value = row
    ? {
        ...row,
        scoreThreshold: numericValue(row.scoreThreshold, 0.5),
        faqScoreThreshold: numericValue(row.faqScoreThreshold, 0.8),
        temperature: numericValue(row.temperature, 0.2),
        knowledgeBaseIds: [...row.knowledgeBaseIds]
      }
    : defaults();
  drawer.value = true;
};
const openTest = (row: AiAgentVO) => {
  testAgent.value = row;
  testVisible.value = true;
};
const testSaved = async (savedAgent: AiAgentVO) => {
  testAgent.value = savedAgent;
  await load();
};
const save = async () => {
  const payload: AiAgentForm = {
    ...form.value,
    scoreThreshold: numericValue(form.value.scoreThreshold, 0.5),
    faqScoreThreshold: numericValue(form.value.faqScoreThreshold, 0.8),
    temperature: numericValue(form.value.temperature, 0.2)
  };
  payload.id ? await updateAiAgent(payload.id, payload) : await createAiAgent(payload);
  drawer.value = false;
  proxy?.$modal.msgSuccess('保存成功');
  await load();
};
const toggle = async (row: AiAgentVO) => {
  await setAiAgentEnabled(row.id, !row.enabled);
  await load();
};
const remove = async (row: AiAgentVO) => {
  await proxy?.$modal.confirm(`确认删除助手“${row.agentName}”吗？`);
  await deleteAiAgent(row.id);
  await load();
};
onMounted(load);
</script>
