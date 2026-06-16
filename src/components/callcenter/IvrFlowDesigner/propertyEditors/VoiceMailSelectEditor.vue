<template>
  <el-select :model-value="modelValue" filterable style="width: 100%" placeholder="请选择语音留言箱" @change="emit('update:modelValue', $event)">
    <el-option v-for="box in voicemailOptions" :key="box.id" :label="box.boxName" :value="box.id" />
  </el-select>
</template>

<script setup lang="ts">
import type { VoiceMailBoxVO } from '@/api/callcenter/voicemail/types';

defineProps<{ modelValue?: string | number; voicemailOptions?: VoiceMailBoxVO[] }>();

const emit = defineEmits<{ (e: 'update:modelValue', value: string | number): void }>();
</script>
