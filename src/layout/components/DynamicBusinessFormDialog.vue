<template>
  <component
    :is="ElDrawer"
    v-model="visible"
    :title="dialogTitle"
    :size="businessType === 'CUSTOMER' ? 'min(680px, 92vw)' : 'min(760px, 92vw)'"
    append-to-body
    destroy-on-close
  >
    <el-form label-position="top">
      <div class="default-field-section">
        <div class="section-title">默认信息</div>
        <el-alert
          v-if="businessType === 'CUSTOMER' && existingCustomer"
          class="existing-customer-alert"
          type="success"
          :closable="false"
          title="该电话号码已存在，已自动带入客户信息。修改后将更新现有客户，不会重复创建。"
          show-icon
        />
        <el-row :gutter="14">
          <el-col :span="12">
            <el-form-item :label="businessType === 'CUSTOMER' ? '客户电话' : '来电号码'" :required="businessType === 'CUSTOMER'">
              <el-input v-model="phone" :disabled="Boolean(existingCustomer)" />
            </el-form-item>
          </el-col>
          <el-col v-if="businessType === 'TICKET'" :span="12">
            <el-form-item label="紧急程度">
              <el-select v-model="urgencyLevelId" style="width: 100%" placeholder="选择紧急程度">
                <el-option v-for="level in urgencyLevels" :key="String(level.id)" :label="level.levelName" :value="level.id">
                  <div class="urgency-option">
                    <span class="urgency-dot" :style="{ backgroundColor: level.tagColor }" />
                    <span>{{ level.levelName }}</span>
                    <small>权重 {{ level.priorityWeight }}</small>
                  </div>
                </el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col v-if="businessType === 'CUSTOMER'" :span="12">
            <el-form-item label="客户姓名">
              <el-input v-model="customerName" placeholder="可选，客户不提供时留空" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="业务模板">
              <el-select v-model="templateId" clearable style="width: 100%" placeholder="选择模板">
                <el-option
                  v-for="template in templates"
                  :key="String(template.id)"
                  :label="template.templateName"
                  :value="template.id"
                  :disabled="!template.enabled"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col v-if="businessType === 'CUSTOMER' && canAssociateImportTask" :span="24">
            <el-form-item label="关联资料导入任务">
              <el-select
                v-model="importTaskId"
                clearable
                filterable
                :loading="importTasksLoading"
                style="width: 100%"
                placeholder="可选，保存后归入资料导入任务"
              >
                <el-option v-for="task in importTasks" :key="String(task.id)" :label="task.taskName" :value="task.id" />
              </el-select>
              <div class="field-tip">关联后可在资料导入任务和资料分配中查询该客户。</div>
            </el-form-item>
          </el-col>
        </el-row>
      </div>
      <div v-if="selectedTemplate" class="custom-field-section">
        <div class="section-title">自定义字段 · {{ selectedTemplate.templateName }}</div>
        <el-row :gutter="14">
          <el-col v-for="field in selectedTemplate.fields" :key="field.fieldCode" :span="field.layoutSpan || 12">
            <el-form-item :label="field.fieldName" :required="field.required">
              <el-input v-if="field.fieldType === 'INPUT'" v-model="formData[field.fieldCode]" :placeholder="field.placeholder" />
              <el-input
                v-else-if="field.fieldType === 'TEXTAREA'"
                v-model="formData[field.fieldCode]"
                type="textarea"
                :placeholder="field.placeholder"
              />
              <el-input-number v-else-if="field.fieldType === 'NUMBER'" v-model="formData[field.fieldCode]" />
              <file-upload v-else-if="field.fieldType === 'FILE'" v-model="formData[field.fieldCode]" :limit="5" :file-size="20" />
              <el-date-picker
                v-else-if="field.fieldType === 'DATE' || field.fieldType === 'DATETIME'"
                v-model="formData[field.fieldCode]"
                :type="field.fieldType === 'DATE' ? 'date' : 'datetime'"
                value-format="YYYY-MM-DD HH:mm:ss"
              />
              <el-radio-group v-else-if="field.fieldType === 'RADIO'" v-model="formData[field.fieldCode]">
                <el-radio v-for="option in field.options" :key="option.value" :value="option.value">{{ option.label }}</el-radio>
              </el-radio-group>
              <el-checkbox-group v-else-if="field.fieldType === 'CHECKBOX'" v-model="formData[field.fieldCode]">
                <el-checkbox v-for="option in field.options" :key="option.value" :value="option.value">{{ option.label }}</el-checkbox>
              </el-checkbox-group>
              <el-select v-else v-model="formData[field.fieldCode]" :multiple="field.fieldType === 'MULTI_SELECT'" style="width: 100%">
                <el-option v-for="option in field.options" :key="option.value" :label="option.label" :value="option.value" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
      </div>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="submit">{{ existingCustomer ? '更新客户' : '保存' }}</el-button>
    </template>
  </component>
</template>

<script setup lang="ts">
import { ElDrawer, ElMessage } from 'element-plus';
import { createCustomer, CustomerVO, getCustomerByPhone, updateCustomer } from '@/api/callcenter/customer';
import { listFormTemplates } from '@/api/callcenter/form-template';
import { FormBusinessType, FormTemplate } from '@/api/callcenter/form-template/types';
import { createTicket, listTicketUrgencyLevels, type TicketUrgencyLevelVO } from '@/api/callcenter/ticket';
import { pageImportTasks, type CustomerImportTaskVO } from '@/api/callcenter/customer-import-task';
import { checkPermi } from '@/utils/permission';

const props = withDefaults(defineProps<{ businessType: FormBusinessType; phoneNumber?: string; callId?: string }>(), {
  phoneNumber: '',
  callId: ''
});
const emit = defineEmits<{ saved: [] }>();
const visible = defineModel<boolean>({ default: false });
const templates = ref<FormTemplate[]>([]);
const templateId = ref<string | number>();
const phone = ref('');
const customerName = ref('');
const formData = reactive<Record<string, any>>({});
const submitting = ref(false);
const existingCustomer = ref<CustomerVO>();
const importTasks = ref<CustomerImportTaskVO[]>([]);
const importTaskId = ref<string | number>();
const importTasksLoading = ref(false);
const urgencyLevels = ref<TicketUrgencyLevelVO[]>([]);
const urgencyLevelId = ref<string | number>();
const selectedTemplate = computed(() => templates.value.find((template) => String(template.id) === String(templateId.value)));
const enabledTemplates = computed(() => templates.value.filter((template) => template.enabled));
const canAssociateImportTask = computed(() => checkPermi(['callcenter:customer-import-task:list']));
const dialogTitle = computed(() => {
  if (props.businessType !== 'CUSTOMER') {
    return '创建工单';
  }
  return existingCustomer.value ? '编辑客户' : '新建客户';
});
let lookupTimer: ReturnType<typeof setTimeout> | undefined;

const loadImportTasks = async () => {
  if (props.businessType !== 'CUSTOMER' || !canAssociateImportTask.value) return;
  importTasksLoading.value = true;
  try {
    const response = await pageImportTasks({ pageNum: 1, pageSize: 200, status: 'ENABLED' });
    importTasks.value = response.rows || [];
  } finally {
    importTasksLoading.value = false;
  }
};

const populateFormData = (template?: FormTemplate) => {
  Object.keys(formData).forEach((key) => delete formData[key]);
  template?.fields.forEach((field) => {
    const existingValue = existingCustomer.value?.formData?.[field.fieldCode];
    formData[field.fieldCode] =
      existingValue ?? (field.fieldType === 'CHECKBOX' || field.fieldType === 'MULTI_SELECT' ? [] : field.defaultValue || '');
  });
};

const lookupCustomer = async () => {
  if (!phone.value.trim()) {
    existingCustomer.value = undefined;
    return;
  }
  const queriedPhone = phone.value.trim();
  const response = await getCustomerByPhone(queriedPhone);
  if (phone.value.trim() !== queriedPhone) return;
  existingCustomer.value = response.data || undefined;
  if (props.businessType !== 'CUSTOMER') return;
  if (!existingCustomer.value) {
    customerName.value = '';
    templateId.value = enabledTemplates.value.length === 1 ? enabledTemplates.value[0].id : undefined;
    populateFormData(selectedTemplate.value);
    return;
  }
  customerName.value = existingCustomer.value.customerName || '';
  templateId.value = existingCustomer.value.templateId;
  populateFormData(selectedTemplate.value);
};

watch(visible, async (opened) => {
  if (!opened) return;
  phone.value = props.phoneNumber;
  customerName.value = '';
  existingCustomer.value = undefined;
  templateId.value = undefined;
  importTaskId.value = undefined;
  importTasks.value = [];
  urgencyLevelId.value = undefined;
  Object.keys(formData).forEach((key) => delete formData[key]);
  const [response, urgencyResponse] = await Promise.all([
    listFormTemplates(props.businessType),
    props.businessType === 'TICKET' ? listTicketUrgencyLevels() : Promise.resolve(undefined),
    loadImportTasks()
  ]);
  templates.value = response.data;
  urgencyLevels.value = urgencyResponse?.data || [];
  urgencyLevelId.value = urgencyLevels.value.find((level) => level.isDefault)?.id || urgencyLevels.value[0]?.id;
  if (enabledTemplates.value.length === 1) templateId.value = enabledTemplates.value[0].id;
  await lookupCustomer();
});

watch(selectedTemplate, (template) => {
  populateFormData(template);
});

watch(phone, () => {
  existingCustomer.value = undefined;
  clearTimeout(lookupTimer);
  lookupTimer = setTimeout(lookupCustomer, 400);
});

const submit = async () => {
  if (props.businessType === 'CUSTOMER' && !phone.value.trim()) {
    ElMessage.warning('客户电话不能为空');
    return;
  }
  submitting.value = true;
  try {
    if (props.businessType === 'CUSTOMER') {
      if (existingCustomer.value) {
        await updateCustomer(existingCustomer.value.id, {
          customerName: customerName.value || undefined,
          sourceCallId: props.callId || existingCustomer.value.sourceCallId,
          templateId: templateId.value,
          importTaskId: importTaskId.value,
          formData
        });
      } else {
        await createCustomer({
          primaryPhone: phone.value,
          customerName: customerName.value || undefined,
          templateId: templateId.value,
          importTaskId: importTaskId.value,
          sourceCallId: props.callId || undefined,
          formData
        });
      }
    } else {
      await createTicket({
        customerId: existingCustomer.value?.id,
        callerNumber: phone.value,
        templateId: templateId.value,
        urgencyLevelId: urgencyLevelId.value,
        sourceCallId: props.callId || undefined,
        formData
      });
    }
    if (props.businessType !== 'CUSTOMER') {
      ElMessage.success('工单创建成功');
    } else {
      ElMessage.success(`${existingCustomer.value ? '客户更新成功' : '客户创建成功'}${importTaskId.value ? '，已关联资料导入任务' : ''}`);
    }
    visible.value = false;
    emit('saved');
  } finally {
    submitting.value = false;
  }
};
</script>

<style scoped lang="scss">
.default-field-section,
.custom-field-section {
  padding: 14px;
  border-radius: 10px;
}
.default-field-section {
  background: #f7f9fc;
}
.custom-field-section {
  margin-top: 16px;
  border: 1px dashed #9eb2cc;
  background: #fbfdff;
}
.section-title {
  margin-bottom: 12px;
  font-weight: 600;
  color: #303133;
}
.existing-customer-alert {
  margin-bottom: 14px;
}
.field-tip {
  margin-top: 5px;
  color: #909399;
  font-size: 12px;
  line-height: 18px;
}
.urgency-option {
  display: flex;
  align-items: center;
  gap: 8px;
}
.urgency-option small {
  margin-left: auto;
  color: #909399;
}
.urgency-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
</style>
