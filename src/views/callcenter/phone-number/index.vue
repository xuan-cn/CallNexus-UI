<template>
  <div class="p-2">
    <el-card class="mb-2" shadow="hover">
      <el-form ref="queryFormRef" :model="queryParams" :inline="true">
        <el-form-item label="节点" prop="nodeId">
          <el-select v-model="queryParams.nodeId" clearable filterable style="width: 180px">
            <el-option v-for="node in nodeOptions" :key="node.id" :label="node.nodeName" :value="node.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="号码" prop="number">
          <el-input v-model="queryParams.number" clearable @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item label="名称" prop="numberName">
          <el-input v-model="queryParams.numberName" clearable @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item label="类型" prop="numberType">
          <el-select v-model="queryParams.numberType" clearable style="width: 130px">
            <el-option v-for="item in numberTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
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
        <el-button v-hasPermi="['callcenter:phone-number:create']" type="primary" plain icon="Plus" @click="handleAdd">新增号码</el-button>
      </template>
      <el-table v-loading="loading" :data="phoneNumberList">
        <el-table-column label="号码" prop="number" min-width="130" />
        <el-table-column label="名称" prop="numberName" min-width="150" />
        <el-table-column label="类型" width="110">
          <template #default="{ row }">{{ numberTypeLabel(row.numberType) }}</template>
        </el-table-column>
        <el-table-column label="节点" prop="nodeName" min-width="150" />
        <el-table-column label="网关" prop="gatewayName" min-width="150" />
        <el-table-column label="默认主叫" width="100">
          <template #default="{ row }">
            <el-tag :type="row.outboundDefault ? 'success' : 'info'">{{ row.outboundDefault ? '是' : '否' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '停用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="210" align="center" fixed="right">
          <template #default="{ row }">
            <el-button v-hasPermi="['callcenter:inbound-did:list']" link type="primary" @click="handleConfigureInboundRoute(row)">呼入规则</el-button>
            <el-button v-hasPermi="['callcenter:phone-number:update']" link type="primary" icon="Edit" @click="handleUpdate(row)" />
            <el-button v-hasPermi="['callcenter:phone-number:delete']" link type="danger" icon="Delete" @click="handleDelete(row)" />
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
              <el-select v-model="form.nodeId" filterable style="width: 100%" @change="handleNodeChange">
                <el-option v-for="node in nodeOptions" :key="node.id" :label="node.nodeName" :value="node.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="绑定网关" prop="gatewayId">
              <el-select v-model="form.gatewayId" clearable filterable style="width: 100%">
                <el-option v-for="gateway in filteredGatewayOptions" :key="gateway.id" :label="gateway.gatewayName" :value="gateway.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="号码" prop="number">
              <el-input v-model="form.number" placeholder="例如 4008001000 或 5295357" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="号码名称" prop="numberName">
              <el-input v-model="form.numberName" placeholder="例如 客服热线" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="号码类型" prop="numberType">
              <el-select v-model="form.numberType" style="width: 100%">
                <el-option v-for="item in numberTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="默认主叫" prop="outboundDefault">
              <el-switch v-model="form.outboundDefault" active-text="是" inactive-text="否" />
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

    <el-drawer v-model="routeDrawer.visible" :title="routeDrawer.title" size="min(1080px, 92vw)" append-to-body destroy-on-close>
      <template v-if="routeNumber">
        <el-descriptions class="route-number-summary" :column="4" border>
          <el-descriptions-item label="号码">{{ routeNumber.number }}</el-descriptions-item>
          <el-descriptions-item label="名称">{{ routeNumber.numberName }}</el-descriptions-item>
          <el-descriptions-item label="节点">{{ routeNumber.nodeName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="网关">{{ routeNumber.gatewayName || '-' }}</el-descriptions-item>
        </el-descriptions>
        <el-alert
          class="route-number-tip"
          type="info"
          :closable="false"
          title="号码负责标识对外资源；入口规则负责识别网关送来的 DID、端口、账号或 Header，并决定来电去向。"
        />
        <InboundDidManager :key="String(routeNumber.id)" embedded :phone-number="routeNumber" />
      </template>
    </el-drawer>
  </div>
</template>

<script setup name="PhoneNumber" lang="ts">
import { createPhoneNumber, deletePhoneNumber, getPhoneNumber, listPhoneNumbers, updatePhoneNumber } from '@/api/callcenter/phone-number';
import { PhoneNumberForm, PhoneNumberQuery, PhoneNumberType, PhoneNumberVO } from '@/api/callcenter/phone-number/types';
import { listFreeSwitchNodes } from '@/api/callcenter/freeswitch-node';
import { FreeSwitchNodeVO } from '@/api/callcenter/freeswitch-node/types';
import { listFreeSwitchGateways } from '@/api/callcenter/freeswitch-gateway';
import { FreeSwitchGatewayVO } from '@/api/callcenter/freeswitch-gateway/types';
import InboundDidManager from '@/views/callcenter/inbound-did/index.vue';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;
const loading = ref(false);
const total = ref(0);
const phoneNumberList = ref<PhoneNumberVO[]>([]);
const nodeOptions = ref<FreeSwitchNodeVO[]>([]);
const gatewayOptions = ref<FreeSwitchGatewayVO[]>([]);
const queryFormRef = ref<ElFormInstance>();
const formRef = ref<ElFormInstance>();
const dialog = reactive<DialogOption>({ visible: false, title: '' });
const routeDrawer = reactive<DialogOption>({ visible: false, title: '' });
const routeNumber = ref<PhoneNumberVO>();
const numberTypeOptions: Array<{ label: string; value: PhoneNumberType }> = [
  { label: 'DID 呼入', value: 'DID' },
  { label: '主叫号码', value: 'CALLER_ID' },
  { label: '呼入呼出', value: 'BOTH' }
];
const initialForm: PhoneNumberForm = {
  number: '',
  numberName: '',
  numberType: 'DID',
  nodeId: undefined,
  gatewayId: undefined,
  outboundDefault: false,
  enabled: true
};
const data = reactive<PageData<PhoneNumberForm, PhoneNumberQuery>>({
  form: { ...initialForm },
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    nodeId: undefined,
    gatewayId: undefined,
    number: '',
    numberName: '',
    numberType: undefined,
    enabled: undefined
  },
  rules: {
    nodeId: [{ required: true, message: '请选择所属节点', trigger: 'change' }],
    number: [{ required: true, pattern: /^[0-9+*#-]{1,32}$/, message: '请输入合法号码', trigger: 'blur' }],
    numberName: [{ required: true, message: '号码名称不能为空', trigger: 'blur' }],
    numberType: [{ required: true, message: '请选择号码类型', trigger: 'change' }]
  }
});
const { form, queryParams, rules } = toRefs(data);

const filteredGatewayOptions = computed(() => gatewayOptions.value.filter((gateway) => !form.value.nodeId || gateway.nodeId === form.value.nodeId));
const numberTypeLabel = (value: PhoneNumberType) => numberTypeOptions.find((item) => item.value === value)?.label || value;
const loadOptions = async () => {
  const [nodeRes, gatewayRes] = await Promise.all([
    listFreeSwitchNodes({ pageNum: 1, pageSize: 200, enabled: true }),
    listFreeSwitchGateways({ pageNum: 1, pageSize: 200, enabled: true })
  ]);
  nodeOptions.value = nodeRes.rows;
  gatewayOptions.value = gatewayRes.rows;
};
const getList = async () => {
  loading.value = true;
  try {
    const res = await listPhoneNumbers(queryParams.value);
    phoneNumberList.value = res.rows;
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
const handleNodeChange = () => {
  if (!filteredGatewayOptions.value.some((gateway) => gateway.id === form.value.gatewayId)) {
    form.value.gatewayId = undefined;
  }
};
const handleAdd = () => {
  reset();
  if (!form.value.nodeId && nodeOptions.value.length === 1) form.value.nodeId = nodeOptions.value[0].id;
  dialog.title = '新增号码';
  dialog.visible = true;
};
const handleUpdate = async (row: PhoneNumberVO) => {
  reset();
  const res = await getPhoneNumber(row.id);
  const data = res.data;
  form.value = {
    id: data.id,
    nodeId: data.nodeId,
    gatewayId: data.gatewayId,
    number: data.number,
    numberName: data.numberName,
    numberType: data.numberType,
    outboundDefault: data.outboundDefault,
    enabled: data.enabled,
    version: data.version
  };
  dialog.title = '修改号码';
  dialog.visible = true;
};
const handleConfigureInboundRoute = (row: PhoneNumberVO) => {
  if (!row.gatewayId) {
    proxy?.$modal.msgWarning('请先为号码绑定来源网关，再配置呼入规则');
    return;
  }
  routeNumber.value = row;
  routeDrawer.title = `呼入规则 · ${row.numberName || row.number}`;
  routeDrawer.visible = true;
};
const submitForm = () =>
  formRef.value?.validate(async (valid) => {
    if (!valid) return;
    form.value.id ? await updatePhoneNumber(form.value) : await createPhoneNumber(form.value);
    proxy?.$modal.msgSuccess('操作成功');
    dialog.visible = false;
    await getList();
  });
const handleDelete = async (row: PhoneNumberVO) => {
  await proxy?.$modal.confirm(`确认删除号码 ${row.number} 吗？`);
  await deletePhoneNumber(row.id);
  proxy?.$modal.msgSuccess('删除成功');
  await getList();
};
onMounted(async () => {
  await loadOptions();
  await getList();
});
</script>

<style scoped>
.route-number-summary {
  margin-bottom: 12px;
}

.route-number-tip {
  margin-bottom: 18px;
}
</style>
