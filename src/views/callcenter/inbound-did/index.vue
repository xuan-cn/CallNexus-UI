<template>
  <div class="inbound-did-page p-2">
    <el-card class="mb-2" shadow="hover">
      <el-form ref="queryFormRef" :model="queryParams" :inline="true" class="query-form">
        <el-form-item label="节点" prop="nodeId">
          <el-select v-model="queryParams.nodeId" clearable filterable placeholder="请选择节点" style="width: 190px" @change="handleQueryNodeChange">
            <el-option v-for="node in nodeOptions" :key="node.id" :label="node.nodeName" :value="node.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="网关" prop="gatewayId">
          <el-select v-model="queryParams.gatewayId" clearable filterable placeholder="请选择网关" style="width: 190px">
            <el-option v-for="gateway in queryGatewayOptions" :key="gateway.id" :label="gateway.gatewayName" :value="gateway.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="入口名称" prop="entryName">
          <el-input v-model="queryParams.entryName" clearable placeholder="例如：售前热线" style="width: 170px" @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item label="入口类型" prop="entryType">
          <el-select v-model="queryParams.entryType" clearable placeholder="全部" style="width: 130px">
            <el-option v-for="item in entryTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="DID号码" prop="didNumber">
          <el-input v-model="queryParams.didNumber" clearable placeholder="被叫/DID" style="width: 140px" @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item label="路由目标" prop="routeTargetType">
          <el-select v-model="queryParams.routeTargetType" clearable placeholder="全部" style="width: 130px">
            <el-option v-for="item in routeTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态" prop="enabled">
          <el-select v-model="queryParams.enabled" clearable placeholder="全部" style="width: 110px">
            <el-option label="启用" :value="true" />
            <el-option label="停用" :value="false" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Search" @click="handleQuery">查询</el-button>
          <el-button icon="Refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <div>
            <div class="card-title">呼入路由规则</div>
            <div class="card-subtitle">按 DID、FXO/USB 端口、账号或 Header 识别呼入来源，并路由到 IVR、队列、分机、留言或工作时间路由。</div>
          </div>
          <div class="header-actions">
            <el-button type="success" plain icon="Operation" @click="openTestDrawer">路由测试</el-button>
            <el-button v-hasPermi="['callcenter:inbound-did:create']" type="primary" plain icon="Plus" @click="handleAdd">新增路由</el-button>
          </div>
        </div>
      </template>

      <el-table v-loading="loading" :data="entryList">
        <el-table-column label="入口名称" prop="entryName" min-width="150" />
        <el-table-column label="节点" prop="nodeName" min-width="150">
          <template #default="{ row }">{{ row.nodeName || nodeName(row.nodeId) }}</template>
        </el-table-column>
        <el-table-column label="网关" prop="gatewayName" min-width="150">
          <template #default="{ row }">{{ row.gatewayName || gatewayName(row.gatewayId) }}</template>
        </el-table-column>
        <el-table-column label="入口类型" width="105">
          <template #default="{ row }">
            <el-tag>{{ entryTypeLabel(row.entryType) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="匹配值" min-width="180">
          <template #default="{ row }">{{ matchText(row) }}</template>
        </el-table-column>
        <el-table-column label="路由目标" min-width="180">
          <template #default="{ row }">
            <el-tag type="success" class="mr-1">{{ routeTypeLabel(row.routeTargetType) }}</el-tag>
            <span>{{ routeTargetText(row) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="优先级" prop="priority" width="90" />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '停用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" prop="createTime" min-width="160" />
        <el-table-column label="操作" width="140" fixed="right" align="center">
          <template #default="{ row }">
            <el-button v-hasPermi="['callcenter:inbound-did:update']" link type="primary" @click="handleUpdate(row)">修改</el-button>
            <el-button v-hasPermi="['callcenter:inbound-did:delete']" link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <pagination v-show="total > 0" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" :total="total" @pagination="getList" />
    </el-card>

    <el-drawer v-model="entryDrawer.visible" :title="entryDrawer.title" size="620px" append-to-body>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-alert
          class="mb-4"
          type="info"
          :closable="false"
          title="先按入口类型识别来电来源，再把来电送到指定 IVR、队列或分机。优先级数值越小越先匹配。"
        />
        <el-form-item label="节点" prop="nodeId">
          <el-select v-model="form.nodeId" filterable placeholder="请选择 FreeSWITCH 节点" style="width: 100%" @change="handleFormNodeChange">
            <el-option v-for="node in nodeOptions" :key="node.id" :label="node.nodeName" :value="node.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="网关" prop="gatewayId">
          <el-select v-model="form.gatewayId" filterable placeholder="请选择来源网关" style="width: 100%">
            <el-option v-for="gateway in formGatewayOptions" :key="gateway.id" :label="gateway.gatewayName" :value="gateway.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="入口名称" prop="entryName">
          <el-input v-model="form.entryName" maxlength="64" show-word-limit placeholder="例如：售前热线、SIM1、FXO端口1" />
        </el-form-item>
        <el-form-item label="入口类型" prop="entryType">
          <el-radio-group v-model="form.entryType" @change="clearEntryMatchFields">
            <el-radio-button v-for="item in entryTypeOptions" :key="item.value" :value="item.value">{{ item.label }}</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="form.entryType === 'DID'" label="DID号码" prop="didNumber">
          <el-input v-model="form.didNumber" placeholder="例如：4008000000、888666、运营商送来的被叫号码" />
        </el-form-item>
        <el-form-item v-if="form.entryType === 'PORT'" label="端口标识" prop="portCode">
          <el-input v-model="form.portCode" placeholder="例如：port1、line1、sim1，由网关送入变量或Header" />
        </el-form-item>
        <el-form-item v-if="form.entryType === 'ACCOUNT'" label="账号标识" prop="accountCode">
          <el-input v-model="form.accountCode" placeholder="例如：9990000、SIP注册账号或网关账号" />
        </el-form-item>
        <template v-if="form.entryType === 'HEADER'">
          <el-form-item label="Header名" prop="headerName">
            <el-input v-model="form.headerName" placeholder="例如：X-Gateway-Port、P-Called-Party-ID" />
          </el-form-item>
          <el-form-item label="Header值" prop="headerValue">
            <el-input v-model="form.headerValue" placeholder="Header 的匹配值" />
          </el-form-item>
        </template>
        <el-form-item label="路由目标" prop="routeTargetType">
          <el-radio-group v-model="form.routeTargetType" @change="handleRouteTargetTypeChange">
            <el-radio-button v-for="item in routeTypeOptions" :key="item.value" :value="item.value">{{ item.label }}</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item :label="routeTargetLabel" prop="routeTargetId">
          <el-select
            v-if="form.routeTargetType === 'IVR'"
            v-model="form.routeTargetId"
            filterable
            placeholder="请选择已发布 IVR 流程"
            style="width: 100%"
          >
            <el-option v-for="item in availableIvrOptions" :key="item.id" :label="item.flowName" :value="String(item.id)">
              <span>{{ item.flowName }}</span>
              <span class="target-option-extra">{{ item.flowCode }}</span>
            </el-option>
          </el-select>
          <el-select
            v-else-if="form.routeTargetType === 'QUEUE'"
            v-model="form.routeTargetId"
            filterable
            placeholder="请选择已启用并同步成功的队列"
            style="width: 100%"
          >
            <el-option v-for="item in availableQueueOptions" :key="item.id" :label="item.queueName" :value="String(item.id)">
              <span>{{ item.queueName }}</span>
              <span class="target-option-extra">{{ item.queueCode }}</span>
            </el-option>
          </el-select>
          <el-select
            v-else-if="form.routeTargetType === 'VOICEMAIL'"
            v-model="form.routeTargetId"
            filterable
            placeholder="请选择已启用的语音留言箱"
            style="width: 100%"
          >
            <el-option v-for="item in availableVoiceMailOptions" :key="item.id" :label="item.boxName" :value="String(item.id)">
              <span>{{ item.boxName }}</span>
              <span class="target-option-extra">{{ item.boxCode }}</span>
            </el-option>
          </el-select>
          <el-select
            v-else-if="form.routeTargetType === 'BUSINESS_HOURS'"
            v-model="form.routeTargetId"
            filterable
            placeholder="请选择工作时间路由配置"
            style="width: 100%"
          >
            <el-option
              v-for="item in availableBusinessHoursRouteOptions"
              :key="item.businessHoursRoute?.id || item.id"
              :label="businessHoursRouteLabel(item)"
              :value="String(item.businessHoursRoute?.id)"
            />
          </el-select>
          <el-select
            v-else
            v-model="form.routeTargetId"
            filterable
            allow-create
            default-first-option
            placeholder="请选择或输入分机号，例如 1001"
            style="width: 100%"
          >
            <el-option v-for="item in availableExtensionOptions" :key="item.id" :label="extensionOptionLabel(item)" :value="item.extension" />
          </el-select>
          <div v-if="form.nodeId && form.routeTargetType === 'QUEUE' && availableQueueOptions.length === 0" class="form-tip">
            当前节点没有可用队列，请先在队列管理启用并同步队列。
          </div>
          <div v-if="form.nodeId && form.routeTargetType === 'IVR' && availableIvrOptions.length === 0" class="form-tip">
            当前节点没有可用 IVR，请先发布绑定该节点的 IVR 流程。
          </div>
          <div v-if="form.nodeId && form.routeTargetType === 'VOICEMAIL' && availableVoiceMailOptions.length === 0" class="form-tip">
            当前节点没有可用留言箱，请先启用留言箱并同步提示音。
          </div>
          <div v-if="form.routeTargetType === 'BUSINESS_HOURS' && availableBusinessHoursRouteOptions.length === 0" class="form-tip">
            暂无工作时间路由配置，请先在号码管理中配置工作时间路由。
          </div>
        </el-form-item>
        <el-form-item label="优先级" prop="priority">
          <el-input-number v-model="form.priority" :min="1" :max="9999" style="width: 180px" />
        </el-form-item>
        <el-form-item label="状态" prop="enabled">
          <el-switch v-model="form.enabled" active-text="启用" inactive-text="停用" />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" type="textarea" maxlength="500" show-word-limit :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="entryDrawer.visible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitForm">保存</el-button>
      </template>
    </el-drawer>

    <el-drawer v-model="testDrawer.visible" title="呼入路由测试" size="520px" append-to-body>
      <el-form :model="testForm" label-width="100px">
        <el-form-item label="节点" required>
          <el-select v-model="testForm.nodeId" filterable placeholder="请选择 FreeSWITCH 节点" style="width: 100%" @change="handleTestNodeChange">
            <el-option v-for="node in nodeOptions" :key="node.id" :label="node.nodeName" :value="node.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="网关">
          <el-select v-model="testForm.gatewayId" clearable filterable placeholder="不选则测试该节点全部网关" style="width: 100%">
            <el-option v-for="gateway in testGatewayOptions" :key="gateway.id" :label="gateway.gatewayName" :value="gateway.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="主叫号码">
          <el-input v-model="testForm.callerNumber" placeholder="例如：19029157428" />
        </el-form-item>
        <el-form-item label="被叫/DID">
          <el-input v-model="testForm.calledNumber" placeholder="例如：888666、4008000000" />
        </el-form-item>
        <el-form-item label="端口标识">
          <el-input v-model="testForm.portCode" placeholder="例如：line1、sim1" />
        </el-form-item>
        <el-form-item label="账号标识">
          <el-input v-model="testForm.accountCode" placeholder="例如：9990000" />
        </el-form-item>
        <el-form-item label="Header名">
          <el-input v-model="testForm.headerName" placeholder="例如：X-Gateway-Port" />
        </el-form-item>
        <el-form-item label="Header值">
          <el-input v-model="testForm.headerValue" placeholder="例如：sim1" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="testing" @click="handleRouteTest">开始测试</el-button>
          <el-button @click="resetTestForm">清空</el-button>
        </el-form-item>
      </el-form>

      <el-empty v-if="!testResult" description="输入呼入参数后点击开始测试" :image-size="80" />
      <el-result
        v-else-if="!testResult.matched"
        icon="warning"
        title="未命中入口"
        :sub-title="testResult.matchedMessage || '没有匹配到启用的 DID/端口入口'"
      />
      <el-descriptions v-else title="命中结果" :column="1" border>
        <el-descriptions-item label="入口名称">{{ testResult.entryName }}</el-descriptions-item>
        <el-descriptions-item label="入口类型">{{ entryTypeLabel(testResult.entryType) }}</el-descriptions-item>
        <el-descriptions-item label="匹配值">{{ testResult.matchValue || fallbackMatchValue(testResult) }}</el-descriptions-item>
        <el-descriptions-item label="路由目标">
          {{ routeTypeLabel(testResult.routeTargetType) }} / {{ routeTargetText(testResult) }}
        </el-descriptions-item>
        <el-descriptions-item label="优先级">{{ testResult.priority }}</el-descriptions-item>
      </el-descriptions>
    </el-drawer>
  </div>
</template>

<script setup name="InboundDid" lang="ts">
import {
  createInboundDidEntry,
  deleteInboundDidEntry,
  getInboundDidEntry,
  listInboundDidEntries,
  testInboundRoute,
  updateInboundDidEntry
} from '@/api/callcenter/inbound-did';
import type {
  InboundDidEntryForm,
  InboundDidEntryQuery,
  InboundDidEntryVO,
  InboundEntryType,
  InboundRouteMatchResult,
  InboundRouteTargetType,
  InboundRouteTestForm
} from '@/api/callcenter/inbound-did/types';
import { listFreeSwitchGateways } from '@/api/callcenter/freeswitch-gateway';
import type { FreeSwitchGatewayVO } from '@/api/callcenter/freeswitch-gateway/types';
import { listFreeSwitchNodes } from '@/api/callcenter/freeswitch-node';
import type { FreeSwitchNodeVO } from '@/api/callcenter/freeswitch-node/types';
import { listIvrFlows } from '@/api/callcenter/ivr-flow';
import type { IvrFlowVO } from '@/api/callcenter/ivr-flow/types';
import { listCallQueues } from '@/api/callcenter/call-queue';
import type { CallQueueVO } from '@/api/callcenter/call-queue/types';
import { listSipAccounts } from '@/api/callcenter/sip-account';
import type { SipAccountVO } from '@/api/callcenter/sip-account/types';
import { listVoiceMailBoxes } from '@/api/callcenter/voicemail';
import type { VoiceMailBoxVO } from '@/api/callcenter/voicemail/types';
import { listPhoneNumbers } from '@/api/callcenter/phone-number';
import type { PhoneNumberVO } from '@/api/callcenter/phone-number/types';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;
const route = useRoute();

const loading = ref(false);
const submitting = ref(false);
const testing = ref(false);
const total = ref(0);
const entryList = ref<InboundDidEntryVO[]>([]);
const nodeOptions = ref<FreeSwitchNodeVO[]>([]);
const gatewayOptions = ref<FreeSwitchGatewayVO[]>([]);
const ivrOptions = ref<IvrFlowVO[]>([]);
const queueOptions = ref<CallQueueVO[]>([]);
const extensionOptions = ref<SipAccountVO[]>([]);
const voiceMailOptions = ref<VoiceMailBoxVO[]>([]);
const phoneNumberOptions = ref<PhoneNumberVO[]>([]);
const queryFormRef = ref<ElFormInstance>();
const formRef = ref<ElFormInstance>();
const testResult = ref<InboundRouteMatchResult>();

const entryTypeOptions: Array<{ label: string; value: InboundEntryType }> = [
  { label: 'DID号码', value: 'DID' },
  { label: '端口', value: 'PORT' },
  { label: '账号', value: 'ACCOUNT' },
  { label: 'Header', value: 'HEADER' }
];

const routeTypeOptions: Array<{ label: string; value: InboundRouteTargetType }> = [
  { label: 'IVR', value: 'IVR' },
  { label: '队列', value: 'QUEUE' },
  { label: '分机', value: 'EXTENSION' },
  { label: '留言', value: 'VOICEMAIL' },
  { label: '工作时间', value: 'BUSINESS_HOURS' }
];

const initialForm: InboundDidEntryForm = {
  entryName: '',
  entryType: 'DID',
  routeTargetType: 'IVR',
  routeTargetId: '',
  priority: 100,
  enabled: true
};

const data = reactive<PageData<InboundDidEntryForm, InboundDidEntryQuery>>({
  form: { ...initialForm },
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    nodeId: undefined,
    gatewayId: undefined,
    entryName: '',
    entryType: undefined,
    didNumber: '',
    routeTargetType: undefined,
    enabled: undefined
  },
  rules: {
    nodeId: [{ required: true, message: '请选择 FreeSWITCH 节点', trigger: 'change' }],
    gatewayId: [{ required: true, message: '请选择来源网关', trigger: 'change' }],
    entryName: [{ required: true, message: '入口名称不能为空', trigger: 'blur' }],
    didNumber: [{ required: true, message: 'DID号码不能为空', trigger: 'blur' }],
    portCode: [{ required: true, message: '端口标识不能为空', trigger: 'blur' }],
    accountCode: [{ required: true, message: '账号标识不能为空', trigger: 'blur' }],
    headerName: [{ required: true, message: 'Header名不能为空', trigger: 'blur' }],
    headerValue: [{ required: true, message: 'Header值不能为空', trigger: 'blur' }],
    routeTargetId: [{ required: true, message: '路由目标不能为空', trigger: 'change' }]
  }
});

const { form, queryParams, rules } = toRefs(data);

const entryDrawer = reactive<DialogOption>({ visible: false, title: '' });
const testDrawer = reactive<DialogOption>({ visible: false, title: '' });

const testForm = reactive<InboundRouteTestForm>({
  nodeId: undefined,
  gatewayId: undefined,
  callerNumber: '',
  calledNumber: '',
  portCode: '',
  accountCode: '',
  headerName: '',
  headerValue: ''
});

const queryGatewayOptions = computed(() => filterGateways(queryParams.value.nodeId));
const formGatewayOptions = computed(() => filterGateways(form.value.nodeId));
const testGatewayOptions = computed(() => filterGateways(testForm.nodeId));
const availableIvrOptions = computed(() =>
  ivrOptions.value.filter(
    (flow) =>
      flow.enabled &&
      flow.publishStatus === 'PUBLISHED' &&
      (!form.value.nodeId || (flow.nodeIds || []).some((id) => String(id) === String(form.value.nodeId)))
  )
);
const availableQueueOptions = computed(() =>
  queueOptions.value.filter(
    (queue) =>
      queue.enabled &&
      queue.syncStatus === 'SYNCED' &&
      (!form.value.nodeId || (queue.nodeIds || []).some((id) => String(id) === String(form.value.nodeId)))
  )
);
const availableExtensionOptions = computed(() =>
  extensionOptions.value.filter((item) => item.enabled && (!form.value.nodeId || String(item.nodeId) === String(form.value.nodeId)))
);
const availableVoiceMailOptions = computed(() => voiceMailOptions.value.filter((item) => item.enabled));
const availableBusinessHoursRouteOptions = computed(() =>
  phoneNumberOptions.value.filter(
    (item) =>
      item.enabled &&
      item.routeType === 'BUSINESS_HOURS' &&
      item.businessHoursRoute?.id &&
      (!form.value.nodeId || String(item.nodeId) === String(form.value.nodeId))
  )
);

const routeTargetLabel = computed(() => {
  if (form.value.routeTargetType === 'QUEUE') return '呼叫队列';
  if (form.value.routeTargetType === 'EXTENSION') return '分机号';
  if (form.value.routeTargetType === 'VOICEMAIL') return '留言箱';
  if (form.value.routeTargetType === 'BUSINESS_HOURS') return '时间路由';
  return 'IVR流程';
});

const filterGateways = (nodeId?: string | number) => {
  if (!nodeId) return gatewayOptions.value;
  return gatewayOptions.value.filter((gateway) => String(gateway.nodeId) === String(nodeId));
};

const nodeName = (id?: string | number) => nodeOptions.value.find((item) => String(item.id) === String(id))?.nodeName || '-';
const gatewayName = (id?: string | number) => gatewayOptions.value.find((item) => String(item.id) === String(id))?.gatewayName || '-';

const entryTypeLabel = (type?: InboundEntryType) => entryTypeOptions.find((item) => item.value === type)?.label || '-';
const routeTypeLabel = (type?: InboundRouteTargetType) => routeTypeOptions.find((item) => item.value === type)?.label || '-';
const extensionOptionLabel = (item: SipAccountVO) => `${item.displayName || item.extension}（${item.extension}）`;
const businessHoursRouteLabel = (item: PhoneNumberVO) => `${item.numberName || item.number}（${item.number}）`;

const matchText = (row: InboundDidEntryVO) => {
  if (row.entryType === 'DID') return row.didNumber || '-';
  if (row.entryType === 'PORT') return row.portCode || '-';
  if (row.entryType === 'ACCOUNT') return row.accountCode || '-';
  if (row.entryType === 'HEADER') return `${row.headerName || '-'}: ${row.headerValue || '-'}`;
  return '-';
};

const fallbackMatchValue = (row: Partial<InboundDidEntryVO>) => {
  if (row.entryType === 'DID') return row.didNumber || '-';
  if (row.entryType === 'PORT') return row.portCode || '-';
  if (row.entryType === 'ACCOUNT') return row.accountCode || '-';
  if (row.entryType === 'HEADER') return `${row.headerName || '-'}: ${row.headerValue || '-'}`;
  return '-';
};

const plainRouteTarget = (type?: InboundRouteTargetType, target?: string) => {
  if (!target) return '-';
  const label = routeTypeLabel(type);
  return target.startsWith(`${label} `) ? target.substring(label.length + 1) : target;
};

const routeTargetText = (row: Partial<InboundDidEntryVO | InboundRouteMatchResult>) => {
  const target = row.routeTargetId || row.routeTargetName;
  if (!target) return '-';
  if (row.routeTargetType === 'IVR') {
    return ivrOptions.value.find((item) => String(item.id) === String(target))?.flowName || String(target);
  }
  if (row.routeTargetType === 'QUEUE') {
    return queueOptions.value.find((item) => String(item.id) === String(target))?.queueName || String(target);
  }
  if (row.routeTargetType === 'EXTENSION') {
    return extensionOptions.value.find((item) => item.extension === String(target))?.displayName || String(target);
  }
  if (row.routeTargetType === 'VOICEMAIL') {
    return voiceMailOptions.value.find((item) => String(item.id) === String(target))?.boxName || String(target);
  }
  if (row.routeTargetType === 'BUSINESS_HOURS') {
    return phoneNumberOptions.value.find((item) => String(item.businessHoursRoute?.id) === String(target))?.numberName || String(target);
  }
  if (row.routeTargetName) return plainRouteTarget(row.routeTargetType, row.routeTargetName);
  return String(target);
};

const targetStillAvailable = () => {
  const target = form.value.routeTargetId;
  if (!target) return true;
  if (form.value.routeTargetType === 'IVR') {
    return availableIvrOptions.value.some((item) => String(item.id) === String(target));
  }
  if (form.value.routeTargetType === 'QUEUE') {
    return availableQueueOptions.value.some((item) => String(item.id) === String(target));
  }
  if (form.value.routeTargetType === 'EXTENSION') {
    return availableExtensionOptions.value.some((item) => item.extension === String(target));
  }
  if (form.value.routeTargetType === 'VOICEMAIL') {
    return availableVoiceMailOptions.value.some((item) => String(item.id) === String(target));
  }
  if (form.value.routeTargetType === 'BUSINESS_HOURS') {
    return availableBusinessHoursRouteOptions.value.some((item) => String(item.businessHoursRoute?.id) === String(target));
  }
  return true;
};

const handleRouteTargetTypeChange = () => {
  form.value.routeTargetId = '';
  formRef.value?.clearValidate('routeTargetId');
};

const loadOptions = async () => {
  const [nodeRes, gatewayRes, ivrRes, queueRes, extensionRes, voiceMailRes, phoneNumberRes] = await Promise.all([
    listFreeSwitchNodes({ pageNum: 1, pageSize: 200, enabled: true }),
    listFreeSwitchGateways({ pageNum: 1, pageSize: 500, enabled: true }),
    listIvrFlows(),
    listCallQueues(),
    listSipAccounts({ pageNum: 1, pageSize: 1000, enabled: true }),
    listVoiceMailBoxes({ pageNum: 1, pageSize: 1000, enabled: true }),
    listPhoneNumbers({ pageNum: 1, pageSize: 1000, enabled: true })
  ]);
  nodeOptions.value = nodeRes.rows || [];
  gatewayOptions.value = gatewayRes.rows || [];
  ivrOptions.value = ivrRes.data || [];
  queueOptions.value = queueRes.data || [];
  extensionOptions.value = extensionRes.rows || [];
  voiceMailOptions.value = voiceMailRes.rows || [];
  phoneNumberOptions.value = phoneNumberRes.rows || [];
};

const getList = async () => {
  loading.value = true;
  try {
    const res = await listInboundDidEntries(queryParams.value);
    entryList.value = res.rows;
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

const handleQueryNodeChange = () => {
  queryParams.value.gatewayId = undefined;
};

const reset = () => {
  form.value = { ...initialForm };
  formRef.value?.resetFields();
};

const clearEntryMatchFields = () => {
  form.value.didNumber = '';
  form.value.portCode = '';
  form.value.accountCode = '';
  form.value.headerName = '';
  form.value.headerValue = '';
};

const handleFormNodeChange = () => {
  form.value.gatewayId = undefined;
  if (!targetStillAvailable()) {
    form.value.routeTargetId = '';
    formRef.value?.clearValidate('routeTargetId');
  }
};

const handleAdd = () => {
  reset();
  entryDrawer.title = '新增呼入路由';
  entryDrawer.visible = true;
};

const handleUpdate = async (row: InboundDidEntryVO) => {
  reset();
  const res = await getInboundDidEntry(row.id);
  form.value = { ...res.data };
  entryDrawer.title = '修改呼入路由';
  entryDrawer.visible = true;
};

const openCreateFromQuery = () => {
  const query = route.query;
  if (query.nodeId) {
    queryParams.value.nodeId = String(query.nodeId);
  }
  if (query.gatewayId) {
    queryParams.value.gatewayId = String(query.gatewayId);
  }
  if (query.entryType) {
    queryParams.value.entryType = query.entryType as InboundEntryType;
  }
  if (query.didNumber) {
    queryParams.value.didNumber = String(query.didNumber);
  }
  if (query.openCreate !== 'true') {
    return;
  }
  reset();
  form.value.nodeId = query.nodeId ? String(query.nodeId) : undefined;
  form.value.gatewayId = query.gatewayId ? String(query.gatewayId) : undefined;
  form.value.entryType = (query.entryType as InboundEntryType) || 'DID';
  form.value.entryName = query.entryName ? String(query.entryName) : '';
  form.value.didNumber = query.didNumber ? String(query.didNumber) : '';
  entryDrawer.title = '新增呼入路由';
  entryDrawer.visible = true;
};

const submitForm = async () => {
  await formRef.value?.validate();
  submitting.value = true;
  try {
    if (form.value.id) {
      await updateInboundDidEntry(form.value);
      proxy?.$modal.msgSuccess('修改成功');
    } else {
      await createInboundDidEntry(form.value);
      proxy?.$modal.msgSuccess('新增成功');
    }
    entryDrawer.visible = false;
    getList();
  } finally {
    submitting.value = false;
  }
};

const handleDelete = async (row: InboundDidEntryVO) => {
  await proxy?.$modal.confirm(`确认删除入口“${row.entryName}”吗？`);
  await deleteInboundDidEntry(row.id);
  proxy?.$modal.msgSuccess('删除成功');
  getList();
};

const openTestDrawer = () => {
  resetTestForm();
  testDrawer.visible = true;
};

const handleTestNodeChange = () => {
  testForm.gatewayId = undefined;
};

const resetTestForm = () => {
  testForm.nodeId = undefined;
  testForm.gatewayId = undefined;
  testForm.callerNumber = '';
  testForm.calledNumber = '';
  testForm.portCode = '';
  testForm.accountCode = '';
  testForm.headerName = '';
  testForm.headerValue = '';
  testResult.value = undefined;
};

const handleRouteTest = async () => {
  if (!testForm.nodeId) {
    proxy?.$modal.msgWarning('请先选择 FreeSWITCH 节点');
    return;
  }
  testing.value = true;
  try {
    const res = await testInboundRoute(testForm);
    testResult.value = res.data;
  } finally {
    testing.value = false;
  }
};

onMounted(async () => {
  await loadOptions();
  openCreateFromQuery();
  getList();
});
</script>

<style scoped>
.inbound-did-page {
  min-height: 100%;
}

.query-form :deep(.el-form-item) {
  margin-bottom: 12px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.card-title {
  color: #003f78;
  font-size: 18px;
  font-weight: 700;
}

.card-subtitle {
  color: #7a8799;
  font-size: 13px;
  line-height: 1.6;
}

.header-actions {
  display: flex;
  flex-shrink: 0;
  gap: 8px;
}

.target-option-extra {
  float: right;
  color: #8a96a8;
  font-size: 12px;
}

.form-tip {
  margin-top: 6px;
  color: #8a96a8;
  font-size: 12px;
  line-height: 1.5;
}
</style>
