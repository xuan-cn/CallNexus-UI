<template>
  <div class="p-2 template-page">
    <el-card class="mb-2 hero-card" shadow="never">
      <div class="page-header">
        <div>
          <div class="page-title">表单模板</div>
          <div class="page-description">配置业务表单字段，并决定客户或工单列表中的可查询字段和自定义列。</div>
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
        <span class="stat-pill"
          >共 <b>{{ templates.length }}</b> 个模板</span
        >
        <el-button circle :icon="Refresh" title="刷新" @click="load" />
      </div>
      <el-table v-loading="loading" :data="templates" class="template-table" stripe>
        <el-table-column label="模板" min-width="200">
          <template #default="{ row }">
            <div class="template-cell">
              <strong>{{ row.templateName }}</strong>
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
        <el-table-column label="办结时限" width="120">
          <template #default="{ row }">
            <span v-if="row.businessType === 'TICKET' && row.deadlineEnabled">{{ deadlineDurationLabel(row.resolutionLimitMinutes) }}</span>
            <span v-else class="empty-chip">-</span>
          </template>
        </el-table-column>
        <el-table-column label="字段 / 列表列" width="140">
          <template #default="{ row }">
            <div class="count-cell">
              <span>{{ row.fields.length }} 字段</span>
              <span class="list-count">{{ listVisibleCount(row) }} 列 · {{ queryEnabledCount(row) }} 条件</span>
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
      size="min(1280px, 96vw)"
      class="form-template-drawer"
      append-to-body
    >
      <div class="editor-shell">
        <div class="meta-bar">
          <AutoInternalCode v-model="form.templateCode" prefix="tpl" />
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
          class="editor-tip"
          type="info"
          :closable="false"
          show-icon
          title="打开「列表列」后字段会出现在对应业务列表；打开「可查询」后列表会按配置动态生成查询条件。"
        />

        <el-form v-if="form.businessType === 'TICKET'" class="workflow-form" label-width="85px">
          <el-form-item label="工单流程">
            <el-select v-model="form.workflowCode" clearable filterable placeholder="选择已发布并激活的流程" style="width: 100%">
              <el-option
                v-for="item in workflowOptions"
                :key="item.flowCode"
                :label="item.flowName"
                :value="item.flowCode"
              />
            </el-select>
            <div class="workflow-tip">工单创建后固化流程编码；流程表单路径请配置为 /callcenter/ticket。</div>
          </el-form-item>
          <el-form-item label="办结时限">
            <div class="deadline-config">
              <el-switch v-model="form.deadlineEnabled" active-text="启用" />
              <template v-if="form.deadlineEnabled">
                <span class="deadline-label">创建后</span>
                <el-input-number v-model="form.resolutionLimitMinutes" :min="1" :max="525600" controls-position="right" />
                <span>分钟内办结，提前</span>
                <el-input-number v-model="form.remindBeforeMinutes" :min="0" :max="525599" controls-position="right" />
                <span>分钟提醒</span>
              </template>
            </div>
            <div class="workflow-tip">仅统计工单办结时限，不改变工作流节点和流转规则；进入“已解决”即停止计时。</div>
          </el-form-item>
          <el-form-item v-if="canConfigureCallback" label="回访策略">
            <el-button v-if="savedTicketTemplate" size="small" @click="openCallbackPolicy">配置回访策略</el-button>
            <div class="workflow-tip">
              {{ savedTicketTemplate ? '对使用本模板、之后办结的工单生效。' : '请先保存工单模板，再配置回访策略。' }}
            </div>
          </el-form-item>
        </el-form>

        <div class="editor-grid">
          <section class="field-list-panel">
            <div class="section-heading">
              <div>
                <strong>字段列表</strong>
                <small>{{ form.fields.length }} 个字段，可拖拽调整顺序</small>
              </div>
              <el-button type="primary" plain size="small" @click="addField">
                <el-icon><Plus /></el-icon>
                添加
              </el-button>
            </div>

            <el-empty v-if="!form.fields.length" description="点击「添加」创建字段" :image-size="64" />
            <div v-else class="field-list">
              <div
                v-for="(field, fieldIndex) in form.fields"
                :key="field.localId"
                class="field-list-item"
                :class="{
                  'is-active': selectedFieldId === field.localId,
                  'is-dragging': draggedFieldIndex === fieldIndex,
                  'is-drag-over': dragOverFieldIndex === fieldIndex && draggedFieldIndex !== fieldIndex
                }"
                @click="selectField(field)"
                @dragover.prevent="handleFieldDragOver(fieldIndex)"
                @drop.prevent="handleFieldDrop(fieldIndex)"
              >
                <button
                  type="button"
                  class="field-drag-handle"
                  draggable="true"
                  title="拖拽调整顺序"
                  @dragstart.stop="handleFieldDragStart(fieldIndex, $event)"
                  @dragend.stop="handleFieldDragEnd"
                >
                  <el-icon><Rank /></el-icon>
                </button>
                <span class="field-index">{{ fieldIndex + 1 }}</span>
                <div class="field-list-content">
                  <div class="field-list-title">{{ field.fieldName || '未命名字段' }}</div>
                  <div class="field-list-meta">
                    <span>{{ fieldTypeLabel(field.fieldType) }}</span>

                  </div>
                  <div v-if="field.enabled === false || field.required || field.listVisible || field.queryEnabled" class="field-list-flags">
                    <span v-if="field.enabled === false" class="is-disabled">已停用</span>
                    <span v-if="field.required">必填</span>
                    <span v-if="field.listVisible">列表显示</span>
                    <span v-if="field.queryEnabled">可查询</span>
                  </div>
                </div>
                <el-button link type="danger" size="small" @click.stop="removeField(fieldIndex)">删除</el-button>
              </div>
            </div>
          </section>

          <section class="field-property-panel">
            <template v-if="selectedField">
              <div class="property-heading">
                <div>
                  <strong>{{ selectedField.fieldName || '未命名字段' }}</strong>
                  <small>{{ fieldTypeLabel(selectedField.fieldType) }}</small>
                </div>
                <el-tag size="small" effect="plain">字段属性</el-tag>
              </div>

              <el-tabs v-model="activePropertyTab" class="property-tabs">
                <el-tab-pane label="基础属性" name="basic">
                  <el-form label-position="top" class="property-form">
                    <el-row :gutter="12">
                      <el-col :span="12">
                        <el-form-item label="字段名称" required>
                          <el-input v-model="selectedField.fieldName" placeholder="如 性别" />
                        </el-form-item>
                      </el-col>
                      <AutoInternalCode v-model="selectedField.fieldCode" prefix="fld" />
                      <el-col :span="12">
                        <el-form-item label="字段类型">
                          <el-select v-model="selectedField.fieldType" style="width: 100%" @change="handleFieldTypeChange(selectedField)">
                            <el-option v-for="item in fieldTypes" :key="item.value" :label="item.label" :value="item.value" />
                          </el-select>
                        </el-form-item>
                      </el-col>
                      <el-col :span="12">
                        <el-form-item label="表单布局">
                          <el-select v-model="selectedField.layoutSpan" style="width: 100%">
                            <el-option :value="12" label="半行" />
                            <el-option :value="24" label="整行" />
                          </el-select>
                        </el-form-item>
                      </el-col>
                      <el-col :span="12">
                        <el-form-item label="输入提示">
                          <el-input v-model="selectedField.placeholder" clearable placeholder="字段为空时显示的提示" />
                        </el-form-item>
                      </el-col>
                      <el-col :span="12">
                        <el-form-item label="默认值">
                          <el-input v-model="selectedField.defaultValue" clearable placeholder="新建数据时的默认值" />
                        </el-form-item>
                      </el-col>
                      <el-col :span="24">
                        <el-form-item label="字段说明">
                          <el-input
                            v-model="selectedField.fieldRemark"
                            type="textarea"
                            :rows="3"
                            maxlength="500"
                            show-word-limit
                            placeholder="说明字段用途，也可作为查询条件提示"
                          />
                        </el-form-item>
                      </el-col>
                    </el-row>
                  </el-form>
                </el-tab-pane>

                <el-tab-pane label="显示设置" name="display">
                  <div class="setting-list">
                    <div class="setting-item">
                      <div><strong>启用字段</strong><small>停用后不再参与新数据录入，但历史数据仍会保留</small></div>
                      <el-switch v-model="selectedField.enabled" />
                    </div>
                    <div class="setting-item">
                      <div><strong>必填字段</strong><small>录入表单时必须填写该字段</small></div>
                      <el-switch v-model="selectedField.required" />
                    </div>
                    <div class="setting-item">
                      <div><strong>列表中显示</strong><small>在客户或工单列表中增加该自定义列</small></div>
                      <el-switch v-model="selectedField.listVisible" />
                    </div>
                  </div>
                </el-tab-pane>

                <el-tab-pane label="业务能力" name="capabilities">
                  <div class="setting-list">
                    <div class="setting-item">
                      <div><strong>允许导入</strong><small>资料导入字段映射中允许选择该字段</small></div>
                      <el-switch v-model="selectedField.importEnabled" :disabled="selectedField.fieldType === 'FILE'" />
                    </div>
                    <div class="setting-item">
                      <div><strong>允许导出</strong><small>客户或工单导出时包含该字段</small></div>
                      <el-switch v-model="selectedField.exportEnabled" />
                    </div>
                    <div class="setting-item">
                      <div><strong>允许 AI 填写</strong><small>AI 工单、坐席辅助和 AI 工作流可以自动写入该字段</small></div>
                      <el-switch v-model="selectedField.aiFillEnabled" :disabled="selectedField.fieldType === 'FILE'" />
                    </div>
                    <div class="setting-item">
                      <div>
                        <strong>点击拨号</strong>
                        <small>{{ dialCapabilityTip(selectedField) }}</small>
                      </div>
                      <el-switch v-model="selectedField.dialEnabled" :disabled="!canEnableDial(selectedField)" />
                    </div>
                  </div>
                </el-tab-pane>

                <el-tab-pane label="查询设置" name="query">
                  <div class="setting-list">
                    <div class="setting-item">
                      <div>
                        <strong>作为查询条件</strong>
                        <small>{{ selectedField.fieldType === 'FILE' ? '附件字段不支持查询' : '在业务列表中动态生成该字段的查询控件' }}</small>
                      </div>
                      <el-switch
                        v-model="selectedField.queryEnabled"
                        :disabled="selectedField.fieldType === 'FILE'"
                        @change="ensureQueryMode(selectedField)"
                      />
                    </div>
                  </div>
                  <el-form v-if="selectedField.queryEnabled" label-position="top" class="property-form query-property-form">
                    <el-row :gutter="12">
                      <el-col :span="12">
                        <el-form-item label="查询方式">
                          <el-select v-model="selectedField.queryMode" style="width: 100%">
                            <el-option
                              v-for="item in queryModeOptions(selectedField.fieldType)"
                              :key="item.value"
                              :label="item.label"
                              :value="item.value"
                            />
                          </el-select>
                        </el-form-item>
                      </el-col>
                      <el-col :span="12">
                        <el-form-item label="查询排序">
                          <el-input-number v-model="selectedField.queryOrder" :min="0" :max="999" controls-position="right" style="width: 100%" />
                        </el-form-item>
                      </el-col>
                    </el-row>
                  </el-form>
                </el-tab-pane>

                <el-tab-pane label="选项配置" name="options">
                  <template v-if="optionTypes.includes(selectedField.fieldType)">
                    <div class="option-heading">
                      <span>配置用户可选择的显示名和存储值</span>
                      <el-button link type="primary" @click="addOption(selectedField)">添加选项</el-button>
                    </div>
                    <div class="option-list">
                      <div v-for="(option, optionIndex) in selectedField.options" :key="option.localId" class="option-row">
                        <span class="option-index">{{ optionIndex + 1 }}</span>
                        <el-input v-model="option.label" placeholder="显示名，如 男" />
                        <el-input v-model="option.value" placeholder="存储值，如 MALE" />
                        <el-button link type="danger" @click="selectedField.options.splice(optionIndex, 1)">删除</el-button>
                      </div>
                    </div>
                    <div v-if="!selectedField.options.length" class="option-empty">请至少添加一个完整选项</div>
                  </template>
                  <el-alert v-else type="info" :closable="false" show-icon title="当前字段类型不需要配置选项" />
                </el-tab-pane>

                <el-tab-pane label="校验规则" name="validation">
                  <el-form label-position="top" class="property-form">
                    <el-form-item label="校验规则 JSON">
                      <el-input
                        v-model="selectedField.validationRules"
                        type="textarea"
                        :rows="8"
                        placeholder='例如：[{"min":2,"max":20,"message":"长度为 2 到 20 个字符"}]'
                      />
                      <div class="property-help">高级配置项，留空表示仅使用“必填”规则。</div>
                    </el-form-item>
                  </el-form>
                </el-tab-pane>
              </el-tabs>
            </template>
            <el-empty v-else description="从左侧选择字段后配置属性" :image-size="72" />
          </section>
        </div>

        <section class="preview-section">
          <div class="section-heading preview-section-heading">
            <div>
              <strong>效果预览</strong>
              <small>预览仅用于核对布局和启用状态</small>
            </div>
            <div class="preview-counts">
              <span>{{ editorListCount }} 个列表列</span>
              <span>{{ editorQueryCount }} 个查询条件</span>
            </div>
          </div>
          <el-tabs v-model="previewTab" class="preview-tabs">
            <el-tab-pane label="表单预览" name="form">
              <el-form label-position="top" class="preview-form">
                <el-row :gutter="12">
                  <el-col v-for="field in form.fields" :key="field.localId" :span="field.layoutSpan || 12">
                    <el-form-item :label="field.fieldName || '未命名字段'" :required="field.required">
                      <el-input v-if="field.fieldType === 'INPUT'" :placeholder="field.placeholder || '请输入'" />
                      <el-input v-else-if="field.fieldType === 'TEXTAREA'" type="textarea" :rows="2" :placeholder="field.placeholder || '请输入'" />
                      <el-input-number v-else-if="field.fieldType === 'NUMBER'" controls-position="right" style="width: 100%" />
                      <el-button v-else-if="field.fieldType === 'FILE'" disabled>选择文件</el-button>
                      <el-date-picker v-else-if="field.fieldType === 'DATE'" type="date" placeholder="选择日期" style="width: 100%" />
                      <el-date-picker v-else-if="field.fieldType === 'DATETIME'" type="datetime" placeholder="选择日期时间" style="width: 100%" />
                      <el-radio-group v-else-if="field.fieldType === 'RADIO'">
                        <el-radio v-for="option in validOptions(field)" :key="option.localId" :value="option.value">{{ option.label }}</el-radio>
                      </el-radio-group>
                      <el-checkbox-group v-else-if="field.fieldType === 'CHECKBOX'">
                        <el-checkbox v-for="option in validOptions(field)" :key="option.localId" :value="option.value">{{
                          option.label
                        }}</el-checkbox>
                      </el-checkbox-group>
                      <el-select v-else :multiple="field.fieldType === 'MULTI_SELECT'" placeholder="请选择" style="width: 100%">
                        <el-option v-for="option in validOptions(field)" :key="option.localId" :label="option.label" :value="option.value" />
                      </el-select>
                    </el-form-item>
                  </el-col>
                </el-row>
                <el-empty v-if="!form.fields.length" :image-size="56" description="字段会在这里实时展示" />
              </el-form>
            </el-tab-pane>
            <el-tab-pane :label="`列表列（${editorListCount}）`" name="list">
              <div v-if="editorListFields.length" class="list-preview">
                <span v-for="field in editorListFields" :key="field.localId" class="list-chip">{{
                  field.fieldName || field.fieldCode || '未命名'
                }}</span>
              </div>
              <div v-else class="preview-empty">尚未开启列表显示，对应业务列表不会展示自定义列</div>
            </el-tab-pane>
            <el-tab-pane :label="`查询条件（${editorQueryCount}）`" name="query">
              <div v-if="editorQueryFields.length" class="list-preview">
                <span v-for="field in editorQueryFields" :key="field.localId" class="list-chip">
                  {{ field.fieldName || field.fieldCode || '未命名' }} · {{ queryModeLabel(field.queryMode) }}
                </span>
              </div>
              <div v-else class="preview-empty">尚未开放动态查询字段</div>
            </el-tab-pane>
          </el-tabs>
        </section>
      </div>

      <template #footer>
        <el-button @click="visible = false">取消</el-button>
        <el-button type="primary" @click="submit">保存</el-button>
      </template>
    </el-drawer>
    <TicketCallbackPolicyDialog ref="callbackPolicyDialog" />
  </div>
</template>

<script setup name="FormTemplateManagement" lang="ts">
import AutoInternalCode from '@/components/AutoInternalCode';
import { createInternalCode, ensureInternalCode } from '@/utils/internalCode';
import { checkPermi } from '@/utils/permission';

import { Plus, Rank, Refresh } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { createFormTemplate, deleteFormTemplate, listFormTemplates, updateFormTemplate } from '@/api/callcenter/form-template';
import { FormField, FormFieldOption, FormFieldType, FormQueryMode, FormTemplate } from '@/api/callcenter/form-template/types';
import { listDefinitionOptions } from '@/api/workflow/definition';
import { FlowDefinitionVo } from '@/api/workflow/definition/types';
import TicketCallbackPolicyDialog from './TicketCallbackPolicyDialog.vue';

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
  deadlineEnabled: false,
  resolutionLimitMinutes: 1440,
  remindBeforeMinutes: 120,
  enabled: true,
  fields: []
});
const form = ref<EditableTemplate>(emptyForm());
const callbackPolicyDialog = ref<InstanceType<typeof TicketCallbackPolicyDialog>>();
const canConfigureCallback = computed(() => checkPermi(['callcenter:auto-outbound-task:update']));
const savedTicketTemplate = computed(() =>
  templates.value.find((template) => template.id === form.value.id && template.businessType === 'TICKET')
);
const openCallbackPolicy = () => {
  const template = savedTicketTemplate.value;
  if (template?.id != null) return callbackPolicyDialog.value?.open(template.id, template.templateName);
};
const draggedFieldIndex = ref<number>();
const dragOverFieldIndex = ref<number>();
const selectedFieldId = ref<string>();
const activePropertyTab = ref('basic');
const previewTab = ref('form');

const listVisibleCount = (template: FormTemplate) => template.fields.filter((field) => field.listVisible).length;
const selectedField = computed(() => form.value.fields.find((field) => field.localId === selectedFieldId.value));
const editorListFields = computed(() => form.value.fields.filter((field) => field.listVisible));
const editorListCount = computed(() => editorListFields.value.length);
const editorQueryFields = computed(() =>
  form.value.fields.filter((field) => field.queryEnabled).sort((a, b) => (a.queryOrder || 0) - (b.queryOrder || 0))
);
const editorQueryCount = computed(() => editorQueryFields.value.length);
const queryEnabledCount = (template: FormTemplate) => template.fields.filter((field) => field.queryEnabled).length;

const queryModeOptions = (fieldType: FormFieldType): Array<{ label: string; value: FormQueryMode }> => {
  if (['INPUT', 'TEXTAREA'].includes(fieldType))
    return [
      { label: '模糊匹配', value: 'LIKE' },
      { label: '精确匹配', value: 'EQ' }
    ];
  if (['RADIO', 'SELECT'].includes(fieldType)) return [{ label: '精确匹配', value: 'EQ' }];
  if (['CHECKBOX', 'MULTI_SELECT'].includes(fieldType)) return [{ label: '包含任一', value: 'CONTAINS_ANY' }];
  if (['NUMBER', 'DATE', 'DATETIME'].includes(fieldType))
    return [
      { label: '范围查询', value: 'BETWEEN' },
      { label: '精确匹配', value: 'EQ' }
    ];
  return [];
};
const defaultQueryMode = (fieldType: FormFieldType): FormQueryMode => queryModeOptions(fieldType)[0]?.value || 'AUTO';
const ensureQueryMode = (field: EditableField) => {
  if (!field.queryEnabled) return;
  const options = queryModeOptions(field.fieldType);
  if (!options.some((item) => item.value === field.queryMode)) field.queryMode = defaultQueryMode(field.fieldType);
};
const queryModeLabel = (mode?: FormQueryMode) =>
  ({ LIKE: '模糊', EQ: '精确', BETWEEN: '范围', CONTAINS_ANY: '包含任一', AUTO: '自动' })[mode || 'AUTO'];
const fieldTypeLabel = (fieldType: FormFieldType) => fieldTypes.find((item) => item.value === fieldType)?.label || fieldType;
const selectField = (field: EditableField) => {
  selectedFieldId.value = field.localId;
};

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
  selectedFieldId.value = undefined;
  activePropertyTab.value = 'basic';
  previewTab.value = 'form';
  visible.value = true;
};
const openEdit = (template: FormTemplate) => {
  form.value = {
    ...template,
    fields: template.fields.map((field) => ({
      ...field,
      layoutSpan: field.layoutSpan || 12,
      listVisible: Boolean(field.listVisible),
      queryEnabled: Boolean(field.queryEnabled),
      queryMode: field.queryMode || defaultQueryMode(field.fieldType),
      queryOrder: field.queryOrder ?? field.sortOrder ?? 0,
      importEnabled: field.fieldType !== 'FILE' && field.importEnabled !== false,
      exportEnabled: field.exportEnabled !== false,
      aiFillEnabled: field.fieldType !== 'FILE' && field.aiFillEnabled !== false,
      dialEnabled: Boolean(field.dialEnabled),
      enabled: field.enabled !== false,
      localId: localId(),
      options: (field.options || []).map((option) => ({ ...option, localId: localId() }))
    }))
  };
  selectedFieldId.value = form.value.fields[0]?.localId;
  activePropertyTab.value = 'basic';
  previewTab.value = 'form';
  visible.value = true;
};
const addField = () => {
  const field: EditableField = {
    localId: localId(),
    fieldCode: createInternalCode('fld'),
    fieldName: '',
    fieldType: 'INPUT',
    required: false,
    layoutSpan: 12,
    listVisible: false,
    queryEnabled: false,
    queryMode: 'LIKE',
    queryOrder: form.value.fields.length,
    fieldRemark: '',
    importEnabled: true,
    exportEnabled: true,
    aiFillEnabled: true,
    dialEnabled: false,
    enabled: true,
    options: []
  };
  form.value.fields.push(field);
  selectedFieldId.value = field.localId;
  activePropertyTab.value = 'basic';
};
const removeField = (fieldIndex: number) => {
  const [removed] = form.value.fields.splice(fieldIndex, 1);
  if (removed?.localId !== selectedFieldId.value) return;
  selectedFieldId.value = form.value.fields[fieldIndex]?.localId || form.value.fields[fieldIndex - 1]?.localId;
};
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
  if (field.fieldType === 'FILE') {
    field.queryEnabled = false;
    field.importEnabled = false;
    field.aiFillEnabled = false;
  }
  if (!canEnableDial(field)) field.dialEnabled = false;
  field.queryMode = defaultQueryMode(field.fieldType);
};
const canEnableDial = (field: EditableField) => form.value.businessType === 'CUSTOMER' && field.fieldType === 'INPUT';
const dialCapabilityTip = (field: EditableField) =>
  canEnableDial(field) ? '字段值将显示拨号操作，号码仍会经过外呼权限和线路策略' : '仅客户表单的输入框字段支持点击拨号';
const validOptions = (field: EditableField) => field.options.filter((option) => option.label && option.value);
const workflowLabel = (workflowCode?: string) => {
  if (!workflowCode) return '未绑定';
  const definition = workflowOptions.value.find((item) => item.flowCode === workflowCode);
  return definition ? `${definition.flowName}（${workflowCode}）` : workflowCode;
};
const deadlineDurationLabel = (minutes?: number) => {
  if (!minutes) return '-';
  if (minutes % 1440 === 0) return `${minutes / 1440} 天`;
  if (minutes % 60 === 0) return `${minutes / 60} 小时`;
  return `${minutes} 分钟`;
};
const submit = async () => {
  form.value.templateCode = ensureInternalCode(form.value.templateCode, 'tpl');
  form.value.fields.forEach((field) => { field.fieldCode = ensureInternalCode(field.fieldCode, 'fld'); });
  if (!form.value.templateCode || !form.value.templateName) {
    ElMessage.warning('请填写模板名称');
    return;
  }
  if (form.value.fields.some((field) => !field.fieldCode || !field.fieldName)) {
    ElMessage.warning('请填写所有字段的名称');
    return;
  }
  if (form.value.fields.some((field) => optionTypes.includes(field.fieldType) && !validOptions(field).length)) {
    ElMessage.warning('单选、多选和下拉字段至少需要一个完整选项');
    return;
  }
  if (form.value.businessType === 'TICKET' && form.value.deadlineEnabled) {
    if (!form.value.resolutionLimitMinutes || form.value.resolutionLimitMinutes <= 0) {
      ElMessage.warning('请配置有效的办结时限');
      return;
    }
    if ((form.value.remindBeforeMinutes || 0) >= form.value.resolutionLimitMinutes) {
      ElMessage.warning('提前提醒时间必须小于办结时限');
      return;
    }
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
      queryEnabled: Boolean(field.queryEnabled),
      queryMode: field.queryEnabled ? field.queryMode || defaultQueryMode(field.fieldType) : undefined,
      queryOrder: field.queryOrder ?? index,
      fieldRemark: field.fieldRemark,
      importEnabled: Boolean(field.importEnabled),
      exportEnabled: Boolean(field.exportEnabled),
      aiFillEnabled: Boolean(field.aiFillEnabled),
      dialEnabled: Boolean(field.dialEnabled),
      enabled: field.enabled !== false,
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
    if (businessType !== 'TICKET') {
      form.value.workflowCode = undefined;
      form.value.deadlineEnabled = false;
    }
    if (businessType !== 'CUSTOMER') form.value.fields.forEach((field) => (field.dialEnabled = false));
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
  background: radial-gradient(circle at 0% 0%, rgba(56, 189, 248, 0.08), transparent 42%), linear-gradient(180deg, #ffffff, #f7fbff);
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
  font-size: 11px;

  b {
    margin: 0 2px;
    color: #153b60;
    font-weight: 600;
  }
}

.template-table :deep(.el-table__header th) {
  font-size: 12px;
  font-weight: 500;
}

.template-table :deep(.el-table__cell) {
  padding: 7px 0;
  font-size: 12px;
}

.template-table :deep(.el-tag) {
  height: 21px;
  padding: 0 7px;
  font-size: 11px;
}

.template-table :deep(.el-button) {
  font-size: 12px;
}

.template-cell {
  display: flex;
  align-items: center;

  strong {
    color: #17324d;
    font-size: 13px;
    font-weight: 500;
  }
}

.count-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  color: #475569;
  font-size: 11px;
}

.list-count {
  color: #2563eb;
}

.row-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
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
  font-size: 11px;
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

.deadline-config {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  color: #475569;
  font-size: 13px;
}

.deadline-config :deep(.el-input-number) {
  width: 130px;
}

.deadline-label {
  margin-left: 6px;
}

.editor-grid {
  display: grid;
  grid-template-columns: 310px minmax(0, 1fr);
  gap: 14px;
  align-items: stretch;
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

.field-list-panel,
.field-property-panel,
.preview-section {
  min-width: 0;
  border: 1px solid #e4ecf6;
  border-radius: 12px;
  background: #fff;
}

.field-list-panel {
  display: flex;
  flex-direction: column;
  min-height: 500px;
  padding: 14px;
}

.field-list {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 7px;
  max-height: 560px;
  overflow-y: auto;
  padding-right: 3px;
}

.field-list-item {
  display: grid;
  grid-template-columns: 26px 24px minmax(0, 1fr) auto;
  gap: 7px;
  align-items: center;
  min-height: 76px;
  padding: 9px 8px;
  border: 1px solid #e8eef6;
  border-radius: 9px;
  background: #fff;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease,
    opacity 0.15s ease;
}

.field-list-item:hover {
  border-color: #c5d8ff;
  background: #fafcff;
}

.field-list-item.is-active {
  border-color: #79a8ff;
  background: #f1f6ff;
  box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.08);
}

.field-list-item.is-dragging {
  opacity: 0.45;
}

.field-list-item.is-drag-over {
  box-shadow: inset 0 0 0 2px rgba(59, 130, 246, 0.3);
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
  font-weight: 500;
}

.field-list-content {
  min-width: 0;
}

.field-list-title {
  overflow: hidden;
  color: #243b53;
  font-size: 13px;
  line-height: 20px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.field-list-meta {
  display: flex;
  gap: 6px;
  min-width: 0;
  color: #94a3b8;
  font-size: 11px;
}

.field-list-meta span:last-child {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.field-list-flags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
}

.field-list-flags span {
  padding: 1px 5px;
  border-radius: 4px;
  background: #eaf2ff;
  color: #3574cf;
  font-size: 10px;
  line-height: 16px;
}

.field-property-panel {
  min-height: 500px;
  padding: 14px 16px;
}

.property-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid #edf1f6;
}

.property-heading strong,
.property-heading small {
  display: block;
}

.property-heading strong {
  color: #1f3349;
  font-size: 14px;
  font-weight: 500;
}

.property-heading small {
  margin-top: 2px;
  color: #94a3b8;
  font-size: 11px;
}

.property-tabs {
  margin-top: 2px;
}

.property-tabs :deep(.el-tabs__item),
.preview-tabs :deep(.el-tabs__item) {
  height: 38px;
  font-size: 12px;
  font-weight: 400;
}

.property-form {
  padding: 8px 2px 0;
}

.property-form :deep(.el-form-item) {
  margin-bottom: 13px;
}

.property-form :deep(.el-form-item__label) {
  margin-bottom: 3px;
  color: #52677d;
  font-size: 12px;
  font-weight: 400;
}

.property-help {
  margin-top: 6px;
  color: #94a3b8;
  font-size: 11px;
  line-height: 1.5;
}

.setting-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 8px;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 13px 14px;
  border: 1px solid #e8eef6;
  border-radius: 9px;
  background: #fafcff;
}

.setting-item strong,
.setting-item small {
  display: block;
}

.setting-item strong {
  color: #334e68;
  font-size: 13px;
  font-weight: 500;
}

.setting-item small {
  margin-top: 3px;
  color: #94a3b8;
  font-size: 11px;
}

.query-property-form {
  margin-top: 10px;
  padding: 12px 14px 0;
  border-radius: 9px;
  background: #f8fafc;
}

.option-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  padding: 8px 2px;
  color: #64748b;
  font-size: 12px;
}

.option-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.option-row {
  display: grid;
  grid-template-columns: 28px 1fr 1fr auto;
  gap: 8px;
  align-items: center;
}

.option-index {
  color: #94a3b8;
  font-size: 12px;
  text-align: center;
}

.option-empty {
  color: #94a3b8;
  font-size: 12px;
}

.preview-section {
  margin-bottom: 20px;
  padding: 14px;
}

.preview-section-heading {
  margin-bottom: 0;
}

.preview-counts {
  display: flex;
  gap: 6px;
}

.preview-counts span {
  padding: 3px 8px;
  border-radius: 999px;
  background: #f1f5f9;
  color: #64748b;
  font-size: 11px;
}

.preview-tabs :deep(.el-tab-pane) {
  min-height: 90px;
  padding: 6px 2px 2px;
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
  font-weight: 400;
}

@media (max-width: 1100px) {
  .editor-grid {
    grid-template-columns: 1fr;
  }

  .field-list-panel {
    min-height: auto;
  }

  .field-list {
    max-height: 320px;
  }

  .meta-bar {
    grid-template-columns: 1fr 1fr;
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
