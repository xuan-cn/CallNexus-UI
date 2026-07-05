<template>
  <el-select :model-value="modelValue" filterable style="width: 100%" placeholder="请选择已启用的 AI 助手" @change="emit('update:modelValue', $event)">
    <el-option v-for="agent in aiAgentOptions" :key="agent.id" :label="agent.agentName" :value="agent.id" />
  </el-select>
</template>

<script setup lang="ts">
import type { AiAgentVO } from '@/api/callcenter/ai-knowledge/types';

defineProps<{ modelValue?: string | number; aiAgentOptions?: AiAgentVO[] }>();
const emit = defineEmits<{ (e: 'update:modelValue', value: string | number): void }>();
</script>
