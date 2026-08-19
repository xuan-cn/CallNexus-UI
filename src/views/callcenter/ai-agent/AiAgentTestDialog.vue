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
        <div class="test-header-copy">
          <span class="test-eyebrow">AI 助手测试</span>
          <strong>{{ agent?.agentName }}</strong>
        </div>
        <el-tag :type="agent?.enabled ? 'success' : 'info'" effect="light" round>
          {{ agent?.enabled ? '已启用' : '已停用' }}
        </el-tag>
      </div>
    </template>
    <div v-if="agent" class="test-layout">
      <aside class="config-panel">
        <div class="panel-head">
          <div>
            <strong>助手配置</strong>
            <small>调整后可保存并新建测试会话</small>
          </div>
        </div>

        <div class="config-scroll">
          <el-form :model="form" label-position="top" class="config-form">
            <section class="config-block">
              <div class="block-title">基础</div>
              <el-form-item label="Chat 模型">
                <el-input :model-value="agent.chatModelName" disabled />
              </el-form-item>
              <el-form-item label="绑定知识库">
                <div class="tag-list">
                  <el-tag v-for="name in agent.knowledgeBaseNames" :key="name" effect="plain" round>{{ name }}</el-tag>
                  <span v-if="!agent.knowledgeBaseNames.length" class="muted">未绑定</span>
                </div>
              </el-form-item>
            </section>

            <section class="config-block">
              <div class="block-title">提示词</div>
              <el-form-item label="系统提示词">
                <el-input v-model="form.systemPrompt" type="textarea" :rows="8" />
              </el-form-item>
              <el-form-item label="开场白">
                <el-input v-model="form.welcomeMessage" type="textarea" :rows="3" />
              </el-form-item>
            </section>

            <section class="config-block">
              <div class="block-title">检索与生成</div>
              <el-form-item label="知识库回答">
                <el-radio-group v-model="form.retrievalMode">
                  <el-radio value="RAG">智能混合</el-radio>
                  <el-radio value="DIRECT_RETRIEVAL">极速原文</el-radio>
                </el-radio-group>
              </el-form-item>
              <el-row :gutter="12">
                <el-col :span="12">
                  <el-form-item label="Top K"><el-input-number v-model="form.topK" :min="1" :max="20" style="width: 100%" /></el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="历史消息数"><el-input-number v-model="form.historyMessageLimit" :min="0" style="width: 100%" /></el-form-item>
                </el-col>
              </el-row>
              <el-form-item label="文档阈值"><el-slider v-model="form.scoreThreshold" :min="0" :max="1" :step="0.01" show-input /></el-form-item>
              <el-form-item label="FAQ 阈值"><el-slider v-model="form.faqScoreThreshold" :min="0" :max="1" :step="0.01" show-input /></el-form-item>
              <el-row :gutter="12">
                <el-col :span="12">
                  <el-form-item label="温度"><el-input-number v-model="form.temperature" :min="0" :max="2" :step="0.1" style="width: 100%" /></el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="输出 Token"><el-input-number v-model="form.maxOutputTokens" :min="1" style="width: 100%" /></el-form-item>
                </el-col>
              </el-row>
            </section>
          </el-form>
        </div>

        <div class="save-bar">
          <el-button type="primary" class="save-button" :loading="saving" @click="saveAndApply">保存配置并新建测试会话</el-button>
        </div>
      </aside>

      <main class="chat-panel">
        <div class="panel-head">
          <div>
            <strong>对话测试</strong>
            <small>实时验证回答效果与知识来源</small>
          </div>
        </div>
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

<style scoped lang="scss">
:global(.ai-agent-test-drawer.el-drawer) {
  display: flex;
  flex-direction: column;
}

:global(.ai-agent-test-drawer .el-drawer__header) {
  flex: none;
  margin-right: 0;
  margin-bottom: 0;
  padding: 18px 24px 16px;
  border-bottom: 1px solid #e8eef6;
  background: linear-gradient(180deg, #ffffff, #f7fbff);
}

:global(.ai-agent-test-drawer .el-drawer__body) {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  height: auto;
  padding: 0;
  overflow: hidden;
  background: #eef3f9;
}

.test-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-right: 28px;
}

.test-header-copy {
  display: grid;
  gap: 4px;
  min-width: 0;

  strong {
    overflow: hidden;
    color: #15233d;
    font-size: 20px;
    line-height: 1.25;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.test-eyebrow {
  color: #6b7c93;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.test-layout {
  display: grid;
  flex: 1;
  grid-template-columns: minmax(380px, 36%) 1fr;
  grid-template-rows: minmax(0, 1fr);
  align-items: stretch;
  gap: 12px;
  min-height: 0;
  height: 100%;
  padding: 12px;
}

.config-panel,
.chat-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  border: 1px solid #dce8f6;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 10px 24px rgba(28, 48, 78, 0.05);
}

.config-panel {
  padding: 16px 16px 0;
}

.chat-panel {
  padding: 16px;
}

.panel-head {
  display: flex;
  flex: none;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 12px;

  strong {
    display: block;
    color: #15233d;
    font-size: 16px;
  }

  small {
    color: #7b8798;
    font-size: 12px;
  }
}

.config-scroll {
  flex: 1;
  min-height: 0;
  padding-right: 4px;
  overflow: auto;
}

.config-form {
  display: grid;
  gap: 12px;
  padding-bottom: 8px;
}

.config-block {
  padding: 12px 12px 2px;
  border: 1px solid #e8eef6;
  border-radius: 12px;
  background: linear-gradient(180deg, #fbfcff, #f7faff);
}

.block-title {
  margin-bottom: 8px;
  color: #3f5270;
  font-size: 13px;
  font-weight: 700;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.muted {
  color: #8b97aa;
  font-size: 13px;
}

.save-bar {
  flex: none;
  padding: 12px 0 16px;
  border-top: 1px solid #eef3f8;
  background: #fff;
}

.save-button {
  width: 100%;
}

.chat-panel :deep(.assistant-shell) {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  height: 100%;
}

@media (max-width: 1100px) {
  .test-layout {
    grid-template-columns: 1fr;
    grid-template-rows: auto minmax(560px, 1fr);
    overflow: auto;
  }

  .config-panel,
  .chat-panel {
    height: auto;
  }

  .chat-panel {
    min-height: 560px;
  }
}
</style>
