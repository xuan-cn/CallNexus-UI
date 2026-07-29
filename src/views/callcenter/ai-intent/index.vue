<template>
  <div class="p-3 intent-page">
    <el-card shadow="never">
      <div class="toolbar">
        <div>
          <h2>意图管理</h2>
          <p>统一维护寒暄、控制、路由和业务意图，AI 助手按需绑定复用。</p>
        </div>
        <el-button v-hasPermi="['callcenter:ai-intent:create']" type="primary" icon="Plus" @click="openEditor()">新增意图</el-button>
      </div>

      <el-table :data="intents" row-key="id">
        <el-table-column label="意图" min-width="210">
          <template #default="{ row }">
            <div class="intent-name">{{ row.intentName }}</div>
            <div class="intent-code">{{ row.intentCode }}</div>
          </template>
        </el-table-column>
        <el-table-column label="类型" width="110">
          <template #default="{ row }"
            ><el-tag :type="typeMeta[row.intentType]?.tag">{{ typeMeta[row.intentType]?.label }}</el-tag></template
          >
        </el-table-column>
        <el-table-column label="相似话术" min-width="250">
          <template #default="{ row }">
            <span class="utterance-count positive">正例 {{ positiveCount(row) }}</span>
            <span class="utterance-count negative">反例 {{ negativeCount(row) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="绑定助手" min-width="210">
          <template #default="{ row }">
            <el-tag v-for="name in row.agentNames" :key="name" class="mr-1" effect="plain">{{ name }}</el-tag>
            <span v-if="!row.agentNames.length" class="muted">未绑定</span>
          </template>
        </el-table-column>
        <el-table-column label="识别阈值" width="100">
          <template #default="{ row }">{{ Number(row.confidenceThreshold).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="建议动作" width="150">
          <template #default="{ row }">{{ actionMeta[row.actionType] || row.actionType }}</template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }"
            ><el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '停用' }}</el-tag></template
          >
        </el-table-column>
        <el-table-column label="操作" width="210" fixed="right">
          <template #default="{ row }">
            <el-button v-hasPermi="['callcenter:ai-intent:test']" link type="success" @click="openTest(row)">测试</el-button>
            <el-button v-hasPermi="['callcenter:ai-intent:update']" link type="primary" @click="openEditor(row)">修改</el-button>
            <el-button v-hasPermi="['callcenter:ai-intent:delete']" link type="danger" @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-drawer v-model="editorVisible" :title="form.id ? '修改意图' : '新增意图'" size="920px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="110px">
        <el-divider content-position="left">基础信息</el-divider>
        <el-row :gutter="18">
          <el-col :span="12"
            ><el-form-item label="意图编码" prop="intentCode"><el-input v-model="form.intentCode" placeholder="例如 TRANSFER_HUMAN" /></el-form-item
          ></el-col>
          <el-col :span="12"
            ><el-form-item label="意图名称" prop="intentName"><el-input v-model="form.intentName" placeholder="例如 转人工" /></el-form-item
          ></el-col>
          <el-col :span="12">
            <el-form-item label="意图类型" prop="intentType">
              <el-select v-model="form.intentType" style="width: 100%">
                <el-option v-for="(meta, key) in typeMeta" :key="key" :label="meta.label" :value="key" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12"
            ><el-form-item label="优先级"><el-input-number v-model="form.priority" :min="1" :max="10000" style="width: 100%" /></el-form-item
          ></el-col>
        </el-row>
        <el-form-item label="意图说明"
          ><el-input v-model="form.description" type="textarea" :rows="2" placeholder="说明该意图何时应命中、何时不应命中"
        /></el-form-item>

        <el-divider content-position="left">正反例话术</el-divider>
        <el-alert title="正例用于描述用户可能怎么说；反例用于排除容易混淆但不应命中的表达。" type="info" :closable="false" class="mb-3" />
        <div class="utterance-editor">
          <div class="utterance-column">
            <div class="column-title positive">正例话术</div>
            <div v-for="(item, index) in positiveUtterances" :key="item.key" class="utterance-row">
              <el-input v-model="item.value" placeholder="例如：帮我转人工坐席" />
              <el-button icon="Delete" circle plain type="danger" @click="positiveUtterances.splice(index, 1)" />
            </div>
            <el-button plain icon="Plus" @click="positiveUtterances.push(newUtterance())">添加正例</el-button>
          </div>
          <div class="utterance-column">
            <div class="column-title negative">反例话术</div>
            <div v-for="(item, index) in negativeUtterances" :key="item.key" class="utterance-row">
              <el-input v-model="item.value" placeholder="例如：不要转人工" />
              <el-button icon="Delete" circle plain type="danger" @click="negativeUtterances.splice(index, 1)" />
            </div>
            <el-button plain icon="Plus" @click="negativeUtterances.push(newUtterance())">添加反例</el-button>
          </div>
        </div>

        <el-divider content-position="left">助手与动作建议</el-divider>
        <el-form-item label="绑定助手">
          <el-select
            v-model="form.agentIds"
            multiple
            collapse-tags
            collapse-tags-tooltip
            style="width: 100%"
            placeholder="选择需要识别该意图的 AI 助手"
          >
            <el-option v-for="agent in agents" :key="agent.id" :label="agent.agentName" :value="agent.id" />
          </el-select>
        </el-form-item>
        <el-row :gutter="18">
          <el-col :span="12">
            <el-form-item label="建议动作">
              <el-select v-model="form.actionType" style="width: 100%">
                <el-option v-for="(label, key) in actionMeta" :key="key" :label="label" :value="key" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12"
            ><el-form-item label="需要确认"><el-switch v-model="form.confirmationRequired" /></el-form-item
          ></el-col>
        </el-row>
        <el-form-item v-if="form.actionType === 'TRANSFER_QUEUE'" label="目标技能组">
          <el-select v-model="actionQueueCode" filterable style="width: 100%" placeholder="请选择要转接的技能组">
            <el-option v-for="queue in queues" :key="queue.id" :label="`${queue.queueName}（${queue.queueCode}）`" :value="queue.queueCode" />
          </el-select>
        </el-form-item>
        <el-form-item v-else-if="form.actionType === 'TRANSFER_EXTENSION'" label="目标分机">
          <el-select v-model="actionExtension" filterable style="width: 100%" placeholder="请选择要转接的 SIP 分机">
            <el-option
              v-for="account in sipAccounts"
              :key="account.id"
              :label="account.displayName ? `${account.extension} - ${account.displayName}` : account.extension"
              :value="account.extension"
            />
          </el-select>
        </el-form-item>
        <el-form-item v-else-if="form.actionType === 'TRANSFER_IVR'" label="目标 IVR">
          <el-select v-model="actionIvrFlowId" filterable style="width: 100%" placeholder="请选择已发布的 IVR 流程">
            <el-option
              v-for="flow in ivrFlows"
              :key="flow.id"
              :label="`${flow.flowName}（${flow.flowCode}）`"
              :value="String(flow.id)"
            />
          </el-select>
        </el-form-item>
        <el-alert
          v-if="['TRANSFER_QUEUE', 'TRANSFER_EXTENSION', 'TRANSFER_IVR'].includes(form.actionType)"
          title="动作参数由系统根据所选目标自动生成，无需手工填写。"
          type="info"
          :closable="false"
          class="mb-4"
        />
        <el-form-item label="建议回复"
          ><el-input v-model="form.responseTemplate" type="textarea" :rows="3" placeholder="命中后向用户播报；转接、挂机等动作会在播报完成后执行"
        /></el-form-item>
        <el-form-item label="置信度阈值"><el-slider v-model="form.confidenceThreshold" :min="0" :max="1" :step="0.01" show-input /></el-form-item>
        <el-form-item label="启用"><el-switch v-model="form.enabled" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editorVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </template>
    </el-drawer>

    <el-dialog v-model="testVisible" title="意图识别测试" width="760px" destroy-on-close>
      <el-alert title="测试只进行识别和诊断，不会执行转接、挂机、停止播放等真实动作。" type="warning" :closable="false" class="mb-4" />
      <el-form label-width="90px">
        <el-form-item label="AI 助手">
          <el-select v-model="testAgentId" style="width: 100%" placeholder="选择已绑定意图的 AI 助手">
            <el-option v-for="agent in agents" :key="agent.id" :label="agent.agentName" :value="agent.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="用户表达"><el-input v-model="testText" type="textarea" :rows="4" placeholder="例如：帮我转人工坐席" /></el-form-item>
      </el-form>
      <div v-if="testResult" class="diagnosis" :class="{ matched: testResult.matched }">
        <div class="diagnosis-header">
          <b>{{ testResult.matched ? `命中：${testResult.intentName}` : '未命中意图' }}</b>
          <el-tag :type="testResult.matched ? 'success' : 'info'">{{ methodText[testResult.matchMethod] || testResult.matchMethod }}</el-tag>
        </div>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="意图编码">{{ testResult.intentCode || '-' }}</el-descriptions-item>
          <el-descriptions-item label="置信度">{{ Number(testResult.confidence || 0).toFixed(4) }}</el-descriptions-item>
          <el-descriptions-item label="识别耗时">{{ testResult.latencyMs }} ms</el-descriptions-item>
          <el-descriptions-item label="建议动作">{{ actionMeta[testResult.actionType || 'NONE'] }}</el-descriptions-item>
          <el-descriptions-item label="判断依据" :span="2">{{ testResult.reason }}</el-descriptions-item>
          <el-descriptions-item label="建议回复" :span="2">{{ testResult.responseTemplate || '-' }}</el-descriptions-item>
        </el-descriptions>
      </div>
      <template #footer>
        <el-button @click="testVisible = false">关闭</el-button>
        <el-button type="primary" :loading="testing" :disabled="!testAgentId || !testText.trim()" @click="runTest">开始识别</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { createAiIntent, deleteAiIntent, listAiAgents, listAiIntents, recognizeAiIntent, updateAiIntent } from '@/api/callcenter/ai-knowledge';
import { listCallQueues } from '@/api/callcenter/call-queue';
import type { CallQueueVO } from '@/api/callcenter/call-queue/types';
import { listIvrFlows } from '@/api/callcenter/ivr-flow';
import type { IvrFlowVO } from '@/api/callcenter/ivr-flow/types';
import { listSipAccounts } from '@/api/callcenter/sip-account';
import type { SipAccountVO } from '@/api/callcenter/sip-account/types';
import type {
  AiAgentVO,
  AiIntentActionType,
  AiIntentForm,
  AiIntentRecognitionVO,
  AiIntentType,
  AiIntentVO
} from '@/api/callcenter/ai-knowledge/types';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;
const typeMeta: Record<AiIntentType, { label: string; tag: '' | 'success' | 'warning' | 'danger' | 'info' }> = {
  CONVERSATION: { label: '会话', tag: 'info' },
  CONTROL: { label: '控制', tag: 'warning' },
  ROUTING: { label: '路由', tag: 'danger' },
  BUSINESS: { label: '业务', tag: 'success' }
};
const actionMeta: Record<AiIntentActionType, string> = {
  NONE: '仅识别',
  CHAT_REPLY: '按模板回复',
  REPEAT_LAST_REPLY: '重复上一句',
  STOP_PLAYBACK: '停止当前播报',
  TRANSFER_QUEUE: '转技能组',
  TRANSFER_EXTENSION: '转分机',
  TRANSFER_IVR: '转 IVR',
  END_CALL: '结束通话',
  KNOWLEDGE_QUERY: '发起知识查询'
};
const methodText = { EXACT: '精确话术', MODEL: '模型分类', NONE: '无候选' };
const intents = ref<AiIntentVO[]>([]);
const agents = ref<AiAgentVO[]>([]);
const queues = ref<CallQueueVO[]>([]);
const sipAccounts = ref<SipAccountVO[]>([]);
const ivrFlows = ref<IvrFlowVO[]>([]);
const actionQueueCode = ref('');
const actionExtension = ref('');
const actionIvrFlowId = ref('');
const editorVisible = ref(false);
const testVisible = ref(false);
const saving = ref(false);
const testing = ref(false);
const formRef = ref();
const testAgentId = ref<string | number>();
const testText = ref('');
const testResult = ref<AiIntentRecognitionVO>();
let utteranceKey = 0;
const newUtterance = (value = '') => ({ key: ++utteranceKey, value });
const positiveUtterances = ref([newUtterance()]);
const negativeUtterances = ref([newUtterance()]);
const defaults = (): AiIntentForm => ({
  intentCode: '',
  intentName: '',
  intentType: 'BUSINESS',
  description: '',
  actionType: 'NONE',
  actionConfigJson: '',
  responseTemplate: '',
  confidenceThreshold: 0.8,
  priority: 100,
  confirmationRequired: false,
  enabled: true,
  utterances: [],
  agentIds: []
});
const form = ref<AiIntentForm>(defaults());
const rules = {
  intentCode: [{ required: true, message: '请输入意图编码', trigger: 'blur' }],
  intentName: [{ required: true, message: '请输入意图名称', trigger: 'blur' }],
  intentType: [{ required: true, message: '请选择意图类型', trigger: 'change' }]
};

const load = async () => {
  const [intentResponse, agentResponse, queueResponse, sipAccountResponse, ivrFlowResponse] = await Promise.all([
    listAiIntents(),
    listAiAgents(),
    listCallQueues(),
    listSipAccounts({ pageNum: 1, pageSize: 1000 }),
    listIvrFlows()
  ]);
  intents.value = intentResponse.data || [];
  agents.value = (agentResponse.data || []).filter((item) => item.enabled);
  queues.value = queueResponse.data || [];
  sipAccounts.value = (sipAccountResponse.rows || []).filter((item) => item.enabled);
  ivrFlows.value = (ivrFlowResponse.data || []).filter((item) => item.enabled && item.publishStatus === 'PUBLISHED');
};
const positiveCount = (row: AiIntentVO) => row.utterances.filter((item) => item.utteranceType === 'POSITIVE').length;
const negativeCount = (row: AiIntentVO) => row.utterances.filter((item) => item.utteranceType === 'NEGATIVE').length;
const openEditor = (row?: AiIntentVO) => {
  form.value = row
    ? { ...row, confidenceThreshold: Number(row.confidenceThreshold), agentIds: [...row.agentIds], utterances: [...row.utterances] }
    : defaults();
  actionQueueCode.value = '';
  actionExtension.value = '';
  actionIvrFlowId.value = '';
  if (row?.actionConfigJson) {
    try {
      const config = JSON.parse(row.actionConfigJson) as { queueCode?: string; extension?: string; ivrFlowId?: string | number };
      actionQueueCode.value = config.queueCode || '';
      actionExtension.value = config.extension || '';
      actionIvrFlowId.value = config.ivrFlowId == null ? '' : String(config.ivrFlowId);
    } catch {
      // 历史异常配置由后端校验，编辑页不再向用户暴露原始 JSON。
    }
  }
  const positives = row?.utterances.filter((item) => item.utteranceType === 'POSITIVE').map((item) => newUtterance(item.utteranceText)) || [];
  const negatives = row?.utterances.filter((item) => item.utteranceType === 'NEGATIVE').map((item) => newUtterance(item.utteranceText)) || [];
  positiveUtterances.value = positives.length ? positives : [newUtterance()];
  negativeUtterances.value = negatives.length ? negatives : [newUtterance()];
  editorVisible.value = true;
};
const save = async () => {
  await formRef.value?.validate();
  if (form.value.actionType === 'TRANSFER_QUEUE' && !actionQueueCode.value) {
    proxy?.$modal.msgError('请选择目标技能组');
    return;
  }
  if (form.value.actionType === 'TRANSFER_EXTENSION' && !actionExtension.value) {
    proxy?.$modal.msgError('请选择目标分机');
    return;
  }
  if (form.value.actionType === 'TRANSFER_IVR' && !actionIvrFlowId.value) {
    proxy?.$modal.msgError('请选择目标 IVR 流程');
    return;
  }
  const actionConfigJson =
    form.value.actionType === 'TRANSFER_QUEUE'
      ? JSON.stringify({ queueCode: actionQueueCode.value })
      : form.value.actionType === 'TRANSFER_EXTENSION'
        ? JSON.stringify({ extension: actionExtension.value })
        : form.value.actionType === 'TRANSFER_IVR'
          ? JSON.stringify({ ivrFlowId: actionIvrFlowId.value })
          : '';
  saving.value = true;
  try {
    const payload: AiIntentForm = {
      ...form.value,
      actionConfigJson,
      utterances: [
        ...positiveUtterances.value
          .filter((item) => item.value.trim())
          .map((item) => ({ utteranceType: 'POSITIVE' as const, utteranceText: item.value.trim() })),
        ...negativeUtterances.value
          .filter((item) => item.value.trim())
          .map((item) => ({ utteranceType: 'NEGATIVE' as const, utteranceText: item.value.trim() }))
      ]
    };
    payload.id ? await updateAiIntent(payload.id, payload) : await createAiIntent(payload);
    editorVisible.value = false;
    proxy?.$modal.msgSuccess('保存成功');
    await load();
  } finally {
    saving.value = false;
  }
};
const remove = async (row: AiIntentVO) => {
  await proxy?.$modal.confirm(`确认删除意图“${row.intentName}”吗？`);
  await deleteAiIntent(row.id);
  proxy?.$modal.msgSuccess('删除成功');
  await load();
};
const openTest = (row: AiIntentVO) => {
  testAgentId.value = row.agentIds[0] || agents.value[0]?.id;
  testText.value = row.utterances.find((item) => item.utteranceType === 'POSITIVE')?.utteranceText || '';
  testResult.value = undefined;
  testVisible.value = true;
};
const runTest = async () => {
  if (!testAgentId.value || !testText.value.trim()) return;
  testing.value = true;
  try {
    testResult.value = (await recognizeAiIntent({ agentId: testAgentId.value, text: testText.value.trim() })).data;
  } finally {
    testing.value = false;
  }
};
watch(
  () => form.value.actionType,
  (actionType) => {
    if (actionType !== 'TRANSFER_QUEUE') actionQueueCode.value = '';
    if (actionType !== 'TRANSFER_EXTENSION') actionExtension.value = '';
    if (actionType !== 'TRANSFER_IVR') actionIvrFlowId.value = '';
  }
);
onMounted(load);
</script>

<style scoped>
.intent-page {
  min-width: 980px;
}
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}
.toolbar h2 {
  margin: 0 0 6px;
  font-size: 20px;
  color: #163a63;
}
.toolbar p {
  margin: 0;
  color: #7b8794;
}
.intent-name {
  font-weight: 600;
  color: #183b61;
}
.intent-code {
  margin-top: 3px;
  color: #8a96a3;
  font-size: 12px;
}
.utterance-count {
  display: inline-flex;
  padding: 3px 9px;
  border-radius: 12px;
  margin-right: 8px;
  font-size: 12px;
}
.utterance-count.positive {
  color: #16804b;
  background: #e9f8f0;
}
.utterance-count.negative {
  color: #b56a13;
  background: #fff4e5;
}
.muted {
  color: #a0a8b0;
}
.utterance-editor {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  margin-bottom: 20px;
}
.utterance-column {
  padding: 14px;
  border: 1px solid #e7ebf0;
  border-radius: 10px;
  background: #fafbfd;
}
.column-title {
  margin-bottom: 12px;
  font-weight: 600;
}
.column-title.positive {
  color: #16804b;
}
.column-title.negative {
  color: #b56a13;
}
.utterance-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  margin-bottom: 9px;
}
.diagnosis {
  padding: 16px;
  border: 1px solid #dfe5ec;
  border-radius: 10px;
  background: #f8fafc;
}
.diagnosis.matched {
  border-color: #b9e6cf;
  background: #f3fbf7;
}
.diagnosis-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
  color: #183b61;
}
</style>
