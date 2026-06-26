<template>
  <div class="p-2">
    <el-card class="mb-2" shadow="hover">
      <el-form ref="queryFormRef" :model="queryParams" :inline="true">
        <el-form-item label="坐席编码" prop="agentCode">
          <el-input v-model="queryParams.agentCode" clearable @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item label="坐席名称" prop="agentName">
          <el-input v-model="queryParams.agentName" clearable @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item label="状态" prop="enabled">
          <el-select v-model="queryParams.enabled" clearable style="width: 120px">
            <el-option label="启用" :value="true" />
            <el-option label="停用" :value="false" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
          <el-button icon="Refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="hover">
      <template #header>
        <el-space wrap>
          <el-button v-hasPermi="['callcenter:agent:create']" type="primary" plain icon="Plus" @click="handleAdd">新增坐席</el-button>
          <el-button v-hasPermi="['callcenter:agent:update']" plain icon="Microphone" @click="handleBatchGeneratePrompt(false)">
            批量生成提示音
          </el-button>
          <el-button v-hasPermi="['callcenter:agent:update']" plain icon="Refresh" @click="handleBatchGeneratePrompt(true)">
            仅未生成坐席
          </el-button>
        </el-space>
      </template>

      <el-table v-loading="loading" :data="agentList" @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="48" />
        <el-table-column label="坐席编码" prop="agentCode" min-width="130" />
        <el-table-column label="坐席名称" prop="agentName" min-width="150" />
        <el-table-column label="系统用户" prop="userId" min-width="180">
          <template #default="{ row }">{{ getUserLabel(row.userId) }}</template>
        </el-table-column>
        <el-table-column label="绑定分机" min-width="160">
          <template #default="{ row }">
            <span v-if="row.sipExtension">{{ row.sipExtension }} - {{ row.sipDisplayName || row.sipDomain || 'SIP 分机' }}</span>
            <span v-else class="text-gray-400">未绑定</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '停用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="工号提示音" min-width="150">
          <template #default="{ row }">
            <el-tooltip v-if="row.promptFailureReason" :content="row.promptFailureReason" placement="top">
              <el-tag :type="promptStatusType(row.promptGenerationStatus)">
                {{ promptStatusText(row.promptGenerationStatus) }}
              </el-tag>
            </el-tooltip>
            <el-tag v-else :type="promptStatusType(row.promptGenerationStatus)">
              {{ promptStatusText(row.promptGenerationStatus) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" prop="createTime" width="180" />
        <el-table-column label="操作" width="320" align="center" fixed="right">
          <template #default="{ row }">
            <el-button v-hasPermi="['callcenter:agent:update']" link type="primary" @click="handleUpdate(row)">修改</el-button>
            <el-button v-hasPermi="['callcenter:agent:bind-extension']" link type="primary" @click="handleBind(row)">绑定分机</el-button>
            <el-button v-hasPermi="['callcenter:agent:update']" link type="primary" @click="handleGeneratePrompt(row)">生成提示音</el-button>
            <el-button v-hasPermi="['callcenter:agent:delete']" link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <pagination v-show="total > 0" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" :total="total" @pagination="getList" />
    </el-card>

    <el-dialog v-model="dialog.visible" :title="dialog.title" width="520px" append-to-body>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="坐席编码" prop="agentCode">
          <el-input v-model="form.agentCode" placeholder="例如 AGENT_1001" />
        </el-form-item>
        <el-form-item label="坐席名称" prop="agentName">
          <el-input v-model="form.agentName" />
        </el-form-item>
        <el-form-item label="系统用户" prop="userId">
          <el-select
            v-model="form.userId"
            clearable
            filterable
            remote
            reserve-keyword
            :remote-method="searchUsers"
            :loading="userLoading"
            placeholder="请输入姓名或登录账号"
            style="width: 100%"
          >
            <el-option v-for="user in userOptions" :key="user.userId" :label="formatUserLabel(user)" :value="user.userId" />
          </el-select>
        </el-form-item>
        <el-form-item label="默认主叫" prop="callerNumberId">
          <el-select v-model="form.callerNumberId" clearable filterable style="width: 100%" placeholder="不选择则使用节点默认主叫">
            <el-option v-for="item in callerNumberOptions" :key="item.id" :label="callerNumberLabel(item)" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="form.id" label="状态">
          <el-switch v-model="form.enabled" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog.visible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="bindDialog.visible" title="绑定 SIP 分机" width="460px" append-to-body>
      <el-form label-width="90px">
        <el-form-item label="SIP 分机">
          <el-select v-model="selectedSipAccountId" filterable placeholder="请选择启用的分机" style="width: 100%">
            <el-option v-for="item in sipAccounts" :key="item.id" :label="`${item.extension} - ${item.displayName}`" :value="item.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="unbindExtension">解除绑定</el-button>
        <el-button type="primary" :disabled="!selectedSipAccountId" @click="submitBind">确认绑定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="promptDialog.visible" title="生成工号提示音" width="820px" append-to-body>
      <el-alert class="mb-3" type="info" :closable="false" show-icon>
        <template #title>{{ promptDialog.scopeText }}</template>
      </el-alert>
      <el-form label-width="100px">
        <el-form-item label="语音模板">
          <el-select v-model="promptForm.templateId" clearable filterable placeholder="不选择则使用默认模板" style="width: 100%">
            <el-option
              v-for="item in agentPromptTemplates"
              :key="item.id"
              :label="`${item.templateName} - ${item.templateText}`"
              :value="item.id"
            />
          </el-select>
          <div class="text-xs text-gray-400 mt-1">模板内容支持 {extension}，例如：工号 {extension} 为您服务。</div>
        </el-form-item>
        <el-form-item v-if="promptDialog.mode === 'batch'" label="生成范围">
          <el-tag>{{ selectedAgents.length ? `已选 ${selectedAgents.length} 个坐席` : '当前筛选结果' }}</el-tag>
          <el-checkbox v-model="promptForm.onlyMissing" class="ml-3">只生成未成功的坐席</el-checkbox>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="promptDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="promptSubmitting" @click="submitPromptGenerate">开始生成</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="Agent" lang="ts">
import {
  bindAgentExtension,
  createAgent,
  deleteAgent,
  generateAgentPrompt,
  generateAgentPrompts,
  getAgent,
  listAgents,
  unbindAgentExtension,
  updateAgent
} from '@/api/callcenter/agent';
import { AgentForm, AgentQuery, AgentVO } from '@/api/callcenter/agent/types';
import { listSpeechTemplates } from '@/api/callcenter/ai-speech';
import type { AiSpeechTemplateVO } from '@/api/callcenter/ai-speech/types';
import { listPhoneNumbers } from '@/api/callcenter/phone-number';
import type { PhoneNumberVO } from '@/api/callcenter/phone-number/types';
import { listSipAccounts } from '@/api/callcenter/sip-account';
import { SipAccountVO } from '@/api/callcenter/sip-account/types';
import { listUser, optionSelect } from '@/api/system/user';
import { UserVO } from '@/api/system/user/types';

interface PromptGenerateForm {
  agentId?: string | number;
  templateId?: string | number;
  onlyMissing?: boolean;
}

const { proxy } = getCurrentInstance() as ComponentInternalInstance;
const loading = ref(false);
const total = ref(0);
const agentList = ref<AgentVO[]>([]);
const selectedAgents = ref<AgentVO[]>([]);
const sipAccounts = ref<SipAccountVO[]>([]);
const userOptions = ref<UserVO[]>([]);
const callerNumberOptions = ref<PhoneNumberVO[]>([]);
const agentPromptTemplates = ref<AiSpeechTemplateVO[]>([]);
const userMap = ref<Map<string, UserVO>>(new Map());
const userLoading = ref(false);
const selectedAgentId = ref<string | number>();
const selectedSipAccountId = ref<string | number>();
const queryFormRef = ref<ElFormInstance>();
const formRef = ref<ElFormInstance>();
const dialog = reactive<DialogOption>({ visible: false, title: '' });
const bindDialog = reactive<DialogOption>({ visible: false, title: '' });
const promptDialog = reactive({ visible: false, mode: 'single', scopeText: '' });
const promptForm = reactive<PromptGenerateForm>({});
const promptSubmitting = ref(false);

const initialForm: AgentForm = { agentCode: '', agentName: '', userId: undefined, callerNumberId: undefined, enabled: true };
const data = reactive<PageData<AgentForm, AgentQuery>>({
  form: { ...initialForm },
  queryParams: { pageNum: 1, pageSize: 10, agentCode: '', agentName: '', enabled: undefined },
  rules: {
    agentCode: [{ required: true, pattern: /^[A-Za-z0-9_-]{2,32}$/, message: '请输入合法坐席编码', trigger: 'blur' }],
    agentName: [{ required: true, message: '坐席名称不能为空', trigger: 'blur' }]
  }
});
const { form, queryParams, rules } = toRefs(data);

const getList = async () => {
  loading.value = true;
  try {
    const res = await listAgents(queryParams.value);
    agentList.value = res.rows;
    total.value = res.total;
    await loadAgentUsers(res.rows);
  } finally {
    loading.value = false;
  }
};

const formatUserLabel = (user: UserVO) => `${user.nickName || user.userName}（${user.userName}）`;

const getUserLabel = (userId?: string | number) => {
  if (!userId) return '未关联';
  const user = userMap.value.get(String(userId));
  return user ? formatUserLabel(user) : `用户 ${userId}`;
};

const mergeUserOptions = (users: UserVO[]) => {
  const merged = new Map(userOptions.value.map((user) => [String(user.userId), user]));
  users.forEach((user) => merged.set(String(user.userId), user));
  userOptions.value = [...merged.values()];
  userMap.value = new Map([...userMap.value, ...users.map((user) => [String(user.userId), user] as const)]);
};

const loadAgentUsers = async (agents: AgentVO[]) => {
  const userIds = [...new Set(agents.map((agent) => agent.userId).filter((userId): userId is string | number => userId !== undefined))];
  if (!userIds.length) return;
  const res = await optionSelect(userIds);
  mergeUserOptions(res.data);
};

const searchUsers = async (keyword: string) => {
  userLoading.value = true;
  try {
    const baseQuery = { pageNum: 1, pageSize: 20, status: '0' };
    const responses = keyword
      ? await Promise.all([listUser({ ...baseQuery, userName: keyword }), listUser({ ...baseQuery, nickName: keyword })])
      : [await listUser(baseQuery)];
    mergeUserOptions(responses.flatMap((response) => response.rows));
  } finally {
    userLoading.value = false;
  }
};

const callerNumberLabel = (item: PhoneNumberVO) => `${item.number} - ${item.numberName || item.gatewayName || '主叫号码'}`;
const loadCallerNumberOptions = async () => {
  const res = await listPhoneNumbers({ pageNum: 1, pageSize: 1000, enabled: true });
  callerNumberOptions.value = res.rows.filter((item) => ['CALLER_ID', 'BOTH'].includes(item.numberType) && !!item.gatewayId);
};

const loadAgentPromptTemplates = async () => {
  const res = await listSpeechTemplates();
  agentPromptTemplates.value = (res.data || []).filter((item) => item.businessType === 'AGENT_NUMBER_PROMPT' && item.enabled);
};

const handleQuery = () => {
  queryParams.value.pageNum = 1;
  getList();
};

const resetQuery = () => {
  queryFormRef.value?.resetFields();
  handleQuery();
};

const reset = () => {
  form.value = { ...initialForm };
  formRef.value?.resetFields();
};

const handleAdd = () => {
  reset();
  searchUsers('');
  loadCallerNumberOptions();
  dialog.title = '新增坐席';
  dialog.visible = true;
};

const handleUpdate = async (row: AgentVO) => {
  reset();
  const res = await getAgent(row.id);
  Object.assign(form.value, res.data);
  await Promise.all([loadAgentUsers([res.data]), loadCallerNumberOptions()]);
  dialog.title = '修改坐席';
  dialog.visible = true;
};

const submitForm = () =>
  formRef.value?.validate(async (valid) => {
    if (!valid) return;
    form.value.id ? await updateAgent(form.value) : await createAgent(form.value);
    proxy?.$modal.msgSuccess('操作成功');
    dialog.visible = false;
    await getList();
  });

const handleDelete = async (row: AgentVO) => {
  await proxy?.$modal.confirm(`确认删除坐席 ${row.agentName} 吗？`);
  await deleteAgent(row.id);
  proxy?.$modal.msgSuccess('删除成功');
  await getList();
};

const handleBind = async (row: AgentVO) => {
  selectedAgentId.value = row.id;
  selectedSipAccountId.value = row.sipAccountId;
  const res = await listSipAccounts({ pageNum: 1, pageSize: 100, enabled: true });
  sipAccounts.value = res.rows;
  bindDialog.visible = true;
};

const submitBind = async () => {
  if (!selectedAgentId.value || !selectedSipAccountId.value) return;
  await bindAgentExtension(selectedAgentId.value, selectedSipAccountId.value);
  proxy?.$modal.msgSuccess('绑定成功');
  bindDialog.visible = false;
  await getList();
};

const unbindExtension = async () => {
  if (!selectedAgentId.value) return;
  await unbindAgentExtension(selectedAgentId.value);
  proxy?.$modal.msgSuccess('已解除绑定');
  bindDialog.visible = false;
  await getList();
};

const handleSelectionChange = (rows: AgentVO[]) => {
  selectedAgents.value = rows;
};

const openPromptDialog = async (mode: string, scopeText: string, options: PromptGenerateForm = {}) => {
  await loadAgentPromptTemplates();
  promptDialog.mode = mode;
  promptDialog.scopeText = scopeText;
  promptForm.agentId = options.agentId;
  promptForm.templateId = options.templateId;
  promptForm.onlyMissing = options.onlyMissing;
  promptDialog.visible = true;
};

const handleGeneratePrompt = async (row: AgentVO) => {
  await openPromptDialog('single', `单个坐席：${row.agentName}`, { agentId: row.id });
};

const handleBatchGeneratePrompt = async (onlyMissing: boolean) => {
  const scope = selectedAgents.value.length ? `已选择 ${selectedAgents.value.length} 个坐席` : '按当前筛选条件批量生成';
  await openPromptDialog('batch', scope, { onlyMissing });
};

const submitPromptGenerate = async () => {
  if (promptSubmitting.value) return;
  promptSubmitting.value = true;
  promptDialog.visible = false;
  try {
  if (promptDialog.mode === 'single' && promptForm.agentId) {
    await generateAgentPrompt(promptForm.agentId, { templateId: promptForm.templateId });
    proxy?.$modal.msgSuccess('已提交工号提示音生成任务');
  } else {
    const agentIds = selectedAgents.value.map((item) => item.id);
    const result = await generateAgentPrompts({
      agentIds: agentIds.length ? agentIds : undefined,
      agentCode: agentIds.length ? undefined : queryParams.value.agentCode,
      agentName: agentIds.length ? undefined : queryParams.value.agentName,
      enabled: agentIds.length ? undefined : queryParams.value.enabled,
      onlyMissing: promptForm.onlyMissing,
      templateId: promptForm.templateId
    });
    proxy?.$modal.msgSuccess(`已提交 ${result.data || 0} 个坐席提示音生成任务`);
  }
  promptDialog.visible = false;
  await getList();
  } finally {
    promptSubmitting.value = false;
  }
};

const promptStatusText = (status?: string) => {
  if (status === 'SUCCESS') return '已生成';
  if (status === 'PROCESSING') return '生成中';
  if (status === 'FAILED') return '失败';
  return '未生成';
};

const promptStatusType = (status?: string) => {
  if (status === 'SUCCESS') return 'success';
  if (status === 'PROCESSING') return 'warning';
  if (status === 'FAILED') return 'danger';
  return 'info';
};

onMounted(() => {
  getList();
  loadAgentPromptTemplates();
});
</script>

