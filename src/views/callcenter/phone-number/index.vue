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
        <el-form-item label="路由" prop="routeType">
          <el-select v-model="queryParams.routeType" clearable style="width: 130px">
            <el-option v-for="item in routeTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
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
        <el-table-column label="呼入路由" min-width="170">
          <template #default="{ row }">
            <span>{{ routeTypeLabel(row.routeType) }}</span>
            <span v-if="row.routeTarget">：{{ routeTargetLabel(row) }}</span>
          </template>
        </el-table-column>
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
        <el-table-column label="操作" width="130" align="center">
          <template #default="{ row }">
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
            <el-form-item label="呼入路由" prop="routeType">
              <el-select v-model="form.routeType" style="width: 100%" @change="handleRouteTypeChange">
                <el-option v-for="item in routeTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col v-if="form.routeType === 'EXTENSION'" :span="12">
            <el-form-item label="目标分机" prop="routeTarget">
              <el-input v-model="form.routeTarget" placeholder="例如 1001" />
            </el-form-item>
          </el-col>
          <el-col v-if="form.routeType === 'IVR'" :span="12">
            <el-form-item label="目标 IVR" prop="routeTarget">
              <el-select v-model="form.routeTarget" filterable style="width: 100%" placeholder="请选择已发布 IVR">
                <el-option v-for="flow in availableIvrOptions" :key="flow.id" :label="flow.flowName" :value="String(flow.id)" />
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
  </div>
</template>

<script setup name="PhoneNumber" lang="ts">
import { createPhoneNumber, deletePhoneNumber, getPhoneNumber, listPhoneNumbers, updatePhoneNumber } from '@/api/callcenter/phone-number';
import { PhoneNumberForm, PhoneNumberQuery, PhoneNumberType, PhoneNumberVO, PhoneRouteType } from '@/api/callcenter/phone-number/types';
import { listFreeSwitchNodes } from '@/api/callcenter/freeswitch-node';
import { FreeSwitchNodeVO } from '@/api/callcenter/freeswitch-node/types';
import { listFreeSwitchGateways } from '@/api/callcenter/freeswitch-gateway';
import { FreeSwitchGatewayVO } from '@/api/callcenter/freeswitch-gateway/types';
import { listIvrFlows } from '@/api/callcenter/ivr-flow';
import { IvrFlowVO } from '@/api/callcenter/ivr-flow/types';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;
const loading = ref(false);
const total = ref(0);
const phoneNumberList = ref<PhoneNumberVO[]>([]);
const nodeOptions = ref<FreeSwitchNodeVO[]>([]);
const gatewayOptions = ref<FreeSwitchGatewayVO[]>([]);
const ivrOptions = ref<IvrFlowVO[]>([]);
const queryFormRef = ref<ElFormInstance>();
const formRef = ref<ElFormInstance>();
const dialog = reactive<DialogOption>({ visible: false, title: '' });
const numberTypeOptions: Array<{ label: string; value: PhoneNumberType }> = [
  { label: 'DID 呼入', value: 'DID' },
  { label: '主叫号码', value: 'CALLER_ID' },
  { label: '呼入呼出', value: 'BOTH' }
];
const routeTypeOptions: Array<{ label: string; value: PhoneRouteType }> = [
  { label: '不路由', value: 'NONE' },
  { label: '固定分机', value: 'EXTENSION' },
  { label: 'IVR 流程', value: 'IVR' }
];
const initialForm: PhoneNumberForm = {
  number: '',
  numberName: '',
  numberType: 'DID',
  nodeId: undefined,
  gatewayId: undefined,
  routeType: 'EXTENSION',
  routeTarget: '',
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
    routeType: undefined,
    enabled: undefined
  },
  rules: {
    nodeId: [{ required: true, message: '请选择所属节点', trigger: 'change' }],
    number: [{ required: true, pattern: /^[0-9+*#-]{1,32}$/, message: '请输入合法号码', trigger: 'blur' }],
    numberName: [{ required: true, message: '号码名称不能为空', trigger: 'blur' }],
    numberType: [{ required: true, message: '请选择号码类型', trigger: 'change' }],
    routeType: [{ required: true, message: '请选择呼入路由', trigger: 'change' }]
  }
});
const { form, queryParams, rules } = toRefs(data);

const filteredGatewayOptions = computed(() => gatewayOptions.value.filter((gateway) => !form.value.nodeId || gateway.nodeId === form.value.nodeId));
const availableIvrOptions = computed(() => ivrOptions.value.filter((flow) =>
  flow.publishStatus === 'PUBLISHED' && flow.enabled && (flow.nodeIds || []).some((id) => String(id) === String(form.value.nodeId))));
const numberTypeLabel = (value: PhoneNumberType) => numberTypeOptions.find((item) => item.value === value)?.label || value;
const routeTypeLabel = (value: PhoneRouteType) => routeTypeOptions.find((item) => item.value === value)?.label || value;
const routeTargetLabel = (row: PhoneNumberVO) => row.routeType === 'IVR'
  ? ivrOptions.value.find((flow) => String(flow.id) === String(row.routeTarget))?.flowName || row.routeTarget
  : row.routeTarget;
const loadOptions = async () => {
  const [nodeRes, gatewayRes, ivrRes] = await Promise.all([
    listFreeSwitchNodes({ pageNum: 1, pageSize: 200, enabled: true }),
    listFreeSwitchGateways({ pageNum: 1, pageSize: 200, enabled: true }),
    listIvrFlows()
  ]);
  nodeOptions.value = nodeRes.rows;
  gatewayOptions.value = gatewayRes.rows;
  ivrOptions.value = ivrRes.data;
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
const handleRouteTypeChange = () => {
  form.value.routeTarget = '';
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
  Object.assign(form.value, res.data);
  dialog.title = '修改号码';
  dialog.visible = true;
};
const submitForm = () =>
  formRef.value?.validate(async (valid) => {
    if (!valid) return;
    if (form.value.routeType !== 'NONE' && !form.value.routeTarget) {
      proxy?.$modal.msgError('请选择或输入呼入路由目标');
      return;
    }
    if (form.value.routeType === 'NONE') form.value.routeTarget = '';
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
