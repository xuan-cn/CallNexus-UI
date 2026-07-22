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
          <right-toolbar v-model:show-search="showSearch" @query-table="getList" />
        </el-row>
      </template>
      <el-table v-loading="loading" :data="accountList">
        <el-table-column label="分机号" prop="extension" min-width="100" />
        <el-table-column label="SIP 登录名" prop="authUsername" min-width="180" />
        <el-table-column label="显示名称" prop="displayName" min-width="150" />
        <el-table-column label="FreeSWITCH 节点" prop="nodeName" min-width="170">
          <template #default="{ row }">{{ row.nodeName || '未绑定' }}</template>
        </el-table-column>
        <el-table-column label="SIP 域" prop="domain" min-width="180" />
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '停用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" prop="createTime" width="180" />
        <el-table-column label="操作" width="120" align="center">
          <template #default="{ row }">
            <el-button v-hasPermi="['callcenter:sip-account:update']" link type="primary" icon="Edit" @click="handleUpdate(row)" />
            <el-button v-hasPermi="['callcenter:sip-account:delete']" link type="danger" icon="Delete" @click="handleDelete(row)" />
          </template>
        </el-table-column>
      </el-table>
      <pagination v-show="total > 0" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" :total="total" @pagination="getList" />
    </el-card>

    <el-dialog v-model="dialog.visible" :title="dialog.title" width="620px" append-to-body>
      <el-alert
        class="mb-4"
        type="info"
        show-icon
        :closable="false"
        title="软电话注册时：用户名/分机号填写分机号，登录名/认证 ID 填写 SIP 登录名，密码填写认证密码。"
      />
      <el-form ref="formRef" :model="form" :rules="rules" label-width="105px">
        <el-form-item label="节点" prop="nodeId">
          <el-select v-model="form.nodeId" filterable placeholder="请选择启用的 FreeSWITCH 节点" style="width: 100%" @change="handleNodeChange">
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
          <el-input v-model="form.domain" placeholder="FreeSWITCH 域名或 IP" />
        </el-form-item>
        <el-form-item :label="form.id ? '新密码' : '认证密码'" prop="password">
          <el-input v-model="form.password" type="password" show-password :placeholder="form.id ? '留空表示不修改' : '至少12位安全密码'" />
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
  </div>
</template>

<script setup name="SipAccount" lang="ts">
import { createSipAccount, deleteSipAccount, getSipAccount, listSipAccounts, updateSipAccount } from '@/api/callcenter/sip-account';
import { SipAccountForm, SipAccountQuery, SipAccountVO } from '@/api/callcenter/sip-account/types';
import { listFreeSwitchNodes } from '@/api/callcenter/freeswitch-node';
import { FreeSwitchNodeVO } from '@/api/callcenter/freeswitch-node/types';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;
const loading = ref(false);
const showSearch = ref(true);
const total = ref(0);
const accountList = ref<SipAccountVO[]>([]);
const nodeOptions = ref<FreeSwitchNodeVO[]>([]);
const queryFormRef = ref<ElFormInstance>();
const formRef = ref<ElFormInstance>();
const dialog = reactive<DialogOption>({ visible: false, title: '' });

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
    nodeId: [{ required: true, message: '请选择 FreeSWITCH 节点', trigger: 'change' }],
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
    const res = await listSipAccounts(queryParams.value);
    accountList.value = res.rows;
    total.value = res.total;
  } finally {
    loading.value = false;
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
  loadNodeOptions();
  dialog.title = '新增 SIP 分机';
  dialog.visible = true;
};

const handleUpdate = async (row: SipAccountVO) => {
  reset();
  await loadNodeOptions();
  const res = await getSipAccount(row.id);
  Object.assign(form.value, res.data, { password: '' });
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
    if (payload.id && !payload.password?.trim()) {
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

onMounted(getList);
</script>
