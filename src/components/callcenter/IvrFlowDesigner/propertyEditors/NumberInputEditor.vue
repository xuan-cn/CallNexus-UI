<template>
  <el-input-number
    :model-value="Number(modelValue ?? min ?? 0)"
    :min="min"
    :max="max"
    :step="1"
    step-strictly
    controls-position="right"
    style="width: 100%"
    @change="emit('update:modelValue', $event)"
  />
  <div v-if="unit" class="number-hint">允许范围：{{ min }}-{{ max }}{{ unit }}</div>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false });

defineProps<{
  modelValue?: number;
  min?: number;
  max?: number;
  unit?: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: number | undefined): void;
}>();
</script>

<style scoped>
.number-hint {
  margin-top: 4px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
</style>
