<template>
  <div class="p-2 import-task-page">
    <div class="workspace">
      <el-card class="task-panel" shadow="never">
        <template #header>
          <div class="panel-header">
            <div>
              <div class="panel-title">导入任务</div>
            </div>
            <el-button v-hasPermi="['callcenter:customer-import-task:create']" type="primary" :icon="Plus" @click="openTaskDrawer()">新建</el-button>
          </div>
        </template>
        <el-input v-model="taskQuery.taskName" clearable placeholder="搜索任务名称" @keyup.enter="searchTasks" @clear="searchTasks">
          <template #append><el-button :icon="Search" aria-label="搜索任务" @click="searchTasks" /></template>
        </el-input>
        <TaskDateFilter @change="changeTaskDates" />
        <div class="task-list-meta">
          <el-radio-group v-model="taskQuery.status" size="small" @change="searchTasks">
            <el-radio-button value="">全部</el-radio-button><el-radio-button value="ENABLED">启用</el-radio-button>
            <el-radio-button value="DISABLED">停用</el-radio-button>
          </el-radio-group>
          <span>{{ taskTotal }} 个</span>
        </div>
        <div v-loading="taskLoading" class="task-list">
          <TaskListItem v-for="task in tasks" :key="task.id" :task="task" :selected="`${selectedTaskId}` === `${task.id}`" @select="selectTask">
            <template #actions>
              <el-dropdown trigger="click" @command="(command) => handleTaskCommand(command, task)">
                <el-button link :icon="MoreFilled" :aria-label="`${task.taskName}的操作`" />
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="edit">编辑</el-dropdown-item>
                    <el-dropdown-item command="status">{{ task.status === 'ENABLED' ? '停用' : '启用' }}</el-dropdown-item>
                    <el-dropdown-item command="delete" divided>删除</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </template>
          </TaskListItem>
          <el-empty v-if="!taskLoading && !tasks.length" description="暂无导入任务" :image-size="80" />
        </div>
        <pagination
          v-show="taskTotal > 0"
          v-model:page="taskQuery.pageNum"
          v-model:limit="taskQuery.pageSize"
          :total="taskTotal"
          :page-sizes="[12, 24, 48]"
          :pager-count="5"
          :auto-scroll="false"
          small
          layout="prev, pager, next"
          @pagination="loadTasks"
        />
      </el-card>

      <div class="content-panel">
        <el-empty v-if="!selectedTask" description="请先选择或新建导入任务" />
        <template v-else>
          <el-card class="batch-card" shadow="never">
            <template #header>
              <div class="panel-header">
                <div>
                  <div class="panel-title">{{ selectedTask.taskName }}</div>
                  <div class="panel-desc">导入记录 · 每次上传生成一个独立批次</div>
                </div>
                <div class="batch-actions">
                  <el-button
                    v-hasPermi="['callcenter:customer-import-task:upload']"
                    type="primary"
                    :icon="UploadFilled"
                    :disabled="selectedTask.status !== 'ENABLED'"
                    @click="openUploadDrawer"
                    >上传资料</el-button
                  >
                  <el-button circle :icon="Refresh" @click="loadBatches" />
                </div>
              </div>
            </template>
            <el-table v-loading="batchLoading" :data="batches" row-key="batchId">
              <el-table-column label="文件名" prop="fileName" min-width="190" show-overflow-tooltip />
              <el-table-column label="状态" width="120">
                <template #default="{ row }"
                  ><el-tag :type="batchTag(row.status)">{{ batchStatus(row.status) }}</el-tag></template
                >
              </el-table-column>
              <el-table-column label="进度" min-width="180">
                <template #default="{ row }">
                  <el-progress :percentage="progress(row)" :stroke-width="8" />
                </template>
              </el-table-column>
              <el-table-column label="总数" prop="totalCount" width="72" />
              <el-table-column label="成功" prop="importedCount" width="72" />
              <el-table-column label="跳过" prop="skippedCount" width="72" />
              <el-table-column label="失败" prop="failedCount" width="72" />
              <el-table-column label="上传时间" prop="createTime" width="170" />
              <el-table-column label="操作" width="210" fixed="right">
                <template #default="{ row }">
                  <el-button link type="primary" @click="openRows(row)">行明细</el-button>
                  <el-button v-if="row.failedCount" link type="warning" @click="downloadErrors(row)">失败明细</el-button>
                  <el-button v-if="row.failedCount" link type="primary" @click="retryBatch(row)">重试</el-button>
                </template>
              </el-table-column>
            </el-table>
            <pagination
              v-show="batchTotal > 0"
              v-model:page="batchQuery.pageNum"
              v-model:limit="batchQuery.pageSize"
              :total="batchTotal"
              @pagination="loadBatches"
            />
          </el-card>
        </template>
      </div>
    </div>

    <el-drawer v-model="taskDrawer.visible" :title="taskDrawer.id ? '编辑导入任务' : '新建导入任务'" size="620px" append-to-body>
      <el-form ref="taskFormRef" :model="taskDrawer.form" :rules="taskRules" label-width="112px">
        <el-divider content-position="left">基础信息</el-divider>
        <el-form-item label="任务名称" prop="taskName"><el-input v-model="taskDrawer.form.taskName" maxlength="128" show-word-limit /></el-form-item>
        <el-form-item label="任务说明"
          ><el-input v-model="taskDrawer.form.description" type="textarea" :rows="3" maxlength="500" show-word-limit
        /></el-form-item>
        <el-form-item label="重复号码"
          ><el-radio-group v-model="taskDrawer.form.duplicateStrategy"
            ><el-radio-button value="SKIP">跳过</el-radio-button><el-radio-button value="UPDATE">更新资料</el-radio-button></el-radio-group
          ></el-form-item
        >
        <el-divider content-position="left">表单与字段映射</el-divider>
        <el-form-item label="表单模板">
          <el-select v-model="taskDrawer.form.formTemplateId" clearable filterable class="w-full" placeholder="不使用自定义表单">
            <el-option v-for="template in formTemplates" :key="template.id" :label="template.templateName" :value="template.id!" />
          </el-select>
        </el-form-item>
        <el-alert type="info" :closable="false" title="字段映射可在首次分析文件后确认，保存后供该任务后续上传复用。" />
        <el-divider content-position="left">默认资料属性</el-divider>
        <el-form-item label="客户类型"><el-input v-model="taskDrawer.form.defaultCustomerType" placeholder="例如：意向客户" /></el-form-item>
        <el-form-item label="来源渠道"><el-input v-model="taskDrawer.form.defaultSourceChannel" placeholder="例如：市场活动" /></el-form-item>
        <el-form-item label="默认标签"><el-input v-model="taskDrawer.form.defaultTags" placeholder="多个标签用逗号分隔" /></el-form-item>
        <el-form-item label="默认备注"><el-input v-model="taskDrawer.form.defaultRemark" type="textarea" :rows="3" /></el-form-item>
      </el-form>
      <template #footer
        ><el-button @click="taskDrawer.visible = false">取消</el-button
        ><el-button type="primary" :loading="taskDrawer.loading" @click="saveTask">保存</el-button></template
      >
    </el-drawer>

    <el-drawer v-model="uploadDrawerVisible" :title="`上传资料 · ${selectedTask?.taskName || ''}`" size="760px" append-to-body @closed="resetUpload">
      <div class="upload-drawer">
        <div class="drawer-toolbar">
          <div class="strategy-tags">
            <el-tag effect="plain">重复号码：{{ selectedTask?.duplicateStrategy === 'UPDATE' ? '更新资料' : '跳过' }}</el-tag>
            <el-tag effect="plain">表单：{{ templateName(selectedTask?.formTemplateId) }}</el-tag>
            <el-tag effect="plain">客户类型：{{ selectedTask?.defaultCustomerType || '未设置' }}</el-tag>
          </div>
          <el-dropdown v-if="selectedTask?.formTemplateId" split-button type="primary" @click="downloadTaskTemplate">
            下载任务模板
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="downloadTemplate">下载标准模板</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <el-button v-else link type="primary" :icon="Download" @click="downloadTemplate">下载标准模板</el-button>
        </div>
        <template v-if="!analysis">
          <el-upload
            ref="uploadRef"
            v-model:file-list="fileList"
            class="drawer-uploader"
            drag
            :auto-upload="false"
            :limit="1"
            accept=".xlsx,.xls"
            :on-change="handleFileChange"
            :on-remove="clearFile"
          >
            <div class="upload-placeholder">
              <el-icon><UploadFilled /></el-icon>
              <div class="upload-placeholder__title">拖入 Excel 文件，或<em>点击选择</em></div>
              <div class="upload-placeholder__tip">支持 .xlsx、.xls，单次上传一个文件</div>
            </div>
          </el-upload>
          <el-alert title="分析只读取表头和样例，不会立即写入客户资料。" type="info" :closable="false" show-icon />
        </template>
        <template v-else>
          <el-alert
            title="确认 Excel 列与系统字段的对应关系。未映射的列将被忽略，主号码必须且只能映射一次。"
            type="info"
            :closable="false"
            show-icon
          />
          <div class="mapping-summary">
            <span>文件：{{ selectedFile?.name }}</span>
            <span>已映射 {{ mappedFieldCount }}/{{ analysis.columns.length }} 个字段</span>
            <el-tag size="small">预计 {{ analysis.totalRows }} 行</el-tag>
          </div>
          <el-table :data="analysis.columns" size="small" border>
            <el-table-column label="Excel 列" prop="header" min-width="150" />
            <el-table-column label="映射到系统字段" min-width="220">
              <template #default="{ row }">
                <el-select v-model="fieldMapping[row.header]" clearable filterable placeholder="忽略该列" class="w-full">
                  <el-option v-for="option in mappingOptions" :key="option.value" :label="option.label" :value="option.value" />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="样例" min-width="180" show-overflow-tooltip>
              <template #default="{ row }">{{ analysis.sampleRows?.[0]?.[row.header] || '-' }}</template>
            </el-table-column>
          </el-table>
          <el-alert v-if="!hasPhoneMapping" type="warning" :closable="false" show-icon title="必须将一个 Excel 列映射为“主号码”" />
        </template>
      </div>
      <template #footer>
        <el-button @click="uploadDrawerVisible = false">取消</el-button>
        <el-button v-if="analysis" @click="clearAnalysis">重新选择文件</el-button>
        <el-button v-if="!analysis" type="primary" :disabled="!selectedFile" :loading="analyzing" @click="analyzeFile">分析字段</el-button>
        <el-button v-else type="primary" :disabled="!canUpload" :loading="uploading" @click="submitUpload">确认导入</el-button>
      </template>
    </el-drawer>

    <el-drawer v-model="rowDrawer.visible" title="导入行明细" size="72%" append-to-body>
      <el-form inline
        ><el-form-item label="状态"
          ><el-select v-model="rowQuery.status" clearable @change="loadRows"
            ><el-option label="成功" value="IMPORTED" /><el-option label="跳过" value="SKIPPED" /><el-option
              label="失败"
              value="FAILED" /></el-select></el-form-item
      ></el-form>
      <el-table v-loading="rowLoading" :data="rowRows">
        <el-table-column label="行号" prop="rowNumber" width="72" />
        <el-table-column label="客户姓名" prop="customerName" min-width="130" />
        <el-table-column label="原始号码" prop="originalPhone" min-width="140" />
        <el-table-column label="规范号码" prop="normalizedPhone" min-width="140" />
        <el-table-column label="状态" width="100"
          ><template #default="{ row }"
            ><el-tag :type="row.status === 'IMPORTED' ? 'success' : row.status === 'FAILED' ? 'danger' : 'warning'">{{
              row.status
            }}</el-tag></template
          ></el-table-column
        >
        <el-table-column label="处理结果" prop="errorMessage" min-width="240" show-overflow-tooltip />
      </el-table>
      <pagination v-show="rowTotal > 0" v-model:page="rowQuery.pageNum" v-model:limit="rowQuery.pageSize" :total="rowTotal" @pagination="loadRows" />
    </el-drawer>
  </div>
</template>

<script setup name="CustomerImportTask" lang="ts">
import { Download, MoreFilled, Plus, Refresh, Search, UploadFilled } from '@element-plus/icons-vue';
import TaskListItem from './components/TaskListItem.vue';
import TaskDateFilter from './components/TaskDateFilter.vue';
import type { FormInstance, FormRules, UploadFile, UploadInstance, UploadUserFile } from 'element-plus';
import { ElMessage, ElMessageBox } from 'element-plus';
import { listFormTemplates } from '@/api/callcenter/form-template';
import type { FormTemplate } from '@/api/callcenter/form-template/types';
import type { CustomerImportAnalysisVO, CustomerImportResultVO, CustomerImportRowVO } from '@/api/callcenter/customer';
import {
  analyzeImportTaskFile,
  createImportTask,
  deleteImportTask,
  pageImportTaskBatches,
  pageImportTaskRows,
  pageImportTasks,
  retryImportTaskRows,
  updateImportTask,
  updateImportTaskStatus,
  uploadImportTaskBatch,
  type CustomerImportTaskForm,
  type CustomerImportTaskQuery,
  type CustomerImportTaskVO
} from '@/api/callcenter/customer-import-task';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;
const tasks = ref<CustomerImportTaskVO[]>([]);
const taskTotal = ref(0);
const taskLoading = ref(false);
const selectedTaskId = ref<string | number>();
const selectedTask = computed(() => tasks.value.find((item) => `${item.id}` === `${selectedTaskId.value}`));
const taskQuery = reactive<CustomerImportTaskQuery>({ pageNum: 1, pageSize: 12, taskName: '', status: '' });
let taskRequestId = 0;
const formTemplates = ref<FormTemplate[]>([]);

const batches = ref<CustomerImportResultVO[]>([]);
const batchTotal = ref(0);
const batchLoading = ref(false);
const batchQuery = reactive({ pageNum: 1, pageSize: 10, fileName: '', status: '' });
const uploadRef = ref<UploadInstance>();
const fileList = ref<UploadUserFile[]>([]);
const selectedFile = ref<File>();
const analysis = ref<CustomerImportAnalysisVO>();
const fieldMapping = reactive<Record<string, string>>({});
const analyzing = ref(false);
const uploading = ref(false);
const uploadDrawerVisible = ref(false);

const rowDrawer = reactive({ visible: false, batchId: undefined as string | number | undefined });
const rowRows = ref<CustomerImportRowVO[]>([]);
const rowTotal = ref(0);
const rowLoading = ref(false);
const rowQuery = reactive({ pageNum: 1, pageSize: 20, status: '' });

const emptyTaskForm = (): CustomerImportTaskForm => ({
  taskName: '',
  description: '',
  duplicateStrategy: 'SKIP',
  defaultCustomerType: '',
  defaultSourceChannel: '',
  defaultTags: '',
  defaultRemark: ''
});
const taskDrawer = reactive({ visible: false, loading: false, id: undefined as string | number | undefined, form: emptyTaskForm() });
const taskFormRef = ref<FormInstance>();
const taskRules: FormRules = { taskName: [{ required: true, message: '请输入任务名称', trigger: 'blur' }] };

const mappingOptions = computed(() => {
  const base = [
    { label: '客户姓名', value: 'name' },
    { label: '主号码（必填）', value: 'phone' },
    { label: '其他号码', value: 'additionalPhones' },
    { label: '客户类型', value: 'customerType' },
    { label: '来源渠道', value: 'sourceChannel' },
    { label: '标签', value: 'tags' },
    { label: '备注', value: 'remark' }
  ];
  const template = formTemplates.value.find((item) => `${item.id}` === `${selectedTask.value?.formTemplateId}`);
  return [
    ...base,
    ...(template?.fields || [])
      .filter((field) => field.enabled !== false && field.importEnabled !== false && field.fieldType !== 'FILE')
      .map((field) => ({ label: `自定义：${field.fieldName}`, value: `form:${field.fieldCode}` }))
  ];
});
const hasPhoneMapping = computed(() => Object.values(fieldMapping).filter((value) => value === 'phone').length === 1);
const canUpload = computed(() => !!selectedFile.value && !!analysis.value && hasPhoneMapping.value && selectedTask.value?.status === 'ENABLED');
const mappedFieldCount = computed(() => Object.values(fieldMapping).filter(Boolean).length);

const loadTasks = async () => {
  const requestId = ++taskRequestId;
  taskLoading.value = true;
  try {
    const response = await pageImportTasks(taskQuery);
    if (requestId !== taskRequestId) return;
    tasks.value = response.rows || [];
    taskTotal.value = response.total || 0;
    if (!tasks.value.some((task) => `${task.id}` === `${selectedTaskId.value}`)) {
      if (tasks.value.length) selectTask(tasks.value[0]);
      else {
        selectedTaskId.value = undefined;
        batches.value = [];
        batchTotal.value = 0;
        batchLoading.value = false;
      }
    }
  } finally {
    if (requestId === taskRequestId) taskLoading.value = false;
  }
};
const searchTasks = () => {
  taskQuery.pageNum = 1;
  loadTasks();
};
const changeTaskDates = (from?: string, to?: string) => {
  taskQuery.createdDateFrom = from;
  taskQuery.createdDateTo = to;
  searchTasks();
};
const selectTask = (task: CustomerImportTaskVO) => {
  selectedTaskId.value = task.id;
  batchQuery.pageNum = 1;
  resetUpload();
  loadBatches();
};

const loadBatches = async () => {
  if (!selectedTaskId.value) return;
  const taskId = selectedTaskId.value;
  batchLoading.value = true;
  try {
    const response = await pageImportTaskBatches(taskId, batchQuery);
    if (`${taskId}` !== `${selectedTaskId.value}`) return;
    batches.value = response.rows || [];
    batchTotal.value = response.total || 0;
  } finally {
    if (`${taskId}` === `${selectedTaskId.value}`) batchLoading.value = false;
  }
};

const handleFileChange = (file: UploadFile) => {
  selectedFile.value = file.raw;
  analysis.value = undefined;
  Object.keys(fieldMapping).forEach((key) => delete fieldMapping[key]);
};
const clearFile = () => resetUpload();
const clearAnalysis = () => resetUpload();
const resetUpload = () => {
  fileList.value = [];
  selectedFile.value = undefined;
  analysis.value = undefined;
  Object.keys(fieldMapping).forEach((key) => delete fieldMapping[key]);
};
const openUploadDrawer = () => {
  resetUpload();
  uploadDrawerVisible.value = true;
};
const analyzeFile = async () => {
  if (!selectedTaskId.value || !selectedFile.value) return;
  analyzing.value = true;
  try {
    const response = await analyzeImportTaskFile(selectedTaskId.value, selectedFile.value);
    analysis.value = response.data;
    Object.keys(fieldMapping).forEach((key) => delete fieldMapping[key]);
    response.data.columns.forEach((column) => {
      if (column.suggestedField) fieldMapping[column.header] = column.suggestedField;
    });
  } finally {
    analyzing.value = false;
  }
};
const submitUpload = async () => {
  if (!selectedTaskId.value || !selectedFile.value || !canUpload.value) return;
  uploading.value = true;
  try {
    const task = selectedTask.value!;
    await updateImportTask(task.id, { ...task, fieldMappingJson: JSON.stringify(fieldMapping) });
    await uploadImportTaskBatch(task.id, selectedFile.value);
    ElMessage.success('导入批次已提交');
    uploadDrawerVisible.value = false;
    resetUpload();
    await loadTasks();
    await loadBatches();
  } finally {
    uploading.value = false;
  }
};

const openTaskDrawer = (task?: CustomerImportTaskVO) => {
  taskDrawer.id = task?.id;
  taskDrawer.form = task ? { ...task } : emptyTaskForm();
  taskDrawer.visible = true;
};
const saveTask = async () => {
  await taskFormRef.value?.validate();
  taskDrawer.loading = true;
  try {
    if (taskDrawer.id) await updateImportTask(taskDrawer.id, taskDrawer.form);
    else selectedTaskId.value = (await createImportTask(taskDrawer.form)).data;
    ElMessage.success('保存成功');
    taskDrawer.visible = false;
    await loadTasks();
  } finally {
    taskDrawer.loading = false;
  }
};
const handleTaskCommand = async (command: string, task: CustomerImportTaskVO) => {
  if (command === 'edit') {
    openTaskDrawer(task);
    return;
  }
  if (command === 'status') {
    await updateImportTaskStatus(task.id, task.status === 'ENABLED' ? 'DISABLED' : 'ENABLED');
    await loadTasks();
    return;
  }
  await ElMessageBox.confirm(
    '删除后将移除任务及导入批次，并删除仅由本任务新建的客户资料。已有客户、手工关联客户及其他任务共用的客户将保留。确定删除吗？',
    '删除任务及导入资料',
    { type: 'warning', confirmButtonText: '确认删除' }
  );
  await deleteImportTask(task.id);
  if (`${selectedTaskId.value}` === `${task.id}`) selectedTaskId.value = undefined;
  await loadTasks();
};

const openRows = (batch: CustomerImportResultVO) => {
  rowDrawer.batchId = batch.batchId;
  rowDrawer.visible = true;
  rowQuery.pageNum = 1;
  loadRows();
};
const loadRows = async () => {
  if (!selectedTaskId.value || !rowDrawer.batchId) return;
  rowLoading.value = true;
  try {
    const response = await pageImportTaskRows(selectedTaskId.value, rowDrawer.batchId, rowQuery);
    rowRows.value = response.rows || [];
    rowTotal.value = response.total || 0;
  } finally {
    rowLoading.value = false;
  }
};
const retryBatch = async (batch: CustomerImportResultVO) => {
  await retryImportTaskRows(selectedTaskId.value!, batch.batchId!);
  ElMessage.success('失败行已重试');
  await loadBatches();
};
const downloadTemplate = () =>
  proxy?.download('api/v1/customer-import-tasks/template', {}, `客户资料导入模板_${Date.now()}.xlsx`, { method: 'post' });
const downloadTaskTemplate = () =>
  proxy?.download(`api/v1/customer-import-tasks/${selectedTaskId.value}/template`, {}, `任务资料导入模板_${Date.now()}.xlsx`, { method: 'post' });
const downloadErrors = (batch: CustomerImportResultVO) =>
  proxy?.download(`api/v1/customer-import-tasks/${selectedTaskId.value}/batches/${batch.batchId}/errors`, {}, `导入失败明细_${Date.now()}.xlsx`);
const templateName = (id?: string | number) => formTemplates.value.find((item) => `${item.id}` === `${id}`)?.templateName || '未设置';
const batchStatus = (status?: string) =>
  ({ PENDING: '等待中', PROCESSING: '处理中', SUCCESS: '成功', PARTIAL_SUCCESS: '部分成功', FAILED: '失败' })[status || ''] || status || '-';
const batchTag = (status?: string) =>
  status === 'SUCCESS' ? 'success' : status === 'FAILED' ? 'danger' : status === 'PARTIAL_SUCCESS' ? 'warning' : 'info';
const progress = (row: CustomerImportResultVO) =>
  row.totalCount ? Math.min(100, Math.round(((row.importedCount + row.skippedCount + row.failedCount) / row.totalCount) * 100)) : 0;

onMounted(async () => {
  const templates = await listFormTemplates('CUSTOMER');
  formTemplates.value = templates.data || [];
  await loadTasks();
});
</script>

<style scoped>
.import-task-page,
.workspace {
  height: calc(100vh - 105px);
}
.workspace {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: 12px;
}
.task-panel,
.content-panel {
  min-height: 0;
  min-width: 0;
}
.task-panel {
  display: flex;
  flex-direction: column;
}
.task-panel:deep(.el-card__header) {
  padding: 12px;
}
.task-panel:deep(.el-card__body) {
  flex: 1;
  min-height: 0;
  padding: 12px;
  display: flex;
  flex-direction: column;
}
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.panel-title {
  font-size: 16px;
  font-weight: 700;
  color: #102a43;
}
.panel-desc {
  font-size: 12px;
  color: #8492a6;
}
.task-list {
  flex: 1;
  min-height: 0;
  overflow: auto;
  margin-top: 8px;
}
.task-list-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 10px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.task-panel :deep(.pagination-container) {
  flex: none;
  padding: 8px 0 0;
}
.content-panel {
  min-height: 0;
  overflow: auto;
}
.content-panel > .batch-card {
  height: 100%;
}
.batch-actions,
.drawer-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
}
.drawer-toolbar {
  justify-content: space-between;
  margin-bottom: 18px;
}
.strategy-tags {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.upload-drawer {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.drawer-uploader,
.drawer-uploader:deep(.el-upload) {
  width: 100%;
}
.drawer-uploader:deep(.el-upload-dragger) {
  width: 100%;
  min-height: 260px;
  padding: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.upload-placeholder {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  text-align: center;
}
.upload-placeholder .el-icon {
  font-size: 54px;
  color: var(--el-text-color-placeholder);
}
.upload-placeholder__title {
  font-size: 15px;
  color: var(--el-text-color-regular);
}
.upload-placeholder__title em {
  color: var(--el-color-primary);
  font-style: normal;
}
.upload-placeholder__tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.mapping-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: #52677c;
}
.batch-card {
  min-height: 0;
}
.w-full {
  width: 100%;
}
@media (max-width: 1200px) {
  .workspace {
    grid-template-columns: 240px minmax(0, 1fr);
  }
}
@media (max-width: 800px) {
  .import-task-page,
  .workspace {
    height: auto;
  }
  .workspace {
    grid-template-columns: minmax(0, 1fr);
  }
  .task-panel {
    height: 340px;
  }
}
</style>
