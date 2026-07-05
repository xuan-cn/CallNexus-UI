<template>
  <el-tooltip content="AI 助手" placement="bottom">
    <div class="right-menu-item hover-effect ai-entry" @click="open">
      <el-icon><ChatDotRound /></el-icon>
    </div>
  </el-tooltip>
  <el-drawer v-model="visible" title="CallNexus AI 助手" size="520px" append-to-body>
    <div class="drawer-shell">
      <el-select v-model="agentId" placeholder="选择 AI 助手" filterable>
        <el-option v-for="item in agents" :key="item.id" :label="item.agentName" :value="item.id" />
      </el-select>
      <AiConversationPanel
        v-if="visible && activeAgent"
        :key="String(activeAgent.id)"
        :agent-id="activeAgent.id"
        :agent-name="activeAgent.agentName"
      />
      <el-empty v-else description="请先在 AI 助手中指定系统内部助手" />
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { listAiAgents } from '@/api/callcenter/ai-knowledge';
import type { AiAgentVO, Id } from '@/api/callcenter/ai-knowledge/types';
import AiConversationPanel from '@/components/callcenter/AiConversationPanel.vue';

const visible = ref(false);
const agents = ref<AiAgentVO[]>([]);
const agentId = ref<Id>();
const activeAgent = computed(() => agents.value.find((item) => String(item.id) === String(agentId.value)));

const open = async () => {
  visible.value = true;
  agents.value = (await listAiAgents()).data?.filter((item) => item.enabled && item.systemAssistant) || [];
  if (!agents.value.some((item) => String(item.id) === String(agentId.value))) {
    agentId.value = agents.value[0]?.id;
  }
};
</script>

<style scoped>
.ai-entry {
  font-size: 20px;
  display: flex;
  align-items: center;
}
.drawer-shell {
  height: calc(100vh - 105px);
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.drawer-shell :deep(.assistant-shell) {
  flex: 1;
}
</style>
