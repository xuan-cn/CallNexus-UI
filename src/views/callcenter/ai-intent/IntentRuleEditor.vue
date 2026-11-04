<template>
  <section class="rule-editor">
    <el-divider content-position="left">话术匹配规则（可选）</el-divider>
    <p class="form-tip">不需要编写正则。同一意图的反例优先排除；正例任一规则符合即可命中。未命中时继续原有语义识别，不调用 AI 辅助理解。</p>
    <div v-for="(rule, index) in rules" :key="index" class="rule-row">
      <div class="rule-toolbar">
        <span>规则 {{ index + 1 }}</span>
        <el-select :model-value="rule.polarity" aria-label="正反例" @update:model-value="update(index, { polarity: $event })">
          <el-option label="正例命中" value="POSITIVE" /><el-option label="反例排除" value="NEGATIVE" />
        </el-select>
        <el-select :model-value="rule.mode" aria-label="匹配方式" @update:model-value="changeMode(index, $event)">
          <el-option v-for="(label, mode) in modes" :key="mode" :label="label" :value="mode" />
        </el-select>
        <el-checkbox :model-value="rule.ignorePunctuation" @update:model-value="update(index, { ignorePunctuation: Boolean($event) })"
          >忽略标点和空格</el-checkbox
        >
        <el-button text type="danger" @click="remove(index)">删除</el-button>
      </div>
      <div v-for="(group, groupIndex) in rule.groups" :key="groupIndex" class="rule-group">
        <span v-if="rule.mode === 'ALL'" class="group-label">第 {{ groupIndex + 1 }} 组</span>
        <KeywordGroup :words="group" @update:words="updateGroup(index, groupIndex, $event)" />
        <el-button v-if="rule.groups.length > 1" text type="danger" @click="update(index, { groups: rule.groups.filter((_, i) => i !== groupIndex) })"
          >删除组</el-button
        >
      </div>
      <el-button v-if="rule.mode === 'ALL' && rule.groups.length < 8" text @click="update(index, { groups: [...rule.groups, []] })"
        >＋ 添加条件组</el-button
      >
      <small class="form-tip">{{ rule.mode === 'ALL' ? '组内任意一个词出现即可；各组必须同时满足。' : '一组中任意一个词符合即可。' }}</small>
    </div>
    <el-button :disabled="rules.length >= 40" plain @click="append">＋ 添加规则</el-button>
    <div v-if="rules.length" class="rule-test">
      <el-input
        v-model="testText"
        maxlength="4096"
        placeholder="输入客户话术，测试当前未保存的规则"
        @input="result = undefined"
        @keyup.enter="testRules"
      />
      <el-button v-hasPermi="['callcenter:ai-intent:test']" :loading="testing" @click="testRules">测试规则</el-button>
    </div>
    <el-alert v-if="result" :title="result" type="info" :closable="false" />
  </section>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue';
import { ElMessage } from 'element-plus';
import request from '@/utils/request';
import type { IntentMatchRule } from '@/api/callcenter/ai-knowledge/types';
import KeywordGroup from './KeywordGroup.vue';
const props = defineProps<{ modelValue?: IntentMatchRule[] }>();
const emit = defineEmits<{ 'update:modelValue': [IntentMatchRule[]] }>();
const rules = computed(() => props.modelValue || []);
const modes = { EXACT: '整句一致', ANY: '包含任意词', ALL: '同时包含多组词', PREFIX: '开头是', SUFFIX: '结尾是' };
const testText = ref('');
const testing = ref(false);
const result = ref<string>();
const setRules = (next: IntentMatchRule[]) => {
  result.value = undefined;
  emit('update:modelValue', next);
};
const update = (index: number, patch: Partial<IntentMatchRule>) =>
  setRules(rules.value.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)));
const append = () => setRules([...rules.value, { polarity: 'POSITIVE', mode: 'ANY', ignorePunctuation: true, groups: [[]] }]);
const remove = (index: number) => setRules(rules.value.filter((_, i) => i !== index));
const changeMode = (index: number, mode: IntentMatchRule['mode']) =>
  update(index, { mode, groups: mode === 'ALL' ? rules.value[index].groups : [[...new Set(rules.value[index].groups.flat())]] });
const updateGroup = (index: number, groupIndex: number, words: string[]) =>
  update(index, { groups: rules.value[index].groups.map((group, i) => (i === groupIndex ? words : group)) });
type Hit = { index: number; polarity: string; mode: keyof typeof modes; words: string[] };
const testRules = async () => {
  if (!testText.value.trim()) {
    ElMessage.warning('请输入测试话术');
    return;
  }
  testing.value = true;
  const snapshot = JSON.stringify({ text: testText.value, rules: rules.value });
  try {
    const hits: Hit[] =
      (await request({ url: '/api/v1/ai/intents/rules-test', method: 'post', data: { text: testText.value, rules: rules.value } })).data || [];
    if (snapshot !== JSON.stringify({ text: testText.value, rules: rules.value })) return;
    result.value = hits.length
      ? `${hits.some((hit) => hit.polarity === 'NEGATIVE') ? '反例优先：排除此意图。' : '正例命中。'}${hits.map((hit) => `规则 ${hit.index}（${modes[hit.mode]}）：${hit.words.join('、')}`).join('；')}`
      : '当前规则未命中；真实识别将继续检查原有正反例话术和向量，不调用 AI 辅助理解。';
  } finally {
    testing.value = false;
  }
};
</script>
<style scoped>
.rule-row {
  padding: 12px;
  border: 1px solid var(--el-border-color);
  margin-bottom: 10px;
  border-radius: 4px;
}
.rule-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
.rule-toolbar .el-select {
  width: 150px;
}
.rule-group {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 8px 0;
}
.group-label {
  white-space: nowrap;
  padding-top: 6px;
}
.form-tip {
  display: block;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.6;
}
.rule-test {
  display: flex;
  gap: 8px;
  margin: 12px 0;
}
</style>
