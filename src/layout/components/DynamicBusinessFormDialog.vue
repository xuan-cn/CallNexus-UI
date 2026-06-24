<template>
  <el-dialog v-model="visible" :title="businessType === 'CUSTOMER' ? '新建客户' : '创建工单'" width="760px" append-to-body>
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
  </el-dialog>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus';
import { createCustomer, CustomerVO, getCustomerByPhone, updateCustomer } from '@/api/callcenter/customer';
import { listFormTemplates } from '@/api/callcenter/form-template';
import { FormBusinessType, FormTemplate } from '@/api/callcenter/form-template/types';
import { createTicket } from '@/api/callcenter/ticket';

const props = defineProps<{ businessType: FormBusinessType; phoneNumber: string; callId: string }>();
const visible = defineModel<boolean>({ default: false });
const templates = ref<FormTemplate[]>([]);
const templateId = ref<string | number>();
const phone = ref('');
const customerName = ref('');
const formData = reactive<Record<string, any>>({});
const submitting = ref(false);
const existingCustomer = ref<CustomerVO>();
const selectedTemplate = computed(() => templates.value.find((template) => String(template.id) === String(templateId.value)));
const enabledTemplates = computed(() => templates.value.filter((template) => template.enabled));
let lookupTimer: ReturnType<typeof setTimeout> | undefined;

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
  Object.keys(formData).forEach((key) => delete formData[key]);
  const response = await listFormTemplates(props.businessType);
  templates.value = response.data;
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
          sourceCallId: props.callId,
          templateId: templateId.value,
          formData
        });
      } else {
        await createCustomer({
          primaryPhone: phone.value,
          customerName: customerName.value || undefined,
          templateId: templateId.value,
          sourceCallId: props.callId,
          formData
        });
      }
    } else {
      await createTicket({
        customerId: existingCustomer.value?.id,
        callerNumber: phone.value,
        templateId: templateId.value,
        sourceCallId: props.callId,
        formData
      });
    }
    ElMessage.success(props.businessType === 'CUSTOMER' ? (existingCustomer.value ? '客户更新成功' : '客户创建成功') : '工单创建成功');
    visible.value = false;
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
</style>
