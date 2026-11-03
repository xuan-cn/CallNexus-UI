<template>
  <div class="task-date-filter">
    <span class="filter-label">创建日期</span>
    <el-date-picker
      v-model="dateRange"
      type="daterange"
      size="small"
      format="YYYY-MM-DD"
      value-format="YYYY-MM-DD"
      start-placeholder="开始日期"
      end-placeholder="结束日期"
      range-separator="至"
      :shortcuts="shortcuts"
      unlink-panels
      @change="changeRange"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const emit = defineEmits<{ change: [from?: string, to?: string] }>();
const dateRange = ref<[string, string] | null>(null);
const recentDays = (days: number) => {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - days + 1);
  return [start, end];
};
const shortcuts = [
  { text: '今天', value: () => recentDays(1) },
  { text: '近7天', value: () => recentDays(7) },
  { text: '近30天', value: () => recentDays(30) }
];
const changeRange = (value: [string, string] | null) => emit('change', value?.[0], value?.[1]);
</script>

<style scoped>
.task-date-filter {
  display: flex;
  flex-direction: column;
  flex: none;
  gap: 5px;
  margin-top: 10px;
}
.filter-label {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.task-date-filter :deep(.el-date-editor) {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  padding: 0 6px;
}
.task-date-filter :deep(.el-range-input) {
  font-size: 11px;
}
.task-date-filter :deep(.el-range-separator) {
  flex: none;
  padding: 0 3px;
  font-size: 11px;
}
</style>
