<template>
  <el-alert
    type="info"
    :closable="false"
    title="默认关闭。明确规则优先；AI 只能选择已启用的处置规则，需达到 95% 置信度。关键词请谨慎配置否定、疑问及排除词。"
  />
  <el-tabs v-model="activeRule" class="conversation-rule-tabs">
    <el-tab-pane v-for="event in events" :key="event.value" :name="event.value" :label="event.tab">
      <template #label
        ><span :class="{ 'rule-enabled': rule(event.value).enabled }">{{ event.tab }}{{ rule(event.value).enabled ? ' ·' : '' }}</span></template
      >
      <h4>{{ event.label }}</h4>
      <el-form label-position="top">
        <el-form-item label="启用"
          ><el-switch :model-value="rule(event.value).enabled || false" @change="update(event.value, 'enabled', $event)"
        /></el-form-item>
        <template v-if="rule(event.value).enabled">
          <template v-if="event.text">
            <el-form-item label="匹配规则"
              ><div class="rule-match-fields">
                <AnswerMatchFields
                  :model-value="{ ...rule(event.value), answers: rule(event.value).phrases }"
                  :intent-options="intentOptions.filter((item) => item.enabled !== false)"
                  @change="(key, value) => update(event.value, key === 'answers' ? 'phrases' : key, value)"
                /></div
            ></el-form-item>
            <el-form-item label="未命中或冲突时使用 AI 辅助理解"
              ><el-switch
                :model-value="rule(event.value).aiUnderstandingEnabled || false"
                @change="update(event.value, 'aiUnderstandingEnabled', $event)"
            /></el-form-item>
            <p class="rule-hint">
              AI 需助手聊天模型可用；只判断整段通话诉求，不把“不是本人”等局部否定当作拒绝服务。开启后允许高置信度结果执行下方处置。
            </p>
          </template>
          <template v-else>
            <el-form-item label="本节点达到次数后处置"
              ><el-input-number
                :model-value="rule(event.value).maxCount || 2"
                :min="1"
                :max="10"
                @update:model-value="update(event.value, 'maxCount', $event)"
            /></el-form-item>
            <el-form-item v-if="event.value === 'SILENCE'" label="次数未满时的提醒"
              ><el-input
                :model-value="rule(event.value).retryText"
                placeholder="请问您还在听吗？"
                @update:model-value="update(event.value, 'retryText', $event)"
            /></el-form-item>
          </template>
          <el-form-item label="处置方式"
            ><el-select :model-value="rule(event.value).action || 'HANGUP'" @update:model-value="update(event.value, 'action', $event)"
              ><el-option label="挂断" value="HANGUP" /><el-option label="转人工技能组" value="TRANSFER_QUEUE" /></el-select
          ></el-form-item>
          <el-form-item v-if="rule(event.value).action === 'TRANSFER_QUEUE'" label="目标技能组"
            ><el-select :model-value="rule(event.value).queueCode" filterable @update:model-value="update(event.value, 'queueCode', $event)"
              ><el-option v-for="queue in queueOptions" :key="queue.queueCode" :label="queue.queueName" :value="queue.queueCode" /></el-select
          ></el-form-item>
          <el-form-item label="处置前话术（可选）"
            ><el-input
              :model-value="rule(event.value).replyText"
              type="textarea"
              :rows="2"
              @update:model-value="update(event.value, 'replyText', $event)"
          /></el-form-item>
        </template>
      </el-form>
    </el-tab-pane>
  </el-tabs>
  <p>沉默仅处理明确的无输入超时；无效回答/超范围使用对话步骤分类，不把模型异常计入。稍后联系不会自动创建回拨任务。</p>
</template>
<script setup lang="ts">
import type { CallQueueVO } from '@/api/callcenter/call-queue/types';
import type { AiIntentVO } from '@/api/callcenter/ai-knowledge/types';
import AnswerMatchFields from './AnswerMatchFields.vue';
type Rule = {
  event: string;
  enabled?: boolean;
  phrases?: string;
  action?: string;
  queueCode?: string;
  replyText?: string;
  retryText?: string;
  maxCount?: number;
  matchMode?: string;
  keywordMode?: string;
  excludedKeywords?: string;
  intentCodes?: string[];
  aiUnderstandingEnabled?: boolean;
};
const props = withDefaults(defineProps<{ modelValue?: Rule[]; queueOptions?: CallQueueVO[]; intentOptions?: AiIntentVO[] }>(), {
  modelValue: () => [],
  queueOptions: () => [],
  intentOptions: () => []
});
const emit = defineEmits<{ (event: 'update:modelValue', value: Rule[]): void }>();
const activeRule = ref('TRANSFER');
const events = [
  { value: 'TRANSFER', label: '要求转人工', tab: '转人工', text: true },
  { value: 'DECLINE', label: '明确拒绝', tab: '拒绝', text: true },
  { value: 'LATER', label: '稍后联系', tab: '稍后联系', text: true },
  { value: 'SILENCE', label: '长时间不说话', tab: '沉默', text: false },
  { value: 'INVALID', label: '连续无效回答', tab: '无效回答', text: false },
  { value: 'OUT_OF_SCOPE', label: '超出业务范围', tab: '超范围', text: false }
];
const rule = (event: string): Rule => props.modelValue.find((item) => item.event === event) || { event };
const update = (event: string, key: string, value: unknown) => {
  const updated = { ...rule(event), action: rule(event).action || (event === 'TRANSFER' ? 'TRANSFER_QUEUE' : 'HANGUP'), [key]: value };
  emit('update:modelValue', [...props.modelValue.filter((item) => item.event !== event), updated]);
};
</script>
<style scoped>
.rule-match-fields {
  display: grid;
  gap: 10px;
  width: 100%;
}
.rule-hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.6;
}
.rule-enabled {
  color: #059669;
}
.conversation-rule-tabs :deep(.el-tabs__item) {
  padding: 0 10px;
  font-size: 13px;
}
.conversation-rule-tabs h4 {
  margin: 4px 0 14px;
  font-size: 14px;
}
</style>
