<template>
  <section v-loading="loading" class="workflow-library" aria-label="AI 编排列表">
    <div class="library-filters">
      <el-input v-model="keyword" clearable placeholder="搜索编排名称或编码" aria-label="搜索编排" class="library-search" />
      <el-select v-model="scene" clearable placeholder="全部场景" aria-label="编排场景">
        <el-option v-for="item in scenes" :key="item.value" :label="item.label" :value="item.value" />
      </el-select>
      <el-select v-model="status" clearable placeholder="全部状态" aria-label="编排状态">
        <el-option label="启用" value="enabled" /><el-option label="停用" value="disabled" />
      </el-select>
      <span class="library-count">共 {{ visibleWorkflows.length }} 个编排</span>
    </div>
    <el-table :data="visibleWorkflows" row-key="id">
      <el-table-column label="编排名称" min-width="220" show-overflow-tooltip>
        <template #default="{ row }"
          ><div class="workflow-name">{{ row.workflowName }}</div>
<!--          <div class="workflow-code">{{ row.workflowCode }}</div>-->
        </template>
      </el-table-column>
      <el-table-column label="场景" width="100"
        ><template #default="{ row }">{{ sceneName(row.sceneType) }}</template></el-table-column
      >
      <el-table-column label="草稿" width="80"
        ><template #default="{ row }">{{ row.draftVersionNo ? `v${row.draftVersionNo}` : '-' }}</template></el-table-column
      >
      <el-table-column label="已发布" width="95"
        ><template #default="{ row }"
          ><el-tag v-if="row.publishedVersionNo" size="small" type="success">v{{ row.publishedVersionNo }}</el-tag
          ><span v-else class="muted">未发布</span></template
        ></el-table-column
      >
      <el-table-column label="绑定助手" width="90" align="center"
        ><template #default="{ row }">{{ row.bindingCount ?? 0 }}</template></el-table-column
      >
      <el-table-column label="状态" width="85"
        ><template #default="{ row }"
          ><el-tag size="small" :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '停用' }}</el-tag></template
        ></el-table-column
      >
      <el-table-column label="更新时间" min-width="165"
        ><template #default="{ row }">{{ row.updateTime || '-' }}</template></el-table-column
      >
      <el-table-column label="操作" width="135" fixed="right">
        <template #default="{ row }">
          <div class="row-actions">
            <el-button v-if="canEdit" link type="primary" size="small" @click="emit('design', row)">设计</el-button>
            <el-dropdown trigger="click" @command="(command) => handleCommand(command, row)">
              <el-button link size="small" :aria-label="`${row.workflowName}的更多操作`"
                >更多 <el-icon><ArrowDown /></el-icon
              ></el-button>
              <template #dropdown
                ><el-dropdown-menu>
                  <el-dropdown-item command="versions">版本记录</el-dropdown-item>
                  <el-dropdown-item v-if="canEdit" command="edit">修改信息</el-dropdown-item>
                  <el-dropdown-item v-if="canEdit" command="toggle">{{ row.enabled ? '停用编排' : '启用编排' }}</el-dropdown-item>
                  <el-dropdown-item v-if="canDelete" command="remove" divided class="delete-command">删除编排</el-dropdown-item>
                </el-dropdown-menu></template
              >
            </el-dropdown>
          </div>
        </template>
      </el-table-column>
      <template #empty
        ><el-empty :description="workflows.length ? '没有符合条件的编排，请调整筛选条件' : '暂无编排，点击右上角新增编排'" :image-size="70"
      /></template>
    </el-table>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { AiWorkflowVO } from '@/api/callcenter/ai-workflow/types';
import { filterWorkflows } from './workflowLibrary';
import { checkPermi } from '@/utils/permission';
const props = defineProps<{ workflows: AiWorkflowVO[]; loading: boolean }>();
const emit = defineEmits<{
  design: [item: AiWorkflowVO];
  edit: [item: AiWorkflowVO];
  versions: [item: AiWorkflowVO];
  toggle: [item: AiWorkflowVO];
  remove: [item: AiWorkflowVO];
}>();
const keyword = ref('');
const scene = ref('');
const status = ref('');
const canEdit = computed(() => checkPermi(['callcenter:ai-workflow:edit']));
const canDelete = computed(() => checkPermi(['callcenter:ai-workflow:delete']));
const scenes = [
  { value: 'VOICE_INBOUND', label: '呼入语音' },
  { value: 'VOICE_OUTBOUND', label: '外呼语音' },
  { value: 'ONLINE_CHAT', label: '在线客服' },
  { value: 'COMMON', label: '通用' }
];
const sceneName = (value: string) => scenes.find((item) => item.value === value)?.label || value;
const visibleWorkflows = computed(() => filterWorkflows(props.workflows, keyword.value, scene.value, status.value));
const handleCommand = (command: string, item: AiWorkflowVO) => {
  if (command === 'versions') emit('versions', item);
  if (command === 'edit' && canEdit.value) emit('edit', item);
  if (command === 'toggle' && canEdit.value) emit('toggle', item);
  if (command === 'remove' && canDelete.value) emit('remove', item);
};
</script>

<style scoped>
.library-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}
.library-search {
  width: 280px;
}
.library-filters > .el-select {
  width: 140px;
}
.library-count {
  margin-left: auto;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.workflow-name {
  color: var(--el-text-color-primary);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.workflow-code {
  margin-top: 3px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.workflow-library :deep(.el-table__row) {
  height: 64px;
}
.row-actions {
  display: flex;
  align-items: center;
  gap: 14px;
  white-space: nowrap;
}
.muted {
  color: var(--el-text-color-secondary);
}
.delete-command {
  color: var(--el-color-danger);
}
@media (max-width: 600px) {
  .library-search {
    width: 100%;
  }
  .library-count {
    margin-left: 0;
  }
}
</style>
