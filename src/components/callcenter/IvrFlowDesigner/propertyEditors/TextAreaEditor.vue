<template>
  <el-input
    :model-value="modelValue"
    type="textarea"
    :rows="6"
    maxlength="1000"
    show-word-limit
    resize="vertical"
    :placeholder="placeholder"
    @input="emit('update:modelValue', $event)"
  />
</template>

<script setup lang="ts">
defineProps<{
  modelValue?: string | number;
  placeholder?: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();
</script>
