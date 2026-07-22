<template>
  <div class="external-number-editor">
    <el-form label-position="top" size="small" class="external-number-form">
      <div class="section-card">
        <div class="section-title">基础策略</div>
        <div class="field-stack">
          <el-form-item label="转接策略">
            <el-select :model-value="form.strategy" style="width: 100%" @change="updateField('strategy', $event)">
              <el-option label="顺序：按列表从上到下拨打" value="ORDER" />
              <el-option label="轮询：每次来电轮换起始号码" value="ROUND_ROBIN" />
              <el-option label="记忆：同一主叫优先找上次号码" value="MEMORY" />
            </el-select>
          </el-form-item>
          <el-form-item label="外呼策略（可选）">
            <el-select
              :model-value="form.outboundPolicyId"
              :loading="policyLoading"
              placeholder="留空时使用节点默认外呼策略或默认外呼线路"
              style="width: 100%"
              filterable
              clearable
              @change="updateField('outboundPolicyId', $event || '')"
            >
              <el-option
                v-for="policy in outboundPolicies"
                :key="policy.id"
                :label="`${policy.nodeName || policy.nodeId} / ${policy.policyName}（${policy.policyCode}）`"
                :value="policy.id"
              />
            </el-select>
          </el-form-item>
        </div>
        <div class="field-stack compact-row">
          <el-form-item label="单个号码振铃超时">
            <el-input-number
              :model-value="form.ringTimeoutSeconds"
              :min="5"
              :max="120"
              controls-position="right"
              @change="updateField('ringTimeoutSeconds', Number($event || 20))"
            />
          </el-form-item>
          <el-form-item label="失败后继续下一个">
            <el-switch :model-value="form.failoverEnabled" @change="updateField('failoverEnabled', Boolean($event))" />
          </el-form-item>
        </div>
      </div>

      <div class="section-card">
        <div class="numbers-title">
          <span>外线号码</span>
          <el-button type="primary" link @click="addNumber">添加号码</el-button>
        </div>
        <el-table :data="form.numbers" border size="small" empty-text="请添加手机或外线号码">
          <el-table-column label="名称" min-width="82">
            <template #default="{ row, $index }">
              <el-input :model-value="row.name" placeholder="可选" @input="updateNumber($index, 'name', $event)" />
            </template>
          </el-table-column>
          <el-table-column label="号码" min-width="120">
            <template #default="{ row, $index }">
              <el-input :model-value="row.number" placeholder="例如 13800000000" @input="updateNumber($index, 'number', $event)" />
            </template>
          </el-table-column>
          <el-table-column label="排序" width="68">
            <template #default="{ row, $index }">
              <el-input-number
                :model-value="row.sortOrder || $index + 1"
                :min="1"
                controls-position="right"
                @change="updateNumber($index, 'sortOrder', Number($event || $index + 1))"
              />
            </template>
          </el-table-column>
          <el-table-column label="启用" width="58">
            <template #default="{ row, $index }">
              <el-switch :model-value="row.enabled !== false" @change="updateNumber($index, 'enabled', Boolean($event))" />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="58">
            <template #default="{ $index }">
              <el-button type="danger" link @click="removeNumber($index)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <el-collapse v-model="advancedPanels" class="advanced-collapse">
        <el-collapse-item name="normalize">
          <template #title>
            <span class="collapse-title">拨号规范化</span>
            <span class="collapse-tip">座机区号、出局前缀和 +86 处理</span>
          </template>
          <div class="normalize-box">
            <div class="field-stack">
              <el-form-item label="本地区号">
                <el-input
                  :model-value="form.localAreaCode"
                  placeholder="例如 0451，留空则不补本地区号"
                  clearable
                  @input="updateField('localAreaCode', $event)"
                />
              </el-form-item>
              <el-form-item label="出局前缀">
                <el-input
                  :model-value="form.outboundPrefix"
                  placeholder="例如 9，通常留空"
                  clearable
                  @input="updateField('outboundPrefix', $event)"
                />
              </el-form-item>
            </div>
            <div class="switch-stack">
              <div class="switch-item">
                <span>本地固话补区号</span>
                <el-switch :model-value="form.addLocalAreaCode" @change="updateField('addLocalAreaCode', Boolean($event))" />
              </div>
              <div class="switch-item">
                <span>+86 手机号转国内号码</span>
                <el-switch
                  :model-value="form.stripChinaCountryCode !== false"
                  @change="updateField('stripChinaCountryCode', Boolean($event))"
                />
              </div>
            </div>
          </div>
        </el-collapse-item>
      </el-collapse>

      <el-alert
        class="mt-2"
        type="info"
        :closable="false"
        title="发布后，呼入命中该节点会通过外呼线路桥接到号码组；正在通话中不会重新计算策略。"
      />
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { listOutboundLinePolicies } from '@/api/callcenter/outbound-line-policy';
import type { OutboundLinePolicyVO } from '@/api/callcenter/outbound-line-policy/types';
import type { IvrExternalNumberGroupConfig, IvrExternalNumberTarget } from '@/api/callcenter/ivr-flow/types';

const props = defineProps<{
  modelValue?: IvrExternalNumberGroupConfig;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: IvrExternalNumberGroupConfig): void;
}>();

const defaultValue = (): IvrExternalNumberGroupConfig => ({
  strategy: 'ORDER',
  outboundPolicyId: '',
  ringTimeoutSeconds: 20,
  failoverEnabled: true,
  localAreaCode: '',
  addLocalAreaCode: false,
  stripChinaCountryCode: true,
  outboundPrefix: '',
  numbers: []
});

const normalize = (value?: IvrExternalNumberGroupConfig): IvrExternalNumberGroupConfig => ({
  ...defaultValue(),
  ...(value || {}),
  numbers: (value?.numbers || []).map((item, index) => ({
    number: item.number || '',
    name: item.name || '',
    sortOrder: item.sortOrder || index + 1,
    enabled: item.enabled !== false
  }))
});

const form = ref<IvrExternalNumberGroupConfig>(normalize(props.modelValue));
const policyLoading = ref(false);
const outboundPolicies = ref<OutboundLinePolicyVO[]>([]);
const advancedPanels = ref<string[]>([]);

watch(
  () => props.modelValue,
  (value) => {
    form.value = normalize(value);
  },
  { deep: true }
);

const emitChange = () => {
  emit('update:modelValue', {
    ...form.value,
    numbers: [...(form.value.numbers || [])]
  });
};

const updateField = (key: keyof IvrExternalNumberGroupConfig, value: unknown) => {
  form.value = { ...form.value, [key]: value };
  emitChange();
};

const addNumber = () => {
  const numbers = [...(form.value.numbers || [])];
  numbers.push({ number: '', name: '', sortOrder: numbers.length + 1, enabled: true });
  form.value = { ...form.value, numbers };
  emitChange();
};

const updateNumber = (index: number, key: keyof IvrExternalNumberTarget, value: unknown) => {
  const numbers = [...(form.value.numbers || [])];
  numbers[index] = { ...numbers[index], [key]: value };
  form.value = { ...form.value, numbers };
  emitChange();
};

const removeNumber = (index: number) => {
  const numbers = [...(form.value.numbers || [])];
  numbers.splice(index, 1);
  form.value = { ...form.value, numbers };
  emitChange();
};

const loadOutboundPolicies = async () => {
  policyLoading.value = true;
  try {
    const response: any = await listOutboundLinePolicies({ enabled: true, pageNum: 1, pageSize: 200 });
    outboundPolicies.value = response.rows || response.data?.rows || response.data || [];
  } finally {
    policyLoading.value = false;
  }
};

onMounted(loadOutboundPolicies);
</script>

<style scoped>
.external-number-editor {
  width: 100%;
}

.external-number-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.external-number-form :deep(.el-form-item) {
  margin-bottom: 10px;
}

.external-number-form :deep(.el-input-number) {
  width: 100%;
}

.external-number-form :deep(.el-table .el-input-number) {
  width: 50px;
}

.external-number-form :deep(.el-table .el-input-number .el-input__wrapper) {
  padding-left: 4px;
  padding-right: 4px;
}

.external-number-form :deep(.el-table .el-input__wrapper) {
  padding-left: 8px;
  padding-right: 8px;
}

.section-card {
  padding: 10px 12px 2px;
  border: 1px solid #e9edf5;
  border-radius: 10px;
  background: #fff;
}

.section-title {
  margin-bottom: 10px;
  font-size: 13px;
  font-weight: 600;
  color: #1f2d3d;
}

.inline-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.field-stack {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2px;
}

.compact-row {
  align-items: end;
}

.numbers-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 0 8px;
  font-weight: 600;
  color: #303133;
}

.advanced-collapse {
  padding: 0 12px;
  border: 1px solid #e9edf5;
  border-radius: 10px;
  background: #fff;
}

.advanced-collapse :deep(.el-collapse) {
  border: 0;
}

.advanced-collapse :deep(.el-collapse-item__header),
.advanced-collapse :deep(.el-collapse-item__wrap) {
  border-bottom: 0;
}

.collapse-title {
  font-size: 13px;
  font-weight: 600;
  color: #1f2d3d;
}

.collapse-tip {
  margin-left: 8px;
  font-size: 12px;
  color: #909399;
}

.normalize-box {
  padding: 8px 0 2px;
  background: #fafcff;
}

.switch-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.switch-stack {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

.switch-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 32px;
  padding: 0 10px;
  border: 1px solid #edf1f7;
  border-radius: 8px;
  background: #fff;
  font-size: 12px;
  color: #606266;
}

@media (max-width: 560px) {
  .inline-row,
  .switch-row,
  .switch-stack,
  .field-stack {
    grid-template-columns: 1fr;
  }
}
</style>
