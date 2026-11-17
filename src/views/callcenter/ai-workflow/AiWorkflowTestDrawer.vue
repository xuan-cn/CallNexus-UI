<template>
  <el-drawer
    :model-value="modelValue"
    title="工作流测试台"
    size="94%"
    destroy-on-close
    append-to-body
    class="workflow-test-drawer"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="test-layout">
      <aside class="context-panel">
        <div class="panel-title">模拟上下文</div>
        <p class="panel-description">测试使用当前草稿，不会发起电话或修改真实业务数据。</p>
        <el-form label-position="top">
          <el-form-item label="AI 助手">
            <el-select v-model="form.agentId" filterable clearable placeholder="AI 辅助理解或意图判断需选择助手" style="width: 100%">
              <el-option v-for="item in agents" :key="item.id" :label="item.agentName" :value="item.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="客户姓名"><el-input v-model="context.customerName" placeholder="例如：张三" /></el-form-item>
          <el-form-item label="客户性别">
            <el-select v-model="context.customerGender" clearable style="width: 100%">
              <el-option label="男" value="MALE" /><el-option label="女" value="FEMALE" /><el-option label="未知" value="UNKNOWN" />
            </el-select>
          </el-form-item>
          <el-form-item label="客户手机号"><el-input v-model="context.customerPhone" /></el-form-item>
          <el-form-item label="企业名称"><el-input v-model="context.companyName" /></el-form-item>
          <el-form-item label="产品名称"><el-input v-model="context.productName" /></el-form-item>
        </el-form>
        <el-button type="primary" :loading="starting" :disabled="sending || stopping" style="width: 100%" @click="startTest">开始新测试</el-button>
      </aside>

      <main class="conversation-panel">
        <div class="panel-head">
          <div>
            <strong>{{ workflowName }}</strong
            ><small>模拟逐轮客户输入与AI播报</small>
          </div>
          <el-tag v-if="execution" :type="statusType">{{ statusLabel }}</el-tag>
        </div>
        <div ref="messagesRef" class="messages">
          <el-empty v-if="!messages.length" description="填写模拟上下文后开始测试" />
          <div v-for="(message, index) in messages" :key="index" class="message-row" :class="message.role.toLowerCase()">
            <div class="message-role">{{ message.role === 'AI' ? 'AI' : '客户' }}</div>
            <div class="message-bubble">{{ message.content }}</div>
          </div>
          <el-alert v-if="execution?.failureMessage" type="error" :closable="false" :title="execution.failureMessage" />
        </div>
        <div class="input-bar">
          <el-input
            v-model="inputText"
            type="textarea"
            :rows="2"
            :disabled="!['WAITING_INPUT', 'WAITING_TTS', 'WAITING_DTMF'].includes(execution?.status || '')"
            :placeholder="execution?.status === 'WAITING_DTMF' ? '输入完整数字串，保留前导零' : '工作流等待输入时，在这里模拟客户回答'"
            @keydown.ctrl.enter.prevent="operations.send && sendInput()"
          />
          <el-button type="primary" :loading="sending" :disabled="!operations.send" @click="sendInput"> 发送输入 </el-button>
        </div>
        <section class="simulation-panel" aria-label="模拟操作">
          <div class="simulation-heading"><strong>模拟操作</strong><small>仅用于测试，不影响真实通话</small></div>
          <div class="simulation-actions">
            <el-button :disabled="!operations.interrupt" @click="sendInput">模拟打断</el-button>
            <el-button :disabled="!operations.playbackCompleted" @click="sendSignal('PLAYBACK_COMPLETED')">模拟播报完成</el-button>
            <el-button :disabled="!operations.silence" @click="sendSignal('SILENCE')">
              {{ execution?.status === 'WAITING_DTMF' ? '模拟按键超时' : '模拟沉默超时' }}
            </el-button>
            <el-button type="danger" plain :loading="stopping" :disabled="!operations.stop" @click="stopTest">结束测试</el-button>
          </div>
          <p class="simulation-hint">播报中可模拟完成或打断；打断使用上方输入框的文字。等待回答时可模拟沉默超时。</p>
        </section>
      </main>

      <aside class="trace-panel">
        <el-alert v-for="item in disclosures" :key="item.id" :title="item.name + '：' + item.status" type="info" :closable="false" />
        <el-alert
          v-if="execution?.variables?.['workflow.lastRule']"
          :title="'最近公共规则：' + ruleText(String(execution.variables['workflow.lastRule']))"
          type="warning"
          :closable="false"
        />
        <div class="panel-head">
          <div><strong>执行轨迹</strong><small>按实际执行顺序记录；耗时不含真实电话收音、TTS 和播放</small></div>
        </div>
        <el-timeline v-if="execution?.traces.length" class="trace-list">
          <el-timeline-item
            v-for="(item, index) in execution.traces"
            :key="item.id"
            :type="traceType(item.status)"
            :timestamp="`节点总耗时：${item.durationMs ?? '未记录'}${item.durationMs == null ? '' : ' ms'}`"
          >
            <div class="trace-card">
              <div class="trace-header">
                <strong>第 {{ item.turnNo }} 轮 · {{ item.nodeName }}</strong
                ><el-tag size="small" effect="plain">{{ traceStatus(item.status) }}</el-tag>
              </div>
              <p v-if="item.inputSummary">输入：{{ item.inputSummary }}</p>
              <p v-if="item.outputSummary">输出：{{ item.outputSummary }}</p>
              <el-button v-if="item.ticketPreview" link type="primary" @click="previewTrace = item">预览工单</el-button>
              <p v-if="item.branchValue">选中出口：{{ item.dialogueDetails?.branchLabel || branchText(item.branchValue) }}</p>
              <p v-if="nextExecutedNode(execution.traces, index)">后续已执行：{{ nextExecutedNode(execution.traces, index) }}</p>
              <p v-else-if="item.status === 'CONTINUE' && item.branchValue">后续节点尚无执行记录，请检查后续轨迹或执行状态。</p>
              <div v-if="item.dialogueDetails" class="dialogue-details">
                <div class="detail-title">判断过程</div>
                <dl class="trace-facts">
                  <dt>匹配路径</dt>
                  <dd>{{ matchPathText(item) }}</dd>
                  <template v-if="item.dialogueDetails.matchedLabels?.length"
                    ><dt>规则命中项</dt>
                    <dd>{{ item.dialogueDetails.matchedLabels.join('、') }}</dd></template
                  >
                  <dt>AI 辅助</dt>
                  <dd>
                    {{ item.dialogueDetails.aiCalled === true ? '已尝试调用' : item.dialogueDetails.aiCalled === false ? '本次未调用' : '未记录' }}
                  </dd>
                  <template v-if="item.dialogueDetails.decision"
                    ><dt>最终判断</dt>
                    <dd>{{ decisionText(item.dialogueDetails.decision) }}</dd></template
                  >
                  <template v-if="item.dialogueDetails.confidence !== undefined"
                    ><dt>置信度</dt>
                    <dd>
                      {{ Math.round(item.dialogueDetails.confidence * 100) }}%<small
                        v-if="['EXACT', 'KEYWORD'].includes(item.dialogueDetails.decision || '')"
                        >规则命中值，非语义正确率</small
                      >
                    </dd></template
                  >
                  <template v-if="item.dialogueDetails.optionCode"
                    ><dt>业务选项</dt>
                    <dd>{{ item.dialogueDetails.optionLabel || item.dialogueDetails.optionCode }}</dd></template
                  >
                  <template v-if="item.dialogueDetails.evidence"
                    ><dt>原文依据</dt>
                    <dd>{{ item.dialogueDetails.evidence }}</dd></template
                  >
                  <dt>处理原因</dt>
                  <dd>{{ reasonText(item.dialogueDetails.reason || '') || '未记录' }}</dd>
                  <template v-if="item.dialogueDetails.missingFields?.length"
                    ><dt>缺失信息</dt>
                    <dd>{{ item.dialogueDetails.missingFields.join('、') }}</dd></template
                  >
                </dl>
                <p v-if="item.dialogueDetails.limitReached" class="trace-warning">已达到澄清次数上限</p>
                <p v-if="item.dialogueDetails.detailsTruncated" class="trace-warning">记录超出长度限制，部分详情已省略。</p>
                <template v-if="timingRows(item).length">
                  <div class="detail-title">处理耗时</div>
                  <dl class="trace-facts">
                    <template v-for="timing in timingRows(item)" :key="timing.label"
                      ><dt>{{ timing.label }}</dt>
                      <dd>{{ timing.value }} ms</dd></template
                    >
                  </dl>
                  <small v-if="item.dialogueDetails.timings?.intent !== undefined">意图服务耗时已包含在规则及意图判断内，不重复累加。</small>
                </template>
              </div>
              <div v-if="item.ruleDetails" class="dialogue-details">
                <div class="detail-title">公共规则检查</div>
                <dl class="trace-facts">
                  <dt>规则</dt>
                  <dd>{{ item.ruleDetails.eventLabel || '未触发处置' }}</dd>
                  <dt>匹配结果</dt>
                  <dd>{{ matchReasonText(item.ruleDetails.matchReason) }}</dd>
                  <template v-if="item.ruleDetails.matchedLabels?.length"
                    ><dt>命中项</dt>
                    <dd>{{ item.ruleDetails.matchedLabels.join('、') }}</dd></template
                  >
                  <dt>AI 辅助</dt>
                  <dd>{{ item.ruleDetails.aiCalled ? '已尝试调用' : '本次未调用' }}</dd>
                  <dt>处理原因</dt>
                  <dd>{{ publicRuleReason(item.ruleDetails.reason) }}</dd>
                  <template v-if="item.ruleDetails.confidence !== undefined"
                    ><dt>置信度</dt>
                    <dd>{{ Math.round(item.ruleDetails.confidence * 100) }}%</dd></template
                  >
                  <template v-if="item.ruleDetails.evidence"
                    ><dt>原文依据</dt>
                    <dd>{{ item.ruleDetails.evidence }}</dd></template
                  >
                  <template v-if="item.ruleDetails.count !== undefined"
                    ><dt>计数</dt>
                    <dd>{{ item.ruleDetails.count }} / {{ item.ruleDetails.maxCount }}</dd></template
                  >
                  <template v-if="item.ruleDetails.action"
                    ><dt>处置</dt>
                    <dd>
                      {{
                        { HANGUP: '挂断', TRANSFER_QUEUE: '转人工技能组', RETRY: '提醒并继续等待' }[item.ruleDetails.action] ||
                        item.ruleDetails.action
                      }}
                    </dd></template
                  >
                </dl>
              </div>
            </div>
          </el-timeline-item>
        </el-timeline>
        <el-empty v-else description="暂无执行轨迹" />
      </aside>
    </div>
    <el-dialog
      :model-value="Boolean(previewTrace)"
      title="模拟工单预览"
      width="min(680px, 94vw)"
      append-to-body
      @update:model-value="(visible) => { if (!visible) previewTrace = undefined; }"
    >
      <template v-if="previewTrace?.ticketPreview">
        <p class="ticket-preview-empty">仅展示本次测试传入的字段，不创建正式工单。</p>
        <p>模板：{{ previewTrace.ticketPreview.templateName || previewTrace.ticketPreview.templateId }}</p>
        <p v-if="previewTrace.outputSummary">校验结果：{{ previewTrace.outputSummary }}</p>
        <el-table :data="previewTrace.ticketPreview.fields" size="small" empty-text="此模板没有可展示的字段">
          <el-table-column label="字段" min-width="145">
            <template #default="{ row }">{{ row.label || row.code }}<span v-if="row.required">（必填）</span></template>
          </el-table-column>
          <el-table-column label="模拟填写值" min-width="240">
            <template #default="{ row }">
              <span v-if="!row.mapped" class="ticket-preview-empty">未映射</span>
              <span v-else-if="emptyTicketValue(row.value)" class="ticket-preview-empty">已映射，值为空</span>
              <span v-else class="ticket-preview-value">{{ formatTicketValue(row.value) }}</span>
            </template>
          </el-table-column>
        </el-table>
      </template>
      <template #footer>
        <el-button @click="previewTrace = undefined">关闭</el-button>
      </template>
    </el-dialog>
  </el-drawer>
</template>

<script setup lang="ts">
import type { AiAgentVO } from '@/api/callcenter/ai-knowledge/types';
import { sendAiWorkflowTestInput, startAiWorkflowTest, terminateAiWorkflowTest } from '@/api/callcenter/ai-workflow';
import type { AiWorkflowNodeTraceVO, AiWorkflowTestExecutionVO, Id } from '@/api/callcenter/ai-workflow/types';
import { matchPathText, matchReasonText, nextExecutedNode, timingRows } from './tracePresentation';
const publicRuleReason = (reason?: string) =>
  ({
    AI_MATCH: 'AI 判断达到 95%，执行已配置处置',
    LOW_CONFIDENCE: '不足 95%，不执行处置',
    AI_NO_MATCH: 'AI 未确认明确处置诉求，继续流程',
    AI_FAILED: 'AI 调用或结果校验失败，继续流程',
    AI_UNAVAILABLE: '未选择助手，不执行 AI 处置',
    EVENT: '显式事件触发'
  })[reason || ''] || matchReasonText(reason);
import { testOperationState } from './testOperationState';

const props = defineProps<{ modelValue: boolean; workflowId?: Id; workflowName?: string; agents: AiAgentVO[] }>();
const emit = defineEmits<{ (event: 'update:modelValue', value: boolean): void }>();
const execution = ref<AiWorkflowTestExecutionVO>();
const previewTrace = ref<AiWorkflowNodeTraceVO>();
const emptyTicketValue = (value: unknown) =>
  value == null || (typeof value === 'string' && !value.trim()) || (Array.isArray(value) && value.length === 0);
const formatTicketValue = (value: unknown) => (typeof value === 'object' ? JSON.stringify(value) : String(value));
watch(() => execution.value?.executionId, () => (previewTrace.value = undefined));
const starting = ref(false);
const sending = ref(false);
const stopping = ref(false);
const inputText = ref('');
const messagesRef = ref<HTMLElement>();
const messages = ref<Array<{ role: 'AI' | 'USER'; content: string }>>([]);
const outputCount = ref(0);
const form = reactive<{ agentId?: Id }>({});
const context = reactive({ customerName: '', customerGender: 'UNKNOWN', customerPhone: '', companyName: '', productName: '' });
const operations = computed(() =>
  testOperationState(execution.value?.status, Boolean(inputText.value.trim()), sending.value || starting.value || stopping.value)
);
const terminal = computed(() => ['COMPLETED', 'TRANSFERRED', 'FAILED', 'TERMINATED'].includes(execution.value?.status || ''));
const statusLabel = computed(
  () =>
    ({
      WAITING_INPUT: '等待客户输入',
      WAITING_DTMF: '等待客户按键',
      WAITING_TTS: '等待模拟播报完成',
      WAITING_ASYNC: '等待异步结果',
      COMPLETED: '执行完成',
      TRANSFERRED: '已模拟转接',
      FAILED: '执行失败',
      TERMINATED: '已结束'
    })[execution.value?.status || ''] || '运行中'
);
const statusType = computed(() => (execution.value?.status === 'FAILED' ? 'danger' : terminal.value ? 'success' : 'warning'));
const disclosures = computed(() =>
  Object.entries(execution.value?.variables || {})
    .filter(([key]) => key.startsWith('workflow.disclosure.'))
    .map(([key, status]) => {
      const id = key.slice('workflow.disclosure.'.length);
      return {
        id,
        name: execution.value?.traces.find((trace) => trace.nodeId === id)?.nodeName || id,
        status:
          (
            {
              PENDING: '必要告知待完成',
              INTERRUPTED: '已打断，待完整补播',
              PLAYBACK_COMPLETED: '已收到播报完成事件',
              SIMULATED_COMPLETED: '模拟告知完成（非电话验收）',
              ABORTED: '通话结束，告知未完成',
              CANCELLED_BY_RULE: '按公共规则转接或结束，告知未完成'
            } as Record<string, string>
          )[String(status)] || String(status)
      };
    })
);

const ruleText = (value: string) =>
  (
    ({
      TRANSFER: '要求转人工',
      DECLINE: '明确拒绝',
      LATER: '稍后联系',
      SILENCE: '沉默超时',
      INVALID: '连续无效回答',
      OUT_OF_SCOPE: '超出业务范围'
    }) as Record<string, string>
  )[value] || value;
const appendOutputs = async (value: AiWorkflowTestExecutionVO) => {
  value.outputMessages.slice(outputCount.value).forEach((content) => {
    const previous = messages.value[messages.value.length - 1];
    if (previous?.role === 'AI') {
      previous.content += content;
    } else {
      messages.value.push({ role: 'AI', content });
    }
  });
  outputCount.value = value.outputMessages.length;
  execution.value = value;
  await nextTick();
  if (messagesRef.value) messagesRef.value.scrollTop = messagesRef.value.scrollHeight;
};
const startTest = async () => {
  if (!props.workflowId || starting.value || sending.value || stopping.value) return;
  starting.value = true;
  try {
    messages.value = [];
    outputCount.value = 0;
    const variables = {
      'customer.name': context.customerName,
      'customer.gender': context.customerGender,
      'customer.phone': context.customerPhone,
      'task.companyName': context.companyName,
      'task.productName': context.productName
    };
    await appendOutputs((await startAiWorkflowTest(props.workflowId, { agentId: form.agentId, variables })).data);
  } finally {
    starting.value = false;
  }
};
const sendInput = async () => {
  if (!execution.value || !(operations.value.send || operations.value.interrupt)) return;
  const text = inputText.value.trim();
  messages.value.push({ role: 'USER', content: text });
  inputText.value = '';
  sending.value = true;
  try {
    const inputId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    await appendOutputs(
      (
        await sendAiWorkflowTestInput(execution.value.executionId, {
          inputId,
          text,
          ...(execution.value.status === 'WAITING_TTS' ? { signal: 'INTERRUPT' } : {})
        })
      ).data
    );
  } finally {
    sending.value = false;
  }
};
const sendSignal = async (signal: string) => {
  if (!execution.value || !(signal === 'SILENCE' ? operations.value.silence : signal === 'PLAYBACK_COMPLETED' && operations.value.playbackCompleted))
    return;
  sending.value = true;
  try {
    const inputId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    await appendOutputs((await sendAiWorkflowTestInput(execution.value.executionId, { inputId, signal })).data);
  } finally {
    sending.value = false;
  }
};
const stopTest = async () => {
  if (!execution.value || !operations.value.stop) return;
  stopping.value = true;
  try {
    await terminateAiWorkflowTest(execution.value.executionId);
    execution.value.status = 'TERMINATED';
  } finally {
    stopping.value = false;
  }
};
const traceStatus = (status: string) =>
  ({
    CONTINUE: '继续',
    RULE: '公共规则处置',
    RULE_CHECK: '公共规则检查',
    SPEAK: '播报',
    SPEAK_RETRY: '播报并等待回答',
    WAIT_INPUT: '等待输入',
    WAIT_ASYNC: '等待异步',
    COMPLETED: '完成',
    TRANSFERRED: '转接',
    FAILED: '失败'
  })[status] || status;
const traceType = (status: string) => (status === 'FAILED' ? 'danger' : ['WAIT_INPUT', 'WAIT_ASYNC'].includes(status) ? 'warning' : 'primary');
const branchText = (value: string) =>
  ({ TRUE: '条件成立', FALSE: '条件不成立', FALLBACK: '未命中意图', COMPLETE: '确认完成', DECLINED: '明确拒绝', LIMIT: '澄清上限' })[value] || value;
const decisionText = (value: string) =>
  ({
    EXACT: '明确回答匹配',
    KEYWORD: '关键词匹配',
    INTENT: '意图匹配',
    SELECT: '业务选项匹配',
    CONFIRM: '确认',
    DECLINE: '拒绝',
    QUESTION: '知识咨询',
    CORRECTION: '资料更正',
    UNCLEAR: '含义不明确',
    OUT_OF_SCOPE: '超出当前问题',
    UNAVAILABLE: 'AI 处理未成功'
  })[value] || value;
const reasonText = (value: string) =>
  ({
    ASKING: '首次提问，尚未判断客户输入',
    FIELDS_REUSED: '字段齐全，按配置复用',
    EXACT_MATCH: '明确回答命中，无需调用 AI',
    KEYWORD_MATCH: '关键词规则命中，无需调用 AI',
    INTENT_MATCH: '已配置意图命中',
    MATCH_CONFLICT: '多个业务出口同时命中，需要 AI 判断或澄清',
    INTENT_FAILED: '意图识别未成功，需要 AI 判断或澄清',
    AI_DISABLED: '未命中明确回答，AI 辅助未启用',
    LOW_CONFIDENCE: '置信度不足 90%，不自动推进',
    AUTO_ADVANCE_DISABLED: '未开启 AI 自动推进',
    NEEDS_CLARIFICATION: '未取得有效业务答案，需要澄清',
    AI_MATCH: 'AI 判断通过，进入对应出口',
    MISSING_FIELDS: '必填信息未齐全',
    CLASSIFICATION_FAILED: 'AI 分类调用或输出校验失败，请检查助手模型与服务日志',
    EXTRACTION_FAILED: '字段提取失败，未推进',
    KNOWLEDGE_FAILED: '知识问答失败，未推进',
    KNOWLEDGE_RETRY: '回答知识插问后留在当前步骤',
    KNOWLEDGE_DISABLED: '识别为知识咨询，但未开启知识插问回答'
  })[value] || value;

watch(
  () => props.modelValue,
  (visible) => {
    previewTrace.value = undefined;
    if (!visible) return;
    execution.value = undefined;
    messages.value = [];
    outputCount.value = 0;
    inputText.value = '';
  }
);
</script>

<style scoped>
.dialogue-details {
  margin-top: 8px;
  padding: 8px 10px;
  border-left: 3px solid #409eff;
  background: #f4f7fb;
  font-size: 12px;
  overflow-wrap: anywhere;
}
:global(.workflow-test-drawer .el-drawer__body) {
  padding: 0;
  overflow: hidden;
}
.test-layout {
  display: grid;
  grid-template-columns: 300px minmax(420px, 1fr) 390px;
  height: 100%;
  background: #f4f7fb;
}
.context-panel,
.conversation-panel,
.trace-panel {
  min-height: 0;
  padding: 18px;
  background: #fff;
}
.context-panel {
  overflow: auto;
  border-right: 1px solid #e5eaf1;
}
.trace-panel {
  overflow: auto;
  border-left: 1px solid #e5eaf1;
}
.conversation-panel {
  display: flex;
  flex-direction: column;
  margin: 14px;
  border: 1px solid #e5eaf1;
  border-radius: 10px;
}
.panel-title {
  color: #1f2937;
  font-size: 16px;
  font-weight: 700;
}
.panel-description,
.panel-head small {
  display: block;
  margin-top: 5px;
  color: #8a96a8;
  font-size: 12px;
  line-height: 1.5;
}
.panel-head {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 14px;
  border-bottom: 1px solid #edf1f6;
}
.simulation-panel {
  flex: none;
  margin-top: 12px;
  padding: 12px;
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
}
.simulation-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 10px;
  font-size: 13px;
}
.simulation-heading small,
.simulation-hint {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.5;
}
.simulation-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.simulation-actions .el-button {
  margin: 0;
  width: 100%;
}
.simulation-hint {
  margin: 8px 0 0;
}
.messages {
  flex: 1;
  min-height: 0;
  padding: 18px 4px;
  overflow: auto;
}
.message-row {
  margin-bottom: 16px;
}
.message-row.user {
  text-align: right;
}
.message-role {
  margin-bottom: 5px;
  color: #8a96a8;
  font-size: 12px;
}
.message-bubble {
  display: inline-block;
  max-width: 82%;
  padding: 10px 13px;
  border-radius: 10px;
  background: #eef5ff;
  color: #26364d;
  font-size: 13px;
  line-height: 1.65;
  text-align: left;
}
.message-row.user .message-bubble {
  background: #e8f8f2;
}
.input-bar {
  display: flex;
  flex: none;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 10px;
  padding-top: 14px;
  border-top: 1px solid #edf1f6;
}
.input-bar :deep(.el-textarea) {
  flex: 1 1 260px;
}
.trace-list {
  margin-top: 18px;
  padding-left: 4px;
}
.trace-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.dialogue-details {
  margin-top: 10px;
  padding: 10px 12px;
  border-left: 3px solid var(--el-color-primary-light-5);
  background: var(--el-fill-color-light);
}
.detail-title {
  margin: 4px 0 8px;
  font-size: 12px;
  font-weight: 600;
}
.trace-facts {
  display: grid;
  grid-template-columns: 80px minmax(0, 1fr);
  gap: 8px 10px;
  margin: 0 0 12px;
  font-size: 12px;
  line-height: 1.6;
}
.trace-facts dt {
  color: var(--el-text-color-secondary);
}
.trace-facts dd {
  margin: 0;
  overflow-wrap: anywhere;
}
.dialogue-details small {
  display: block;
  color: var(--el-text-color-secondary);
  font-size: 11px;
  line-height: 1.5;
}
.trace-card .trace-warning {
  color: var(--el-color-warning-dark-2);
}
.trace-card p {
  margin: 6px 0 0;
  color: #66758a;
  font-size: 12px;
  line-height: 1.5;
}
.ticket-preview-empty {
  color: var(--el-text-color-secondary);
}
.ticket-preview-value {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
@media (max-width: 1280px) {
  .test-layout {
    grid-template-columns: 260px minmax(380px, 1fr) 330px;
  }
}
</style>
