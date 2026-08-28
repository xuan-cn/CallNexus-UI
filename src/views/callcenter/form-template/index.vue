<template>
  <div class="p-2 template-page">
    <el-card class="mb-2 hero-card" shadow="never">
      <div class="page-header">
        <div>
          <div class="page-title">表单模板</div>
          <div class="page-description">配置业务表单字段；客户模板还可控制哪些字段作为列表自定义列显示。</div>
        </div>
        <div class="header-actions">
          <el-button type="primary" @click="openCreate">
            <el-icon><Plus /></el-icon>
            新增模板
          </el-button>
        </div>
      </div>
    </el-card>

    <el-card class="table-card" shadow="never">
      <div class="table-toolbar">
        <span class="stat-pill">共 <b>{{ templates.length }}</b> 个模板</span>
        <el-button circle :icon="Refresh" title="刷新" @click="load" />
      </div>
      <el-table v-loading="loading" :data="templates" class="template-table" stripe>
        <el-table-column label="模板" min-width="200">
          <template #default="{ row }">
            <div class="template-cell">
              <strong>{{ row.templateName }}</strong>
              <span>{{ row.templateCode }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="业务类型" width="110">
          <template #default="{ row }">
            <el-tag effect="plain" round size="small" :type="row.businessType === 'CUSTOMER' ? 'primary' : 'warning'">
              {{ row.businessType === 'CUSTOMER' ? '客户' : '工单' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="工单流程" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.businessType === 'TICKET'">{{ workflowLabel(row.workflowCode) }}</span>
            <span v-else class="empty-chip">-</span>
          </template>
        </el-table-column>
        <el-table-column label="字段 / 列表列" width="140">
          <template #default="{ row }">
            <div class="count-cell">
              <span>{{ row.fields.length }} 字段</span>
              <span v-if="row.businessType === 'CUSTOMER'" class="list-count">
                {{ listVisibleCount(row) }} 列
              </span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.enabled ? 'success' : 'info'" effect="plain" round size="small">
              {{ row.enabled ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right" align="center">
          <template #default="{ row }">
            <div class="row-actions">
              <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
              <el-button link type="danger" @click="remove(row)">删除</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-drawer
      v-model="visible"
      :title="form.id ? '配置字段与列表列' : '新增表单模板'"
      size="min(1180px, 94vw)"
      class="form-template-drawer"
      append-to-body
    >
      <div class="editor-shell">
        <div class="meta-bar">
          <el-input v-model="form.templateCode" placeholder="模板编码，如 customer" class="meta-input" />
          <el-input v-model="form.templateName" placeholder="模板名称，如 客户信息" class="meta-input" />
          <el-select v-model="form.businessType" class="meta-select">
            <el-option label="客户" value="CUSTOMER" />
            <el-option label="工单" value="TICKET" />
          </el-select>
          <div class="meta-switch">
            <span>启用</span>
            <el-switch v-model="form.enabled" />
          </div>
        </div>

        <el-alert
          v-if="form.businessType === 'CUSTOMER'"
          class="editor-tip"
          type="info"
          :closable="false"
          show-icon
          title="客户模板：打开「列表列」后，该字段会出现在客户列表的自定义列中。"
        />

        <el-form v-if="form.businessType === 'TICKET'" class="workflow-form" label-width="85px">
          <el-form-item label="工单流程">
            <el-select v-model="form.workflowCode" clearable filterable placeholder="选择已发布并激活的流程" style="width: 100%">
              <el-option
                v-for="item in workflowOptions"
                :key="item.flowCode"
                :label="`${item.flowName}（${item.flowCode}）`"
                :value="item.flowCode"
              />
            </el-select>
            <div class="workflow-tip">工单创建后固化流程编码；流程表单路径请配置为 /callcenter/ticket。</div>
          </el-form-item>
        </el-form>

        <div class="editor-grid">
          <section class="fields-panel">
            <div class="section-heading">
              <div>
                <strong>字段配置</strong>
                <small>{{ form.fields.length }} 个字段<span v-if="form.businessType === 'CUSTOMER'"> · {{ editorListCount }} 个列表列</span></small>
              </div>
              <el-button type="primary" plain @click="addField">添加字段</el-button>
            </div>

            <el-empty v-if="!form.fields.length" description="点击「添加字段」开始配置" :image-size="72" />

            <div v-else class="field-table">
              <div class="field-table-head" :class="{ 'has-list-col': form.businessType === 'CUSTOMER' }">
                <span class="col-drag"></span>
                <span class="col-index">#</span>
                <span class="col-name">显示名</span>
                <span class="col-code">编码</span>
                <span class="col-type">类型</span>
                <span class="col-flag">必填</span>
                <span v-if="form.businessType === 'CUSTOMER'" class="col-flag">列表</span>
                <span class="col-span">布局</span>
                <span class="col-action"></span>
              </div>

              <div
                v-for="(field, fieldIndex) in form.fields"
                :key="field.localId"
                class="field-row"
                :class="{
                  'is-dragging': draggedFieldIndex === fieldIndex,
                  'is-drag-over': dragOverFieldIndex === fieldIndex && draggedFieldIndex !== fieldIndex,
                  'is-list-on': form.businessType === 'CUSTOMER' && field.listVisible,
                  'has-list-col': form.businessType === 'CUSTOMER',
                  'has-options': optionTypes.includes(field.fieldType)
                }"
                @dragover.prevent="handleFieldDragOver(fieldIndex)"
                @drop.prevent="handleFieldDrop(fieldIndex)"
              >
                <div class="field-row-main">
                  <button
                    type="button"
                    class="field-drag-handle col-drag"
                    draggable="true"
                    title="拖拽调整顺序"
                    @dragstart.stop="handleFieldDragStart(fieldIndex, $event)"
                    @dragend.stop="handleFieldDragEnd"
                  >
                    <el-icon><Rank /></el-icon>
                  </button>

                  <span class="field-index col-index">{{ fieldIndex + 1 }}</span>

                  <el-input v-model="field.fieldName" class="col-name" placeholder="如 性别" />
                  <el-input v-model="field.fieldCode" class="col-code" placeholder="如 gender" />
                  <el-select v-model="field.fieldType" class="col-type" @change="handleFieldTypeChange(field)">
                    <el-option v-for="item in fieldTypes" :key="item.value" :label="item.label" :value="item.value" />
                  </el-select>

                  <div class="col-flag">
                    <el-switch v-model="field.required" size="small" inline-prompt active-text="是" inactive-text="否" />
                  </div>
                  <div v-if="form.businessType === 'CUSTOMER'" class="col-flag">
                    <el-switch
                      v-model="field.listVisible"
                      size="small"
                      inline-prompt
                      active-text="显"
                      inactive-text="隐"
                    />
                  </div>

                  <el-select v-model="field.layoutSpan" class="col-span" size="default">
                    <el-option :value="12" label="半行" />
                    <el-option :value="24" label="整行" />
                  </el-select>

                  <el-button class="col-action" link type="danger" @click="form.fields.splice(fieldIndex, 1)">删除</el-button>
                </div>

                <div v-if="optionTypes.includes(field.fieldType)" class="option-editor">
                  <div class="option-heading">
                    <span>选项配置</span>
                    <el-button link type="primary" @click="addOption(field)">添加选项</el-button>
                  </div>
                  <div v-for="(option, optionIndex) in field.options" :key="option.localId" class="option-row">
                    <el-input v-model="option.label" placeholder="显示名，如 男" />
                    <el-input v-model="option.value" placeholder="值，如 MALE" />
                    <el-button link type="danger" @click="field.options.splice(optionIndex, 1)">删除</el-button>
                  </div>
                  <div v-if="!field.options.length" class="option-empty">请至少添加一个完整选项</div>
                </div>
              </div>

              <button type="button" class="field-table-foot" @click="addField">
                <el-icon><Plus /></el-icon>
                继续添加字段
              </button>
            </div>
          </section>

          <aside class="preview-panel">
            <div class="preview-block" v-if="form.businessType === 'CUSTOMER'">
              <div class="section-heading">
                <strong>列表列预览</strong>
                <el-tag size="small" effect="plain" round>{{ editorListCount }} 列</el-tag>
              </div>
              <div v-if="editorListFields.length" class="list-preview">
                <span v-for="field in editorListFields" :key="field.localId" class="list-chip">
                  {{ field.fieldName || field.fieldCode || '未命名' }}
                </span>
              </div>
              <div v-else class="preview-empty">尚未勾选列表列，客户列表不会展示自定义列</div>
            </div>

            <div class="preview-block">
              <div class="section-heading">
                <strong>表单预览</strong>
                <el-tag size="small" effect="plain" round>
                  {{ form.businessType === 'CUSTOMER' ? '客户表单' : '工单表单' }}
                </el-tag>
              </div>
              <el-form label-position="top" class="preview-form">
                <el-row :gutter="10">
                  <el-col v-for="field in form.fields" :key="field.localId" :span="field.layoutSpan || 12">
                    <el-form-item :label="field.fieldName || '未命名字段'" :required="field.required">
                      <el-input v-if="field.fieldType === 'INPUT'" :placeholder="field.placeholder || '请输入'" />
                      <el-input v-else-if="field.fieldType === 'TEXTAREA'" type="textarea" :rows="2" placeholder="请输入" />
                      <el-input-number v-else-if="field.fieldType === 'NUMBER'" controls-position="right" style="width: 100%" />
                      <el-button v-else-if="field.fieldType === 'FILE'" disabled>选择文件</el-button>
                      <el-date-picker
                        v-else-if="field.fieldType === 'DATE'"
                        type="date"
                        placeholder="选择日期"
                        style="width: 100%"
                      />
                      <el-date-picker
                        v-else-if="field.fieldType === 'DATETIME'"
                        type="datetime"
                        placeholder="选择日期时间"
                        style="width: 100%"
                      />
                      <el-radio-group v-else-if="field.fieldType === 'RADIO'">
                        <el-radio v-for="option in validOptions(field)" :key="option.localId" :value="option.value">
                          {{ option.label }}
                        </el-radio>
                      </el-radio-group>
                      <el-checkbox-group v-else-if="field.fieldType === 'CHECKBOX'">
                        <el-checkbox v-for="option in validOptions(field)" :key="option.localId" :value="option.value">
                          {{ option.label }}
                        </el-checkbox>
                      </el-checkbox-group>
                      <el-select
                        v-else
                        :multiple="field.fieldType === 'MULTI_SELECT'"
                        placeholder="请选择"
                        style="width: 100%"
                      >
                        <el-option
                          v-for="option in validOptions(field)"
                          :key="option.localId"
                          :label="option.label"
                          :value="option.value"
                        />
                      </el-select>
                    </el-form-item>
                  </el-col>
                </el-row>
                <el-empty v-if="!form.fields.length" :image-size="56" description="字段会在这里实时展示" />
              </el-form>
            </div>
          </aside>
        </div>
      </div>

      <template #footer>
        <el-button @click="visible = false">取消</el-button>
        <el-button type="primary" @click="submit">保存</el-button>
      </template>
    </el-drawer>
  </div>
</template>

<script setup name="FormTemplateManagement" lang="ts">
import { Plus, Rank, Refresh } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { createFormTemplate, deleteFormTemplate, listFormTemplates, updateFormTemplate } from '@/api/callcenter/form-template';
import { FormField, FormFieldOption, FormFieldType, FormTemplate } from '@/api/callcenter/form-template/types';
import { listDefinitionOptions } from '@/api/workflow/definition';
import { FlowDefinitionVo } from '@/api/workflow/definition/types';

type EditableOption = FormFieldOption & { localId: string };
type EditableField = Omit<FormField, 'options'> & { localId: string; options: EditableOption[] };
type EditableTemplate = Omit<FormTemplate, 'fields'> & { fields: EditableField[] };

const loading = ref(false);
const visible = ref(false);
const templates = ref<FormTemplate[]>([]);
const workflowOptions = ref<FlowDefinitionVo[]>([]);
const optionTypes: FormFieldType[] = ['RADIO', 'CHECKBOX', 'SELECT', 'MULTI_SELECT'];
const fieldTypes: Array<{ label: string; value: FormFieldType }> = [
  { label: '附件', value: 'FILE' },
  { label: '输入框', value: 'INPUT' },
  { label: '文本框', value: 'TEXTAREA' },
  { label: '单选框', value: 'RADIO' },
  { label: '多选框', value: 'CHECKBOX' },
  { label: '下拉单选', value: 'SELECT' },
  { label: '下拉多选', value: 'MULTI_SELECT' },
  { label: '数字', value: 'NUMBER' },
  { label: '日期', value: 'DATE' },
  { label: '日期时间', value: 'DATETIME' }
];
const localId = () => `${Date.now()}-${Math.random()}`;
const emptyForm = (): EditableTemplate => ({
  templateCode: '',
  templateName: '',
  businessType: 'CUSTOMER',
  workflowCode: undefined,
  enabled: true,
  fields: []
});
const form = ref<EditableTemplate>(emptyForm());
const draggedFieldIndex = ref<number>();
const dragOverFieldIndex = ref<number>();

const listVisibleCount = (template: FormTemplate) => template.fields.filter((field) => field.listVisible).length;
const editorListFields = computed(() => form.value.fields.filter((field) => field.listVisible));
const editorListCount = computed(() => editorListFields.value.length);

const load = async () => {
  loading.value = true;
  try {
    templates.value = (await listFormTemplates()).data;
  } finally {
    loading.value = false;
  }
};
const openCreate = () => {
  form.value = emptyForm();
  visible.value = true;
};
const openEdit = (template: FormTemplate) => {
  form.value = {
    ...template,
    fields: template.fields.map((field) => ({
      ...field,
      layoutSpan: field.layoutSpan || 12,
      listVisible: Boolean(field.listVisible),
      localId: localId(),
      options: field.options.map((option) => ({ ...option, localId: localId() }))
    }))
  };
  visible.value = true;
};
const addField = () =>
  form.value.fields.push({
    localId: localId(),
    fieldCode: '',
    fieldName: '',
    fieldType: 'INPUT',
    required: false,
    layoutSpan: 12,
    listVisible: false,
    options: []
  });
const addOption = (field: EditableField) => field.options.push({ localId: localId(), label: '', value: '', sortOrder: field.options.length });
const handleFieldDragStart = (fieldIndex: number, event: DragEvent) => {
  draggedFieldIndex.value = fieldIndex;
  dragOverFieldIndex.value = fieldIndex;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(fieldIndex));
  }
};
const handleFieldDragOver = (fieldIndex: number) => {
  if (draggedFieldIndex.value !== undefined) dragOverFieldIndex.value = fieldIndex;
};
const handleFieldDrop = (fieldIndex: number) => {
  const sourceIndex = draggedFieldIndex.value;
  if (sourceIndex === undefined || sourceIndex === fieldIndex) {
    handleFieldDragEnd();
    return;
  }
  const [field] = form.value.fields.splice(sourceIndex, 1);
  form.value.fields.splice(fieldIndex, 0, field);
  handleFieldDragEnd();
};
const handleFieldDragEnd = () => {
  draggedFieldIndex.value = undefined;
  dragOverFieldIndex.value = undefined;
};
const handleFieldTypeChange = (field: EditableField) => {
  if (!optionTypes.includes(field.fieldType)) field.options = [];
  if (optionTypes.includes(field.fieldType) && !field.options.length) addOption(field);
};
const validOptions = (field: EditableField) => field.options.filter((option) => option.label && option.value);
const workflowLabel = (workflowCode?: string) => {
  if (!workflowCode) return '未绑定';
  const definition = workflowOptions.value.find((item) => item.flowCode === workflowCode);
  return definition ? `${definition.flowName}（${workflowCode}）` : workflowCode;
};
const submit = async () => {
  if (!form.value.templateCode || !form.value.templateName) {
    ElMessage.warning('请填写模板编码和模板名称');
    return;
  }
  if (form.value.fields.some((field) => !field.fieldCode || !field.fieldName)) {
    ElMessage.warning('请填写所有字段的编码和名称');
    return;
  }
  if (form.value.fields.some((field) => optionTypes.includes(field.fieldType) && !validOptions(field).length)) {
    ElMessage.warning('单选、多选和下拉字段至少需要一个完整选项');
    return;
  }
  const data: FormTemplate = {
    ...form.value,
    fields: form.value.fields.map((field, index) => ({
      fieldCode: field.fieldCode,
      fieldName: field.fieldName,
      fieldType: field.fieldType,
      required: field.required,
      layoutSpan: field.layoutSpan || 12,
      placeholder: field.placeholder,
      defaultValue: field.defaultValue,
      validationRules: field.validationRules,
      listVisible: Boolean(field.listVisible),
      sortOrder: index,
      options: validOptions(field).map((option, optionIndex) => ({ label: option.label, value: option.value, sortOrder: optionIndex }))
    }))
  };
  data.id ? await updateFormTemplate(data) : await createFormTemplate(data);
  ElMessage.success('保存成功');
  visible.value = false;
  await load();
};
const remove = async (template: FormTemplate) => {
  try {
    await ElMessageBox.confirm(`确认删除模板「${template.templateName}」吗？`, '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    });
  } catch {
    return;
  }
  if (template.id) await deleteFormTemplate(template.id);
  ElMessage.success('已删除');
  await load();
};
watch(
  () => form.value.businessType,
  (businessType) => {
    if (businessType !== 'TICKET') form.value.workflowCode = undefined;
  }
);
onMounted(async () => {
  const [definitions] = await Promise.all([listDefinitionOptions(), load()]);
  workflowOptions.value = definitions.data;
});
</script>

<style scoped lang="scss">
.template-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.hero-card {
  border-color: #e4ecf6;
  background:
    radial-gradient(circle at 0% 0%, rgba(56, 189, 248, 0.08), transparent 42%),
    linear-gradient(180deg, #ffffff, #f7fbff);
}

.hero-card :deep(.el-card__body) {
  padding: 16px 18px !important;
}

.table-card :deep(.el-card__body) {
  padding: 14px 16px !important;
}

.table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding: 8px 12px;
  border: 1px solid #e8eef6;
  border-radius: 12px;
  background: #f7faff;
}

.stat-pill {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border: 1px solid #e4ecf6;
  border-radius: 999px;
  background: #fff;
  color: #64748b;
  font-size: 12px;

  b {
    margin: 0 2px;
    color: #153b60;
    font-weight: 600;
  }
}

.template-table :deep(.el-table__header th) {
  font-size: 12px;
  font-weight: 600;
}

.template-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;

  strong {
    color: #17324d;
    font-size: 14px;
    font-weight: 600;
  }

  span {
    color: #94a3b8;
    font-size: 12px;
  }
}

.count-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  color: #475569;
  font-size: 12px;
}

.list-count {
  color: #2563eb;
}

.row-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.empty-chip {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 0 8px;
  border: 1px solid #e8eef6;
  border-radius: 999px;
  background: #f8fafc;
  color: #94a3b8;
  font-size: 12px;
}

.editor-shell {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 8px;
}

.meta-bar {
  display: grid;
  grid-template-columns: 1.1fr 1.2fr 140px auto;
  gap: 10px;
  align-items: center;
  padding: 12px;
  border: 1px solid #e8eef6;
  border-radius: 12px;
  background: #f7faff;
}

.meta-switch {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #64748b;
  font-size: 13px;
  white-space: nowrap;
}

.editor-tip {
  border-radius: 10px;
}

.workflow-form {
  margin: 0;
  padding: 10px 12px 2px;
  border: 1px solid #e8eef6;
  border-radius: 12px;
  background: #fff;
}

.workflow-tip {
  margin-top: 4px;
  color: #94a3b8;
  font-size: 12px;
  line-height: 1.5;
}

.editor-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(280px, 0.9fr);
  gap: 14px;
  align-items: start;
  padding-bottom: 20px;
}

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;

  strong {
    color: #15233d;
    font-size: 14px;
    font-weight: 600;
  }

  small {
    display: block;
    margin-top: 2px;
    color: #94a3b8;
    font-size: 12px;
  }
}

.fields-panel,
.preview-panel {
  min-width: 0;
}

.fields-panel {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.field-table {
  overflow: hidden;
  border: 1px solid #e4ecf6;
  border-radius: 12px;
  background: #fff;
}

.field-table-head,
.field-row-main {
  display: grid;
  grid-template-columns: 28px 28px minmax(88px, 1.1fr) minmax(88px, 1fr) 108px 52px 72px 48px;
  gap: 8px;
  align-items: center;
}

.field-table-head.has-list-col,
.field-row.has-list-col .field-row-main {
  grid-template-columns: 28px 28px minmax(80px, 1.05fr) minmax(80px, 0.95fr) 104px 48px 48px 72px 44px;
}

.field-table-head {
  padding: 8px 12px;
  background: #f5f8fc;
  border-bottom: 1px solid #e8eef6;
  color: #64748b;
  font-size: 12px;
  font-weight: 500;
}

.field-row {
  border-bottom: 1px solid #eef2f7;
  transition:
    background-color 0.15s ease,
    box-shadow 0.15s ease,
    opacity 0.15s ease;
}

.field-row:last-of-type {
  border-bottom: 0;
}

.field-row:hover {
  background: #fafcff;
}

.field-row.is-list-on {
  background: #f7faff;
}

.field-row.is-dragging {
  opacity: 0.45;
}

.field-row.is-drag-over {
  box-shadow: inset 0 0 0 2px rgba(59, 130, 246, 0.35);
  background: #eff6ff;
}

.field-row-main {
  padding: 10px 12px;
}

.field-drag-handle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  color: #94a3b8;
  background: transparent;
  cursor: grab;
  user-select: none;
}

.field-drag-handle:hover {
  color: #2563eb;
  background: #eff6ff;
}

.field-drag-handle:active {
  cursor: grabbing;
}

.field-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: #eef2f7;
  color: #64748b;
  font-size: 12px;
  font-weight: 600;
}

.col-flag {
  display: flex;
  align-items: center;
  justify-content: center;
}

.col-action {
  justify-self: end;
}

.field-row-main :deep(.el-input),
.field-row-main :deep(.el-select) {
  width: 100%;
}

.field-row-main :deep(.el-input__wrapper),
.field-row-main :deep(.el-select__wrapper) {
  min-height: 32px;
  box-shadow: 0 0 0 1px #e4ecf6 inset;
}

.field-row-main :deep(.el-input__wrapper:hover),
.field-row-main :deep(.el-select__wrapper:hover) {
  box-shadow: 0 0 0 1px #c5d8ff inset;
}

.option-editor {
  margin: 0 12px 10px;
  padding: 10px;
  border: 1px dashed #dbe5f2;
  border-radius: 10px;
  background: #f8fafc;
}

.option-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  color: #64748b;
  font-size: 12px;
}

.option-row {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 8px;
  margin-bottom: 8px;
  align-items: center;
}

.option-empty {
  color: #94a3b8;
  font-size: 12px;
}

.field-table-foot {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  min-height: 44px;
  padding: 0 12px;
  border: 0;
  border-top: 1px dashed #d7e4f4;
  color: #3b82f6;
  font-size: 13px;
  font-weight: 500;
  background: #f8fbff;
  cursor: pointer;
  transition:
    color 0.15s ease,
    background-color 0.15s ease;
}

.field-table-foot:hover {
  color: #1d4ed8;
  background: #eff6ff;
}

.preview-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: sticky;
  top: 8px;
  padding-bottom: 4px;
}

.preview-block {
  padding: 14px;
  border: 1px solid #e4ecf6;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 1px 2px rgba(28, 48, 78, 0.03);
}

.preview-block:last-child {
  margin-bottom: 0;
}

.list-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.list-chip {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 0 10px;
  border: 1px solid rgba(37, 99, 235, 0.2);
  border-radius: 999px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 12px;
  font-weight: 500;
}

.preview-empty {
  color: #94a3b8;
  font-size: 12px;
  line-height: 1.5;
}

.preview-form :deep(.el-form-item) {
  margin-bottom: 12px;
}

.preview-form :deep(.el-form-item:last-child) {
  margin-bottom: 0;
}

.preview-form :deep(.el-form-item__label) {
  color: #475569;
  font-size: 12px;
  font-weight: 500;
}

@media (max-width: 1100px) {
  .editor-grid {
    grid-template-columns: 1fr;
  }

  .preview-panel {
    position: static;
  }

  .meta-bar {
    grid-template-columns: 1fr 1fr;
  }

  .field-table {
    overflow-x: auto;
  }

  .field-table-head,
  .field-row-main {
    min-width: 720px;
  }
}
</style>

<style>
.form-template-drawer .el-drawer__body {
  padding: 16px 18px 28px;
  overflow-y: auto;
  background: linear-gradient(180deg, #f8fbff, #f4f7fb 140px, #f4f7fb);
}

.form-template-drawer .el-drawer__footer {
  padding: 12px 18px;
  border-top: 1px solid #e8eef6;
  background: #fff;
}
</style>
