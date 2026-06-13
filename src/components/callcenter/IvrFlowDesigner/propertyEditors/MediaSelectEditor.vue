<template>
  <el-select :model-value="modelValue" filterable style="width: 100%" @change="emit('update:modelValue', $event)">
    <el-option
      v-for="media in mediaOptions"
      :key="media.id"
      :label="`${media.assetName}（v${media.latestVersionNo || 1}）`"
      :value="media.id"
    />
  </el-select>
</template>

<script setup lang="ts">
import type { MediaAssetVO } from '@/api/callcenter/media-asset/types';

defineProps<{
  modelValue?: string | number;
  mediaOptions: MediaAssetVO[];
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number): void;
}>();
</script>
