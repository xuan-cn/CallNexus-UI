<template>
  <div class="p-3 intent-page">
    <div class="page-header">
      <div>
        <h2>意图管理</h2>
        <p>按业务分类维护意图和正反例话术，并限定识别候选范围。</p>
      </div>
      <div class="header-actions">
        <el-button v-hasPermi="['callcenter:ai-intent:create']" type="primary" icon="Plus" @click="openEditor()">新增意图</el-button>
      </div>
    </div>
    <div class="intent-layout">
      <aside class="group-panel">
        <div class="group-panel-header">
          <div>
            <div class="group-panel-title">意图分类</div>
            <div class="group-panel-subtitle">按业务范围筛选</div>
          </div>
          <el-tooltip content="管理分类" placement="top">
            <el-button
              v-hasPermi="['callcenter:ai-intent:update']"
              class="group-manage-button"
              circle
              text
              icon="Setting"
              @click="groupManageVisible = true"
            />
          </el-tooltip>
        </div>
        <el-input v-model="groupKeyword" class="group-search" clearable prefix-icon="Search" placeholder="搜索分类" />
        <nav class="group-navigation">
          <button :class="['group-item', 'group-item-all', { active: selectedGroup === 'ALL' }]" type="button" @click="selectGroup('ALL')">
            <span class="group-item-main"><span class="group-icon all-icon">全</span><span>全部意图</span></span>
            <span class="group-count">{{ groupTotal }}</span>
          </button>
          <div class="group-section-title">业务分类</div>
          <div class="group-list">
            <button
              v-for="group in visibleGroups"
              :key="group.id"
              :class="['group-item', { active: String(selectedGroup) === String(group.id), disabled: !group.enabled }]"
              type="button"
              @click="selectGroup(group.id)"
            >
              <span class="group-item-main"
                ><span class="group-icon">{{ group.groupName.slice(0, 1) }}</span
                ><span class="group-name">{{ group.groupName }}</span></span
              >
              <span class="group-count">{{ group.intentCount }}</span>
            </button>
            <el-empty v-if="!visibleGroups.length" :image-size="42" description="暂无匹配分类" />
          </div>
          <div class="group-divider"></div>
          <button :class="['group-item', { active: selectedGroup === 'UNGROUPED' }]" type="button" @click="selectGroup('UNGROUPED')">
            <span class="group-item-main"><span class="group-icon ungrouped-icon">未</span><span>未分类</span></span>
            <span class="group-count">{{ ungroupedCount }}</span>
          </button>
        </nav>
        <button v-hasPermi="['callcenter:ai-intent:create']" class="group-add-button" type="button" @click="openGroupEditor()">
          <el-icon><Plus /></el-icon><span>新建分类</span>
        </button>
      </aside>
      <el-card class="intent-content" shadow="never">
        <el-form :model="query" inline class="query-form" @submit.prevent="search">
          <el-form-item label="关键词"
            ><el-input v-model="query.keyword" clearable placeholder="名称、编码或说明" @keyup.enter="search"
          /></el-form-item>
          <el-form-item label="类型"
            ><el-select v-model="query.intentType" clearable placeholder="全部类型"
              ><el-option v-for="(meta, key) in typeMeta" :key="key" :label="meta.label" :value="key" /></el-select
          ></el-form-item>
          <el-form-item label="状态"
            ><el-select v-model="query.enabled" clearable placeholder="全部状态"
              ><el-option label="启用" :value="true" /><el-option label="停用" :value="false" /></el-select
          ></el-form-item>
          <el-form-item label="绑定助手"
            ><el-select v-model="query.agentId" clearable filterable placeholder="全部助手"
              ><el-option v-for="agent in agents" :key="agent.id" :label="agent.agentName" :value="agent.id" /></el-select
          ></el-form-item>
          <el-form-item
            ><el-button type="primary" icon="Search" @click="search">查询</el-button
            ><el-button icon="Refresh" @click="resetQuery">重置</el-button></el-form-item
          >
        </el-form>
        <div class="list-toolbar">
          <div class="selection-summary">
            共 {{ total }} 项<span v-if="selectedRows.length">，已选 {{ selectedRows.length }} 项</span>
          </div>
          <div v-if="selectedRows.length" class="batch-actions">
            <el-button v-hasPermi="['callcenter:ai-intent:update']" @click="openBatchGroup">批量分类</el-button>
            <el-button v-hasPermi="['callcenter:ai-intent:update']" type="success" plain @click="batchSetEnabled(true)">批量启用</el-button>
            <el-button v-hasPermi="['callcenter:ai-intent:update']" type="warning" plain @click="batchSetEnabled(false)">批量停用</el-button>
          </div>
        </div>
        <el-table v-loading="loading" class="intent-table" :data="intents" row-key="id" @selection-change="selectedRows = $event">
          <el-table-column type="selection" width="42" />
          <el-table-column label="意图" min-width="190"
            ><template #default="{ row }"
              ><div class="intent-name">{{ row.intentName }}</div>
              <div class="intent-code">{{ row.intentCode }}</div></template
            ></el-table-column
          >
          <el-table-column label="分类" width="130"
            ><template #default="{ row }">{{ row.groupName || '未分类' }}</template></el-table-column
          >
          <el-table-column label="类型" width="90"
            ><template #default="{ row }"
              ><el-tag :type="typeMeta[row.intentType]?.tag">{{ typeMeta[row.intentType]?.label }}</el-tag></template
            ></el-table-column
          >
          <el-table-column label="话术" width="150"
            ><template #default="{ row }"
              ><span class="utterance-count positive">正 {{ positiveCount(row) }}</span
              ><span class="utterance-count negative">反 {{ negativeCount(row) }}</span></template
            ></el-table-column
          >
          <el-table-column label="绑定助手" min-width="170" show-overflow-tooltip
            ><template #default="{ row }">{{ row.agentNames?.join('、') || '未绑定' }}</template></el-table-column
          >
          <el-table-column label="阈值" width="75"
            ><template #default="{ row }">{{ Number(row.confidenceThreshold).toFixed(2) }}</template></el-table-column
          >
          <el-table-column label="建议动作" width="125"
            ><template #default="{ row }">{{ actionMeta[row.actionType] || row.actionType }}</template></el-table-column
          >
          <el-table-column label="状态" width="75"
            ><template #default="{ row }"
              ><el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '停用' }}</el-tag></template
            ></el-table-column
          >
          <el-table-column label="操作" width="168" fixed="right"
            ><template #default="{ row }"
              ><div class="row-actions">
                <el-button v-hasPermi="['callcenter:ai-intent:test']" link type="success" @click="openTest(row)">测试</el-button
                ><el-button v-hasPermi="['callcenter:ai-intent:update']" link type="primary" @click="openEditor(row)">修改</el-button
                ><el-button v-hasPermi="['callcenter:ai-intent:delete']" link type="danger" @click="remove(row)">删除</el-button>
              </div></template
            ></el-table-column
          >
        </el-table>
        <pagination v-show="total > 0" v-model:page="query.pageNum" v-model:limit="query.pageSize" :total="total" @pagination="loadIntents" />
      </el-card>
    </div>

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
          <el-col :span="12"
            ><el-form-item label="所属分类"
              ><el-select v-model="form.groupId" clearable filterable style="width: 100%" placeholder="未分类"
                ><el-option v-for="group in enabledGroups" :key="group.id" :label="group.groupName" :value="group.id" /></el-select></el-form-item
          ></el-col>
          <el-col :span="12"
            ><el-form-item label="意图类型" prop="intentType"
              ><el-select v-model="form.intentType" style="width: 100%"
                ><el-option v-for="(meta, key) in typeMeta" :key="key" :label="meta.label" :value="key" /></el-select></el-form-item
          ></el-col>
          <el-col :span="12"
            ><el-form-item label="优先级"><el-input-number v-model="form.priority" :min="1" :max="10000" style="width: 100%" /></el-form-item
          ></el-col>
        </el-row>
        <el-form-item label="意图说明"
          ><el-input v-model="form.description" type="textarea" :rows="2" placeholder="说明该意图何时应命中、何时不应命中"
        /></el-form-item>
        <el-divider content-position="left">正反例话术</el-divider>
        <el-alert title="正例描述用户可能怎么说；反例排除容易混淆但不应命中的表达。" type="info" :closable="false" class="mb-3" />
        <div class="utterance-editor">
          <div class="utterance-column">
            <div class="column-title positive">正例话术</div>
            <div v-for="(item, index) in positiveUtterances" :key="item.key" class="utterance-row">
              <el-input v-model="item.value" placeholder="例如：帮我转人工坐席" /><el-button
                icon="Delete"
                circle
                plain
                type="danger"
                @click="positiveUtterances.splice(index, 1)"
              />
            </div>
            <el-button plain icon="Plus" @click="positiveUtterances.push(newUtterance())">添加正例</el-button>
          </div>
          <div class="utterance-column">
            <div class="column-title negative">反例话术</div>
            <div v-for="(item, index) in negativeUtterances" :key="item.key" class="utterance-row">
              <el-input v-model="item.value" placeholder="例如：不要转人工" /><el-button
                icon="Delete"
                circle
                plain
                type="danger"
                @click="negativeUtterances.splice(index, 1)"
              />
            </div>
            <el-button plain icon="Plus" @click="negativeUtterances.push(newUtterance())">添加反例</el-button>
          </div>
        </div>
        <el-divider content-position="left">助手与动作建议</el-divider>
        <el-form-item label="绑定助手"
          ><el-select
            v-model="form.agentIds"
            multiple
            collapse-tags
            collapse-tags-tooltip
            style="width: 100%"
            placeholder="选择需要识别该意图的 AI 助手"
            ><el-option v-for="agent in agents" :key="agent.id" :label="agent.agentName" :value="agent.id" /></el-select
        ></el-form-item>
        <el-row :gutter="18"
          ><el-col :span="12"
            ><el-form-item label="建议动作"
              ><el-select v-model="form.actionType" style="width: 100%"
                ><el-option v-for="(label, key) in actionMeta" :key="key" :label="label" :value="key" /></el-select></el-form-item></el-col
          ><el-col :span="12"
            ><el-form-item label="需要确认"><el-switch v-model="form.confirmationRequired" /></el-form-item></el-col
        ></el-row>
        <el-form-item v-if="form.actionType === 'TRANSFER_QUEUE'" label="目标技能组"
          ><el-select v-model="actionQueueCode" filterable style="width: 100%"
            ><el-option v-for="item in queues" :key="item.id" :label="`${item.queueName}（${item.queueCode}）`" :value="item.queueCode" /></el-select
        ></el-form-item>
        <el-form-item v-else-if="form.actionType === 'TRANSFER_EXTENSION'" label="目标分机"
          ><el-select v-model="actionExtension" filterable style="width: 100%"
            ><el-option
              v-for="item in sipAccounts"
              :key="item.id"
              :label="item.displayName ? `${item.extension} - ${item.displayName}` : item.extension"
              :value="item.extension" /></el-select
        ></el-form-item>
        <el-form-item v-else-if="form.actionType === 'TRANSFER_IVR'" label="目标 IVR"
          ><el-select v-model="actionIvrFlowId" filterable style="width: 100%"
            ><el-option v-for="item in ivrFlows" :key="item.id" :label="`${item.flowName}（${item.flowCode}）`" :value="String(item.id)" /></el-select
        ></el-form-item>
        <el-form-item v-else-if="form.actionType === 'TRANSFER_ONLINE_SERVICE'" label="在线客服组"
          ><el-select v-model="actionOnlineSkillGroupId" filterable style="width: 100%"
            ><el-option
              v-for="item in skillGroups"
              :key="item.id"
              :label="`${item.groupName}（${item.groupCode}）`"
              :value="String(item.id)" /></el-select
        ></el-form-item>
        <template v-else-if="form.actionType === 'CREATE_TICKET'"
          ><el-form-item label="工单模板"
            ><el-select v-model="actionTicketTemplateId" filterable style="width: 100%"
              ><el-option
                v-for="item in ticketTemplates"
                :key="item.id"
                :label="item.templateName"
                :value="String(item.id)" /></el-select></el-form-item
          ><el-form-item label="自动提交"
            ><el-switch v-model="actionTicketAutoSubmit" /><span class="action-tip">开启后创建工单并立即提交绑定的工作流</span></el-form-item
          ></template
        >
        <el-form-item label="建议回复"
          ><el-input v-model="form.responseTemplate" type="textarea" :rows="3" placeholder="命中后向用户播报；受控动作会在播报完成后执行"
        /></el-form-item>
        <el-form-item label="置信度阈值"><el-slider v-model="form.confidenceThreshold" :min="0" :max="1" :step="0.01" show-input /></el-form-item>
        <el-form-item label="启用"><el-switch v-model="form.enabled" /></el-form-item>
      </el-form>
      <template #footer
        ><el-button @click="editorVisible = false">取消</el-button
        ><el-button type="primary" :loading="saving" @click="save">保存</el-button></template
      >
    </el-drawer>

    <el-dialog v-model="groupManageVisible" title="意图分类管理" width="760px">
      <div class="dialog-toolbar">
        <span>分类用于缩小识别范围，也便于编排时批量选择。</span><el-button type="primary" icon="Plus" @click="openGroupEditor()">新增分类</el-button>
      </div>
      <el-table :data="groups"
        ><el-table-column prop="groupName" label="分类名称" /><el-table-column prop="groupCode" label="分类编码" /><el-table-column
          prop="intentCount"
          label="意图数"
          width="80"
        /><el-table-column label="状态" width="80"
          ><template #default="{ row }">{{ row.enabled ? '启用' : '停用' }}</template></el-table-column
        ><el-table-column label="操作" width="130"
          ><template #default="{ row }"
            ><el-button link type="primary" @click="openGroupEditor(row)">修改</el-button
            ><el-button link type="danger" @click="removeGroup(row)">删除</el-button></template
          ></el-table-column
        ></el-table
      >
    </el-dialog>
    <el-dialog v-model="groupEditorVisible" :title="groupForm.id ? '修改分类' : '新增分类'" width="520px" append-to-body>
      <el-form label-width="90px"
        ><el-form-item label="分类名称" required><el-input v-model="groupForm.groupName" /></el-form-item
        ><el-form-item label="分类编码" required><el-input v-model="groupForm.groupCode" placeholder="例如 AFTER_SALE" /></el-form-item
        ><el-form-item label="排序"><el-input-number v-model="groupForm.sortOrder" :min="1" :max="10000" /></el-form-item
        ><el-form-item label="说明"><el-input v-model="groupForm.description" type="textarea" :rows="2" /></el-form-item
        ><el-form-item label="启用"><el-switch v-model="groupForm.enabled" /></el-form-item
      ></el-form>
      <template #footer
        ><el-button @click="groupEditorVisible = false">取消</el-button><el-button type="primary" @click="saveGroup">保存</el-button></template
      >
    </el-dialog>
    <el-dialog v-model="batchGroupVisible" title="批量调整分类" width="480px"
      ><el-form label-width="90px"
        ><el-form-item label="目标分类"
          ><el-select v-model="batchGroupId" clearable style="width: 100%" placeholder="清空后设为未分类"
            ><el-option
              v-for="group in enabledGroups"
              :key="group.id"
              :label="group.groupName"
              :value="group.id" /></el-select></el-form-item></el-form
      ><template #footer
        ><el-button @click="batchGroupVisible = false">取消</el-button><el-button type="primary" @click="submitBatchGroup">确定</el-button></template
      ></el-dialog
    >

    <el-dialog v-model="testVisible" title="意图识别测试" width="780px" destroy-on-close>
      <el-alert title="测试只进行本地向量识别和诊断，不会执行转接、挂机等真实动作。" type="warning" :closable="false" class="mb-4" />
      <el-form label-width="100px"
        ><el-form-item label="AI 助手"
          ><el-select v-model="testAgentId" style="width: 100%"
            ><el-option v-for="agent in agents" :key="agent.id" :label="agent.agentName" :value="agent.id" /></el-select></el-form-item
        ><el-form-item label="识别范围"
          ><el-radio-group v-model="testScope"
            ><el-radio-button value="CURRENT">当前意图</el-radio-button
            ><el-radio-button value="GROUP" :disabled="!testGroupId">当前分类</el-radio-button
            ><el-radio-button value="ALL">助手全部意图</el-radio-button></el-radio-group
          ></el-form-item
        ><el-form-item label="用户表达"><el-input v-model="testText" type="textarea" :rows="4" placeholder="输入用户可能说的一句话" /></el-form-item
      ></el-form>
      <div v-if="testResult" class="diagnosis" :class="{ matched: testResult.matched }">
        <div class="diagnosis-header">
          <b>{{ testResult.matched ? `命中：${testResult.intentName}` : '未命中意图' }}</b
          ><el-tag :type="testResult.matched ? 'success' : 'info'">{{ methodText[testResult.matchMethod] || testResult.matchMethod }}</el-tag>
        </div>
        <el-descriptions :column="2" border
          ><el-descriptions-item label="意图编码">{{ testResult.intentCode || '-' }}</el-descriptions-item
          ><el-descriptions-item label="置信度">{{ Number(testResult.confidence || 0).toFixed(4) }}</el-descriptions-item
          ><el-descriptions-item label="识别耗时">{{ testResult.latencyMs }} ms</el-descriptions-item
          ><el-descriptions-item label="建议动作">{{ actionMeta[testResult.actionType || 'NONE'] }}</el-descriptions-item
          ><el-descriptions-item label="判断依据" :span="2">{{ testResult.reason }}</el-descriptions-item></el-descriptions
        >
      </div>
      <template #footer
        ><el-button @click="testVisible = false">关闭</el-button
        ><el-button type="primary" :loading="testing" :disabled="!testAgentId || !testText.trim()" @click="runTest">开始识别</el-button></template
      >
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import {
  batchUpdateAiIntents,
  createAiIntent,
  createAiIntentGroup,
  deleteAiIntent,
  deleteAiIntentGroup,
  listAiAgents,
  listAiIntentGroups,
  pageAiIntents,
  recognizeAiIntent,
  updateAiIntent,
  updateAiIntentGroup
} from '@/api/callcenter/ai-knowledge';
import { listCallQueues } from '@/api/callcenter/call-queue';
import { listIvrFlows } from '@/api/callcenter/ivr-flow';
import { listSipAccounts } from '@/api/callcenter/sip-account';
import { listSkillGroups } from '@/api/callcenter/skill-group';
import { listFormTemplates } from '@/api/callcenter/form-template';
import type { CallQueueVO } from '@/api/callcenter/call-queue/types';
import type { IvrFlowVO } from '@/api/callcenter/ivr-flow/types';
import type { SipAccountVO } from '@/api/callcenter/sip-account/types';
import type { SkillGroupVO } from '@/api/callcenter/skill-group/types';
import type { FormTemplate } from '@/api/callcenter/form-template/types';
import type {
  AiAgentVO,
  AiIntentActionType,
  AiIntentForm,
  AiIntentGroupForm,
  AiIntentGroupVO,
  AiIntentPageQuery,
  AiIntentRecognitionVO,
  AiIntentType,
  AiIntentVO,
  Id
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
  TRANSFER_ONLINE_SERVICE: '转在线客服',
  CREATE_TICKET: '创建工单',
  END_CALL: '结束通话',
  KNOWLEDGE_QUERY: '发起知识查询'
};
const methodText: Record<string, string> = { EXACT: '精确话术', VECTOR: '向量识别', MODEL: '模型分类', NONE: '无候选' };
const intents = ref<AiIntentVO[]>([]);
const groups = ref<AiIntentGroupVO[]>([]);
const agents = ref<AiAgentVO[]>([]);
const queues = ref<CallQueueVO[]>([]);
const sipAccounts = ref<SipAccountVO[]>([]);
const ivrFlows = ref<IvrFlowVO[]>([]);
const skillGroups = ref<SkillGroupVO[]>([]);
const ticketTemplates = ref<FormTemplate[]>([]);
const loading = ref(false);
const saving = ref(false);
const testing = ref(false);
const total = ref(0);
const groupTotal = ref(0);
const selectedRows = ref<AiIntentVO[]>([]);
const selectedGroup = ref<Id | 'ALL' | 'UNGROUPED'>('ALL');
const groupKeyword = ref('');
const editorVisible = ref(false);
const testVisible = ref(false);
const groupManageVisible = ref(false);
const groupEditorVisible = ref(false);
const batchGroupVisible = ref(false);
const query = reactive<AiIntentPageQuery>({ pageNum: 1, pageSize: 20, keyword: '' });
const enabledGroups = computed(() => groups.value.filter((item) => item.enabled));
const visibleGroups = computed(() => {
  const keyword = groupKeyword.value.trim().toLowerCase();
  if (!keyword) return groups.value;
  return groups.value.filter((item) => item.groupName.toLowerCase().includes(keyword) || item.groupCode.toLowerCase().includes(keyword));
});
const ungroupedCount = computed(() => Math.max(0, groupTotal.value - groups.value.reduce((sum, item) => sum + Number(item.intentCount || 0), 0)));
const groupForm = ref<AiIntentGroupForm>({ groupCode: '', groupName: '', description: '', sortOrder: 100, enabled: true });
const batchGroupId = ref<Id>();
const actionQueueCode = ref('');
const actionExtension = ref('');
const actionIvrFlowId = ref('');
const actionOnlineSkillGroupId = ref('');
const actionTicketTemplateId = ref('');
const actionTicketAutoSubmit = ref(false);
const formRef = ref();
const testAgentId = ref<Id>();
const testText = ref('');
const testResult = ref<AiIntentRecognitionVO>();
const testScope = ref<'CURRENT' | 'GROUP' | 'ALL'>('CURRENT');
const testIntentCode = ref('');
const testGroupId = ref<Id>();
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

const loadIntents = async () => {
  loading.value = true;
  try {
    const response = (await pageAiIntents(query)) as unknown as { rows: AiIntentVO[]; total: number };
    intents.value = response.rows || [];
    total.value = response.total || 0;
    if (selectedGroup.value === 'ALL' && !query.keyword && !query.intentType && query.enabled === undefined && !query.agentId)
      groupTotal.value = total.value;
  } finally {
    loading.value = false;
  }
};
const loadGroups = async () => {
  groups.value = (await listAiIntentGroups()).data || [];
};
const loadOptions = async () => {
  const [a, q, s, i, g, t] = await Promise.all([
    listAiAgents(),
    listCallQueues(),
    listSipAccounts({ pageNum: 1, pageSize: 1000 }),
    listIvrFlows(),
    listSkillGroups(),
    listFormTemplates('TICKET')
  ]);
  agents.value = (a.data || []).filter((x) => x.enabled);
  queues.value = q.data || [];
  sipAccounts.value = (s.rows || []).filter((x) => x.enabled);
  ivrFlows.value = (i.data || []).filter((x) => x.enabled && x.publishStatus === 'PUBLISHED');
  skillGroups.value = (g.data || []).filter((x) => x.enabled);
  ticketTemplates.value = (t.data || []).filter((x) => x.enabled);
};
const selectGroup = (value: Id | 'ALL' | 'UNGROUPED') => {
  selectedGroup.value = value;
  query.groupId = value === 'ALL' || value === 'UNGROUPED' ? undefined : value;
  query.ungrouped = value === 'UNGROUPED' || undefined;
  search();
};
const search = () => {
  query.pageNum = 1;
  loadIntents();
};
const resetQuery = () => {
  query.keyword = '';
  query.intentType = undefined;
  query.enabled = undefined;
  query.agentId = undefined;
  selectedGroup.value = 'ALL';
  query.groupId = undefined;
  query.ungrouped = undefined;
  search();
};
const positiveCount = (row: AiIntentVO) => (row.utterances || []).filter((x) => x.utteranceType === 'POSITIVE').length;
const negativeCount = (row: AiIntentVO) => (row.utterances || []).filter((x) => x.utteranceType === 'NEGATIVE').length;

const openEditor = (row?: AiIntentVO) => {
  form.value = row
    ? { ...row, confidenceThreshold: Number(row.confidenceThreshold), agentIds: [...(row.agentIds || [])], utterances: [...(row.utterances || [])] }
    : defaults();
  actionQueueCode.value = '';
  actionExtension.value = '';
  actionIvrFlowId.value = '';
  actionOnlineSkillGroupId.value = '';
  actionTicketTemplateId.value = '';
  actionTicketAutoSubmit.value = false;
  if (row?.actionConfigJson) {
    try {
      const c = JSON.parse(row.actionConfigJson);
      actionQueueCode.value = c.queueCode || '';
      actionExtension.value = c.extension || '';
      actionIvrFlowId.value = c.ivrFlowId == null ? '' : String(c.ivrFlowId);
      actionOnlineSkillGroupId.value = c.skillGroupId == null ? '' : String(c.skillGroupId);
      actionTicketTemplateId.value = c.templateId == null ? '' : String(c.templateId);
      actionTicketAutoSubmit.value = Boolean(c.submitAfterCreate);
    } catch {}
  }
  const p = (row?.utterances || []).filter((x) => x.utteranceType === 'POSITIVE').map((x) => newUtterance(x.utteranceText));
  const n = (row?.utterances || []).filter((x) => x.utteranceType === 'NEGATIVE').map((x) => newUtterance(x.utteranceText));
  positiveUtterances.value = p.length ? p : [newUtterance()];
  negativeUtterances.value = n.length ? n : [newUtterance()];
  editorVisible.value = true;
};
const actionConfig = () =>
  form.value.actionType === 'TRANSFER_QUEUE'
    ? { queueCode: actionQueueCode.value }
    : form.value.actionType === 'TRANSFER_EXTENSION'
      ? { extension: actionExtension.value }
      : form.value.actionType === 'TRANSFER_IVR'
        ? { ivrFlowId: actionIvrFlowId.value }
        : form.value.actionType === 'TRANSFER_ONLINE_SERVICE'
          ? { skillGroupId: actionOnlineSkillGroupId.value }
          : form.value.actionType === 'CREATE_TICKET'
            ? { templateId: actionTicketTemplateId.value, submitAfterCreate: actionTicketAutoSubmit.value }
            : undefined;
const save = async () => {
  await formRef.value?.validate();
  const required: Record<string, [string, string]> = {
    TRANSFER_QUEUE: [actionQueueCode.value, '请选择目标技能组'],
    TRANSFER_EXTENSION: [actionExtension.value, '请选择目标分机'],
    TRANSFER_IVR: [actionIvrFlowId.value, '请选择目标 IVR 流程'],
    TRANSFER_ONLINE_SERVICE: [actionOnlineSkillGroupId.value, '请选择在线客服技能组'],
    CREATE_TICKET: [actionTicketTemplateId.value, '请选择工单模板']
  };
  const check = required[form.value.actionType];
  if (check && !check[0]) {
    proxy?.$modal.msgError(check[1]);
    return;
  }
  saving.value = true;
  try {
    const config = actionConfig();
    const payload: AiIntentForm = {
      ...form.value,
      actionConfigJson: config ? JSON.stringify(config) : '',
      utterances: [
        ...positiveUtterances.value.filter((x) => x.value.trim()).map((x) => ({ utteranceType: 'POSITIVE' as const, utteranceText: x.value.trim() })),
        ...negativeUtterances.value.filter((x) => x.value.trim()).map((x) => ({ utteranceType: 'NEGATIVE' as const, utteranceText: x.value.trim() }))
      ]
    };
    payload.id ? await updateAiIntent(payload.id, payload) : await createAiIntent(payload);
    editorVisible.value = false;
    proxy?.$modal.msgSuccess('保存成功');
    await Promise.all([loadIntents(), loadGroups()]);
  } finally {
    saving.value = false;
  }
};
const remove = async (row: AiIntentVO) => {
  await proxy?.$modal.confirm(`确认删除意图“${row.intentName}”吗？`);
  await deleteAiIntent(row.id);
  proxy?.$modal.msgSuccess('删除成功');
  await Promise.all([loadIntents(), loadGroups()]);
};
const openGroupEditor = (row?: AiIntentGroupVO) => {
  groupForm.value = row ? { ...row } : { groupCode: '', groupName: '', description: '', sortOrder: 100, enabled: true };
  groupEditorVisible.value = true;
};
const saveGroup = async () => {
  if (!groupForm.value.groupName.trim() || !groupForm.value.groupCode.trim()) {
    proxy?.$modal.msgError('请填写分类名称和编码');
    return;
  }
  groupForm.value.id ? await updateAiIntentGroup(groupForm.value.id, groupForm.value) : await createAiIntentGroup(groupForm.value);
  groupEditorVisible.value = false;
  await loadGroups();
};
const removeGroup = async (row: AiIntentGroupVO) => {
  await proxy?.$modal.confirm(`确认删除分类“${row.groupName}”吗？`);
  await deleteAiIntentGroup(row.id);
  await loadGroups();
};
const selectedIds = () => selectedRows.value.map((x) => x.id);
const openBatchGroup = () => {
  batchGroupId.value = undefined;
  batchGroupVisible.value = true;
};
const submitBatchGroup = async () => {
  await batchUpdateAiIntents({ intentIds: selectedIds(), groupId: batchGroupId.value, clearGroup: batchGroupId.value == null });
  batchGroupVisible.value = false;
  proxy?.$modal.msgSuccess('分类已更新');
  await Promise.all([loadIntents(), loadGroups()]);
};
const batchSetEnabled = async (enabled: boolean) => {
  await proxy?.$modal.confirm(`确认${enabled ? '启用' : '停用'}选中的 ${selectedRows.value.length} 个意图吗？`);
  await batchUpdateAiIntents({ intentIds: selectedIds(), enabled });
  proxy?.$modal.msgSuccess('状态已更新');
  await loadIntents();
};
const openTest = (row: AiIntentVO) => {
  testAgentId.value = row.agentIds?.[0] || agents.value[0]?.id;
  testText.value = row.utterances?.find((x) => x.utteranceType === 'POSITIVE')?.utteranceText || '';
  testIntentCode.value = row.intentCode;
  testGroupId.value = row.groupId;
  testScope.value = 'CURRENT';
  testResult.value = undefined;
  testVisible.value = true;
};
const runTest = async () => {
  if (!testAgentId.value || !testText.value.trim()) return;
  testing.value = true;
  try {
    testResult.value = (
      await recognizeAiIntent({
        agentId: testAgentId.value,
        text: testText.value.trim(),
        intentCodes: testScope.value === 'CURRENT' ? [testIntentCode.value] : undefined,
        groupIds: testScope.value === 'GROUP' && testGroupId.value ? [testGroupId.value] : undefined
      })
    ).data;
  } finally {
    testing.value = false;
  }
};
watch(
  () => form.value.actionType,
  (value) => {
    if (value !== 'TRANSFER_QUEUE') actionQueueCode.value = '';
    if (value !== 'TRANSFER_EXTENSION') actionExtension.value = '';
    if (value !== 'TRANSFER_IVR') actionIvrFlowId.value = '';
    if (value !== 'TRANSFER_ONLINE_SERVICE') actionOnlineSkillGroupId.value = '';
    if (value !== 'CREATE_TICKET') {
      actionTicketTemplateId.value = '';
      actionTicketAutoSubmit.value = false;
    }
  }
);
onMounted(async () => {
  await Promise.all([loadGroups(), loadOptions()]);
  await loadIntents();
});
</script>

<style scoped>
.intent-page {
  min-width: 1080px;
}
.page-header,
.dialog-toolbar,
.list-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.page-header {
  margin-bottom: 14px;
}
.page-header h2 {
  margin: 0 0 5px;
  font-size: 20px;
  color: #163a63;
}
.page-header p,
.dialog-toolbar {
  margin: 0;
  color: #7b8794;
}
.header-actions,
.batch-actions,
.row-actions {
  display: flex;
  align-items: center;
  white-space: nowrap;
}
.intent-layout {
  display: grid;
  grid-template-columns: 236px minmax(0, 1fr);
  gap: 14px;
}
.group-panel {
  align-self: start;
  position: sticky;
  top: 12px;
  padding: 16px 12px 12px;
  border: 1px solid #e6ebf2;
  border-radius: 10px;
  background: #fff;
}
.group-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px 13px;
}
.group-panel-title {
  color: #1f3653;
  font-size: 14px;
  font-weight: 600;
}
.group-panel-subtitle {
  margin-top: 3px;
  color: #9aa6b2;
  font-size: 10px;
}
.group-manage-button {
  color: #718096;
}
.group-search {
  margin-bottom: 12px;
}
.group-search :deep(.el-input__wrapper) {
  border-radius: 7px;
  box-shadow: 0 0 0 1px #e5eaf0 inset;
}
.group-search :deep(.el-input__inner) {
  font-size: 12px;
}
.group-navigation {
  display: flex;
  flex-direction: column;
}
.group-section-title {
  padding: 13px 10px 7px;
  color: #a0a9b5;
  font-size: 10px;
  letter-spacing: 0.06em;
}
.group-list {
  max-height: calc(100vh - 390px);
  min-height: 42px;
  overflow-y: auto;
  scrollbar-width: thin;
}
.group-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 40px;
  padding: 7px 9px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #536579;
  font-size: 12px;
  text-align: left;
  cursor: pointer;
}
.group-item:hover {
  background: #f4f7fb;
}
.group-item.active {
  color: #145ca5;
  background: #eaf3fc;
}
.group-item.disabled {
  opacity: 0.5;
}
.group-item-main {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 9px;
}
.group-icon {
  display: inline-flex;
  flex: 0 0 28px;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 7px;
  background: #f0f3f7;
  color: #6c7c8f;
  font-size: 10px;
}
.group-item.active .group-icon {
  background: #d7e9fb;
  color: #145ca5;
}
.all-icon {
  background: #e8f2fc;
  color: #2769a8;
}
.ungrouped-icon {
  background: #f4f4f5;
  color: #8b929b;
}
.group-count {
  flex: 0 0 auto;
  min-width: 24px;
  padding: 1px 6px;
  border-radius: 9px;
  background: #f2f4f7;
  color: #8491a1;
  font-size: 10px;
  text-align: center;
}
.group-item.active .group-count {
  background: rgb(255 255 255 / 72%);
  color: #2870b7;
}
.group-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.group-divider {
  height: 1px;
  margin: 8px 8px;
  background: #edf0f4;
}
.group-add-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  margin-top: 11px;
  padding: 9px;
  border: 0;
  border-radius: 8px;
  background: #f7f9fc;
  color: #53708f;
  font-size: 12px;
  gap: 6px;
  cursor: pointer;
}
.group-add-button:hover {
  color: #1764ad;
  background: #edf4fb;
}
.group-list :deep(.el-empty) {
  padding: 10px 0;
}
.group-list :deep(.el-empty__description) {
  margin-top: 2px;
}
.query-form {
  padding: 12px 12px 0;
  border-radius: 8px;
  background: #f7f9fc;
}
.query-form :deep(.el-input),
.query-form :deep(.el-select) {
  width: 190px;
}
.list-toolbar {
  height: 46px;
}
.selection-summary {
  color: #7b8794;
}
.intent-table :deep(.cell) {
  font-size: 12px;
}
.intent-name {
  font-weight: 600;
  color: #183b61;
}
.intent-code {
  margin-top: 2px;
  color: #8a96a3;
  font-size: 11px;
}
.utterance-count {
  display: inline-flex;
  padding: 2px 7px;
  margin-right: 4px;
  border-radius: 10px;
  font-size: 11px;
}
.utterance-count.positive {
  color: #16804b;
  background: #e9f8f0;
}
.utterance-count.negative {
  color: #b56a13;
  background: #fff4e5;
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
.action-tip {
  margin-left: 10px;
  color: #8a96a3;
}
.dialog-toolbar {
  margin-bottom: 12px;
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
