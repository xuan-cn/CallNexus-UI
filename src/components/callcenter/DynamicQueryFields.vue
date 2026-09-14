<template>
  <template v-for="field in visibleFields" :key="field.fieldCode">
    <el-form-item :label="field.fieldName">
      <el-input
        v-if="field.queryMode === 'LIKE' || (field.queryMode === 'EQ' && ['INPUT', 'TEXTAREA'].includes(field.fieldType))"
        :model-value="modelValue[field.fieldCode] as string"
        clearable
        :placeholder="field.placeholder || `请输入${field.fieldName}`"
        @update:model-value="update(field.fieldCode, $event)"
        @keyup.enter="$emit('search')"
      />
      <el-select
        v-else-if="field.queryMode === 'EQ'"
        :model-value="scalarValue(field.fieldCode)"
        clearable
        filterable
        :placeholder="`请选择${field.fieldName}`"
        @update:model-value="update(field.fieldCode, $event)"
      >
        <el-option v-for="option in field.options" :key="option.value" :label="option.label" :value="option.value" />
      </el-select>
      <el-select
        v-else-if="field.queryMode === 'CONTAINS_ANY'"
        :model-value="multiValues(field.fieldCode)"
        multiple
        collapse-tags
        clearable
        :placeholder="`请选择${field.fieldName}`"
        @update:model-value="update(field.fieldCode, $event)"
      >
        <el-option v-for="option in field.options" :key="option.value" :label="option.label" :value="option.value" />
      </el-select>
      <el-date-picker
        v-else-if="field.queryMode === 'BETWEEN' && field.fieldType === 'DATE'"
        :model-value="dateRange(field.fieldCode)"
        type="daterange"
        value-format="YYYY-MM-DD"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        @update:model-value="update(field.fieldCode, $event)"
      />
      <el-date-picker
        v-else-if="field.queryMode === 'BETWEEN' && field.fieldType === 'DATETIME'"
        :model-value="dateRange(field.fieldCode)"
        type="datetimerange"
        value-format="YYYY-MM-DD HH:mm:ss"
        start-placeholder="开始时间"
        end-placeholder="结束时间"
        @update:model-value="update(field.fieldCode, $event)"
      />
      <div v-else-if="field.queryMode === 'BETWEEN'" class="number-range">
        <el-input-number :model-value="numberRange(field.fieldCode)[0]" controls-position="right" @update:model-value="updateRange(field.fieldCode, 0, $event)" />
        <span>至</span>
        <el-input-number :model-value="numberRange(field.fieldCode)[1]" controls-position="right" @update:model-value="updateRange(field.fieldCode, 1, $event)" />
      </div>
    </el-form-item>
  </template>
  <el-form-item v-if="fields.length > 4">
    <el-button link type="primary" @click="expanded = !expanded">{{ expanded ? '收起筛选' : `更多筛选（${fields.length - 4}）` }}</el-button>
  </el-form-item>
</template>

<script setup lang="ts">
import type { FormQueryField } from '@/api/callcenter/form-template/types';

const props = defineProps<{ fields: FormQueryField[]; modelValue: Record<string, unknown> }>();
const emit = defineEmits<{ (event: 'update:modelValue', value: Record<string, unknown>): void; (event: 'search'): void }>();
const expanded = ref(false);
const visibleFields = computed(() => (expanded.value ? props.fields : props.fields.slice(0, 4)));

const update = (fieldCode: string, value: unknown) => emit('update:modelValue', { ...props.modelValue, [fieldCode]: value });
const scalarValue = (fieldCode: string) => props.modelValue[fieldCode] as string | number | undefined;
const multiValues = (fieldCode: string) => (Array.isArray(props.modelValue[fieldCode]) ? props.modelValue[fieldCode] : []) as string[];
const dateRange = (fieldCode: string) => (Array.isArray(props.modelValue[fieldCode]) ? props.modelValue[fieldCode] : undefined) as string[] | undefined;
const numberRange = (fieldCode: string) => (Array.isArray(props.modelValue[fieldCode]) ? props.modelValue[fieldCode] : [undefined, undefined]) as Array<number | undefined>;
const updateRange = (fieldCode: string, index: number, value: number | undefined) => {
  const range = [...numberRange(fieldCode)];
  range[index] = value;
  update(fieldCode, range);
};
</script>

<style scoped>
.number-range { display: flex; align-items: center; gap: 6px; }
.number-range :deep(.el-input-number) { width: 112px; }
</style>
