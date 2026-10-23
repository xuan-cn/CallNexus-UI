<template>
  <el-drawer v-model="visible" title="紧急程度配置" size="min(760px, 92vw)" append-to-body destroy-on-close>
    <div class="manager-tip">权重越大，进行中的工单越靠前。已被工单使用的等级请停用，不要删除。</div>
    <div class="manager-toolbar">
      <el-button type="primary" plain @click="openCreate">新增等级</el-button>
    </div>
    <el-table v-loading="loading" :data="rows">
      <el-table-column label="等级" min-width="130">
        <template #default="{ row }">
          <span class="level-name"><i :style="{ backgroundColor: row.tagColor }" />{{ row.levelName }}</span>
          <el-tag v-if="row.isDefault" size="small" type="success" effect="plain">默认</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="编码" prop="levelCode" min-width="120" />
      <el-table-column label="权重" prop="priorityWeight" width="80" align="center" />
      <el-table-column label="顺序" prop="sortOrder" width="80" align="center" />
      <el-table-column label="状态" width="90">
        <template #default="{ row }"><el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '停用' }}</el-tag></template>
      </el-table-column>
      <el-table-column label="操作" width="130" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">修改</el-button>
          <el-button link type="danger" :disabled="row.isDefault" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="editVisible" :title="editingId ? '修改紧急程度' : '新增紧急程度'" width="560px" append-to-body destroy-on-close>
      <el-form label-width="96px">
        <el-form-item label="名称" required><el-input v-model="form.levelName" maxlength="32" /></el-form-item>
        <el-form-item label="编码" required>
          <el-input v-model="form.levelCode" maxlength="32" :disabled="Boolean(editingId)" placeholder="如 URGENT" />
        </el-form-item>
        <el-form-item label="排序权重" required>
          <el-input-number v-model="form.priorityWeight" :min="0" :max="10000" />
          <span class="field-tip">数值越大越靠前</span>
        </el-form-item>
        <el-form-item label="标签颜色" required><el-color-picker v-model="form.tagColor" /></el-form-item>
        <el-form-item label="显示顺序" required><el-input-number v-model="form.sortOrder" :min="0" :max="10000" /></el-form-item>
        <el-form-item label="默认等级"><el-switch v-model="form.isDefault" /></el-form-item>
        <el-form-item label="启用"><el-switch v-model="form.enabled" :disabled="form.isDefault" /></el-form-item>
        <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" :rows="2" maxlength="255" show-word-limit /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submit">保存</el-button>
      </template>
    </el-dialog>
  </el-drawer>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  createTicketUrgencyLevel,
  deleteTicketUrgencyLevel,
  listTicketUrgencyLevels,
  updateTicketUrgencyLevel,
  type TicketUrgencyLevelForm,
  type TicketUrgencyLevelVO
} from '@/api/callcenter/ticket';

const visible = defineModel<boolean>({ default: false });
const emit = defineEmits<{ changed: [] }>();
const loading = ref(false);
const saving = ref(false);
const editVisible = ref(false);
const editingId = ref<string | number>();
const rows = ref<TicketUrgencyLevelVO[]>([]);
const defaults = (): TicketUrgencyLevelForm => ({
  levelCode: '',
  levelName: '',
  priorityWeight: 10,
  tagColor: '#409EFF',
  isDefault: false,
  enabled: true,
  sortOrder: 10,
  remark: undefined,
  version: undefined
});
const form = reactive<TicketUrgencyLevelForm>(defaults());

const load = async () => {
  loading.value = true;
  try {
    const response = await listTicketUrgencyLevels(true);
    rows.value = response.data || [];
  } finally {
    loading.value = false;
  }
};

watch(visible, (opened) => opened && load());

const openCreate = () => {
  editingId.value = undefined;
  Object.assign(form, defaults(), { sortOrder: (rows.value.at(-1)?.sortOrder || 0) + 10 });
  editVisible.value = true;
};

const openEdit = (row: TicketUrgencyLevelVO) => {
  editingId.value = row.id;
  Object.assign(form, {
    levelCode: row.levelCode,
    levelName: row.levelName,
    priorityWeight: row.priorityWeight,
    tagColor: row.tagColor,
    isDefault: row.isDefault,
    enabled: row.enabled,
    sortOrder: row.sortOrder,
    remark: row.remark,
    version: row.version
  });
  editVisible.value = true;
};

const submit = async () => {
  if (!form.levelName.trim() || !/^[A-Za-z0-9_.-]{1,32}$/.test(form.levelCode.trim())) {
    ElMessage.warning('请填写名称，编码只能包含字母、数字、点、横线或下划线');
    return;
  }
  if (form.isDefault) form.enabled = true;
  saving.value = true;
  try {
    if (editingId.value) await updateTicketUrgencyLevel(editingId.value, form);
    else await createTicketUrgencyLevel(form);
    ElMessage.success('紧急程度已保存');
    editVisible.value = false;
    await load();
    emit('changed');
  } finally {
    saving.value = false;
  }
};

const remove = async (row: TicketUrgencyLevelVO) => {
  await ElMessageBox.confirm(`确定删除紧急程度“${row.levelName}”吗？`, '删除确认', { type: 'warning' });
  await deleteTicketUrgencyLevel(row.id);
  ElMessage.success('紧急程度已删除');
  await load();
  emit('changed');
};
</script>

<style scoped lang="scss">
.manager-tip {
  margin-bottom: 12px;
  color: #606266;
  font-size: 13px;
}
.manager-toolbar {
  margin-bottom: 12px;
}
.level-name {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-right: 8px;
}
.level-name i {
  width: 9px;
  height: 9px;
  border-radius: 50%;
}
.field-tip {
  margin-left: 10px;
  color: #909399;
  font-size: 12px;
}
</style>
