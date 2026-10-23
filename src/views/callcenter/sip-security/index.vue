<template>
  <div class="p-2 sip-security-page">
    <el-card shadow="never">
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <el-tab-pane label="安全事件" name="events">
          <el-form :model="eventQuery" inline class="compact-form">
            <el-form-item label="节点"><node-select v-model="eventQuery.nodeId" /></el-form-item>
            <el-form-item label="分机"><el-input v-model="eventQuery.extension" clearable placeholder="分机号" /></el-form-item>
            <el-form-item label="来源IP"><el-input v-model="eventQuery.sourceIp" clearable placeholder="IP地址" /></el-form-item>
            <el-form-item label="结果">
              <el-select v-model="eventQuery.result" clearable placeholder="全部" style="width: 110px">
                <el-option label="成功" value="SUCCESS" /><el-option label="失败" value="FAILURE" /><el-option label="已拦截" value="BLOCKED" />
              </el-select>
            </el-form-item>
            <el-form-item label="时间">
              <el-date-picker
                v-model="eventTimeRange"
                type="datetimerange"
                value-format="YYYY-MM-DD HH:mm:ss"
                range-separator="至"
                start-placeholder="开始时间"
                end-placeholder="结束时间"
                style="width: 330px"
              />
            </el-form-item>
            <el-form-item
              ><el-button type="primary" icon="Search" @click="loadEvents">查询</el-button
              ><el-button icon="Refresh" @click="resetEvents">重置</el-button></el-form-item
            >
          </el-form>
          <el-table v-loading="eventLoading" :data="eventRows">
            <el-table-column label="时间" prop="occurredAt" width="168" />
            <el-table-column label="节点" min-width="125"
              ><template #default="{ row }">{{ nodeName(row.nodeId) }}</template></el-table-column
            >
            <el-table-column label="分机/鉴权名" min-width="145"
              ><template #default="{ row }">{{ row.extensionSnapshot || row.authUsernameSnapshot || '未知账号' }}</template></el-table-column
            >
            <el-table-column label="来源" min-width="165"
              ><template #default="{ row }">{{ sourceLabel(row) }}</template></el-table-column
            >
            <el-table-column label="结果" width="90" align="center"
              ><template #default="{ row }"
                ><el-tag :type="resultType(row.result)">{{ resultLabel(row.result) }}</el-tag></template
              ></el-table-column
            >
            <el-table-column label="风险" width="90" align="center"
              ><template #default="{ row }"
                ><el-tag :type="riskType(row.riskLevel)" effect="plain">{{ riskLabel(row.riskLevel) }}</el-tag></template
              ></el-table-column
            >
            <el-table-column label="原因" prop="reasonCode" min-width="160"
              ><template #default="{ row }">{{ row.reasonCode || '-' }}</template></el-table-column
            >
            <el-table-column label="终端" prop="userAgent" min-width="180" show-overflow-tooltip />
          </el-table>
          <pagination
            v-show="eventTotal > 0"
            v-model:page="eventQuery.pageNum"
            v-model:limit="eventQuery.pageSize"
            :total="eventTotal"
            @pagination="loadEvents"
          />
        </el-tab-pane>

        <el-tab-pane label="当前封禁" name="blocks">
          <el-form :model="blockQuery" inline class="compact-form">
            <el-form-item label="节点"><node-select v-model="blockQuery.nodeId" /></el-form-item>
            <el-form-item label="对象">
              <el-select v-model="blockQuery.blockType" clearable placeholder="全部" style="width: 140px">
                <el-option label="来源IP" value="IP" /><el-option label="分机" value="ACCOUNT" /><el-option label="IP+分机" value="IP_ACCOUNT" />
              </el-select>
            </el-form-item>
            <el-form-item label="来源IP"><el-input v-model="blockQuery.sourceIp" clearable placeholder="IP地址" /></el-form-item>
            <el-form-item label="状态">
              <el-select v-model="blockQuery.status" clearable placeholder="全部" style="width: 120px">
                <el-option label="生效中" value="ACTIVE" /><el-option label="已到期" value="EXPIRED" /><el-option label="已解除" value="RELEASED" />
              </el-select>
            </el-form-item>
            <el-form-item><el-button type="primary" icon="Search" @click="loadBlocks">查询</el-button></el-form-item>
          </el-form>
          <el-table v-loading="blockLoading" :data="blockRows">
            <el-table-column label="封禁时间" prop="blockedAt" width="168" />
            <el-table-column label="节点" min-width="130"
              ><template #default="{ row }">{{ nodeName(row.nodeId) }}</template></el-table-column
            >
            <el-table-column label="封禁对象" width="105"
              ><template #default="{ row }">{{ blockTypeLabel(row.blockType) }}</template></el-table-column
            >
            <el-table-column label="来源IP" prop="sourceIp" min-width="145"
              ><template #default="{ row }">{{ row.sourceIp || '-' }}</template></el-table-column
            >
            <el-table-column label="分机ID" prop="sipAccountId" min-width="125"
              ><template #default="{ row }">{{ row.sipAccountId || '-' }}</template></el-table-column
            >
            <el-table-column label="触发次数" prop="triggerCount" width="90" align="center" />
            <el-table-column label="截止时间" prop="expiresAt" width="168"
              ><template #default="{ row }">{{ row.expiresAt || '手工锁定' }}</template></el-table-column
            >
            <el-table-column label="节点执行" width="105"
              ><template #default="{ row }"
                ><el-tag :type="executionType(row.executionStatus)" effect="plain">{{ executionLabel(row.executionStatus) }}</el-tag></template
              ></el-table-column
            >
            <el-table-column label="原因" prop="reasonDetail" min-width="220" show-overflow-tooltip />
            <el-table-column label="操作" width="90" fixed="right"
              ><template #default="{ row }"
                ><el-button v-if="row.status === 'ACTIVE'" v-hasPermi="['callcenter:sip-security:unblock']" link type="primary" @click="release(row)"
                  >解除</el-button
                ><span v-else>-</span></template
              ></el-table-column
            >
          </el-table>
          <pagination
            v-show="blockTotal > 0"
            v-model:page="blockQuery.pageNum"
            v-model:limit="blockQuery.pageSize"
            :total="blockTotal"
            @pagination="loadBlocks"
          />
        </el-tab-pane>

        <el-tab-pane label="策略配置" name="policy">
          <el-alert
            title="节点策略优先于租户默认策略；节点没有独立策略时自动继承默认策略。0 表示租户默认策略。"
            type="info"
            show-icon
            :closable="false"
            class="mb-3"
          />
          <el-form ref="policyFormRef" :model="policy" label-position="top" class="policy-form">
            <section class="policy-section">
              <div class="section-heading">
                <span class="section-title">基础设置</span>
                <span class="section-description">选择策略生效范围，并控制拦截与告警状态</span>
              </div>
              <div class="policy-basic-grid">
                <el-form-item label="策略范围" class="scope-field">
                  <node-select v-model="policy.nodeId" :include-default="true" @change="loadPolicy" />
                </el-form-item>
                <div class="switch-field">
                  <div>
                    <div class="field-title">启用策略</div>
                    <div class="field-description">关闭后仅记录事件，不执行自动封禁</div>
                  </div>
                  <el-switch v-model="policy.enabled" />
                </div>
                <div class="switch-field">
                  <div>
                    <div class="field-title">安全告警</div>
                    <div class="field-description">达到风险条件时发送系统告警</div>
                  </div>
                  <el-switch v-model="policy.alertEnabled" />
                </div>
              </div>
            </section>

            <section class="policy-section">
              <div class="section-heading">
                <span class="section-title">失败判定</span>
                <span class="section-description">达到设定次数后自动封禁</span>
              </div>
              <div class="policy-rule-grid">
                <number-pair
                  label="IP + 分机"
                  description="同一 IP 登录同一分机失败"
                  v-model:window="policy.pairWindowSeconds"
                  v-model:threshold="policy.pairFailureThreshold"
                />
                <number-pair
                  label="分机 + 多 IP"
                  description="同一分机从多个 IP 登录失败"
                  v-model:window="policy.accountWindowSeconds"
                  v-model:threshold="policy.accountFailureThreshold"
                />
                <number-pair
                  label="IP + 多分机"
                  description="同一 IP 登录多个分机失败"
                  v-model:window="policy.ipWindowSeconds"
                  v-model:threshold="policy.ipFailureThreshold"
                />
              </div>
            </section>

            <section class="policy-section">
              <div class="section-heading">
                <span class="section-title">阶梯封禁</span>
                <span class="section-description">同一对象重复触发时逐步延长封禁时间</span>
              </div>
              <div class="block-duration-grid">
                <el-form-item label="首次触发">
                  <div class="duration-input"><el-input-number v-model="policy.firstBlockSeconds" :min="60" :max="2592000" /><span>秒</span></div>
                </el-form-item>
                <el-form-item label="第二次触发">
                  <div class="duration-input"><el-input-number v-model="policy.secondBlockSeconds" :min="60" :max="2592000" /><span>秒</span></div>
                </el-form-item>
                <el-form-item label="多次触发">
                  <div class="duration-input"><el-input-number v-model="policy.repeatedBlockSeconds" :min="60" :max="2592000" /><span>秒</span></div>
                </el-form-item>
              </div>
            </section>
            <div class="policy-actions">
              <el-button v-hasPermi="['callcenter:sip-security:policy']" type="primary" :loading="policySaving" @click="savePolicy"
                >保存策略</el-button
              >
            </div>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="IP访问规则" name="acl">
          <el-empty description="长期白名单和黑名单统一使用现有的访问控制 ACL，避免两套规则冲突。">
            <el-button v-hasPermi="['callcenter:freeswitch-acl:list']" type="primary" @click="openAclManagement">打开访问控制 ACL</el-button>
          </el-empty>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup lang="ts" name="SipSecurity">
import { defineComponent, h } from 'vue';
import { ElInputNumber, ElOption, ElSelect } from 'element-plus';
import { useRouter } from 'vue-router';
import { listFreeSwitchNodes } from '@/api/callcenter/freeswitch-node';
import type { FreeSwitchNodeVO } from '@/api/callcenter/freeswitch-node/types';
import {
  getEffectiveSipSecurityPolicy,
  listSipSecurityBlocks,
  listSipSecurityEvents,
  releaseSipSecurityBlock,
  saveSipSecurityPolicy
} from '@/api/callcenter/sip-security';
import type {
  SipSecurityBlockQuery,
  SipSecurityBlockVO,
  SipSecurityEventQuery,
  SipSecurityEventVO,
  SipSecurityPolicyVO
} from '@/api/callcenter/sip-security/types';

type TagType = 'primary' | 'success' | 'warning' | 'danger' | 'info';

const router = useRouter();
const { proxy } = getCurrentInstance() as ComponentInternalInstance;
const nodes = ref<FreeSwitchNodeVO[]>([]);
const activeTab = ref('events');
const eventLoading = ref(false);
const blockLoading = ref(false);
const policySaving = ref(false);
const eventRows = ref<SipSecurityEventVO[]>([]);
const blockRows = ref<SipSecurityBlockVO[]>([]);
const eventTotal = ref(0);
const blockTotal = ref(0);
const eventTimeRange = ref<[string, string]>();
const eventQuery = reactive<SipSecurityEventQuery>({ pageNum: 1, pageSize: 10 });
const blockQuery = reactive<SipSecurityBlockQuery>({ pageNum: 1, pageSize: 10, status: 'ACTIVE' });
const policy = reactive<SipSecurityPolicyVO>(defaultPolicy());

const NodeSelect = defineComponent({
  props: { modelValue: [String, Number], includeDefault: Boolean },
  emits: ['update:modelValue', 'change'],
  setup(props, { emit }) {
    return () =>
      h(
        ElSelect,
        {
          modelValue: props.modelValue,
          clearable: !props.includeDefault,
          filterable: true,
          placeholder: '全部节点',
          style: 'width: 100%',
          'onUpdate:modelValue': (value: string | number) => emit('update:modelValue', value),
          onChange: (value: string | number) => emit('change', value)
        },
        () => [
          props.includeDefault ? h(ElOption, { label: '租户默认策略', value: 0 }) : null,
          ...nodes.value.map((node) => h(ElOption, { label: node.nodeName, value: node.id, key: node.id }))
        ]
      );
  }
});

const NumberPair = defineComponent({
  props: { label: String, description: String, window: Number, threshold: Number },
  emits: ['update:window', 'update:threshold'],
  setup(props, { emit }) {
    return () =>
      h('div', { class: 'rule-card' }, [
        h('div', { class: 'rule-title' }, props.label),
        h('div', { class: 'rule-description' }, props.description),
        h('div', { class: 'number-pair' }, [
          h('div', { class: 'number-field' }, [
            h('span', { class: 'number-label' }, '时间窗口'),
            h('div', { class: 'number-input' }, [
              h(ElInputNumber, {
                modelValue: props.window,
                min: 10,
                max: 86400,
                controlsPosition: 'right',
                'onUpdate:modelValue': (value: number) => emit('update:window', value)
              }),
              h('span', '秒')
            ])
          ]),
          h('div', { class: 'number-field' }, [
            h('span', { class: 'number-label' }, '失败次数'),
            h('div', { class: 'number-input' }, [
              h(ElInputNumber, {
                modelValue: props.threshold,
                min: 2,
                max: 10000,
                controlsPosition: 'right',
                'onUpdate:modelValue': (value: number) => emit('update:threshold', value)
              }),
              h('span', '次')
            ])
          ])
        ])
      ]);
  }
});

function defaultPolicy(): SipSecurityPolicyVO {
  return {
    nodeId: 0,
    enabled: true,
    pairWindowSeconds: 60,
    pairFailureThreshold: 5,
    accountWindowSeconds: 600,
    accountFailureThreshold: 10,
    ipWindowSeconds: 300,
    ipFailureThreshold: 20,
    firstBlockSeconds: 600,
    secondBlockSeconds: 1800,
    repeatedBlockSeconds: 86400,
    alertEnabled: true,
    version: 0
  };
}

const nodeName = (id: string | number) => nodes.value.find((item) => String(item.id) === String(id))?.nodeName || String(id);
const sourceLabel = (row: SipSecurityEventVO) => (row.sourceIp ? `${row.sourceIp}${row.sourcePort ? `:${row.sourcePort}` : ''}` : '-');
const resultLabel = (value: string) => ({ SUCCESS: '成功', FAILURE: '失败', BLOCKED: '已拦截' })[value] || value;
const resultType = (value: string): TagType =>
  (({ SUCCESS: 'success', FAILURE: 'danger', BLOCKED: 'warning' }) as Record<string, TagType>)[value] || 'info';
const riskLabel = (value: string) => ({ LOW: '低', MEDIUM: '中', HIGH: '高', CRITICAL: '严重' })[value] || value;
const riskType = (value: string): TagType =>
  (({ LOW: 'info', MEDIUM: 'warning', HIGH: 'danger', CRITICAL: 'danger' }) as Record<string, TagType>)[value] || 'info';
const blockTypeLabel = (value: string) => ({ IP: '来源IP', ACCOUNT: '分机', IP_ACCOUNT: 'IP+分机' })[value] || value;
const executionLabel = (value?: string) =>
  ({ PENDING: '待下发', PROCESSING: '执行中', SUCCESS: '已执行', FAILED: '失败', NOT_REQUIRED: '应用拦截' })[value || ''] || '-';
const executionType = (value?: string): TagType =>
  (({ PENDING: 'warning', PROCESSING: 'primary', SUCCESS: 'success', FAILED: 'danger', NOT_REQUIRED: 'info' }) as Record<string, TagType>)[
    value || ''
  ] || 'info';

async function loadEvents() {
  eventLoading.value = true;
  try {
    eventQuery.beginTime = eventTimeRange.value?.[0];
    eventQuery.endTime = eventTimeRange.value?.[1];
    const res = await listSipSecurityEvents(eventQuery);
    eventRows.value = res.rows;
    eventTotal.value = res.total;
  } finally {
    eventLoading.value = false;
  }
}
async function loadBlocks() {
  blockLoading.value = true;
  try {
    const res = await listSipSecurityBlocks(blockQuery);
    blockRows.value = res.rows;
    blockTotal.value = res.total;
  } finally {
    blockLoading.value = false;
  }
}
async function loadPolicy() {
  const res = await getEffectiveSipSecurityPolicy(policy.nodeId || 0);
  Object.assign(policy, res.data, { nodeId: policy.nodeId || 0 });
}
async function savePolicy() {
  if (policy.secondBlockSeconds < policy.firstBlockSeconds || policy.repeatedBlockSeconds < policy.secondBlockSeconds) {
    proxy?.$modal.msgError('阶梯封禁时间必须依次递增');
    return;
  }
  policySaving.value = true;
  try {
    await saveSipSecurityPolicy(policy);
    proxy?.$modal.msgSuccess('策略已保存');
    await loadPolicy();
  } finally {
    policySaving.value = false;
  }
}
async function release(row: SipSecurityBlockVO) {
  const { value } = await ElMessageBox.prompt('请输入解除原因', '解除封禁', {
    inputValue: '管理员确认解除',
    inputPattern: /\S+/,
    inputErrorMessage: '请输入解除原因'
  });
  await releaseSipSecurityBlock(row.id, value);
  proxy?.$modal.msgSuccess('已解除封禁');
  await loadBlocks();
}
function resetEvents() {
  Object.assign(eventQuery, {
    pageNum: 1,
    pageSize: 10,
    nodeId: undefined,
    extension: undefined,
    sourceIp: undefined,
    result: undefined,
    riskLevel: undefined,
    beginTime: undefined,
    endTime: undefined
  });
  eventTimeRange.value = undefined;
  loadEvents();
}
function handleTabChange(name: string | number) {
  if (name === 'events') loadEvents();
  else if (name === 'blocks') loadBlocks();
  else if (name === 'policy') loadPolicy();
}
function openAclManagement() {
  const aclRoute = router.getRoutes().find((item) => item.path.endsWith('/freeswitch-acl'));
  if (!aclRoute) {
    proxy?.$modal.msgError('当前账号未加载“访问控制ACL”菜单，请检查角色菜单授权');
    return;
  }
  void router.push({ path: aclRoute.path });
}

onMounted(async () => {
  const res = await listFreeSwitchNodes({ pageNum: 1, pageSize: 1000 });
  nodes.value = res.rows;
  await loadEvents();
});
</script>

<style scoped>
.sip-security-page :deep(.el-card__body) {
  padding: 14px 16px;
}
.compact-form {
  margin-bottom: 4px;
}
.policy-form {
  max-width: 1240px;
  margin: 0 auto;
}
.policy-section {
  margin-bottom: 16px;
  padding: 18px 20px 4px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-fill-color-blank);
}
.section-heading {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 16px;
}
.section-title {
  padding-left: 9px;
  border-left: 3px solid var(--el-color-primary);
  font-size: 15px;
  font-weight: 600;
  line-height: 18px;
}
.section-description,
.field-description {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.policy-basic-grid {
  display: grid;
  grid-template-columns: minmax(260px, 1.2fr) repeat(2, minmax(220px, 1fr));
  gap: 16px;
}
.scope-field {
  margin-bottom: 14px;
}
.switch-field {
  display: flex;
  min-height: 64px;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 14px;
  padding: 8px 14px;
  border-radius: 6px;
  background: var(--el-fill-color-light);
}
.field-title {
  margin-bottom: 4px;
  color: var(--el-text-color-primary);
  font-weight: 600;
}
.rule-card :deep(.rule-title) {
  margin-bottom: 3px;
  color: var(--el-text-color-primary);
  font-size: 13px;
  font-weight: 600;
}
.rule-card :deep(.rule-description) {
  color: var(--el-text-color-secondary);
  font-size: 11px;
}
.policy-rule-grid,
.block-duration-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}
.rule-card {
  min-width: 0;
  margin-bottom: 16px;
  padding: 16px;
  border-radius: 7px;
  background: var(--el-fill-color-light);
}
.rule-card :deep(.number-pair) {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  margin-top: 12px;
}
.rule-card :deep(.number-field) {
  min-width: 0;
}
.rule-card :deep(.number-label) {
  display: block;
  margin-bottom: 5px;
  color: var(--el-text-color-regular);
  font-size: 11px;
}
.rule-card :deep(.number-input),
.duration-input {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}
.rule-card :deep(.number-input .el-input-number) {
  width: 100%;
}
.duration-input :deep(.el-input-number) {
  width: min(180px, calc(100% - 28px));
}
.policy-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 2px;
}
@media (max-width: 1100px) {
  .policy-basic-grid,
  .policy-rule-grid,
  .block-duration-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 720px) {
  .policy-section {
    padding: 16px 14px 2px;
  }
  .section-heading {
    align-items: flex-start;
    flex-direction: column;
    gap: 6px;
  }
  .policy-basic-grid,
  .policy-rule-grid,
  .block-duration-grid {
    grid-template-columns: 1fr;
  }
  .rule-card :deep(.number-pair) {
    grid-template-columns: 1fr;
  }
}
</style>
