<template>
  <el-drawer
    :model-value="modelValue"
    size="90%"
    destroy-on-close
    append-to-body
    class="ai-agent-test-drawer"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <template #header>
      <div class="test-header">
        <div>
          <b>{{ agent?.agentName }}</b
          ><span>AI 助手测试</span>
        </div>
        <el-tag :type="agent?.enabled ? 'success' : 'info'">{{ agent?.enabled ? '已启用' : '已停用' }}</el-tag>
      </div>
    </template>
    <div v-if="agent" class="test-layout">
      <aside class="config-panel">
        <div class="panel-title">助手配置</div>
        <el-form :model="form" label-position="top">
          <el-form-item label="Chat 模型"><el-input :model-value="agent.chatModelName" disabled /></el-form-item>
          <el-form-item label="绑定知识库">
            <div class="tag-list">
              <el-tag v-for="name in agent.knowledgeBaseNames" :key="name">{{ name }}</el-tag
              ><span v-if="!agent.knowledgeBaseNames.length">未绑定</span>
            </div>
          </el-form-item>
          <el-form-item label="系统提示词"><el-input v-model="form.systemPrompt" type="textarea" :rows="5" /></el-form-item>
          <el-form-item label="开场白"><el-input v-model="form.welcomeMessage" type="textarea" :rows="3" /></el-form-item>
          <el-form-item label="知识库回答">
            <el-radio-group v-model="form.retrievalMode"
              ><el-radio value="RAG">智能混合</el-radio><el-radio value="DIRECT_RETRIEVAL">极速原文</el-radio></el-radio-group
            >
          </el-form-item>
          <el-row :gutter="12">
            <el-col :span="12"
              ><el-form-item label="Top K"><el-input-number v-model="form.topK" :min="1" :max="20" /></el-form-item
            ></el-col>
            <el-col :span="12"
              ><el-form-item label="历史消息数"><el-input-number v-model="form.historyMessageLimit" :min="0" /></el-form-item
            ></el-col>
          </el-row>
          <el-form-item label="文档阈值"><el-slider v-model="form.scoreThreshold" :min="0" :max="1" :step="0.01" show-input /></el-form-item>
          <el-form-item label="FAQ 阈值"><el-slider v-model="form.faqScoreThreshold" :min="0" :max="1" :step="0.01" show-input /></el-form-item>
          <el-row :gutter="12">
            <el-col :span="12"
              ><el-form-item label="温度"><el-input-number v-model="form.temperature" :min="0" :max="2" :step="0.1" /></el-form-item
            ></el-col>
            <el-col :span="12"
              ><el-form-item label="输出 Token"><el-input-number v-model="form.maxOutputTokens" :min="1" /></el-form-item
            ></el-col>
          </el-row>
          <el-button type="primary" class="save-button" :loading="saving" @click="saveAndApply">保存配置并新建测试会话</el-button>
        </el-form>
      </aside>
      <main class="chat-panel">
        <div class="panel-title">对话测试</div>
        <AiConversationPanel :key="chatKey" :agent-id="agent.id" :agent-name="agent.agentName" />
      </main>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { listAiAgents, updateAiAgent } from '@/api/callcenter/ai-knowledge';
import type { AiAgentForm, AiAgentVO } from '@/api/callcenter/ai-knowledge/types';
import AiConversationPanel from '@/components/callcenter/AiConversationPanel.vue';

const props = defineProps<{ modelValue: boolean; agent?: AiAgentVO }>();
const emit = defineEmits<{ (event: 'update:modelValue', value: boolean): void; (event: 'saved', value: AiAgentVO): void }>();
const { proxy } = getCurrentInstance() as ComponentInternalInstance;
const form = ref<AiAgentForm>({} as AiAgentForm);
const saving = ref(false);
const chatKey = ref(0);

const numericValue = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const resetForm = (agent: AiAgentVO) => {
  form.value = {
    ...agent,
    topK: numericValue(agent.topK, 5),
    scoreThreshold: numericValue(agent.scoreThreshold, 0.5),
    faqScoreThreshold: numericValue(agent.faqScoreThreshold, 0.8),
    temperature: numericValue(agent.temperature, 0.2),
    maxOutputTokens: numericValue(agent.maxOutputTokens, 2048),
    historyMessageLimit: numericValue(agent.historyMessageLimit, 10),
    knowledgeBaseIds: [...(agent.knowledgeBaseIds || [])]
  };
};

watch(
  [() => props.agent, () => props.modelValue],
  ([agent, visible]) => {
    if (agent && visible) resetForm(agent);
  },
  { immediate: true }
);

const saveAndApply = async () => {
  if (!props.agent) return;
  saving.value = true;
  try {
    await updateAiAgent(props.agent.id, form.value);
    const updated = (await listAiAgents()).data?.find((item) => String(item.id) === String(props.agent?.id));
    if (updated) {
      resetForm(updated);
      emit('saved', updated);
    }
    chatKey.value += 1;
    proxy?.$modal.msgSuccess('配置已保存，已新建测试会话');
  } finally {
    saving.value = false;
  }
};
</script>

<style scoped>
:global(.ai-agent-test-drawer .el-drawer__header) {
  margin-right: 0;
  margin-bottom: 0;
  padding: 20px 24px 14px;
  border-bottom: 1px solid #e5e7eb;
}
:global(.ai-agent-test-drawer .el-drawer__body) {
  min-height: 0;
  padding: 0;
  overflow: hidden;
}
.test-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-right: 28px;
}
.test-header div {
  display: flex;
  gap: 12px;
  align-items: baseline;
}
.test-header b {
  font-size: 20px;
}
.test-header span {
  color: #64748b;
}
.test-layout {
  height: 100%;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(390px, 34%) 1fr;
  background: #f4f6f9;
  border-top: 1px solid #e5e7eb;
}
.config-panel,
.chat-panel {
  min-height: 0;
  background: #fff;
  padding: 22px 26px;
}
.config-panel {
  overflow-y: auto;
  border-right: 1px solid #e5e7eb;
}
.chat-panel {
  display: flex;
  flex-direction: column;
}
.chat-panel :deep(.assistant-shell) {
  flex: 1;
}
.panel-title {
  font-size: 17px;
  font-weight: 600;
  color: #053b70;
  margin-bottom: 18px;
}
.tag-list {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.save-button {
  width: 100%;
  margin-top: 6px;
}
@media (max-width: 1000px) {
  .test-layout {
    grid-template-columns: 1fr;
    overflow: auto;
  }
  .config-panel {
    border-right: 0;
    border-bottom: 1px solid #e5e7eb;
  }
  .chat-panel {
    min-height: 720px;
  }
}
</style>
