<template>
  <div class="keyword-group">
    <div class="words">
      <el-tag v-for="word in visibleWords" :key="word" closable type="info" @close="remove(word)">{{ word }}</el-tag>
      <el-button v-if="words.length > 6" text size="small" @click="expanded = !expanded">{{
        expanded ? '收起' : `还有 ${words.length - 6} 个`
      }}</el-button>
    </div>
    <el-input
      v-model="draft"
      maxlength="13000"
      placeholder="输入关键词，回车添加；粘贴时按逗号、顿号或换行拆分"
      @keydown.enter.prevent="add()"
      @blur="add()"
      @paste.prevent="paste"
    >
      <template #append><el-button @click="add()">添加</el-button></template>
    </el-input>
  </div>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue';
import { ElMessage } from 'element-plus';
const props = defineProps<{ words: string[] }>();
const emit = defineEmits<{ 'update:words': [string[]] }>();
const draft = ref('');
const expanded = ref(false);
const visibleWords = computed(() => (expanded.value ? props.words : props.words.slice(0, 6)));
const remove = (word: string) =>
  emit(
    'update:words',
    props.words.filter((item) => item !== word)
  );
const add = (text = draft.value) => {
  const added = text
    .split(/[,，、\r\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  const next = [...new Set([...props.words, ...added])];
  if (next.length > 100 || next.some((word) => word.length > 128)) {
    ElMessage.warning('每组最多 100 个词，每个词最多 128 字');
    return;
  }
  emit('update:words', next);
  draft.value = '';
};
const paste = (event: ClipboardEvent) => add(draft.value + (event.clipboardData?.getData('text') || ''));
</script>
<style scoped>
.keyword-group {
  min-width: 0;
  flex: 1;
}
.words {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 6px;
}
</style>
