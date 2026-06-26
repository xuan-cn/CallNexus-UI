<template>
  <div class="p-2">
    <el-card shadow="hover">
      <template #header>
        <div class="toolbar">
          <div>
            <el-button v-hasPermi="['callcenter:outbound-line-policy:create']" type="primary" plain icon="Plus" @click="openCreate"
              >新增策略</el-button
            >
            <el-button plain icon="Refresh" @click="load">刷新</el-button>
          </div>
          <div class="hint">未显式指定主叫号码时，外呼会先按默认策略选线；没有策略时回退号码管理中的默认主叫。</div>
        </div>
      </template>

      <el-form :model="query" inline class="query-form">
        <el-form-item label="节点">
          <el-select v-model="query.nodeId" clearable filterable placeholder="全部节点" style="width: 220px">
            <el-option v-for="node in nodes" :key="node.id" :label="node.nodeName" :value="node.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="策略类型">
          <el-select v-model="query.policyType" clearable placeholder="全部类型" style="width: 160px">
            <el-option label="固定线路" value="FIXED" />
            <el-option label="轮询线路" value="ROUND_ROBIN" />
            <el-option label="权重线路" value="WEIGHT" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.enabled" clearable placeholder="全部" style="width: 120px">
            <el-option label="启用" :value="true" />
            <el-option label="停用" :value="false" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Search" @click="load">查询</el-button>
          <el-button icon="Refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table v-loading="loading" :data="rows">
        <el-table-column label="策略编码" prop="policyCode" min-width="150" />
        <el-table-column label="策略名称" prop="policyName" min-width="160" />
        <el-table-column label="节点" prop="nodeName" min-width="160" />
        <el-table-column label="类型" width="120">
          <template #default="{ row }">
            <el-tag>{{ policyTypeLabel(row.policyType) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="默认" width="90">
          <template #default="{ row }">
            <el-tag :type="row.defaultPolicy ? 'success' : 'info'">{{ row.defaultPolicy ? '是' : '否' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '停用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="线路" min-width="260">
          <template #default="{ row }">
            <div class="line-list">
              <el-tag v-for="item in row.items" :key="item.id" :type="item.enabled ? 'primary' : 'info'" effect="plain">
                {{ item.phoneNumber || item.phoneNumberId }}{{ row.policyType === 'WEIGHT' ? ` / 权重${item.weight}` : '' }}
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="备注" prop="remark" min-width="180" show-overflow-tooltip />
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button v-hasPermi="['callcenter:outbound-line-policy:update']" link type="primary" @click="openUpdate(row)">修改</el-button>
            <el-button v-hasPermi="['callcenter:outbound-line-policy:delete']" link type="danger" @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-drawer v-model="drawer.visible" :title="drawer.title" size="920px" append-to-body>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="110px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="所属节点" prop="nodeId">
              <el-select v-model="form.nodeId" filterable style="width: 100%" @change="loadPhoneNumbers">
                <el-option v-for="node in nodes" :key="node.id" :label="node.nodeName" :value="node.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="策略类型" prop="policyType">
              <el-select v-model="form.policyType" style="width: 100%">
                <el-option label="固定线路：始终优先第一条可用线路" value="FIXED" />
                <el-option label="轮询线路：按顺序循环使用" value="ROUND_ROBIN" />
                <el-option label="权重线路：按权重比例分配" value="WEIGHT" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="策略编码" prop="policyCode"><el-input v-model="form.policyCode" /></el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="策略名称" prop="policyName"><el-input v-model="form.policyName" /></el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="默认策略"><el-switch v-model="form.defaultPolicy" active-text="是" inactive-text="否" /></el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态"><el-switch v-model="form.enabled" active-text="启用" inactive-text="停用" /></el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">线路明细</el-divider>
        <div class="item-actions">
          <el-button plain icon="Plus" @click="addItem">添加线路</el-button>
          <span>只显示当前节点下启用且类型为“主叫/呼入呼出”的号码。</span>
        </div>
        <el-table class="line-detail-table" :data="form.items" border>
          <el-table-column label="主叫号码" min-width="220">
            <template #default="{ row }">
              <el-select v-model="row.phoneNumberId" filterable style="width: 100%">
                <el-option v-for="number in phoneNumbers" :key="number.id" :label="phoneNumberLabel(number)" :value="number.id" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="权重" width="120">
            <template #default="{ row }"><el-input-number v-model="row.weight" :min="1" :max="999" controls-position="right" /></template>
          </el-table-column>
          <el-table-column label="排序" width="120">
            <template #default="{ row }"><el-input-number v-model="row.sortOrder" :min="0" :max="999" controls-position="right" /></template>
          </el-table-column>
          <el-table-column label="启用" width="90">
            <template #default="{ row }"><el-switch v-model="row.enabled" /></template>
          </el-table-column>
          <el-table-column label="操作" width="90">
            <template #default="{ $index }"><el-button link type="danger" @click="form.items.splice($index, 1)">删除</el-button></template>
          </el-table-column>
        </el-table>

        <el-form-item label="备注" class="remark-item"><el-input v-model="form.remark" type="textarea" :rows="3" maxlength="500" show-word-limit /></el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="drawer.visible = false">取消</el-button>
        <el-button type="primary" @click="submit">保存</el-button>
      </template>
    </el-drawer>
  </div>
</template>

<script setup name="OutboundLinePolicy" lang="ts">
import {
  createOutboundLinePolicy,
  deleteOutboundLinePolicy,
  getOutboundLinePolicy,
  listOutboundLinePolicies,
  updateOutboundLinePolicy
} from '@/api/callcenter/outbound-line-policy';
import type {
  OutboundLinePolicyForm,
  OutboundLinePolicyQuery,
  OutboundLinePolicyType,
  OutboundLinePolicyVO
} from '@/api/callcenter/outbound-line-policy/types';
import { listFreeSwitchNodes } from '@/api/callcenter/freeswitch-node';
import type { FreeSwitchNodeVO } from '@/api/callcenter/freeswitch-node/types';
import { listPhoneNumbers } from '@/api/callcenter/phone-number';
import type { PhoneNumberVO } from '@/api/callcenter/phone-number/types';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;
const loading = ref(false);
const rows = ref<OutboundLinePolicyVO[]>([]);
const nodes = ref<FreeSwitchNodeVO[]>([]);
const phoneNumbers = ref<PhoneNumberVO[]>([]);
const formRef = ref<ElFormInstance>();
const query = reactive<OutboundLinePolicyQuery>({ pageNum: 1, pageSize: 50 });
const drawer = reactive({ visible: false, title: '' });
const form = reactive<OutboundLinePolicyForm>({
  policyCode: '',
  policyName: '',
  policyType: 'ROUND_ROBIN',
  defaultPolicy: true,
  enabled: true,
  items: []
});
const rules = {
  nodeId: [{ required: true, message: '请选择 FreeSWITCH 节点' }],
  policyCode: [{ required: true, message: '请输入策略编码' }],
  policyName: [{ required: true, message: '请输入策略名称' }],
  policyType: [{ required: true, message: '请选择策略类型' }]
};
const policyTypeLabel = (value: OutboundLinePolicyType) => ({ FIXED: '固定', ROUND_ROBIN: '轮询', WEIGHT: '权重' })[value] || value;
const phoneNumberLabel = (item: PhoneNumberVO) => `${item.number} - ${item.numberName || item.gatewayName || '主叫号码'}`;

const loadNodes = async () => {
  const res = await listFreeSwitchNodes({ pageNum: 1, pageSize: 1000, enabled: true });
  nodes.value = res.rows || [];
};
const loadPhoneNumbers = async () => {
  if (!form.nodeId) {
    phoneNumbers.value = [];
    return;
  }
  const res = await listPhoneNumbers({ pageNum: 1, pageSize: 1000, nodeId: form.nodeId, enabled: true });
  phoneNumbers.value = (res.rows || []).filter((item) => item.numberType === 'CALLER_ID' || item.numberType === 'BOTH');
};
const load = async () => {
  loading.value = true;
  try {
    const res = await listOutboundLinePolicies(query);
    rows.value = res.rows || [];
  } finally {
    loading.value = false;
  }
};
const resetQuery = () => {
  Object.assign(query, { pageNum: 1, pageSize: 50, nodeId: undefined, policyType: undefined, enabled: undefined });
  load();
};
const resetForm = () => {
  Object.assign(form, {
    id: undefined,
    nodeId: undefined,
    policyCode: '',
    policyName: '',
    policyType: 'ROUND_ROBIN',
    defaultPolicy: true,
    enabled: true,
    remark: '',
    version: undefined,
    items: []
  });
  phoneNumbers.value = [];
};
const openCreate = () => {
  resetForm();
  drawer.title = '新增外呼线路策略';
  drawer.visible = true;
};
const openUpdate = async (row: OutboundLinePolicyVO) => {
  resetForm();
  const data = (await getOutboundLinePolicy(row.id)).data;
  Object.assign(form, data, { items: data.items.map((item) => ({ ...item })) });
  await loadPhoneNumbers();
  drawer.title = '修改外呼线路策略';
  drawer.visible = true;
};
const addItem = () => {
  form.items.push({ phoneNumberId: undefined, weight: 1, sortOrder: form.items.length + 1, enabled: true });
};
const submit = () =>
  formRef.value?.validate(async (valid) => {
    if (!valid) return;
    if (!form.items.length || form.items.some((item) => !item.phoneNumberId)) {
      proxy?.$modal.msgError('请至少配置一条可用线路');
      return;
    }
    form.id ? await updateOutboundLinePolicy(form) : await createOutboundLinePolicy(form);
    proxy?.$modal.msgSuccess('保存成功');
    drawer.visible = false;
    await load();
  });
const remove = async (row: OutboundLinePolicyVO) => {
  await proxy?.$modal.confirm(`确认删除外呼线路策略 ${row.policyName} 吗？`);
  await deleteOutboundLinePolicy(row.id);
  proxy?.$modal.msgSuccess('删除成功');
  await load();
};

onMounted(async () => {
  await loadNodes();
  await load();
});
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.hint {
  color: #8792a2;
  font-size: 13px;
}
.query-form {
  margin-bottom: 12px;
}
.line-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
:deep(.el-divider) {
  display: none;
}
.item-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  margin-left: 110px;
  position: relative;
  color: #8792a2;
}
.item-actions::before {
  position: absolute;
  left: -110px;
  width: 96px;
  text-align: right;
  font-weight: 600;
  color: #606266;
  content: '线路明细';
}
.item-actions + :deep(.el-table) {
  width: calc(100% - 110px);
  margin-left: 110px;
}
.item-actions + :deep(.el-table .el-input-number) {
  width: 100%;
}
.item-actions + :deep(.el-table .el-select) {
  width: 100%;
}
.line-table {
  width: calc(100% - 110px);
  margin-left: 110px;
}
.line-table :deep(.el-input-number) {
  width: 100%;
}
.remark-item {
  margin-top: 18px;
}
.item-actions::before {
  content: '\7EBF\8DEF\660E\7EC6';
}
.line-detail-table {
  box-sizing: border-box;
  width: calc(100% - 110px);
  margin-left: 110px;
}
.line-detail-table :deep(.el-input-number),
.line-detail-table :deep(.el-select) {
  width: 100%;
}
</style>
