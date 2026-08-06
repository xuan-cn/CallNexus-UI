<template>
  <div class="p-2 openapi-page">
    <el-card shadow="hover">
      <template #header>
        <div class="page-header">
          <div>
            <div class="page-title">开放接口应用</div>
            <div class="page-description">为第三方系统分配独立凭证、接口权限、来源 IP 和可用外呼线路。</div>
          </div>
          <div class="header-actions">
            <el-button icon="Refresh" @click="loadApplications">刷新</el-button>
            <el-button v-hasPermi="['callcenter:openapi-application:create']" type="primary" icon="Plus" @click="openCreate"> 新增应用 </el-button>
          </div>
        </div>
      </template>

      <el-alert
        type="info"
        :closable="false"
        show-icon
        title="第三方使用 Client ID 和 Client Secret 换取访问令牌；密钥只在创建或轮换时展示一次。"
        class="mb-4"
      />

      <el-table v-loading="loading" :data="applications" row-key="id">
        <el-table-column label="应用" min-width="230">
          <template #default="{ row }">
            <div class="application-cell">
              <strong>{{ row.appName }}</strong>
              <span>{{ row.appCode }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '停用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="接口权限" min-width="320">
          <template #default="{ row }">
            <div class="compact-tags">
              <el-tag v-for="scope in row.scopes.slice(0, 4)" :key="scope" effect="plain">{{ scopeLabel(scope) }}</el-tag>
              <el-popover v-if="row.scopes.length > 4" placement="bottom-start" :width="520" trigger="click">
                <template #reference>
                  <el-button link type="primary" class="all-scopes-button">查看全部 {{ row.scopes.length }} 项</el-button>
                </template>
                <div class="all-scopes-panel">
                  <div class="all-scopes-title">已授权接口权限（{{ row.scopes.length }} 项）</div>
                  <div v-for="group in applicationScopeGroups(row.scopes)" :key="group.key" class="all-scopes-group">
                    <span class="all-scopes-group-name">{{ group.label }}</span>
                    <div class="all-scopes-tags">
                      <el-tag v-for="scope in group.scopes" :key="scope" effect="plain">{{ scopeLabel(scope) }}</el-tag>
                    </div>
                  </div>
                </div>
              </el-popover>
              <span v-if="!row.scopes.length" class="empty-value">未授权</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="访问控制" min-width="190">
          <template #default="{ row }">
            <div class="metric-lines">
              <span>IP 白名单 {{ enabledIpCount(row) }} 条</span>
              <span>线路授权 {{ row.routePolicyCodes.length }} 条</span>
              <span>事件订阅 {{ row.eventTypes?.length || 0 }} 项</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="限流" min-width="180">
          <template #default="{ row }">
            <div class="metric-lines">
              <span>{{ row.requestsPerMinute }} 次/分钟</span>
              <span>通话并发 {{ row.maxConcurrentCalls }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="Token 有效期" width="135">
          <template #default="{ row }">{{ formatDuration(row.tokenTtlSeconds) }}</template>
        </el-table-column>
        <el-table-column label="创建时间" prop="createTime" width="170" />
        <el-table-column label="操作" width="225" fixed="right">
          <template #default="{ row }">
            <div class="operation-actions">
              <el-button v-hasPermi="['callcenter:openapi-application:credential']" link type="primary" @click="openCredentials(row)">
                凭证
              </el-button>
              <el-button v-hasPermi="['callcenter:openapi-application:update']" link type="primary" @click="openUpdate(row)"> 修改 </el-button>
              <el-button v-hasPermi="['callcenter:openapi-application:delete']" link type="danger" @click="removeApplication(row)"> 删除 </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!loading && !applications.length" description="暂无开放应用" />
    </el-card>

    <el-drawer v-model="applicationDrawer.visible" :title="applicationDrawer.title" size="960px" append-to-body destroy-on-close>
      <el-form ref="applicationFormRef" :model="applicationForm" :rules="applicationRules" label-width="115px">
        <el-tabs v-model="applicationTab" class="application-tabs">
          <el-tab-pane label="基础配置" name="basic">
            <div class="config-panel">
              <el-row :gutter="18">
                <el-col :span="12">
                  <el-form-item label="应用编码" prop="appCode">
                    <el-input v-model="applicationForm.appCode" :disabled="!!editingId" placeholder="例如 CRM_INTEGRATION" />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="应用名称" prop="appName">
                    <el-input v-model="applicationForm.appName" placeholder="例如 CRM 客户中心" />
                  </el-form-item>
                </el-col>
                <el-col :span="8">
                  <el-form-item label="Token 有效期" prop="tokenTtlSeconds">
                    <el-input-number v-model="applicationForm.tokenTtlSeconds" :min="300" :max="86400" :step="300" controls-position="right" />
                  </el-form-item>
                </el-col>
                <el-col :span="8">
                  <el-form-item label="每分钟请求" prop="requestsPerMinute">
                    <el-input-number v-model="applicationForm.requestsPerMinute" :min="1" :max="100000" controls-position="right" />
                  </el-form-item>
                </el-col>
                <el-col :span="8">
                  <el-form-item label="通话并发" prop="maxConcurrentCalls">
                    <el-input-number v-model="applicationForm.maxConcurrentCalls" :min="1" :max="10000" controls-position="right" />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="状态">
                    <el-switch v-model="applicationForm.enabled" active-text="启用" inactive-text="停用" />
                  </el-form-item>
                </el-col>
                <el-col :span="24">
                  <el-form-item label="说明">
                    <el-input v-model="applicationForm.description" type="textarea" :rows="3" maxlength="500" show-word-limit />
                  </el-form-item>
                </el-col>
              </el-row>
            </div>
          </el-tab-pane>

          <el-tab-pane label="权限与线路" name="permission">
            <div class="config-panel">
              <div class="panel-heading">
                <div><strong>接口权限</strong><span>按业务能力授权第三方应用可调用的接口</span></div>
              </div>
              <el-form-item prop="scopes" label-width="0">
                <div class="scope-groups">
                  <div v-for="group in scopeGroups" :key="group.key" class="scope-group">
                    <div class="scope-group-header">
                      <strong>{{ group.label }}</strong>
                      <el-checkbox
                        :model-value="isScopeGroupChecked(group.scopes)"
                        :indeterminate="isScopeGroupIndeterminate(group.scopes)"
                        @change="toggleScopeGroup(group.scopes, Boolean($event))"
                        >全选</el-checkbox
                      >
                    </div>
                    <el-checkbox-group v-model="applicationForm.scopes" class="scope-options">
                      <el-checkbox v-for="scope in group.scopes" :key="scope" :value="scope">{{ scopeLabel(scope) }}</el-checkbox>
                    </el-checkbox-group>
                  </div>
                </div>
              </el-form-item>
              <el-divider />
              <div class="panel-heading">
                <div><strong>外呼线路授权</strong><span>未授权线路策略时，该应用不能发起外呼</span></div>
              </div>
              <el-form-item label="允许策略">
                <el-select
                  v-model="applicationForm.routePolicyCodes"
                  multiple
                  clearable
                  filterable
                  collapse-tags
                  collapse-tags-tooltip
                  style="width: 100%"
                >
                  <el-option
                    v-for="policy in outboundPolicies"
                    :key="policy.id"
                    :label="`${policy.policyName} (${policy.policyCode})`"
                    :value="policy.policyCode"
                    :disabled="!policy.enabled"
                  />
                </el-select>
              </el-form-item>
            </div>
          </el-tab-pane>

          <el-tab-pane label="事件推送" name="event">
            <div class="config-panel">
              <div class="delivery-methods">
                <div class="delivery-method">
                  <div><strong>WebSocket 实时事件</strong><span>适合实时更新第三方界面的通话状态</span></div>
                  <div class="delivery-switch">
                    <span>{{ applicationForm.websocketEnabled ? '启用' : '停用' }}</span>
                    <el-switch v-model="applicationForm.websocketEnabled" />
                  </div>
                </div>
                <div class="delivery-method">
                  <div><strong>Webhook 可靠回调</strong><span>适合接收通话结束、录音和转写等业务结果</span></div>
                  <div class="delivery-switch">
                    <span>{{ applicationForm.webhookEnabled ? '启用' : '停用' }}</span>
                    <el-switch v-model="applicationForm.webhookEnabled" />
                  </div>
                </div>
              </div>
              <el-row v-if="applicationForm.webhookEnabled" :gutter="18" class="webhook-fields">
                <el-col :span="24">
                  <el-form-item label="回调地址">
                    <el-input v-model="applicationForm.webhookUrl" placeholder="https://crm.example.com/callnexus/events" />
                  </el-form-item>
                </el-col>
                <el-col :span="24">
                  <el-form-item label="签名密钥">
                    <el-input
                      v-model="applicationForm.webhookSecret"
                      type="password"
                      show-password
                      :placeholder="editingId ? '留空表示不修改' : '请输入至少 16 位随机密钥'"
                    />
                  </el-form-item>
                </el-col>
              </el-row>
              <div class="event-selection">
                <div class="panel-heading event-heading">
                  <div><strong>订阅事件</strong><span>WebSocket 与 Webhook 共用同一组事件订阅</span></div>
                  <div class="event-selection-actions">
                    <span>已选 {{ applicationForm.eventTypes.length }} / {{ availableEvents.length }}</span>
                    <el-checkbox
                      :model-value="allEventsChecked"
                      :indeterminate="eventSelectionIndeterminate"
                      @change="toggleAllEvents(Boolean($event))"
                      >全选</el-checkbox
                    >
                  </div>
                </div>
                <el-checkbox-group v-model="applicationForm.eventTypes" class="event-options">
                  <el-checkbox v-for="eventType in availableEvents" :key="eventType" :value="eventType">
                    {{ eventTypeLabel(eventType) }}
                  </el-checkbox>
                </el-checkbox-group>
              </div>
              <el-alert type="info" :closable="false" show-icon> WebSocket 断线后，可通过事件查询接口按 event_id 补拉，避免漏掉业务事件。 </el-alert>
            </div>
          </el-tab-pane>

          <el-tab-pane label="访问安全" name="security">
            <div class="config-panel">
              <div class="panel-heading section-with-action">
                <div><strong>来源 IP 白名单</strong><span>只允许可信的第三方服务出口 IP 调用开放接口</span></div>
                <el-button plain icon="Plus" @click="addIpRule">添加 IP</el-button>
              </div>
              <el-alert
                type="warning"
                :closable="false"
                show-icon
                class="mb-3"
                title="至少保留一条启用规则。支持单个 IP 或 CIDR，例如 203.0.113.10、10.0.0.0/24。"
              />
              <el-table :data="applicationForm.ipRules" border>
                <el-table-column label="IP / CIDR" min-width="260">
                  <template #default="{ row }"><el-input v-model="row.cidr" placeholder="203.0.113.10 或 10.0.0.0/24" /></template>
                </el-table-column>
                <el-table-column label="说明" min-width="220">
                  <template #default="{ row }"><el-input v-model="row.description" placeholder="第三方系统出口 IP" /></template>
                </el-table-column>
                <el-table-column label="启用" width="85">
                  <template #default="{ row }"><el-switch v-model="row.enabled" /></template>
                </el-table-column>
                <el-table-column label="操作" width="75">
                  <template #default="{ $index }">
                    <el-button link type="danger" @click="applicationForm.ipRules.splice($index, 1)">删除</el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </el-tab-pane>
        </el-tabs>
      </el-form>
      <template #footer>
        <el-button @click="applicationDrawer.visible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitApplication">保存</el-button>
      </template>
    </el-drawer>

    <el-drawer v-model="credentialDrawer.visible" :title="credentialDrawer.title" size="860px" append-to-body>
      <div class="credential-toolbar">
        <el-alert type="warning" :closable="false" show-icon title="Client Secret 不入库明文；丢失后只能轮换，无法找回。" />
        <el-button type="primary" icon="Plus" @click="openCredentialCreate">创建凭证</el-button>
      </div>
      <el-table v-loading="credentialLoading" :data="credentials" row-key="id">
        <el-table-column label="凭证名称" prop="credentialName" min-width="150" />
        <el-table-column label="Client ID" prop="clientId" min-width="245" show-overflow-tooltip />
        <el-table-column label="密钥提示" width="110">
          <template #default="{ row }">******{{ row.secretHint }}</template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }"
            ><el-tag :type="row.status === 'ACTIVE' ? 'success' : 'info'">{{ credentialStatusLabel(row.status) }}</el-tag></template
          >
        </el-table-column>
        <el-table-column label="失效时间" width="170">
          <template #default="{ row }">{{ row.expiresAt || '长期有效' }}</template>
        </el-table-column>
        <el-table-column label="最后使用" width="170">
          <template #default="{ row }">{{ row.lastUsedAt || '尚未使用' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status === 'ACTIVE'" link type="primary" @click="rotateCredential(row)">轮换</el-button>
            <el-button v-if="row.status === 'ACTIVE'" link type="danger" @click="revokeCredential(row)">撤销</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!credentialLoading && !credentials.length" description="暂无客户端凭证" />
    </el-drawer>

    <el-dialog v-model="credentialCreateDialog.visible" title="创建客户端凭证" width="520px" append-to-body>
      <el-form ref="credentialFormRef" :model="credentialForm" :rules="credentialRules" label-width="100px">
        <el-form-item label="凭证名称" prop="credentialName"
          ><el-input v-model="credentialForm.credentialName" placeholder="例如 CRM 生产环境"
        /></el-form-item>
        <el-form-item label="失效时间">
          <el-date-picker
            v-model="credentialForm.expiresAt"
            type="datetime"
            value-format="YYYY-MM-DDTHH:mm:ss"
            placeholder="留空表示长期有效"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="credentialCreateDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="credentialSubmitting" @click="submitCredential">创建</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="secretDialog.visible" title="请立即保存客户端密钥" width="680px" append-to-body :close-on-click-modal="false">
      <el-alert
        type="warning"
        :closable="false"
        show-icon
        :title="secretDialog.data?.warning || '关闭后将无法再次查看 Client Secret。'"
        class="mb-4"
      />
      <div class="secret-field">
        <span>Client ID</span>
        <el-input :model-value="secretDialog.data?.clientId" readonly>
          <template #append><el-button @click="copyValue(secretDialog.data?.clientId)">复制</el-button></template>
        </el-input>
      </div>
      <div class="secret-field">
        <span>Client Secret</span>
        <el-input :model-value="secretDialog.data?.clientSecret" type="textarea" :rows="3" readonly />
        <el-button class="copy-secret" type="primary" plain @click="copyValue(secretDialog.data?.clientSecret)">复制 Client Secret</el-button>
      </div>
      <template #footer><el-button type="primary" @click="secretDialog.visible = false">我已安全保存</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup name="OpenApiApplication" lang="ts">
import {
  createOpenApiApplication,
  createOpenApiCredential,
  deleteOpenApiApplication,
  getOpenApiApplication,
  listOpenApiApplications,
  listOpenApiCredentials,
  listOpenApiEvents,
  listOpenApiScopes,
  revokeOpenApiCredential,
  rotateOpenApiCredential,
  updateOpenApiApplication
} from '@/api/callcenter/openapi-application';
import type {
  OpenApiApplicationForm,
  OpenApiApplicationVO,
  OpenApiCredentialForm,
  OpenApiCredentialSecretVO,
  OpenApiCredentialVO
} from '@/api/callcenter/openapi-application/types';
import { listOutboundLinePolicies } from '@/api/callcenter/outbound-line-policy';
import type { OutboundLinePolicyVO } from '@/api/callcenter/outbound-line-policy/types';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;
const loading = ref(false);
const submitting = ref(false);
const applications = ref<OpenApiApplicationVO[]>([]);
const availableScopes = ref<string[]>([]);
const availableEvents = ref<string[]>([]);
const outboundPolicies = ref<OutboundLinePolicyVO[]>([]);
const editingId = ref<string | number>();
const applicationFormRef = ref<ElFormInstance>();
const credentialFormRef = ref<ElFormInstance>();
const applicationTab = ref('basic');
const applicationDrawer = reactive({ visible: false, title: '' });
const credentialDrawer = reactive({ visible: false, title: '', applicationId: undefined as string | number | undefined });
const credentialCreateDialog = reactive({ visible: false });
const secretDialog = reactive({ visible: false, data: undefined as OpenApiCredentialSecretVO | undefined });
const credentialLoading = ref(false);
const credentialSubmitting = ref(false);
const credentials = ref<OpenApiCredentialVO[]>([]);
const credentialForm = reactive<OpenApiCredentialForm>({ credentialName: '', expiresAt: undefined });
const applicationForm = reactive<OpenApiApplicationForm>(emptyApplicationForm());

const scopeLabels: Record<string, string> = {
  'agent.read': '读取坐席状态',
  'agent.signin': '坐席签入',
  'agent.signout': '坐席签出',
  'agent.status.write': '修改坐席状态',
  'call.read': '读取通话',
  'call.originate': '发起外呼',
  'call.answer': '接听通话',
  'call.hangup': '挂断通话',
  'call.hold': '保持与恢复',
  'call.mute': '静音与取消静音',
  'call.dtmf': '发送按键',
  'call.transfer': '盲转',
  'call.consult': '咨询转接',
  'call.conference': '咨询转会议',
  'dispatch.read': '读取调度资源',
  'dispatch.monitor': '监听',
  'dispatch.whisper': '耳语',
  'dispatch.barge': '强插',
  'dispatch.force_hangup': '强拆',
  'event.subscribe': '订阅实时事件'
};

const eventTypeLabels: Record<string, string> = {
  'call.ringing': '通话振铃',
  'call.answered': '通话接听',
  'call.bridged': '通话桥接',
  'call.unbridged': '通话解除桥接',
  'call.hangup': '通话挂断',
  'call.monitor.started': '监听已开始',
  'call.monitor.stopped': '监听已停止',
  'call.whisper.started': '耳语已开始',
  'call.whisper.stopped': '耳语已停止',
  'call.barge.started': '强插已开始',
  'call.barge.stopped': '强插已停止',
  'call.force_hangup': '强拆命令已提交',
  'conference.created': '会议创建',
  'conference.member_invited': '会议邀请成员',
  'conference.member_joined': '会议成员加入',
  'conference.member_muted': '会议成员静音',
  'conference.member_left': '会议成员离开',
  'conference.ended': '会议结束',
  'recording.ready': '录音就绪',
  'transcript.ready': '转写就绪',
  'transcript.failed': '转写失败'
};

const scopeGroupDefinitions = [
  { key: 'agent', label: '坐席控制', prefix: 'agent.' },
  { key: 'call', label: '通话控制', prefix: 'call.' },
  { key: 'dispatch', label: '调度控制', prefix: 'dispatch.' },
  { key: 'event', label: '事件订阅', prefix: 'event.' }
];

const scopeGroups = computed(() =>
  scopeGroupDefinitions
    .map((group) => ({ ...group, scopes: availableScopes.value.filter((scope) => scope.startsWith(group.prefix)) }))
    .filter((group) => group.scopes.length)
);

const allEventsChecked = computed(
  () => availableEvents.value.length > 0 && availableEvents.value.every((eventType) => applicationForm.eventTypes.includes(eventType))
);
const eventSelectionIndeterminate = computed(() => {
  const selectedCount = availableEvents.value.filter((eventType) => applicationForm.eventTypes.includes(eventType)).length;
  return selectedCount > 0 && selectedCount < availableEvents.value.length;
});

const applicationScopeGroups = (scopes: string[]) => {
  const knownScopes = new Set<string>();
  const groups = scopeGroupDefinitions
    .map((group) => {
      const groupScopes = scopes.filter((scope) => scope.startsWith(group.prefix));
      groupScopes.forEach((scope) => knownScopes.add(scope));
      return { key: group.key, label: group.label, scopes: groupScopes };
    })
    .filter((group) => group.scopes.length);
  const otherScopes = scopes.filter((scope) => !knownScopes.has(scope));
  if (otherScopes.length) groups.push({ key: 'other', label: '其他权限', scopes: otherScopes });
  return groups;
};

const applicationRules = {
  appCode: [
    { required: true, message: '请输入应用编码', trigger: 'blur' },
    { pattern: /^[A-Za-z][A-Za-z0-9_-]{1,63}$/, message: '以字母开头，仅支持字母、数字、下划线和横线', trigger: 'blur' }
  ],
  appName: [{ required: true, message: '请输入应用名称', trigger: 'blur' }],
  tokenTtlSeconds: [{ required: true, message: '请输入 Token 有效期', trigger: 'change' }],
  requestsPerMinute: [{ required: true, message: '请输入每分钟请求上限', trigger: 'change' }],
  maxConcurrentCalls: [{ required: true, message: '请输入通话并发上限', trigger: 'change' }],
  scopes: [{ type: 'array', required: true, min: 1, message: '请至少选择一个接口权限', trigger: 'change' }]
};
const credentialRules = { credentialName: [{ required: true, message: '请输入凭证名称', trigger: 'blur' }] };

function emptyApplicationForm(): OpenApiApplicationForm {
  return {
    appCode: '',
    appName: '',
    enabled: true,
    tokenTtlSeconds: 3600,
    requestsPerMinute: 600,
    maxConcurrentCalls: 10,
    websocketEnabled: true,
    webhookEnabled: false,
    webhookUrl: '',
    webhookSecret: '',
    eventTypes: ['call.ringing', 'call.answered', 'call.hangup'],
    description: '',
    scopes: [],
    ipRules: [{ cidr: '', description: '第三方系统出口 IP', enabled: true }],
    routePolicyCodes: []
  };
}

const scopeLabel = (scope: string) => scopeLabels[scope] || scope;
const eventTypeLabel = (eventType: string) => eventTypeLabels[eventType] || eventType;
const enabledIpCount = (row: OpenApiApplicationVO) => row.ipRules.filter((rule) => rule.enabled).length;
const credentialStatusLabel = (status: OpenApiCredentialVO['status']) => (status === 'ACTIVE' ? '有效' : '已撤销');
const formatDuration = (seconds: number) => {
  if (seconds % 3600 === 0) return `${seconds / 3600} 小时`;
  if (seconds % 60 === 0) return `${seconds / 60} 分钟`;
  return `${seconds} 秒`;
};

const loadApplications = async () => {
  loading.value = true;
  try {
    applications.value = (await listOpenApiApplications()).data || [];
  } finally {
    loading.value = false;
  }
};

const loadDependencies = async () => {
  const [scopeResponse, eventResponse, policyResponse] = await Promise.all([
    listOpenApiScopes(),
    listOpenApiEvents(),
    listOutboundLinePolicies({ pageNum: 1, pageSize: 1000 })
  ]);
  availableScopes.value = scopeResponse.data || [];
  availableEvents.value = eventResponse.data || [];
  outboundPolicies.value = policyResponse.rows || [];
};

const resetApplicationForm = () => Object.assign(applicationForm, emptyApplicationForm());
const openCreate = () => {
  editingId.value = undefined;
  resetApplicationForm();
  applicationTab.value = 'basic';
  applicationDrawer.title = '新增开放接口应用';
  applicationDrawer.visible = true;
};

const openUpdate = async (row: OpenApiApplicationVO) => {
  const data = (await getOpenApiApplication(row.id)).data;
  editingId.value = row.id;
  resetApplicationForm();
  Object.assign(applicationForm, data, {
    scopes: [...(data.scopes || [])],
    ipRules: (data.ipRules || []).map((rule) => ({ ...rule })),
    routePolicyCodes: [...(data.routePolicyCodes || [])],
    eventTypes: [...(data.eventTypes || [])],
    webhookSecret: ''
  });
  applicationTab.value = 'basic';
  applicationDrawer.title = '修改开放接口应用';
  applicationDrawer.visible = true;
};

const isScopeGroupChecked = (scopes: string[]) => scopes.length > 0 && scopes.every((scope) => applicationForm.scopes.includes(scope));
const isScopeGroupIndeterminate = (scopes: string[]) => {
  const count = scopes.filter((scope) => applicationForm.scopes.includes(scope)).length;
  return count > 0 && count < scopes.length;
};
const toggleScopeGroup = (scopes: string[], checked: boolean) => {
  const selected = new Set(applicationForm.scopes);
  scopes.forEach((scope) => (checked ? selected.add(scope) : selected.delete(scope)));
  applicationForm.scopes = [...selected];
};

const toggleAllEvents = (checked: boolean) => {
  applicationForm.eventTypes = checked ? [...availableEvents.value] : [];
};
const addIpRule = () => applicationForm.ipRules.push({ cidr: '', description: '', enabled: true });

const submitApplication = () =>
  applicationFormRef.value?.validate(async (valid) => {
    if (!valid) return;
    const rules = applicationForm.ipRules.filter((rule) => rule.cidr.trim());
    if (!rules.length || !rules.some((rule) => rule.enabled)) {
      proxy?.$modal.msgError('请至少配置一条启用的来源 IP 白名单');
      return;
    }
    if ((applicationForm.websocketEnabled || applicationForm.webhookEnabled) && !applicationForm.eventTypes.length) {
      proxy?.$modal.msgError('启用事件推送时，请至少选择一个订阅事件');
      return;
    }
    if (applicationForm.webhookEnabled && !applicationForm.webhookUrl?.trim()) {
      proxy?.$modal.msgError('请输入 Webhook 回调地址');
      return;
    }
    submitting.value = true;
    try {
      const payload: OpenApiApplicationForm = {
        ...applicationForm,
        scopes: [...applicationForm.scopes],
        ipRules: rules.map((rule) => ({ ...rule, cidr: rule.cidr.trim() })),
        routePolicyCodes: [...applicationForm.routePolicyCodes],
        eventTypes: [...applicationForm.eventTypes],
        webhookUrl: applicationForm.webhookUrl?.trim(),
        webhookSecret: applicationForm.webhookSecret?.trim()
      };
      if (editingId.value) await updateOpenApiApplication(editingId.value, payload);
      else await createOpenApiApplication(payload);
      proxy?.$modal.msgSuccess('保存成功');
      applicationDrawer.visible = false;
      await loadApplications();
    } finally {
      submitting.value = false;
    }
  });

const removeApplication = async (row: OpenApiApplicationVO) => {
  await proxy?.$modal.confirm(`确认删除开放应用“${row.appName}”吗？`);
  await deleteOpenApiApplication(row.id);
  proxy?.$modal.msgSuccess('删除成功');
  await loadApplications();
};

const loadCredentials = async () => {
  if (!credentialDrawer.applicationId) return;
  credentialLoading.value = true;
  try {
    credentials.value = (await listOpenApiCredentials(credentialDrawer.applicationId)).data || [];
  } finally {
    credentialLoading.value = false;
  }
};

const openCredentials = async (row: OpenApiApplicationVO) => {
  credentialDrawer.applicationId = row.id;
  credentialDrawer.title = `客户端凭证 - ${row.appName}`;
  credentialDrawer.visible = true;
  await loadCredentials();
};

const openCredentialCreate = () => {
  Object.assign(credentialForm, { credentialName: '', expiresAt: undefined });
  credentialCreateDialog.visible = true;
};

const showSecret = (data: OpenApiCredentialSecretVO) => {
  secretDialog.data = data;
  secretDialog.visible = true;
};

const submitCredential = () =>
  credentialFormRef.value?.validate(async (valid) => {
    if (!valid || !credentialDrawer.applicationId) return;
    credentialSubmitting.value = true;
    try {
      const data = (await createOpenApiCredential(credentialDrawer.applicationId, { ...credentialForm })).data;
      credentialCreateDialog.visible = false;
      showSecret(data);
      await loadCredentials();
    } finally {
      credentialSubmitting.value = false;
    }
  });

const rotateCredential = async (row: OpenApiCredentialVO) => {
  if (!credentialDrawer.applicationId) return;
  await proxy?.$modal.confirm(`轮换后旧密钥立即失效，确认轮换“${row.credentialName}”吗？`);
  const data = (await rotateOpenApiCredential(credentialDrawer.applicationId, row.id)).data;
  showSecret(data);
  await loadCredentials();
};

const revokeCredential = async (row: OpenApiCredentialVO) => {
  if (!credentialDrawer.applicationId) return;
  await proxy?.$modal.confirm(`撤销后使用方将无法换取 Token，确认撤销“${row.credentialName}”吗？`);
  await revokeOpenApiCredential(credentialDrawer.applicationId, row.id);
  proxy?.$modal.msgSuccess('凭证已撤销');
  await loadCredentials();
};

const copyValue = async (value?: string) => {
  if (!value) return;
  await navigator.clipboard.writeText(value);
  proxy?.$modal.msgSuccess('已复制');
};

onMounted(async () => {
  await Promise.all([loadApplications(), loadDependencies()]);
});
</script>

<style scoped lang="scss">
.page-header,
.credential-toolbar,
.section-with-action {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.page-title {
  color: var(--el-text-color-primary);
  font-size: 18px;
  font-weight: 600;
}

.page-description {
  margin-top: 5px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.header-actions,
.operation-actions {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 8px;
}

.compact-tags {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.all-scopes-button {
  height: 24px;
  padding: 0 2px;
}

.all-scopes-title {
  margin-bottom: 12px;
  color: var(--el-text-color-primary);
  font-weight: 600;
}

.all-scopes-group + .all-scopes-group {
  margin-top: 12px;
}

.all-scopes-group-name {
  display: block;
  margin-bottom: 7px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.all-scopes-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.empty-value {
  color: var(--el-text-color-placeholder);
  font-size: 13px;
}

.operation-actions :deep(.el-button + .el-button) {
  margin-left: 0;
}

.application-cell,
.metric-lines {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.application-cell span,
.metric-lines span {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.section-title {
  margin: 8px 0 16px;
  padding-left: 10px;
  border-left: 3px solid var(--el-color-primary);
  color: var(--el-text-color-primary);
  font-size: 16px;
  font-weight: 600;
}

.application-tabs :deep(.el-tabs__header) {
  margin-bottom: 18px;
}

.config-panel {
  min-height: 420px;
  padding: 18px 20px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 10px;
  background: var(--el-bg-color);
}

.panel-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  gap: 16px;
}

.panel-heading > div:first-child {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.panel-heading strong {
  color: var(--el-text-color-primary);
  font-size: 15px;
}

.panel-heading span {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.delivery-methods {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-bottom: 18px;
  gap: 14px;
}

.delivery-method {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  background: var(--el-fill-color-lighter);
  gap: 16px;
}

.delivery-method > div {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.delivery-method span {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.delivery-switch {
  display: flex;
  flex: 0 0 auto;
  flex-direction: row !important;
  align-items: center;
  min-width: 82px;
  gap: 10px !important;
}

.delivery-switch > span {
  min-width: 24px;
  color: var(--el-text-color-regular);
  text-align: right;
  white-space: nowrap;
}

.webhook-fields {
  padding-top: 18px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.event-selection {
  margin: 18px 0;
  padding: 16px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
}

.event-selection-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.event-selection-actions > span {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.scope-groups {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  width: 100%;
  gap: 12px;
}

.scope-group {
  padding: 14px 16px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  background: var(--el-fill-color-lighter);
}

.scope-group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.scope-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 12px;
}

.scope-options :deep(.el-checkbox) {
  margin-right: 0;
}

.event-options {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  width: 100%;
  gap: 10px 14px;
}

.event-options :deep(.el-checkbox) {
  margin-right: 0;
}

.credential-toolbar {
  margin-bottom: 16px;
}

.credential-toolbar .el-alert {
  flex: 1;
}

.secret-field + .secret-field {
  margin-top: 18px;
}

.secret-field > span {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
}

.copy-secret {
  width: 100%;
  margin-top: 10px;
}

@media (max-width: 900px) {
  .scope-groups,
  .delivery-methods {
    grid-template-columns: 1fr;
  }

  .event-options {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
