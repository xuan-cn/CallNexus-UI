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
            <el-select v-model="form.agentId" filterable clearable placeholder="意图判断流程必须选择" style="width: 100%">
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
        <el-button type="primary" :loading="starting" style="width: 100%" @click="startTest">开始新测试</el-button>
        <el-button v-if="execution && !terminal" class="stop-button" type="danger" plain style="width: 100%" @click="stopTest">结束测试</el-button>
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
            :disabled="execution?.status !== 'WAITING_INPUT'"
            placeholder="工作流等待输入时，在这里模拟客户回答"
            @keydown.ctrl.enter.prevent="sendInput"
          />
          <el-button type="primary" :loading="sending" :disabled="execution?.status !== 'WAITING_INPUT' || !inputText.trim()" @click="sendInput">
            发送输入
          </el-button>
        </div>
      </main>

      <aside class="trace-panel">
        <div class="panel-head">
          <div><strong>执行轨迹</strong><small>按实际执行顺序记录节点、分支和耗时</small></div>
        </div>
        <el-timeline v-if="execution?.traces.length" class="trace-list">
          <el-timeline-item v-for="item in execution.traces" :key="item.id" :type="traceType(item.status)" :timestamp="`${item.durationMs || 0} ms`">
            <div class="trace-card">
              <div>
                <strong>{{ item.nodeName }}</strong
                ><el-tag size="small" effect="plain">{{ traceStatus(item.status) }}</el-tag>
              </div>
              <p v-if="item.inputSummary">输入：{{ item.inputSummary }}</p>
              <p v-if="item.outputSummary">输出：{{ item.outputSummary }}</p>
              <p v-if="item.branchValue">分支：{{ branchText(item.branchValue) }}</p>
            </div>
          </el-timeline-item>
        </el-timeline>
        <el-empty v-else description="暂无执行轨迹" />
      </aside>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import type { AiAgentVO } from '@/api/callcenter/ai-knowledge/types';
import { sendAiWorkflowTestInput, startAiWorkflowTest, terminateAiWorkflowTest } from '@/api/callcenter/ai-workflow';
import type { AiWorkflowNodeTraceVO, AiWorkflowTestExecutionVO, Id } from '@/api/callcenter/ai-workflow/types';

const props = defineProps<{ modelValue: boolean; workflowId?: Id; workflowName?: string; agents: AiAgentVO[] }>();
const emit = defineEmits<{ (event: 'update:modelValue', value: boolean): void }>();
const execution = ref<AiWorkflowTestExecutionVO>();
const starting = ref(false);
const sending = ref(false);
const inputText = ref('');
const messagesRef = ref<HTMLElement>();
const messages = ref<Array<{ role: 'AI' | 'USER'; content: string }>>([]);
const outputCount = ref(0);
const form = reactive<{ agentId?: Id }>({});
const context = reactive({ customerName: '', customerGender: 'UNKNOWN', customerPhone: '', companyName: '', productName: '' });
const terminal = computed(() => ['COMPLETED', 'TRANSFERRED', 'FAILED', 'TERMINATED'].includes(execution.value?.status || ''));
const statusLabel = computed(
  () =>
    ({
      WAITING_INPUT: '等待客户输入',
      WAITING_ASYNC: '等待异步结果',
      COMPLETED: '执行完成',
      TRANSFERRED: '已模拟转接',
      FAILED: '执行失败',
      TERMINATED: '已结束'
    })[execution.value?.status || ''] || '运行中'
);
const statusType = computed(() => (execution.value?.status === 'FAILED' ? 'danger' : terminal.value ? 'success' : 'warning'));

const appendOutputs = async (value: AiWorkflowTestExecutionVO) => {
  value.outputMessages.slice(outputCount.value).forEach((content) => messages.value.push({ role: 'AI', content }));
  outputCount.value = value.outputMessages.length;
  execution.value = value;
  await nextTick();
  if (messagesRef.value) messagesRef.value.scrollTop = messagesRef.value.scrollHeight;
};
const startTest = async () => {
  if (!props.workflowId) return;
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
  if (!execution.value || !inputText.value.trim()) return;
  const text = inputText.value.trim();
  messages.value.push({ role: 'USER', content: text });
  inputText.value = '';
  sending.value = true;
  try {
    const inputId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    await appendOutputs((await sendAiWorkflowTestInput(execution.value.executionId, { inputId, text })).data);
  } finally {
    sending.value = false;
  }
};
const stopTest = async () => {
  if (!execution.value) return;
  await terminateAiWorkflowTest(execution.value.executionId);
  execution.value.status = 'TERMINATED';
};
const traceStatus = (status: string) =>
  ({ CONTINUE: '继续', SPEAK: '播报', WAIT_INPUT: '等待输入', WAIT_ASYNC: '等待异步', COMPLETED: '完成', TRANSFERRED: '转接', FAILED: '失败' })[
    status
  ] || status;
const traceType = (status: string) => (status === 'FAILED' ? 'danger' : ['WAIT_INPUT', 'WAIT_ASYNC'].includes(status) ? 'warning' : 'primary');
const branchText = (value: string) => ({ TRUE: '条件成立', FALSE: '条件不成立', FALLBACK: '未命中意图' })[value] || value;

watch(
  () => props.modelValue,
  (visible) => {
    if (!visible) return;
    execution.value = undefined;
    messages.value = [];
    outputCount.value = 0;
    inputText.value = '';
  }
);
</script>

<style scoped>
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
.stop-button {
  margin: 10px 0 0;
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
  gap: 10px;
  padding-top: 14px;
  border-top: 1px solid #edf1f6;
}
.trace-list {
  margin-top: 18px;
  padding-left: 4px;
}
.trace-card > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.trace-card p {
  margin: 6px 0 0;
  color: #66758a;
  font-size: 12px;
  line-height: 1.5;
}
@media (max-width: 1280px) {
  .test-layout {
    grid-template-columns: 260px minmax(380px, 1fr) 330px;
  }
}
</style>
