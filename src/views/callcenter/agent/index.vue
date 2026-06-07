<template>
  <div class="p-2">
    <el-card class="mb-2" shadow="hover">
      <el-form ref="queryFormRef" :model="queryParams" :inline="true">
        <el-form-item label="坐席编码" prop="agentCode"
          ><el-input v-model="queryParams.agentCode" clearable @keyup.enter="handleQuery"
        /></el-form-item>
        <el-form-item label="坐席名称" prop="agentName"
          ><el-input v-model="queryParams.agentName" clearable @keyup.enter="handleQuery"
        /></el-form-item>
        <el-form-item label="状态" prop="enabled"
          ><el-select v-model="queryParams.enabled" clearable style="width: 120px"
            ><el-option label="启用" :value="true" /><el-option label="停用" :value="false" /></el-select
        ></el-form-item>
        <el-form-item
          ><el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button
          ><el-button icon="Refresh" @click="resetQuery">重置</el-button></el-form-item
        >
      </el-form>
    </el-card>
    <el-card shadow="hover">
      <template #header
        ><el-button v-hasPermi="['callcenter:agent:create']" type="primary" plain icon="Plus" @click="handleAdd">新增坐席</el-button></template
      >
      <el-table v-loading="loading" :data="agentList">
        <el-table-column label="坐席编码" prop="agentCode" min-width="130" />
        <el-table-column label="坐席名称" prop="agentName" min-width="150" />
        <el-table-column label="系统用户" prop="userId" min-width="180"
          ><template #default="{ row }">{{ getUserLabel(row.userId) }}</template></el-table-column
        >
        <el-table-column label="绑定分机ID" prop="sipAccountId" min-width="120"
          ><template #default="{ row }">{{ row.sipAccountId || '未绑定' }}</template></el-table-column
        >
        <el-table-column label="状态" width="90"
          ><template #default="{ row }"
            ><el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '停用' }}</el-tag></template
          ></el-table-column
        >
        <el-table-column label="创建时间" prop="createTime" width="180" />
        <el-table-column label="操作" width="210" align="center">
          <template #default="{ row }">
            <el-button v-hasPermi="['callcenter:agent:update']" link type="primary" @click="handleUpdate(row)">修改</el-button>
            <el-button v-hasPermi="['callcenter:agent:bind-extension']" link type="primary" @click="handleBind(row)">绑定分机</el-button>
            <el-button v-hasPermi="['callcenter:agent:delete']" link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <pagination v-show="total > 0" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" :total="total" @pagination="getList" />
    </el-card>

    <el-dialog v-model="dialog.visible" :title="dialog.title" width="500px" append-to-body>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="坐席编码" prop="agentCode"><el-input v-model="form.agentCode" placeholder="例如 AGENT_1001" /></el-form-item>
        <el-form-item label="坐席名称" prop="agentName"><el-input v-model="form.agentName" /></el-form-item>
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
        <el-form-item v-if="form.id" label="状态"><el-switch v-model="form.enabled" /></el-form-item>
      </el-form>
      <template #footer
        ><el-button @click="dialog.visible = false">取消</el-button><el-button type="primary" @click="submitForm">确定</el-button></template
      >
    </el-dialog>

    <el-dialog v-model="bindDialog.visible" title="绑定 SIP 分机" width="460px" append-to-body>
      <el-form label-width="90px"
        ><el-form-item label="SIP 分机"
          ><el-select v-model="selectedSipAccountId" filterable placeholder="请选择启用的分机" style="width: 100%"
            ><el-option
              v-for="item in sipAccounts"
              :key="item.id"
              :label="`${item.extension} - ${item.displayName}`"
              :value="item.id" /></el-select></el-form-item
      ></el-form>
      <template #footer
        ><el-button @click="unbindExtension">解除绑定</el-button
        ><el-button type="primary" :disabled="!selectedSipAccountId" @click="submitBind">确认绑定</el-button></template
      >
    </el-dialog>
  </div>
</template>

<script setup name="Agent" lang="ts">
import { bindAgentExtension, createAgent, deleteAgent, getAgent, listAgents, unbindAgentExtension, updateAgent } from '@/api/callcenter/agent';
import { AgentForm, AgentQuery, AgentVO } from '@/api/callcenter/agent/types';
import { listSipAccounts } from '@/api/callcenter/sip-account';
import { SipAccountVO } from '@/api/callcenter/sip-account/types';
import { listUser, optionSelect } from '@/api/system/user';
import { UserVO } from '@/api/system/user/types';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;
const loading = ref(false);
const total = ref(0);
const agentList = ref<AgentVO[]>([]);
const sipAccounts = ref<SipAccountVO[]>([]);
const userOptions = ref<UserVO[]>([]);
const userMap = ref<Map<string, UserVO>>(new Map());
const userLoading = ref(false);
const selectedAgentId = ref<string | number>();
const selectedSipAccountId = ref<string | number>();
const queryFormRef = ref<ElFormInstance>();
const formRef = ref<ElFormInstance>();
const dialog = reactive<DialogOption>({ visible: false, title: '' });
const bindDialog = reactive<DialogOption>({ visible: false, title: '' });
const initialForm: AgentForm = { agentCode: '', agentName: '', userId: undefined, enabled: true };
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
  dialog.title = '新增坐席';
  dialog.visible = true;
};
const handleUpdate = async (row: AgentVO) => {
  reset();
  const res = await getAgent(row.id);
  Object.assign(form.value, res.data);
  await loadAgentUsers([res.data]);
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
};
const unbindExtension = async () => {
  if (!selectedAgentId.value) return;
  await unbindAgentExtension(selectedAgentId.value);
  proxy?.$modal.msgSuccess('已解除绑定');
  bindDialog.visible = false;
};
onMounted(getList);
</script>
