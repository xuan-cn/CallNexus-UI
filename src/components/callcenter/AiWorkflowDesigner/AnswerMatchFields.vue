<template>
  <el-select :model-value="modelValue.matchMode || 'EXACT'" aria-label="匹配方式" @update:model-value="set('matchMode', $event)">
    <el-option label="整句匹配" value="EXACT" />
    <el-option label="关键词匹配" value="KEYWORD" />
    <el-option label="意图匹配" value="INTENT" />
  </el-select>
  <template v-if="modelValue.matchMode === 'INTENT'">
    <el-select
      :model-value="modelValue.intentCodes || []"
      multiple
      filterable
      collapse-tags
      collapse-tags-tooltip
      placeholder="选择已有意图"
      @update:model-value="set('intentCodes', $event)"
    >
      <el-option v-for="intent in intentOptions" :key="intent.intentCode" :label="intent.intentName" :value="intent.intentCode" />
    </el-select>
  </template>
  <template v-else>
    <el-input
      :model-value="modelValue.answers"
      type="textarea"
      :rows="2"
      :placeholder="modelValue.matchMode === 'KEYWORD' ? '关键词，每行一条' : '明确回答示例，每行一条'"
      @update:model-value="set('answers', $event)"
    />
    <template v-if="modelValue.matchMode === 'KEYWORD'">
      <el-select :model-value="modelValue.keywordMode || 'ANY'" @update:model-value="set('keywordMode', $event)">
        <el-option label="任一关键词命中" value="ANY" /><el-option label="全部关键词命中" value="ALL" />
      </el-select>
      <el-input
        :model-value="modelValue.excludedKeywords"
        type="textarea"
        :rows="2"
        placeholder="排除词，每行一条；包含任一排除词不命中"
        @update:model-value="set('excludedKeywords', $event)"
      />
      <span class="keyword-warning">关键词是包含匹配，不理解否定或疑问，请配置排除词；冲突时交由 AI 或澄清。</span>
    </template>
  </template>
</template>
<script setup lang="ts">
import type { AiIntentVO } from '@/api/callcenter/ai-knowledge/types';
defineProps<{
  modelValue: { matchMode?: string; answers?: string; keywordMode?: string; excludedKeywords?: string; intentCodes?: string[] };
  intentOptions: AiIntentVO[];
}>();
const emit = defineEmits<{ (event: 'change', key: string, value: unknown): void }>();
const set = (key: string, value: unknown) => emit('change', key, value);
</script>
<style scoped>
.keyword-warning {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.6;
}
</style>
