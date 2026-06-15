<template>
  <div class="p-2">
    <el-card shadow="hover">
      <template #header>
        <div class="toolbar">
          <el-button v-hasPermi="['callcenter:outbound-blacklist:create']" type="primary" plain icon="Plus" @click="openCreate">新增黑名单</el-button>
          <el-button v-hasPermi="['callcenter:outbound-blacklist:import']" type="success" plain icon="Upload" @click="openImport"
            >Excel 导入</el-button
          >
        </div>
      </template>
      <el-table v-loading="loading" :data="rows">
        <el-table-column label="范围" width="100"
          ><template #default="{ row }"
            ><el-tag>{{ row.scopeType === 'GLOBAL' ? '租户全局' : '指定任务' }}</el-tag></template
          ></el-table-column
        >
        <el-table-column label="外呼任务" prop="taskName" min-width="150"
          ><template #default="{ row }">{{ row.taskName || '-' }}</template></el-table-column
        >
        <el-table-column label="电话号码" prop="normalizedPhone" min-width="150" />
        <el-table-column label="原因" prop="reason" min-width="180" show-overflow-tooltip />
        <el-table-column label="来源" width="110"
          ><template #default="{ row }">{{ sourceLabel(row.source) }}</template></el-table-column
        >
        <el-table-column label="生效时间" prop="effectiveAt" width="170"
          ><template #default="{ row }">{{ row.effectiveAt || '立即生效' }}</template></el-table-column
        >
        <el-table-column label="失效时间" prop="expiresAt" width="170"
          ><template #default="{ row }">{{ row.expiresAt || '长期有效' }}</template></el-table-column
        >
        <el-table-column label="状态" width="100"
          ><template #default="{ row }"
            ><el-tag :type="row.active ? 'danger' : 'info'">{{ row.active ? '拦截中' : row.enabled ? '待生效' : '已停用' }}</el-tag></template
          ></el-table-column
        >
        <el-table-column label="操作" width="190" fixed="right">
          <template #default="{ row }">
            <el-button v-hasPermi="['callcenter:outbound-blacklist:update']" link type="primary" @click="openUpdate(row)">修改</el-button>
            <el-button v-hasPermi="['callcenter:outbound-blacklist:update']" link :type="row.enabled ? 'warning' : 'success'" @click="toggle(row)">{{
              row.enabled ? '停用' : '启用'
            }}</el-button>
            <el-button v-hasPermi="['callcenter:outbound-blacklist:delete']" link type="danger" @click="remove(row)">解除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialog.visible" :title="dialog.title" width="680px" append-to-body>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="110px">
        <el-form-item label="限制范围" prop="scopeType"
          ><el-radio-group v-model="form.scopeType"
            ><el-radio-button value="GLOBAL">租户全局</el-radio-button><el-radio-button value="TASK">指定任务</el-radio-button></el-radio-group
          ></el-form-item
        >
        <el-form-item v-if="form.scopeType === 'TASK'" label="外呼任务" prop="taskId"
          ><el-select v-model="form.taskId" filterable style="width: 100%"
            ><el-option v-for="task in tasks" :key="task.id" :label="task.taskName" :value="task.id" /></el-select
        ></el-form-item>
        <el-form-item label="电话号码" prop="phoneNumber"
          ><el-input v-model="form.phoneNumber" placeholder="支持空格、横线、括号和 00 国际前缀"
        /></el-form-item>
        <el-form-item label="拦截原因"><el-input v-model="form.reason" type="textarea" :rows="3" maxlength="255" show-word-limit /></el-form-item>
        <el-form-item label="来源" prop="source"
          ><el-select v-model="form.source" style="width: 100%"
            ><el-option v-for="item in sources" :key="item.value" :label="item.label" :value="item.value" /></el-select
        ></el-form-item>
        <el-form-item label="有效时间"
          ><el-date-picker
            v-model="validRange"
            type="datetimerange"
            value-format="YYYY-MM-DD HH:mm:ss"
            start-placeholder="立即生效"
            end-placeholder="长期有效"
            style="width: 100%"
        /></el-form-item>
        <el-form-item label="状态"><el-switch v-model="form.enabled" active-text="启用" inactive-text="停用" /></el-form-item>
      </el-form>
      <template #footer
        ><el-button @click="dialog.visible = false">取消</el-button><el-button type="primary" @click="submit">保存</el-button></template
      >
    </el-dialog>

    <el-dialog v-model="importDialog.visible" title="Excel 导入外呼黑名单" width="920px" append-to-body>
      <div class="import-options">
        <el-radio-group v-model="importDialog.scopeType"
          ><el-radio-button value="GLOBAL">租户全局</el-radio-button><el-radio-button value="TASK">指定任务</el-radio-button></el-radio-group
        >
        <el-select v-if="importDialog.scopeType === 'TASK'" v-model="importDialog.taskId" placeholder="选择外呼任务" style="width: 240px"
          ><el-option v-for="task in tasks" :key="task.id" :label="task.taskName" :value="task.id"
        /></el-select>
        <el-upload :auto-upload="false" :limit="1" accept=".xlsx,.xls" :on-change="(file) => (importDialog.file = file.raw)"
          ><el-button plain>选择 Excel 文件</el-button></el-upload
        >
        <el-button plain icon="Download" @click="downloadTemplate">下载模板</el-button>
        <el-button
          type="success"
          :disabled="!importDialog.file || (importDialog.scopeType === 'TASK' && !importDialog.taskId)"
          :loading="importDialog.previewing"
          @click="previewImport"
          >开始预检</el-button
        >
      </div>
      <template v-if="importDialog.batch">
        <div class="summary">
          <el-tag>总计 {{ importDialog.batch.totalCount }}</el-tag
          ><el-tag type="success">有效 {{ importDialog.batch.validCount }}</el-tag
          ><el-tag type="warning">重复 {{ importDialog.batch.duplicateCount }}</el-tag
          ><el-tag type="danger">无效 {{ importDialog.batch.invalidCount }}</el-tag>
        </div>
        <el-table :data="importDialog.batch.rows" max-height="420">
          <el-table-column label="行号" prop="rowNumber" width="70" />
          <el-table-column label="原始号码" prop="originalPhone" />
          <el-table-column label="标准化号码" prop="normalizedPhone" />
          <el-table-column label="原因" prop="reason" />
          <el-table-column label="结果" prop="status" width="150" />
          <el-table-column label="说明" prop="errorMessage" min-width="220" />
        </el-table>
      </template>
      <template #footer>
        <el-button v-if="importDialog.batch && importDialog.batch.invalidCount + importDialog.batch.duplicateCount > 0" @click="downloadErrors"
          >下载失败明细</el-button
        >
        <el-button @click="importDialog.visible = false">取消</el-button>
        <el-button type="primary" :disabled="!importDialog.batch?.validCount" :loading="importDialog.confirming" @click="confirmImport"
          >确认导入有效黑名单</el-button
        >
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="OutboundBlacklist" lang="ts">
import {
  confirmOutboundBlacklistImport,
  createOutboundBlacklist,
  deleteOutboundBlacklist,
  disableOutboundBlacklist,
  enableOutboundBlacklist,
  getOutboundBlacklist,
  listOutboundBlacklists,
  previewOutboundBlacklistImport,
  updateOutboundBlacklist
} from '@/api/callcenter/outbound-blacklist';
import {
  OutboundBlacklistForm,
  OutboundBlacklistImportBatchVO,
  OutboundBlacklistScope,
  OutboundBlacklistVO
} from '@/api/callcenter/outbound-blacklist/types';
import { listOutboundTasks } from '@/api/callcenter/outbound-task';
import { OutboundTaskVO } from '@/api/callcenter/outbound-task/types';
import type { UploadFile } from 'element-plus';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;
const loading = ref(false);
const rows = ref<OutboundBlacklistVO[]>([]);
const tasks = ref<OutboundTaskVO[]>([]);
const formRef = ref<ElFormInstance>();
const dialog = reactive({ visible: false, title: '' });
const form = reactive<OutboundBlacklistForm>({ scopeType: 'GLOBAL', phoneNumber: '', source: 'MANUAL', enabled: true });
const validRange = ref<[string, string]>();
const sources = [
  { label: '手工添加', value: 'MANUAL' },
  { label: '客户要求', value: 'CUSTOMER_REQUEST' },
  { label: '系统规则', value: 'SYSTEM_RULE' },
  { label: 'Excel 导入', value: 'EXCEL' }
];
const rules = {
  scopeType: [{ required: true, message: '请选择限制范围' }],
  taskId: [{ required: true, message: '请选择外呼任务' }],
  phoneNumber: [{ required: true, message: '请输入电话号码' }],
  source: [{ required: true, message: '请选择来源' }]
};
const importDialog = reactive({
  visible: false,
  scopeType: 'GLOBAL' as OutboundBlacklistScope,
  taskId: undefined as string | number | undefined,
  file: undefined as File | undefined,
  previewing: false,
  confirming: false,
  batch: undefined as OutboundBlacklistImportBatchVO | undefined
});
const sourceLabel = (value: string) =>
  ({ MANUAL: '手工添加', EXCEL: 'Excel 导入', CUSTOMER_REQUEST: '客户要求', SYSTEM_RULE: '系统规则' })[value] || value;
const load = async () => {
  loading.value = true;
  try {
    const [blacklistRes, taskRes] = await Promise.all([listOutboundBlacklists(), listOutboundTasks()]);
    rows.value = blacklistRes.data;
    tasks.value = taskRes.data;
  } finally {
    loading.value = false;
  }
};
const reset = () => {
  Object.assign(form, { id: undefined, scopeType: 'GLOBAL', taskId: undefined, phoneNumber: '', reason: '', source: 'MANUAL', enabled: true });
  validRange.value = undefined;
};
const openCreate = () => {
  reset();
  dialog.title = '新增外呼黑名单';
  dialog.visible = true;
};
const openUpdate = async (row: OutboundBlacklistVO) => {
  reset();
  const data = (await getOutboundBlacklist(row.id)).data;
  Object.assign(form, { ...data, phoneNumber: data.originalPhone });
  validRange.value = data.effectiveAt || data.expiresAt ? [data.effectiveAt || '', data.expiresAt || ''] : undefined;
  dialog.title = '修改外呼黑名单';
  dialog.visible = true;
};
const submit = () =>
  formRef.value?.validate(async (valid) => {
    if (!valid) return;
    form.effectiveAt = validRange.value?.[0] || undefined;
    form.expiresAt = validRange.value?.[1] || undefined;
    form.id ? await updateOutboundBlacklist(form.id, form) : await createOutboundBlacklist(form);
    proxy?.$modal.msgSuccess('保存成功');
    dialog.visible = false;
    await load();
  });
const toggle = async (row: OutboundBlacklistVO) => {
  row.enabled ? await disableOutboundBlacklist(row.id) : await enableOutboundBlacklist(row.id);
  await load();
};
const remove = async (row: OutboundBlacklistVO) => {
  await proxy?.$modal.confirm(`确认解除电话号码 ${row.normalizedPhone} 的黑名单限制吗？`);
  await deleteOutboundBlacklist(row.id);
  proxy?.$modal.msgSuccess('已解除黑名单限制');
  await load();
};
const openImport = () => {
  Object.assign(importDialog, { visible: true, scopeType: 'GLOBAL', taskId: undefined, file: undefined, batch: undefined });
};
const downloadTemplate = () => proxy?.download('api/v1/outbound-blacklists/import-template', {}, `外呼黑名单导入模板_${Date.now()}.xlsx`);
const downloadErrors = () =>
  importDialog.batch &&
  proxy?.download(`api/v1/outbound-blacklists/import-batches/${importDialog.batch.id}/errors`, {}, `黑名单导入失败明细_${Date.now()}.xlsx`);
const previewImport = async () => {
  if (!importDialog.file) return;
  importDialog.previewing = true;
  try {
    importDialog.batch = (await previewOutboundBlacklistImport(importDialog.scopeType, importDialog.taskId, importDialog.file)).data;
  } finally {
    importDialog.previewing = false;
  }
};
const confirmImport = async () => {
  if (!importDialog.batch) return;
  importDialog.confirming = true;
  try {
    const result = (await confirmOutboundBlacklistImport(importDialog.batch.id)).data;
    proxy?.$modal.msgSuccess(`成功导入 ${result.importedCount} 条黑名单`);
    importDialog.visible = false;
    await load();
  } finally {
    importDialog.confirming = false;
  }
};
onMounted(load);
</script>

<style scoped>
.toolbar,
.import-options,
.summary {
  display: flex;
  align-items: center;
  gap: 10px;
}
.summary {
  margin: 16px 0;
}
</style>
