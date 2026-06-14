<template>
  <el-input
    :model-value="modelValue"
    :placeholder="placeholder"
    @input="emit('update:modelValue', $event)"
  />
</template>

<script setup lang="ts">
import type { MediaAssetVO } from '@/api/callcenter/media-asset/types';
import type { CallQueueVO } from '@/api/callcenter/call-queue/types';

defineProps<{
  modelValue?: string | number;
  placeholder?: string;
  mediaOptions?: MediaAssetVO[];
  queueOptions?: CallQueueVO[];
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();
</script>
