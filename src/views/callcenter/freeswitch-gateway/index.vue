<template>
  <div class="p-2">
    <el-card class="mb-2" shadow="hover">
      <el-form ref="queryFormRef" :model="queryParams" :inline="true">
        <el-form-item label="节点" prop="nodeId">
          <el-select v-model="queryParams.nodeId" clearable filterable style="width: 180px">
            <el-option v-for="node in nodeOptions" :key="node.id" :label="node.nodeName" :value="node.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="网关编码" prop="gatewayCode">
          <el-input v-model="queryParams.gatewayCode" clearable @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item label="网关名称" prop="gatewayName">
          <el-input v-model="queryParams.gatewayName" clearable @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item label="方向" prop="direction">
          <el-select v-model="queryParams.direction" clearable style="width: 120px">
            <el-option v-for="item in directionOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
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
        <el-button v-hasPermi="['callcenter:freeswitch-gateway:create']" type="primary" plain icon="Plus" @click="handleAdd">新增网关</el-button>
      </template>
      <el-table v-loading="loading" :data="gatewayList">
        <el-table-column label="网关编码" prop="gatewayCode" min-width="130" />
        <el-table-column label="网关名称" prop="gatewayName" min-width="150" />
        <el-table-column label="节点" prop="nodeName" min-width="150" />
        <el-table-column label="方向" width="100">
          <template #default="{ row }">{{ directionLabel(row.direction) }}</template>
        </el-table-column>
        <el-table-column label="SIP 服务器" prop="proxy" min-width="180" />
        <el-table-column label="认证用户" prop="username" min-width="120" />
        <el-table-column label="注册" width="90">
          <template #default="{ row }">
            <el-tag :type="row.registerEnabled ? 'success' : 'info'">{{ row.registerEnabled ? '注册' : '不注册' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="传输" prop="transport" width="90" />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '停用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="130" align="center">
          <template #default="{ row }">
            <el-button v-hasPermi="['callcenter:freeswitch-gateway:update']" link type="primary" icon="Edit" @click="handleUpdate(row)" />
            <el-button v-hasPermi="['callcenter:freeswitch-gateway:delete']" link type="danger" icon="Delete" @click="handleDelete(row)" />
          </template>
        </el-table-column>
      </el-table>
      <pagination v-show="total > 0" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" :total="total" @pagination="getList" />
    </el-card>

    <el-dialog v-model="dialog.visible" :title="dialog.title" width="720px" append-to-body>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="110px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="所属节点" prop="nodeId">
              <el-select v-model="form.nodeId" filterable style="width: 100%">
                <el-option v-for="node in nodeOptions" :key="node.id" :label="node.nodeName" :value="node.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="网关编码" prop="gatewayCode">
              <el-input v-model="form.gatewayCode" placeholder="例如 GW_CARRIER_01" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="网关名称" prop="gatewayName">
              <el-input v-model="form.gatewayName" placeholder="例如 运营商线路01" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="方向" prop="direction">
              <el-select v-model="form.direction" style="width: 100%">
                <el-option v-for="item in directionOptions" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="SIP服务器" prop="proxy">
              <el-input v-model="form.proxy" placeholder="例如 sip.example.com:5060" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="SIP域" prop="realm">
              <el-input v-model="form.realm" placeholder="为空时由网关配置决定" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="认证用户" prop="username">
              <el-input v-model="form.username" placeholder="运营商提供的账号" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="form.id ? '新认证密码' : '认证密码'" prop="password">
              <el-input v-model="form.password" type="password" show-password :placeholder="form.id ? '留空表示不修改' : '运营商提供的密码'" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="传输协议" prop="transport">
              <el-select v-model="form.transport" style="width: 100%">
                <el-option label="UDP" value="UDP" />
                <el-option label="TCP" value="TCP" />
                <el-option label="TLS" value="TLS" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="主叫号码" prop="callerIdNumber">
              <el-input v-model="form.callerIdNumber" placeholder="默认外呼主叫号码" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="注册到网关" prop="registerEnabled">
              <el-switch v-model="form.registerEnabled" active-text="是" inactive-text="否" />
            </el-form-item>
          </el-col>
          <el-col v-if="form.id" :span="12">
            <el-form-item label="状态" prop="enabled">
              <el-switch v-model="form.enabled" active-text="启用" inactive-text="停用" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="dialog.visible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="FreeSwitchGateway" lang="ts">
import {
  createFreeSwitchGateway,
  deleteFreeSwitchGateway,
  getFreeSwitchGateway,
  listFreeSwitchGateways,
  updateFreeSwitchGateway
} from '@/api/callcenter/freeswitch-gateway';
import { FreeSwitchGatewayForm, FreeSwitchGatewayQuery, FreeSwitchGatewayVO, GatewayDirection } from '@/api/callcenter/freeswitch-gateway/types';
import { listFreeSwitchNodes } from '@/api/callcenter/freeswitch-node';
import { FreeSwitchNodeVO } from '@/api/callcenter/freeswitch-node/types';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;
const loading = ref(false);
const total = ref(0);
const gatewayList = ref<FreeSwitchGatewayVO[]>([]);
const nodeOptions = ref<FreeSwitchNodeVO[]>([]);
const queryFormRef = ref<ElFormInstance>();
const formRef = ref<ElFormInstance>();
const dialog = reactive<DialogOption>({ visible: false, title: '' });
const directionOptions: Array<{ label: string; value: GatewayDirection }> = [
  { label: '呼入', value: 'INBOUND' },
  { label: '呼出', value: 'OUTBOUND' },
  { label: '呼入呼出', value: 'BOTH' }
];
const initialForm: FreeSwitchGatewayForm = {
  nodeId: undefined,
  gatewayCode: '',
  gatewayName: '',
  direction: 'BOTH',
  proxy: '',
  realm: '',
  username: '',
  password: '',
  registerEnabled: false,
  transport: 'UDP',
  callerIdNumber: '',
  enabled: true
};
const data = reactive<PageData<FreeSwitchGatewayForm, FreeSwitchGatewayQuery>>({
  form: { ...initialForm },
  queryParams: { pageNum: 1, pageSize: 10, nodeId: undefined, gatewayCode: '', gatewayName: '', direction: undefined, enabled: undefined },
  rules: {
    nodeId: [{ required: true, message: '请选择所属节点', trigger: 'change' }],
    gatewayCode: [{ required: true, pattern: /^[A-Za-z0-9_-]{2,32}$/, message: '请输入合法网关编码', trigger: 'blur' }],
    gatewayName: [{ required: true, message: '网关名称不能为空', trigger: 'blur' }],
    direction: [{ required: true, message: '请选择网关方向', trigger: 'change' }],
    proxy: [{ required: true, message: 'SIP服务器不能为空', trigger: 'blur' }],
    transport: [{ required: true, message: '请选择传输协议', trigger: 'change' }]
  }
});
const { form, queryParams, rules } = toRefs(data);

const directionLabel = (value: GatewayDirection) => directionOptions.find((item) => item.value === value)?.label || value;
const loadNodes = async () => {
  const res = await listFreeSwitchNodes({ pageNum: 1, pageSize: 200, enabled: true });
  nodeOptions.value = res.rows;
};
const getList = async () => {
  loading.value = true;
  try {
    const res = await listFreeSwitchGateways(queryParams.value);
    gatewayList.value = res.rows;
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
  if (!form.value.nodeId && nodeOptions.value.length === 1) form.value.nodeId = nodeOptions.value[0].id;
  dialog.title = '新增 FreeSWITCH 网关';
  dialog.visible = true;
};
const handleUpdate = async (row: FreeSwitchGatewayVO) => {
  reset();
  const res = await getFreeSwitchGateway(row.id);
  Object.assign(form.value, res.data, { password: '' });
  dialog.title = '修改 FreeSWITCH 网关';
  dialog.visible = true;
};
const submitForm = () =>
  formRef.value?.validate(async (valid) => {
    if (!valid) return;
    form.value.id ? await updateFreeSwitchGateway(form.value) : await createFreeSwitchGateway(form.value);
    proxy?.$modal.msgSuccess('操作成功');
    dialog.visible = false;
    await getList();
  });
const handleDelete = async (row: FreeSwitchGatewayVO) => {
  await proxy?.$modal.confirm(`确认删除网关 ${row.gatewayName} 吗？`);
  await deleteFreeSwitchGateway(row.id);
  proxy?.$modal.msgSuccess('删除成功');
  await getList();
};
onMounted(async () => {
  await loadNodes();
  await getList();
});
</script>
