<template>
  <div class="task-list-item" :class="{ 'is-selected': selected }">
    <el-popover
      v-model:visible="detailsVisible"
      placement="right-start"
      :width="300"
      :offset="$slots.actions ? 44 : 12"
      trigger="hover"
      :show-after="300"
      :hide-after="100"
    >
      <template #reference>
        <button
          type="button"
          class="task-select"
          :aria-label="task.taskName"
          :aria-pressed="selected"
          @click="$emit('select', task)"
          @focus="detailsVisible = true"
          @blur="detailsVisible = false"
          @keydown.esc="detailsVisible = false"
        >
          <span class="task-heading">
            <span class="task-name">{{ task.taskName }}</span>
            <span v-if="task.status === 'DISABLED'" class="task-disabled">停用</span>
          </span>
          <span v-if="mode === 'assignment'" class="task-summary">
            <span :class="{ 'is-warning': task.unassignedCount > 0 }">待分配 {{ task.unassignedCount || 0 }}</span>
            <span>导入 {{ task.importedCount || 0 }}</span>
          </span>
          <span v-else class="task-summary">
            <span>导入 {{ task.importedCount || 0 }}</span>
            <span v-if="task.failedCount" class="is-danger">失败 {{ task.failedCount }}</span>
          </span>
        </button>
      </template>
      <div class="task-detail-title">{{ task.taskName }}</div>
      <dl class="task-details">
        <dt>任务编号</dt>
        <dd>{{ task.taskCode || '-' }}</dd>
        <dt>状态</dt>
        <dd>{{ task.status === 'ENABLED' ? '启用' : '停用' }}</dd>
        <dt>导入批次</dt>
        <dd>{{ task.batchCount || 0 }}</dd>
        <dt>成功 / 失败</dt>
        <dd>{{ task.importedCount || 0 }} / {{ task.failedCount || 0 }}</dd>
        <dt>已分配 / 未分配</dt>
        <dd>{{ task.assignedCount || 0 }} / {{ task.unassignedCount || 0 }}</dd>
        <dt>最近导入</dt>
        <dd>{{ task.lastImportTime || '尚未上传' }}</dd>
        <dt>创建时间</dt>
        <dd>{{ task.createTime || '-' }}</dd>
        <dt v-if="task.description">任务说明</dt>
        <dd v-if="task.description">{{ task.description }}</dd>
      </dl>
    </el-popover>
    <div v-if="$slots.actions" class="task-actions"><slot name="actions" /></div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { CustomerImportTaskVO } from '@/api/callcenter/customer-import-task';

withDefaults(defineProps<{ task: CustomerImportTaskVO; selected: boolean; mode?: 'import' | 'assignment' }>(), { mode: 'import' });
defineEmits<{ select: [task: CustomerImportTaskVO] }>();
const detailsVisible = ref(false);
</script>

<style scoped>
.task-list-item {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 6px;
  padding: 0 6px 0 0;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  background: var(--el-bg-color);
  transition:
    background-color 0.15s,
    border-color 0.15s;
}
.task-list-item:hover {
  border-color: var(--el-color-primary-light-5);
  background: var(--el-fill-color-light);
}
.task-list-item.is-selected {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}
.task-select {
  flex: 1;
  min-width: 0;
  padding: 10px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  text-align: left;
  font: inherit;
  cursor: pointer;
}
.task-select:focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: -2px;
}
.task-heading {
  display: flex;
  align-items: center;
  gap: 6px;
}
.task-name {
  min-width: 0;
  overflow: hidden;
  color: var(--el-text-color-primary);
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.task-disabled {
  flex: none;
  color: var(--el-text-color-placeholder);
  font-size: 11px;
}
.task-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  margin-top: 4px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 18px;
  font-variant-numeric: tabular-nums;
}
.is-warning {
  color: var(--el-color-warning);
}
.is-danger {
  color: var(--el-color-danger);
}
.task-actions {
  flex: none;
}
.task-detail-title {
  margin-bottom: 10px;
  color: var(--el-text-color-primary);
  font-size: 14px;
  font-weight: 600;
  overflow-wrap: anywhere;
}
.task-details {
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr);
  gap: 8px;
  margin: 0;
  font-size: 12px;
  line-height: 18px;
}
.task-details dt {
  color: var(--el-text-color-secondary);
}
.task-details dd {
  margin: 0;
  overflow-wrap: anywhere;
}
</style>
