<template>
  <el-select :model-value="modelValue" filterable style="width: 100%" placeholder="请选择工作时间方案" @change="emit('update:modelValue', $event)">
    <el-option v-for="plan in businessHoursOptions" :key="plan.id" :label="plan.planName" :value="plan.id" />
  </el-select>
</template>
<script setup lang="ts">
import type { BusinessHoursPlan } from '@/api/callcenter/business-hours/types';
defineProps<{ modelValue?: string | number; businessHoursOptions?: BusinessHoursPlan[] }>();
const emit = defineEmits<{ (e: 'update:modelValue', value: string | number): void }>();
</script>
