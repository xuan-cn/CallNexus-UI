<template>
  <div class="p-2">
    <el-card shadow="hover">
      <template #header><el-button type="primary" @click="openCreate">新增模板</el-button></template>
      <el-table v-loading="loading" :data="templates">
        <el-table-column label="模板编码" prop="templateCode" min-width="150" />
        <el-table-column label="模板名称" prop="templateName" min-width="160" />
        <el-table-column label="业务类型" prop="businessType" width="120" />
        <el-table-column label="工单流程" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">{{ row.businessType === 'TICKET' ? workflowLabel(row.workflowCode) : '-' }}</template>
        </el-table-column>
        <el-table-column label="字段数量" width="100"
          ><template #default="{ row }">{{ row.fields.length }}</template></el-table-column
        >
        <el-table-column label="状态" width="90"
          ><template #default="{ row }">{{ row.enabled ? '启用' : '停用' }}</template></el-table-column
        >
        <el-table-column label="操作" width="130" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button link type="danger" @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-drawer
      v-model="visible"
      :title="form.id ? '编辑模板' : '新增模板'"
      size="min(1280px, 92vw)"
      class="form-template-drawer"
      append-to-body
    >
      <el-form label-width="85px">
        <el-row :gutter="14">
          <el-col :span="7"
            ><el-form-item label="模板编码"><el-input v-model="form.templateCode" /></el-form-item
          ></el-col>
          <el-col :span="7"
            ><el-form-item label="模板名称"><el-input v-model="form.templateName" /></el-form-item
          ></el-col>
          <el-col :span="6">
            <el-form-item label="业务类型">
              <el-select v-model="form.businessType"><el-option label="客户" value="CUSTOMER" /><el-option label="工单" value="TICKET" /></el-select>
            </el-form-item>
          </el-col>
          <el-col :span="4"
            ><el-form-item label="启用"><el-switch v-model="form.enabled" /></el-form-item
          ></el-col>
        </el-row>
        <el-form-item v-if="form.businessType === 'TICKET'" label="工单流程">
          <el-select v-model="form.workflowCode" clearable filterable placeholder="选择已发布并激活的流程" style="width: 100%">
            <el-option
              v-for="item in workflowOptions"
              :key="item.flowCode"
              :label="`${item.flowName}（${item.flowCode}）`"
              :value="item.flowCode"
            />
          </el-select>
          <div class="workflow-tip">
            工单创建后固化流程编码，已启动实例不受后续版本发布影响；流程表单路径请配置为 /callcenter/ticket。
          </div>
        </el-form-item>
      </el-form>

      <el-row :gutter="16">
        <el-col :span="15">
          <div class="section-heading"><strong>字段配置</strong><el-button plain type="primary" @click="addField">添加字段</el-button></div>
          <el-empty v-if="!form.fields.length" description="点击添加字段开始配置" />
          <div
            v-for="(field, fieldIndex) in form.fields"
            :key="field.localId"
            class="field-card"
            :class="{
              'is-dragging': draggedFieldIndex === fieldIndex,
              'is-drag-over': dragOverFieldIndex === fieldIndex && draggedFieldIndex !== fieldIndex
            }"
            @dragover.prevent="handleFieldDragOver(fieldIndex)"
            @drop.prevent="handleFieldDrop(fieldIndex)"
          >
            <div class="field-card-heading">
              <div class="field-card-title">
                <span
                  class="field-drag-handle"
                  draggable="true"
                  title="拖拽调整字段顺序"
                  @dragstart.stop="handleFieldDragStart(fieldIndex, $event)"
                  @dragend.stop="handleFieldDragEnd"
                >
                  <el-icon><Rank /></el-icon>
                </span>
                <strong>{{ field.fieldName || `字段 ${fieldIndex + 1}` }}</strong>
                <el-tag size="small" type="info">第 {{ fieldIndex + 1 }} 项</el-tag>
              </div>
              <el-button link type="danger" @click="form.fields.splice(fieldIndex, 1)">删除字段</el-button>
            </div>
            <el-row :gutter="10">
              <el-col :span="7"><el-input v-model="field.fieldCode" placeholder="字段编码，如 gender" /></el-col>
              <el-col :span="7"><el-input v-model="field.fieldName" placeholder="字段名称，如 性别" /></el-col>
              <el-col :span="6">
                <el-select v-model="field.fieldType" style="width: 100%" @change="handleFieldTypeChange(field)">
                  <el-option v-for="item in fieldTypes" :key="item.value" :label="item.label" :value="item.value" />
                </el-select>
              </el-col>
              <el-col :span="4"><el-switch v-model="field.required" active-text="必填" /></el-col>
            </el-row>
            <div class="layout-editor">
              <span>字段布局</span>
              <el-radio-group v-model="field.layoutSpan" size="small">
                <el-radio-button :value="12">一行两个</el-radio-button>
                <el-radio-button :value="24">独占整行</el-radio-button>
              </el-radio-group>
              <el-switch
                v-if="form.businessType === 'CUSTOMER'"
                v-model="field.listVisible"
                active-text="列表显示"
                inactive-text="列表隐藏"
              />
            </div>
            <div v-if="optionTypes.includes(field.fieldType)" class="option-editor">
              <div class="option-heading">
                <span>选项配置</span>
                <el-button link type="primary" @click="addOption(field)">添加选项</el-button>
              </div>
              <el-row v-for="(option, optionIndex) in field.options" :key="option.localId" :gutter="8" class="option-row">
                <el-col :span="10"><el-input v-model="option.label" placeholder="显示名称，例如 男" /></el-col>
                <el-col :span="10"><el-input v-model="option.value" placeholder="实际值，例如 MALE" /></el-col>
                <el-col :span="4"><el-button link type="danger" @click="field.options.splice(optionIndex, 1)">删除</el-button></el-col>
              </el-row>
              <el-empty v-if="!field.options.length" :image-size="42" description="单选、多选和下拉字段至少添加一个选项" />
            </div>
          </div>
        </el-col>

        <el-col :span="9">
          <div class="preview-panel">
            <div class="section-heading">
              <strong>实时预览</strong><el-tag size="small">{{ form.businessType === 'CUSTOMER' ? '客户表单' : '工单表单' }}</el-tag>
            </div>
            <el-form label-position="top">
              <el-row :gutter="12">
                <el-col v-for="field in form.fields" :key="field.localId" :span="field.layoutSpan || 12">
                  <el-form-item :label="field.fieldName || '未命名字段'" :required="field.required">
                    <el-input v-if="field.fieldType === 'INPUT'" :placeholder="field.placeholder || '请输入'" />
                    <el-input v-else-if="field.fieldType === 'TEXTAREA'" type="textarea" placeholder="请输入" />
                    <el-input-number v-else-if="field.fieldType === 'NUMBER'" />
                    <el-button v-else-if="field.fieldType === 'FILE'" disabled>选择文件</el-button>
                    <el-date-picker v-else-if="field.fieldType === 'DATE'" type="date" placeholder="选择日期" style="width: 100%" />
                    <el-date-picker v-else-if="field.fieldType === 'DATETIME'" type="datetime" placeholder="选择日期时间" style="width: 100%" />
                    <el-radio-group v-else-if="field.fieldType === 'RADIO'">
                      <el-radio v-for="option in validOptions(field)" :key="option.localId" :value="option.value">{{ option.label }}</el-radio>
                    </el-radio-group>
                    <el-checkbox-group v-else-if="field.fieldType === 'CHECKBOX'">
                      <el-checkbox v-for="option in validOptions(field)" :key="option.localId" :value="option.value">{{ option.label }}</el-checkbox>
                    </el-checkbox-group>
                    <el-select v-else :multiple="field.fieldType === 'MULTI_SELECT'" placeholder="请选择" style="width: 100%">
                      <el-option v-for="option in validOptions(field)" :key="option.localId" :label="option.label" :value="option.value" />
                    </el-select>
                  </el-form-item>
                </el-col>
              </el-row>
              <el-empty v-if="!form.fields.length" :image-size="70" description="字段会在这里实时展示" />
            </el-form>
          </div>
        </el-col>
      </el-row>

      <template #footer><el-button @click="visible = false">取消</el-button><el-button type="primary" @click="submit">保存</el-button></template>
    </el-drawer>
  </div>
</template>

<script setup name="FormTemplateManagement" lang="ts">
import { ElMessage } from 'element-plus';
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
      localId: localId(),
      options: field.options.map((option) => ({ ...option, localId: localId() }))
    }))
  };
  visible.value = true;
};
const addField = () =>
  form.value.fields.push({ localId: localId(), fieldCode: '', fieldName: '', fieldType: 'INPUT', required: false, layoutSpan: 12, options: [] });
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
  visible.value = false;
  await load();
};
const remove = async (template: FormTemplate) => {
  if (template.id) await deleteFormTemplate(template.id);
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
.section-heading,
.field-card-heading,
.option-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.field-card {
  padding: 14px;
  margin-bottom: 12px;
  border: 1px solid #e3e8f1;
  border-radius: 10px;
  background: #fff;
  transition:
    border-color 0.16s ease,
    box-shadow 0.16s ease,
    opacity 0.16s ease;
}
.field-card.is-dragging {
  opacity: 0.45;
}
.field-card.is-drag-over {
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgb(64 158 255 / 14%);
}
.field-card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.field-drag-handle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  color: #909399;
  cursor: grab;
  user-select: none;
}
.field-drag-handle:hover {
  color: #409eff;
  background: #ecf5ff;
}
.field-drag-handle:active {
  cursor: grabbing;
}
.option-editor {
  padding: 12px;
  margin-top: 12px;
  border-radius: 8px;
  background: #f7f9fc;
}
.layout-editor {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin-top: 12px;
  color: #606266;
}
.option-row {
  margin-bottom: 8px;
}
.preview-panel {
  min-height: 360px;
  padding: 16px;
  border: 1px solid #dfe6f1;
  border-radius: 12px;
  background: #f8fafc;
}
.workflow-tip {
  margin-top: 4px;
  color: #909399;
}

:global(.form-template-drawer .el-drawer__body) {
  padding: 16px 20px;
  overflow-y: auto;
}

:global(.form-template-drawer .el-drawer__footer) {
  padding: 14px 20px;
  border-top: 1px solid #ebeef5;
}

@media (max-width: 900px) {
  :global(.form-template-drawer) {
    width: 100% !important;
  }
}
</style>
