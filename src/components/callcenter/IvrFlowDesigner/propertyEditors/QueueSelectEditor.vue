<template>
  <el-select :model-value="modelValue" filterable style="width: 100%" placeholder="请选择呼叫队列" @change="emit('update:modelValue', $event)">
    <el-option
      v-for="queue in queueOptions"
      :key="queue.id"
      :label="`${queue.queueName}（${queue.queueCode}@default）`"
      :value="queue.id"
    />
  </el-select>
</template>

<script setup lang="ts">
import type { CallQueueVO } from '@/api/callcenter/call-queue/types';
import type { MediaAssetVO } from '@/api/callcenter/media-asset/types';

defineProps<{
  modelValue?: string | number;
  queueOptions: CallQueueVO[];
  mediaOptions?: MediaAssetVO[];
  placeholder?: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number): void;
}>();
</script>
