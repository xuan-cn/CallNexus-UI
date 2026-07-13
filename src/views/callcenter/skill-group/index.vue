<template>
  <div class="p-2">
    <el-card shadow="hover">
      <template #header>
        <div class="toolbar">
          <el-button v-hasPermi="['callcenter:skill-group:create']" type="primary" plain icon="Plus" @click="handleAdd">新增技能组</el-button>
          <el-button plain icon="Refresh" @click="load">刷新</el-button>
        </div>
      </template>

      <el-table v-loading="loading" :data="groups">
        <el-table-column label="技能组编码" prop="groupCode" min-width="150" />
        <el-table-column label="技能组名称" prop="groupName" min-width="170" />
        <el-table-column label="坐席数量" prop="memberCount" width="100" />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '停用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="备注" prop="remark" min-width="200" show-overflow-tooltip />
        <el-table-column label="操作" width="230" align="center" fixed="right">
          <template #default="{ row }">
            <el-button v-hasPermi="['callcenter:skill-group:update']" link type="primary" icon="Edit" @click="handleUpdate(row)">修改</el-button>
            <el-button link type="primary" icon="Connection" @click="openPolicyDialog(row)">外呼策略</el-button>
            <el-button v-hasPermi="['callcenter:skill-group:delete']" link type="danger" icon="Delete" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialog.visible" :title="dialog.title" width="620px" append-to-body>
      <el-alert class="mb-4" type="info" :closable="false" title="技能组决定哪些坐席可以接听关联队列的来电，也可以作为外呼线路策略的选择依据。" />
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="技能组编码" prop="groupCode">
          <el-input v-model="form.groupCode" placeholder="例如 SALES_SUPPORT" />
        </el-form-item>
        <el-form-item label="技能组名称" prop="groupName">
          <el-input v-model="form.groupName" />
        </el-form-item>
        <el-form-item label="成员坐席" prop="agentIds">
          <el-select v-model="form.agentIds" multiple filterable style="width: 100%">
            <el-option v-for="agent in agents" :key="agent.id" :label="agentLabel(agent)" :value="agent.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="form.enabled" active-text="启用" inactive-text="停用" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="3" maxlength="500" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog.visible = false">取消</el-button>
        <el-button type="primary" @click="submit">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="policyDialog.visible" :title="policyDialog.title" width="860px" append-to-body>
      <el-alert
        class="mb-4"
        type="info"
        :closable="false"
        title="配置后，该技能组坐席外呼会优先使用这里绑定的外呼线路策略；不配置时继续走节点默认策略。"
      />

      <el-form ref="policyFormRef" class="policy-form" :model="policyForm" :rules="policyRules" label-width="132px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="FreeSWITCH节点" prop="nodeId">
              <el-select v-model="policyForm.nodeId" filterable clearable style="width: 100%" @change="onPolicyNodeChange">
                <el-option v-for="node in nodes" :key="node.id" :label="node.nodeName" :value="node.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="外呼策略" prop="outboundLinePolicyId">
              <el-select v-model="policyForm.outboundLinePolicyId" filterable clearable style="width: 100%" :disabled="!policyForm.nodeId">
                <el-option v-for="policy in policyOptions" :key="policy.id" :label="policyLabel(policy)" :value="policy.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态">
              <el-switch v-model="policyForm.enabled" active-text="启用" inactive-text="停用" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label=" ">
              <el-button type="primary" icon="Check" @click="submitPolicyBinding">保存绑定</el-button>
              <el-button icon="RefreshLeft" @click="resetPolicyForm">清空</el-button>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="备注">
              <el-input v-model="policyForm.remark" type="textarea" :rows="2" maxlength="500" show-word-limit />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <el-table v-loading="policyDialog.loading" :data="policyBindings" border>
        <el-table-column label="节点" prop="nodeName" min-width="160" />
        <el-table-column label="外呼策略" min-width="220">
          <template #default="{ row }">
            {{ row.policyName || row.policyCode || row.outboundLinePolicyId }}
            <el-tag v-if="row.policyType" class="ml-2" effect="plain">{{ policyTypeLabel(row.policyType) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '停用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="备注" prop="remark" min-width="180" show-overflow-tooltip />
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="editPolicyBinding(row)">修改</el-button>
            <el-button link type="danger" @click="removePolicyBinding(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup name="SkillGroup" lang="ts">
import { createSkillGroup, deleteSkillGroup, getSkillGroup, listSkillGroups, updateSkillGroup } from '@/api/callcenter/skill-group';
import type { SkillGroupForm, SkillGroupVO } from '@/api/callcenter/skill-group/types';
import { listAgents } from '@/api/callcenter/agent';
import type { AgentVO } from '@/api/callcenter/agent/types';
import { listFreeSwitchNodes } from '@/api/callcenter/freeswitch-node';
import type { FreeSwitchNodeVO } from '@/api/callcenter/freeswitch-node/types';
import {
  deleteSkillGroupOutboundPolicy,
  listOutboundLinePolicies,
  listSkillGroupOutboundPolicies,
  saveSkillGroupOutboundPolicy
} from '@/api/callcenter/outbound-line-policy';
import type {
  OutboundLinePolicyType,
  OutboundLinePolicyVO,
  SkillGroupOutboundPolicyForm,
  SkillGroupOutboundPolicyVO
} from '@/api/callcenter/outbound-line-policy/types';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;

const loading = ref(false);
const groups = ref<SkillGroupVO[]>([]);
const agents = ref<AgentVO[]>([]);
const nodes = ref<FreeSwitchNodeVO[]>([]);
const formRef = ref<ElFormInstance>();
const policyFormRef = ref<ElFormInstance>();

const dialog = reactive({ visible: false, title: '' });
const policyDialog = reactive({
  visible: false,
  title: '',
  loading: false,
  group: undefined as SkillGroupVO | undefined
});

const form = reactive<SkillGroupForm>({ groupCode: '', groupName: '', agentIds: [], enabled: true, remark: '' });
const policyForm = reactive<SkillGroupOutboundPolicyForm>({ enabled: true });
const policyBindings = ref<SkillGroupOutboundPolicyVO[]>([]);
const policyOptions = ref<OutboundLinePolicyVO[]>([]);

const rules = {
  groupCode: [{ required: true, pattern: /^[A-Za-z0-9_-]{2,32}$/, message: '请输入合法技能组编码', trigger: 'blur' }],
  groupName: [{ required: true, message: '请输入技能组名称', trigger: 'blur' }],
  agentIds: [{ required: true, type: 'array', min: 1, message: '至少选择一名坐席', trigger: 'change' }]
};

const policyRules = {
  nodeId: [{ required: true, message: '请选择 FreeSWITCH 节点', trigger: 'change' }],
  outboundLinePolicyId: [{ required: true, message: '请选择外呼线路策略', trigger: 'change' }]
};

const normalizeRows = <T,>(res: any): T[] => res?.rows || res?.data || [];
const policyTypeLabel = (value: OutboundLinePolicyType) => ({ FIXED: '固定', ROUND_ROBIN: '轮询', WEIGHT: '权重' })[value] || value;
const agentLabel = (agent: AgentVO) => `${agent.agentName || agent.agentCode}（${agent.agentCode}）`;
const policyLabel = (policy: OutboundLinePolicyVO) => `${policy.policyName}（${policy.policyCode}，${policyTypeLabel(policy.policyType)}）`;

const loadNodes = async () => {
  const res = await listFreeSwitchNodes({ pageNum: 1, pageSize: 1000, enabled: true });
  nodes.value = normalizeRows<FreeSwitchNodeVO>(res);
};

const load = async () => {
  loading.value = true;
  try {
    const [groupRes, agentRes] = await Promise.all([listSkillGroups(), listAgents({ pageNum: 1, pageSize: 1000, enabled: true })]);
    groups.value = groupRes.data || [];
    agents.value = agentRes.rows || [];
    if (!nodes.value.length) {
      await loadNodes();
    }
  } finally {
    loading.value = false;
  }
};

const reset = () => Object.assign(form, { id: undefined, groupCode: '', groupName: '', agentIds: [], enabled: true, remark: '', version: undefined });

const handleAdd = () => {
  reset();
  dialog.title = '新增技能组';
  dialog.visible = true;
};

const handleUpdate = async (row: SkillGroupVO) => {
  reset();
  Object.assign(form, (await getSkillGroup(row.id)).data);
  dialog.title = '修改技能组';
  dialog.visible = true;
};

const submit = () =>
  formRef.value?.validate(async (valid) => {
    if (!valid) return;
    form.id ? await updateSkillGroup(form) : await createSkillGroup(form);
    proxy?.$modal.msgSuccess('保存成功');
    dialog.visible = false;
    await load();
  });

const handleDelete = async (row: SkillGroupVO) => {
  await proxy?.$modal.confirm(`确认删除技能组“${row.groupName}”吗？`);
  await deleteSkillGroup(row.id);
  proxy?.$modal.msgSuccess('删除成功');
  await load();
};

const resetPolicyForm = () => {
  Object.assign(policyForm, {
    id: undefined,
    nodeId: undefined,
    skillGroupId: policyDialog.group?.id,
    outboundLinePolicyId: undefined,
    enabled: true,
    remark: '',
    version: undefined
  });
  policyOptions.value = [];
};

const loadPolicyBindings = async () => {
  if (!policyDialog.group?.id) return;
  policyDialog.loading = true;
  try {
    const res = await listSkillGroupOutboundPolicies(policyDialog.group.id);
    policyBindings.value = res.data || [];
  } finally {
    policyDialog.loading = false;
  }
};

const loadPolicyOptions = async (nodeId?: string | number) => {
  if (!nodeId) {
    policyOptions.value = [];
    return;
  }
  const res = await listOutboundLinePolicies({ pageNum: 1, pageSize: 1000, nodeId, enabled: true });
  policyOptions.value = normalizeRows<OutboundLinePolicyVO>(res);
};

const onPolicyNodeChange = async () => {
  policyForm.outboundLinePolicyId = undefined;
  await loadPolicyOptions(policyForm.nodeId);
};

const openPolicyDialog = async (row: SkillGroupVO) => {
  policyDialog.group = row;
  policyDialog.title = `外呼策略 - ${row.groupName}`;
  policyDialog.visible = true;
  resetPolicyForm();
  if (!nodes.value.length) {
    await loadNodes();
  }
  await loadPolicyBindings();
};

const editPolicyBinding = async (row: SkillGroupOutboundPolicyVO) => {
  Object.assign(policyForm, {
    id: row.id,
    nodeId: row.nodeId,
    skillGroupId: row.skillGroupId,
    outboundLinePolicyId: row.outboundLinePolicyId,
    enabled: row.enabled,
    remark: row.remark || '',
    version: row.version
  });
  await loadPolicyOptions(row.nodeId);
};

const submitPolicyBinding = () =>
  policyFormRef.value?.validate(async (valid) => {
    if (!valid || !policyDialog.group?.id) return;
    await saveSkillGroupOutboundPolicy({ ...policyForm, skillGroupId: policyDialog.group.id });
    proxy?.$modal.msgSuccess('外呼策略绑定已保存');
    resetPolicyForm();
    await loadPolicyBindings();
  });

const removePolicyBinding = async (row: SkillGroupOutboundPolicyVO) => {
  await proxy?.$modal.confirm(`确认删除 ${row.nodeName || '当前节点'} 的技能组外呼策略绑定吗？`);
  await deleteSkillGroupOutboundPolicy(row.id);
  proxy?.$modal.msgSuccess('删除成功');
  await loadPolicyBindings();
};

onMounted(load);
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
}

.mb-4 {
  margin-bottom: 16px;
}

.ml-2 {
  margin-left: 8px;
}

.policy-form :deep(.el-form-item__label) {
  white-space: nowrap;
}
</style>
