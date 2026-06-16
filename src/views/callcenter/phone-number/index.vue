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
          <el-col v-if="form.routeType === 'QUEUE'" :span="12">
            <el-form-item label="目标队列" prop="routeTarget">
              <el-select v-model="form.routeTarget" filterable style="width: 100%" placeholder="请选择已同步的呼叫队列">
                <el-option v-for="queue in availableQueueOptions" :key="queue.id" :label="queue.queueName" :value="String(queue.id)" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col v-if="form.routeType === 'VOICEMAIL'" :span="12">
            <el-form-item label="目标留言箱" prop="routeTarget">
              <el-select v-model="form.routeTarget" filterable style="width: 100%" placeholder="请选择语音留言箱">
                <el-option v-for="box in voicemailOptions" :key="box.id" :label="box.boxName" :value="String(box.id)" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col v-if="form.routeType === 'BUSINESS_HOURS'" :span="24">
            <el-card shadow="never">
              <el-form-item label="工作时间方案" required>
                <el-select v-model="form.businessHoursRoute.planId" style="width: 100%">
                  <el-option v-for="plan in businessHoursPlans" :key="plan.id" :label="plan.planName" :value="plan.id" />
                </el-select>
              </el-form-item>
              <el-row :gutter="16">
                <el-col :span="12">
                  <el-form-item label="时间内类型">
                    <el-select v-model="form.businessHoursRoute.inHoursTargetType" style="width: 100%" @change="handleBusinessTargetTypeChange('in')">
                      <el-option v-for="item in businessTargetOptions" :key="item.value" :label="item.label" :value="item.value" />
                    </el-select>
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="时间内目标">
                    <el-input v-if="form.businessHoursRoute.inHoursTargetType === 'EXTENSION'" v-model="form.businessHoursRoute.inHoursTarget" placeholder="例如 1001" />
                    <el-select v-else-if="form.businessHoursRoute.inHoursTargetType === 'IVR'" v-model="form.businessHoursRoute.inHoursTarget" filterable style="width: 100%" placeholder="请选择已发布 IVR">
                      <el-option v-for="flow in availableIvrOptions" :key="flow.id" :label="flow.flowName" :value="String(flow.id)" />
                    </el-select>
                    <el-select v-else-if="form.businessHoursRoute.inHoursTargetType === 'QUEUE'" v-model="form.businessHoursRoute.inHoursTarget" filterable style="width: 100%" placeholder="请选择已同步的呼叫队列">
                      <el-option v-for="queue in availableQueueOptions" :key="queue.id" :label="queue.queueName" :value="String(queue.id)" />
                    </el-select>
                    <el-select v-else-if="form.businessHoursRoute.inHoursTargetType === 'VOICEMAIL'" v-model="form.businessHoursRoute.inHoursTarget" filterable style="width: 100%" placeholder="请选择语音留言箱">
                      <el-option v-for="box in voicemailOptions" :key="box.id" :label="box.boxName" :value="String(box.id)" />
                    </el-select>
                    <el-input v-else disabled placeholder="挂断不需要配置目标" />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="时间外类型">
                    <el-select v-model="form.businessHoursRoute.outHoursTargetType" style="width: 100%" @change="handleBusinessTargetTypeChange('out')">
                      <el-option v-for="item in businessTargetOptions" :key="item.value" :label="item.label" :value="item.value" />
                    </el-select>
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="时间外目标">
                    <el-input v-if="form.businessHoursRoute.outHoursTargetType === 'EXTENSION'" v-model="form.businessHoursRoute.outHoursTarget" placeholder="例如 1001" />
                    <el-select v-else-if="form.businessHoursRoute.outHoursTargetType === 'IVR'" v-model="form.businessHoursRoute.outHoursTarget" filterable style="width: 100%" placeholder="请选择已发布 IVR">
                      <el-option v-for="flow in availableIvrOptions" :key="flow.id" :label="flow.flowName" :value="String(flow.id)" />
                    </el-select>
                    <el-select v-else-if="form.businessHoursRoute.outHoursTargetType === 'QUEUE'" v-model="form.businessHoursRoute.outHoursTarget" filterable style="width: 100%" placeholder="请选择已同步的呼叫队列">
                      <el-option v-for="queue in availableQueueOptions" :key="queue.id" :label="queue.queueName" :value="String(queue.id)" />
                    </el-select>
                    <el-select v-else-if="form.businessHoursRoute.outHoursTargetType === 'VOICEMAIL'" v-model="form.businessHoursRoute.outHoursTarget" filterable style="width: 100%" placeholder="请选择语音留言箱">
                      <el-option v-for="box in voicemailOptions" :key="box.id" :label="box.boxName" :value="String(box.id)" />
                    </el-select>
                    <el-input v-else disabled placeholder="挂断不需要配置目标" />
                  </el-form-item>
                </el-col>
              </el-row>
            </el-card>
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
import { listCallQueues } from '@/api/callcenter/call-queue';
import { CallQueueVO } from '@/api/callcenter/call-queue/types';
import { listBusinessHoursPlans } from '@/api/callcenter/business-hours';
import type { BusinessHoursPlan } from '@/api/callcenter/business-hours/types';
import { listVoiceMailBoxes } from '@/api/callcenter/voicemail';
import type { VoiceMailBoxVO } from '@/api/callcenter/voicemail/types';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;
const loading = ref(false);
const total = ref(0);
const phoneNumberList = ref<PhoneNumberVO[]>([]);
const nodeOptions = ref<FreeSwitchNodeVO[]>([]);
const gatewayOptions = ref<FreeSwitchGatewayVO[]>([]);
const ivrOptions = ref<IvrFlowVO[]>([]);
const queueOptions = ref<CallQueueVO[]>([]);
const businessHoursPlans = ref<BusinessHoursPlan[]>([]);
const voicemailOptions = ref<VoiceMailBoxVO[]>([]);
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
  { label: 'IVR 流程', value: 'IVR' },
  { label: '呼叫队列', value: 'QUEUE' },
  { label: '语音留言', value: 'VOICEMAIL' },
  { label: '工作时间路由', value: 'BUSINESS_HOURS' }
];
const businessTargetOptions = [
  { label: '固定分机', value: 'EXTENSION' },
  { label: 'IVR 流程', value: 'IVR' },
  { label: '呼叫队列', value: 'QUEUE' },
  { label: '语音留言', value: 'VOICEMAIL' },
  { label: '挂断', value: 'HANGUP' }
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
  enabled: true,
  businessHoursRoute: { inHoursTargetType: 'EXTENSION', inHoursTarget: '', outHoursTargetType: 'HANGUP', outHoursTarget: '' }
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
const availableQueueOptions = computed(() => queueOptions.value.filter((queue) =>
  queue.enabled && queue.syncStatus === 'SYNCED'
  && (queue.nodeIds || []).some((id) => String(id) === String(form.value.nodeId))));
const numberTypeLabel = (value: PhoneNumberType) => numberTypeOptions.find((item) => item.value === value)?.label || value;
const routeTypeLabel = (value: PhoneRouteType) => routeTypeOptions.find((item) => item.value === value)?.label || value;
const routeTargetLabel = (row: PhoneNumberVO) => {
  if (row.routeType === 'IVR') return ivrOptions.value.find((flow) => String(flow.id) === String(row.routeTarget))?.flowName || row.routeTarget;
  if (row.routeType === 'QUEUE') return queueOptions.value.find((queue) => String(queue.id) === String(row.routeTarget))?.queueName || row.routeTarget;
  if (row.routeType === 'VOICEMAIL') return voicemailOptions.value.find((box) => String(box.id) === String(row.routeTarget))?.boxName || row.routeTarget;
  if (row.routeType === 'BUSINESS_HOURS') {
    return businessHoursPlans.value.find((plan) => String(plan.id) === String(row.businessHoursRoute?.planId))?.planName || row.routeTarget;
  }
  return row.routeTarget;
};
const loadOptions = async () => {
  const [nodeRes, gatewayRes, ivrRes, queueRes, businessHoursRes, voicemailRes] = await Promise.all([
    listFreeSwitchNodes({ pageNum: 1, pageSize: 200, enabled: true }),
    listFreeSwitchGateways({ pageNum: 1, pageSize: 200, enabled: true }),
    listIvrFlows(),
    listCallQueues(),
    listBusinessHoursPlans(),
    listVoiceMailBoxes({ pageNum: 1, pageSize: 1000, enabled: true })
  ]);
  nodeOptions.value = nodeRes.rows;
  gatewayOptions.value = gatewayRes.rows;
  ivrOptions.value = ivrRes.data;
  queueOptions.value = queueRes.data;
  businessHoursPlans.value = businessHoursRes.data.filter((item) => item.enabled);
  voicemailOptions.value = voicemailRes.rows.filter((item) => item.enabled);
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
  if (form.value.routeType === 'IVR'
    && !availableIvrOptions.value.some((flow) => String(flow.id) === String(form.value.routeTarget))) {
    form.value.routeTarget = '';
  }
  if (form.value.routeType === 'QUEUE'
    && !availableQueueOptions.value.some((queue) => String(queue.id) === String(form.value.routeTarget))) {
    form.value.routeTarget = '';
  }
};
const handleRouteTypeChange = () => {
  form.value.routeTarget = '';
  if (form.value.routeType === 'BUSINESS_HOURS' && !form.value.businessHoursRoute) {
    form.value.businessHoursRoute = { inHoursTargetType: 'EXTENSION', inHoursTarget: '', outHoursTargetType: 'HANGUP', outHoursTarget: '' };
  }
};
const handleBusinessTargetTypeChange = (position: 'in' | 'out') => {
  if (position === 'in') {
    form.value.businessHoursRoute.inHoursTarget = '';
  } else {
    form.value.businessHoursRoute.outHoursTarget = '';
  }
};
const validateBusinessHoursRoute = () => {
  if (form.value.routeType !== 'BUSINESS_HOURS') return true;
  const route = form.value.businessHoursRoute;
  if (!route?.planId) {
    proxy?.$modal.msgError('请选择工作时间方案');
    return false;
  }
  if (route.inHoursTargetType !== 'HANGUP' && !route.inHoursTarget) {
    proxy?.$modal.msgError('请选择或输入时间内路由目标');
    return false;
  }
  if (route.outHoursTargetType !== 'HANGUP' && !route.outHoursTarget) {
    proxy?.$modal.msgError('请选择或输入时间外路由目标');
    return false;
  }
  if (route.inHoursTargetType === 'HANGUP') route.inHoursTarget = '';
  if (route.outHoursTargetType === 'HANGUP') route.outHoursTarget = '';
  return true;
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
    if (form.value.routeType !== 'NONE' && form.value.routeType !== 'BUSINESS_HOURS' && !form.value.routeTarget) {
      proxy?.$modal.msgError('请选择或输入呼入路由目标');
      return;
    }
    if (!validateBusinessHoursRoute()) return;
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
