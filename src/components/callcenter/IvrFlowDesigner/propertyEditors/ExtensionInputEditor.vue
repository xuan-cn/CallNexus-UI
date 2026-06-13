<template>
  <el-input
    :model-value="modelValue"
    :placeholder="placeholder"
    @input="emit('update:modelValue', $event)"
  />
</template>

<script setup lang="ts">
import type { MediaAssetVO } from '@/api/callcenter/media-asset/types';

defineProps<{
  modelValue?: string | number;
  placeholder?: string;
  mediaOptions?: MediaAssetVO[];
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();
</script>
