<template>
  <div class="p-2">
    <transition :enter-active-class="proxy?.animate.searchAnimate.enter" :leave-active-class="proxy?.animate.searchAnimate.leave">
      <el-card v-show="showSearch" class="mb-2" shadow="hover">
        <el-form ref="queryFormRef" :model="queryParams" :inline="true">
          <el-form-item label="分机号" prop="extension">
            <el-input v-model="queryParams.extension" placeholder="请输入分机号" clearable @keyup.enter="handleQuery" />
          </el-form-item>
          <el-form-item label="登录名" prop="authUsername">
            <el-input v-model="queryParams.authUsername" placeholder="请输入 SIP 登录名" clearable @keyup.enter="handleQuery" />
          </el-form-item>
          <el-form-item label="显示名称" prop="displayName">
            <el-input v-model="queryParams.displayName" placeholder="请输入显示名称" clearable @keyup.enter="handleQuery" />
          </el-form-item>
          <el-form-item label="状态" prop="enabled">
            <el-select v-model="queryParams.enabled" placeholder="全部状态" clearable style="width: 120px">
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
    </transition>

    <el-card shadow="hover">
      <template #header>
        <el-row :gutter="10">
          <el-col :span="1.5">
            <el-button v-hasPermi="['callcenter:sip-account:create']" type="primary" plain icon="Plus" @click="handleAdd"> 新增 SIP 分机 </el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button v-hasPermi="['callcenter:sip-account:create']" type="success" plain icon="DocumentAdd" @click="handleBatchAdd"
              >批量新增</el-button
            >
          </el-col>
          <right-toolbar v-model:show-search="showSearch" @query-table="getList" />
        </el-row>
      </template>
      <el-table v-loading="loading" :data="accountList">
        <el-table-column label="分机号" prop="extension" min-width="100" />
        <el-table-column label="SIP 登录名" prop="authUsername" min-width="180" />
        <el-table-column label="显示名称" prop="displayName" min-width="150" />
        <el-table-column label="话务服务节点" prop="nodeName" min-width="170">
          <template #default="{ row }">{{ row.nodeName || '未绑定' }}</template>
        </el-table-column>
        <el-table-column label="SIP 域" prop="domain" min-width="180" />
        <el-table-column label="配置状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '停用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="注册状态" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="registrationTagType(row.registrationStatus)" effect="light">
              {{ registrationLabel(row.registrationStatus) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="安全状态" min-width="145" align="center">
          <template #default="{ row }">
            <el-tooltip :content="securityTooltip(row)" placement="top">
              <el-tag :type="securityTagType(row.securityStatus)" effect="light">
                {{ securityLabel(row.securityStatus) }}
              </el-tag>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" prop="createTime" width="180" />
        <el-table-column label="操作" width="170" align="center" fixed="right">
          <template #default="{ row }">
            <el-button v-hasPermi="['callcenter:sip-account:update']" link type="primary" icon="Edit" @click="handleUpdate(row)" />
            <el-button
              v-if="!isSecurityLocked(row.securityStatus)"
              v-hasPermi="['callcenter:sip-security:block']"
              link
              type="warning"
              icon="Lock"
              @click="handleSecurityLock(row)"
            />
            <el-button v-else v-hasPermi="['callcenter:sip-security:unblock']" link type="success" icon="Unlock" @click="handleSecurityUnlock(row)" />
            <el-button v-hasPermi="['callcenter:sip-account:delete']" link type="danger" icon="Delete" @click="handleDelete(row)" />
          </template>
        </el-table-column>
      </el-table>
      <pagination v-show="total > 0" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" :total="total" @pagination="getList" />
    </el-card>

    <el-dialog v-model="dialog.visible" :title="dialog.title" width="620px" append-to-body @closed="reset">
      <el-alert
        class="mb-4"
        type="info"
        show-icon
        :closable="false"
        title="软电话注册时：用户名/分机号填写分机号，登录名/认证 ID 填写 SIP 登录名，密码填写认证密码。"
      />
      <el-form ref="formRef" :model="form" :rules="rules" label-width="105px">
        <el-form-item label="节点" prop="nodeId">
          <el-select v-model="form.nodeId" filterable placeholder="请选择启用的话务服务节点" style="width: 100%" @change="handleNodeChange">
            <el-option v-for="node in nodeOptions" :key="node.id" :label="`${node.nodeName}（${node.sipDomain}）`" :value="node.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="分机号" prop="extension">
          <el-input v-model="form.extension" placeholder="例如 1003" />
        </el-form-item>
        <el-form-item label="SIP 登录名" prop="authUsername">
          <el-input v-model="form.authUsername" placeholder="新建时留空自动生成，例如 cnx_xxxxxxxx" />
        </el-form-item>
        <el-form-item label="显示名称" prop="displayName">
          <el-input v-model="form.displayName" placeholder="例如 客服分机1003" />
        </el-form-item>
        <el-form-item label="SIP 域" prop="domain">
          <el-input v-model="form.domain" placeholder="话务服务域名或 IP" />
        </el-form-item>
        <el-form-item label="认证密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            show-password
            autocomplete="new-password"
            :placeholder="form.id ? '当前密码，留空表示不修改' : '至少12位安全密码'"
          />
        </el-form-item>
        <el-form-item v-if="form.id" label="状态">
          <el-switch v-model="form.enabled" active-text="启用" inactive-text="停用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog.visible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">确定</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="batchDialog.visible" title="批量新增 SIP 分机" size="520px" append-to-body :close-on-click-modal="false">
      <el-alert
        class="mb-4"
        type="info"
        show-icon
        :closable="false"
        title="系统将从起始分机号开始连续生成，单次最多新增 200 个。任一号码重复时整批不会写入。"
      />
      <el-form ref="batchFormRef" :model="batchForm" :rules="batchRules" label-width="110px">
        <el-form-item label="节点" prop="nodeId">
          <el-select v-model="batchForm.nodeId" filterable placeholder="请选择启用的话务服务节点" style="width: 100%">
            <el-option v-for="node in nodeOptions" :key="node.id" :label="`${node.nodeName}（${node.sipDomain}）`" :value="node.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="起始分机号" prop="startExtension">
          <el-input v-model="batchForm.startExtension" placeholder="例如 1001" />
        </el-form-item>
        <el-form-item label="新增数量" prop="count">
          <el-input-number v-model="batchForm.count" :min="1" :max="200" controls-position="right" style="width: 100%" />
        </el-form-item>
        <el-form-item label="名称前缀" prop="displayNamePrefix">
          <el-input v-model="batchForm.displayNamePrefix" placeholder="例如 客服分机" />
        </el-form-item>
        <el-form-item label="统一初始密码" prop="password">
          <el-input v-model="batchForm.password" type="password" show-password placeholder="至少12位安全密码" />
        </el-form-item>
        <el-form-item label="生成预览">
          <div class="batch-preview">{{ batchExtensionPreview }}</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="batchDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="batchDialog.submitting" @click="submitBatchForm">确认批量新增</el-button>
      </template>
    </el-drawer>
  </div>
</template>

<script setup name="SipAccount" lang="ts">
import {
  batchCreateSipAccounts,
  createSipAccount,
  deleteSipAccount,
  getSipAccount,
  getSipAccountPassword,
  listSipAccounts,
  lockSipAccount,
  unlockSipAccount,
  updateSipAccount
} from '@/api/callcenter/sip-account';
import { SipAccountBatchCreateForm, SipAccountForm, SipAccountQuery, SipAccountVO, SipSecurityStatus } from '@/api/callcenter/sip-account/types';
import { listFreeSwitchNodes } from '@/api/callcenter/freeswitch-node';
import { FreeSwitchNodeVO } from '@/api/callcenter/freeswitch-node/types';
import { listDispatchExtensionStatuses } from '@/api/callcenter/dispatch-monitor';
import type { DispatchRegistrationStatus } from '@/api/callcenter/dispatch-monitor/types';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;
const loading = ref(false);
const showSearch = ref(true);
const total = ref(0);
const accountList = ref<SipAccountVO[]>([]);
const nodeOptions = ref<FreeSwitchNodeVO[]>([]);
const queryFormRef = ref<ElFormInstance>();
const formRef = ref<ElFormInstance>();
const batchFormRef = ref<ElFormInstance>();
const dialog = reactive<DialogOption>({ visible: false, title: '' });
const originalPassword = ref('');
const batchDialog = reactive({ visible: false, submitting: false });
const batchForm = reactive<SipAccountBatchCreateForm>({
  nodeId: undefined,
  startExtension: '1001',
  count: 10,
  displayNamePrefix: '客服分机',
  password: ''
});
const batchRules = {
  nodeId: [{ required: true, message: '请选择话务服务节点', trigger: 'change' }],
  startExtension: [{ required: true, pattern: /^[0-9]{2,16}$/, message: '请输入2到16位数字分机号', trigger: 'blur' }],
  count: [{ required: true, type: 'number', min: 1, max: 200, message: '新增数量为1到200', trigger: 'change' }],
  displayNamePrefix: [{ required: true, message: '请输入显示名称前缀', trigger: 'blur' }],
  password: [{ required: true, min: 12, max: 128, message: '密码长度必须为12到128位', trigger: 'blur' }]
};

const batchExtensionPreview = computed(() => {
  if (!/^\d{2,16}$/.test(batchForm.startExtension) || !batchForm.count) return '请输入有效的起始分机号和数量';
  const start = BigInt(batchForm.startExtension);
  const end = start + BigInt(batchForm.count - 1);
  const width = batchForm.startExtension.length;
  return `${batchForm.startExtension} - ${end.toString().padStart(width, '0')}（共 ${batchForm.count} 个）`;
});

const initialForm: SipAccountForm = {
  nodeId: undefined,
  extension: '',
  authUsername: '',
  displayName: '',
  domain: '',
  password: '',
  enabled: true
};

const authUsernameValidator = (_rule: unknown, value: string, callback: (error?: Error) => void) => {
  if (!value && !form.value.id) {
    callback();
    return;
  }
  if (!value) {
    callback(new Error('SIP 登录名不能为空'));
    return;
  }
  if (!/^[A-Za-z0-9_.-]{4,64}$/.test(value)) {
    callback(new Error('登录名只能包含字母、数字、下划线、点和横线，长度 4 到 64 位'));
    return;
  }
  callback();
};

const passwordValidator = (_rule: unknown, value: string, callback: (error?: Error) => void) => {
  if (form.value.id && value === originalPassword.value) {
    callback();
    return;
  }
  if (!form.value.id && (!value || value.length < 12)) {
    callback(new Error('密码至少12位'));
    return;
  }
  if (value && value.length < 12) {
    callback(new Error('密码至少12位'));
    return;
  }
  callback();
};

const data = reactive<PageData<SipAccountForm, SipAccountQuery>>({
  form: { ...initialForm },
  queryParams: { pageNum: 1, pageSize: 10, extension: '', authUsername: '', displayName: '', enabled: undefined },
  rules: {
    nodeId: [{ required: true, message: '请选择话务服务节点', trigger: 'change' }],
    extension: [{ required: true, pattern: /^[0-9]{2,16}$/, message: '请输入2到16位数字分机号', trigger: 'blur' }],
    authUsername: [{ validator: authUsernameValidator, trigger: 'blur' }],
    displayName: [{ required: true, message: '显示名称不能为空', trigger: 'blur' }],
    domain: [{ required: true, message: 'SIP 域不能为空', trigger: 'blur' }],
    password: [{ validator: passwordValidator, trigger: 'blur' }]
  }
});

const { form, queryParams, rules } = toRefs(data);

const getList = async () => {
  loading.value = true;
  try {
    const [accountRes, statusRes] = await Promise.all([listSipAccounts(queryParams.value), listDispatchExtensionStatuses()]);
    const statusMap = new Map(statusRes.data.map((item) => [String(item.sipAccountId), item.registrationStatus]));
    accountList.value = accountRes.rows.map((item) => ({
      ...item,
      registrationStatus: statusMap.get(String(item.id)) || (item.enabled ? 'NODE_UNAVAILABLE' : 'DISABLED')
    }));
    total.value = accountRes.total;
  } finally {
    loading.value = false;
  }
};

const registrationLabel = (value?: DispatchRegistrationStatus) =>
  ({ REGISTERED: '已注册', UNREGISTERED: '未注册', DISABLED: '已停用', NODE_UNAVAILABLE: '节点不可达' })[value || ''] || '未知';
const registrationTagType = (value?: DispatchRegistrationStatus) =>
  value === 'REGISTERED' ? 'success' : value === 'UNREGISTERED' ? 'danger' : value === 'NODE_UNAVAILABLE' ? 'warning' : 'info';

const securityLabel = (value?: SipSecurityStatus) =>
  ({ NORMAL: '正常', WATCHING: '观察中', TEMP_LOCKED: '临时锁定', MANUAL_LOCKED: '手工锁定', DISABLED: '已停用' })[value || 'NORMAL'];
const securityTagType = (value?: SipSecurityStatus) =>
  value === 'WATCHING' || value === 'TEMP_LOCKED' ? 'warning' : value === 'MANUAL_LOCKED' ? 'danger' : value === 'DISABLED' ? 'info' : 'success';
const isSecurityLocked = (value?: SipSecurityStatus) => value === 'TEMP_LOCKED' || value === 'MANUAL_LOCKED';
const securityTooltip = (row: SipAccountVO) => {
  const details = [`近10分钟失败 ${row.recentFailureCount || 0} 次`];
  if (row.lastFailureIp) details.push(`最近来源 ${row.lastFailureIp}`);
  if (row.lockedUntil) details.push(`锁定至 ${row.lockedUntil}`);
  if (row.lockReason) details.push(row.lockReason);
  return details.join('；');
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
  originalPassword.value = '';
  form.value = { ...initialForm };
  formRef.value?.resetFields();
};

const handleAdd = () => {
  reset();
  loadNodeOptions();
  dialog.title = '新增 SIP 分机';
  dialog.visible = true;
};

const handleBatchAdd = async () => {
  await loadNodeOptions();
  Object.assign(batchForm, { nodeId: undefined, startExtension: '1001', count: 10, displayNamePrefix: '客服分机', password: '' });
  batchFormRef.value?.clearValidate();
  batchDialog.visible = true;
};

const submitBatchForm = () =>
  batchFormRef.value?.validate(async (valid) => {
    if (!valid) return;
    await proxy?.$modal.confirm(`确认批量新增 ${batchForm.count} 个分机（${batchExtensionPreview.value}）吗？`);
    batchDialog.submitting = true;
    try {
      const res = await batchCreateSipAccounts({ ...batchForm });
      proxy?.$modal.msgSuccess(`成功新增 ${res.data} 个 SIP 分机`);
      batchDialog.visible = false;
      await getList();
    } finally {
      batchDialog.submitting = false;
    }
  });

const handleUpdate = async (row: SipAccountVO) => {
  reset();
  await loadNodeOptions();
  const [res, passwordRes] = await Promise.all([getSipAccount(row.id), getSipAccountPassword(row.id)]);
  originalPassword.value = passwordRes.data.password || '';
  Object.assign(form.value, res.data, { password: originalPassword.value });
  dialog.title = '修改 SIP 分机';
  dialog.visible = true;
};

const loadNodeOptions = async () => {
  const res = await listFreeSwitchNodes({ pageNum: 1, pageSize: 100, enabled: true });
  nodeOptions.value = res.rows;
};

const handleNodeChange = (nodeId: string | number) => {
  const node = nodeOptions.value.find((item) => String(item.id) === String(nodeId));
  if (node) form.value.domain = node.sipDomain;
};

const submitForm = () =>
  formRef.value?.validate(async (valid) => {
    if (!valid) return;
    const payload: SipAccountForm = { ...form.value };
    if (!payload.authUsername?.trim()) {
      delete payload.authUsername;
    }
    if (payload.id && (!payload.password?.trim() || payload.password === originalPassword.value)) {
      delete payload.password;
    }
    form.value.id ? await updateSipAccount(payload) : await createSipAccount(payload);
    proxy?.$modal.msgSuccess('操作成功');
    dialog.visible = false;
    await getList();
  });

const handleDelete = async (row: SipAccountVO) => {
  await proxy?.$modal.confirm(`确认删除分机 ${row.extension} 吗？`);
  await deleteSipAccount(row.id);
  proxy?.$modal.msgSuccess('删除成功');
  await getList();
};

const handleSecurityLock = async (row: SipAccountVO) => {
  const { value } = await ElMessageBox.prompt(`确认手工锁定分机 ${row.extension} 吗？`, '锁定 SIP 分机', {
    confirmButtonText: '锁定',
    cancelButtonText: '取消',
    inputPlaceholder: '请输入锁定原因（选填）',
    inputValidator: (text) => !text || text.length <= 200 || '原因不能超过200个字符'
  });
  await lockSipAccount(row.id, { reason: value });
  proxy?.$modal.msgSuccess('分机已锁定');
  await getList();
};

const handleSecurityUnlock = async (row: SipAccountVO) => {
  const { value } = await ElMessageBox.prompt(`确认解除分机 ${row.extension} 的注册锁定吗？`, '解除 SIP 锁定', {
    confirmButtonText: '解除',
    cancelButtonText: '取消',
    inputPlaceholder: '请输入解除原因（选填）',
    inputValidator: (text) => !text || text.length <= 200 || '原因不能超过200个字符'
  });
  await unlockSipAccount(row.id, { reason: value });
  proxy?.$modal.msgSuccess('锁定已解除');
  await getList();
};

onMounted(getList);
</script>

<style scoped>
.batch-preview {
  width: 100%;
  padding: 8px 12px;
  color: var(--el-text-color-regular);
  background: var(--el-fill-color-light);
  border-radius: 4px;
}
</style>
