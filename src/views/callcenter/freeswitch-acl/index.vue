<template>
  <div class="p-2">
    <el-card shadow="hover">
      <el-form :model="query" inline>
        <el-form-item label="节点">
          <el-select v-model="query.nodeId" clearable filterable placeholder="全部节点" style="width: 220px">
            <el-option v-for="node in nodes" :key="node.id" :label="node.nodeName" :value="node.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="名称"><el-input v-model="query.aclName" clearable placeholder="ACL 名称" @keyup.enter="load" /></el-form-item>
        <el-form-item label="用途">
          <el-select v-model="query.purpose" clearable placeholder="全部用途" style="width: 180px">
            <el-option label="SIP 终端接入" value="SIP_ENDPOINT" />
            <el-option label="运营商线路来源" value="CARRIER_INGRESS" />
          </el-select>
        </el-form-item>
        <el-form-item><el-button type="primary" icon="Search" @click="load">查询</el-button></el-form-item>
      </el-form>

      <div class="toolbar">
        <el-button v-hasPermi="['callcenter:freeswitch-acl:create']" type="primary" plain icon="Plus" @click="openCreate">新增 ACL</el-button>
        <span class="hint">规则保存后只是草稿，发布成功才会影响 FreeSWITCH。</span>
      </div>

      <el-table v-loading="loading" :data="rows">
        <el-table-column label="名称" prop="aclName" min-width="150" />
        <el-table-column label="ACL 编码" prop="aclCode" min-width="170" />
        <el-table-column label="节点" min-width="160">
          <template #default="{ row }">{{ nodeName(row.nodeId) }}</template>
        </el-table-column>
        <el-table-column label="用途" width="145">
          <template #default="{ row }">
            <el-tag :type="row.purpose === 'SIP_ENDPOINT' ? 'primary' : 'warning'">{{ purposeLabel(row.purpose) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="默认动作" width="105">
          <template #default="{ row }">
            <el-tag :type="row.defaultAction === 'DENY' ? 'danger' : 'success'">{{ actionLabel(row.defaultAction) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="规则" width="75">
          <template #default="{ row }">{{ row.entries?.length || 0 }}</template>
        </el-table-column>
        <el-table-column label="发布状态" min-width="145">
          <template #default="{ row }">
            <el-tooltip v-if="row.syncError" :content="row.syncError" placement="top">
              <el-tag :type="syncType(row.syncStatus)">{{ syncLabel(row) }}</el-tag>
            </el-tooltip>
            <el-tag v-else :type="syncType(row.syncStatus)">{{ syncLabel(row) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="{ row }"><el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '停用' }}</el-tag></template>
        </el-table-column>
        <el-table-column label="操作" width="330" fixed="right">
          <template #default="{ row }">
            <div class="operation-actions">
              <el-button v-hasPermi="['callcenter:freeswitch-acl:query']" link type="primary" @click="openTest(row)">测试 IP</el-button>
              <el-button v-hasPermi="['callcenter:freeswitch-acl:update']" link type="primary" @click="openUpdate(row)">修改</el-button>
              <el-button v-hasPermi="['callcenter:freeswitch-acl:publish']" link type="success" @click="publish(row)">发布</el-button>
              <el-dropdown trigger="click">
                <el-button link type="primary">更多<el-icon class="more-arrow"><ArrowDown /></el-icon></el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item @click="preview(row)">配置预览</el-dropdown-item>
                    <el-dropdown-item :disabled="!row.publishedVersionNo || row.publishedVersionNo < 2" @click="rollback(row)">回滚上一版</el-dropdown-item>
                    <el-dropdown-item v-if="!row.publishedVersionNo" divided @click="remove(row)">删除</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </template>
        </el-table-column>
      </el-table>
      <pagination v-show="total > 0" v-model:page="query.pageNum" v-model:limit="query.pageSize" :total="total" @pagination="load" />
    </el-card>

    <el-drawer v-model="drawer.visible" :title="drawer.title" size="780px" append-to-body>
      <el-alert type="warning" :closable="false" show-icon class="mb-4">
        默认拒绝时，仅允许规则中的 IP/CIDR。发布前请先把当前管理话机或软电话出口 IP 加入允许列表。
      </el-alert>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="115px">
        <el-row :gutter="18">
          <el-col :span="12">
            <el-form-item label="FreeSWITCH 节点" prop="nodeId">
              <el-select v-model="form.nodeId" filterable style="width: 100%">
                <el-option v-for="node in nodes" :key="node.id" :label="node.nodeName" :value="node.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12"><el-form-item label="ACL 名称" prop="aclName"><el-input v-model="form.aclName" /></el-form-item></el-col>
          <el-col :span="12">
            <el-form-item label="ACL 编码" prop="aclCode">
              <el-input v-model="form.aclCode" placeholder="例如 cnx_sip_endpoint_acl" :disabled="!!form.id" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="用途" prop="purpose">
              <el-select v-model="form.purpose" style="width: 100%">
                <el-option label="SIP 终端接入" value="SIP_ENDPOINT" />
                <el-option label="运营商线路来源" value="CARRIER_INGRESS" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="默认动作" prop="defaultAction">
              <el-radio-group v-model="form.defaultAction">
                <el-radio-button value="DENY">默认拒绝</el-radio-button>
                <el-radio-button value="ALLOW">默认允许</el-radio-button>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="12"><el-form-item label="状态"><el-switch v-model="form.enabled" active-text="启用" inactive-text="停用" /></el-form-item></el-col>
        </el-row>

        <div class="section-title">
          <span>IP/CIDR 规则</span>
          <el-button plain icon="Plus" @click="addEntry">添加规则</el-button>
        </div>
        <el-table :data="form.entries" border>
          <el-table-column label="动作" width="115">
            <template #default="{ row }">
              <el-select v-model="row.action"><el-option label="允许" value="ALLOW" /><el-option label="拒绝" value="DENY" /></el-select>
            </template>
          </el-table-column>
          <el-table-column label="IP/CIDR" min-width="220">
            <template #default="{ row }"><el-input v-model="row.cidr" placeholder="192.168.1.0/24 或单个 IP" /></template>
          </el-table-column>
          <el-table-column label="说明" min-width="180">
            <template #default="{ row }"><el-input v-model="row.description" placeholder="办公网、运营商 SBC" /></template>
          </el-table-column>
          <el-table-column label="操作" width="75">
            <template #default="{ $index }"><el-button link type="danger" @click="form.entries.splice($index, 1)">删除</el-button></template>
          </el-table-column>
        </el-table>
      </el-form>
      <template #footer>
        <el-button @click="drawer.visible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submit">保存草稿</el-button>
      </template>
    </el-drawer>

    <el-dialog v-model="testDialog.visible" title="ACL IP 命中测试" width="520px" append-to-body>
      <el-input v-model="testDialog.ip" placeholder="输入要测试的 IPv4 或 IPv6 地址">
        <template #append><el-button :loading="testDialog.loading" @click="runTest">测试</el-button></template>
      </el-input>
      <el-result
        v-if="testDialog.result"
        :icon="testDialog.result.allowed ? 'success' : 'error'"
        :title="testDialog.result.allowed ? '允许访问' : '拒绝访问'"
        :sub-title="testDialog.result.message"
      />
    </el-dialog>

    <el-dialog v-model="previewDialog.visible" title="白名单配置文件预览" width="850px" append-to-body>
      <el-input v-model="previewDialog.xml" type="textarea" :rows="22" readonly />
    </el-dialog>
  </div>
</template>

<script setup name="FreeSwitchAcl" lang="ts">
import {
  createFreeSwitchAcl,
  deleteFreeSwitchAcl,
  getFreeSwitchAcl,
  listFreeSwitchAcls,
  previewFreeSwitchAcl,
  publishFreeSwitchAcl,
  rollbackFreeSwitchAcl,
  testFreeSwitchAclIp,
  updateFreeSwitchAcl
} from '@/api/callcenter/freeswitch-acl';
import type {
  AclAction,
  AclPurpose,
  FreeSwitchAclForm,
  FreeSwitchAclIpTestVO,
  FreeSwitchAclQuery,
  FreeSwitchAclVO
} from '@/api/callcenter/freeswitch-acl/types';
import { listFreeSwitchNodes } from '@/api/callcenter/freeswitch-node';
import type { FreeSwitchNodeVO } from '@/api/callcenter/freeswitch-node/types';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;
const loading = ref(false);
const submitting = ref(false);
const rows = ref<FreeSwitchAclVO[]>([]);
const nodes = ref<FreeSwitchNodeVO[]>([]);
const total = ref(0);
const formRef = ref<ElFormInstance>();
const query = reactive<FreeSwitchAclQuery>({ pageNum: 1, pageSize: 10 });
const drawer = reactive({ visible: false, title: '' });
const form = reactive<FreeSwitchAclForm>(emptyForm());
const testDialog = reactive({
  visible: false,
  aclId: undefined as string | number | undefined,
  ip: '',
  loading: false,
  result: undefined as FreeSwitchAclIpTestVO | undefined
});
const previewDialog = reactive({ visible: false, xml: '' });
const rules = {
  nodeId: [{ required: true, message: '请选择 FreeSWITCH 节点', trigger: 'change' }],
  aclName: [{ required: true, message: '请输入 ACL 名称', trigger: 'blur' }],
  aclCode: [
    { required: true, message: '请输入 ACL 编码', trigger: 'blur' },
    { pattern: /^[A-Za-z][A-Za-z0-9_-]{1,63}$/, message: '以字母开头，仅支持字母、数字、下划线和横线', trigger: 'blur' }
  ],
  purpose: [{ required: true, message: '请选择用途', trigger: 'change' }],
  defaultAction: [{ required: true, message: '请选择默认动作', trigger: 'change' }]
};

function emptyForm(): FreeSwitchAclForm {
  return {
    aclCode: 'cnx_sip_endpoint_acl',
    aclName: '',
    purpose: 'SIP_ENDPOINT',
    defaultAction: 'DENY',
    entries: [{ action: 'ALLOW', cidr: '', description: '' }],
    enabled: true
  };
}
const purposeLabel = (value: AclPurpose) => (value === 'SIP_ENDPOINT' ? 'SIP 终端接入' : '运营商线路来源');
const actionLabel = (value: AclAction) => (value === 'ALLOW' ? '允许' : '拒绝');
const nodeName = (id: string | number) => nodes.value.find((node) => String(node.id) === String(id))?.nodeName || String(id);
const syncType = (status: string) => ({ SYNCED: 'success', FAILED: 'danger', DRAFT_CHANGED: 'warning', SYNCING: 'primary' })[status] || 'info';
const syncLabel = (row: FreeSwitchAclVO) =>
  ({
    SYNCED: `已发布 v${row.publishedVersionNo}`,
    FAILED: '同步失败',
    DRAFT_CHANGED: `草稿已修改 / v${row.publishedVersionNo}`,
    SYNCING: '同步中',
    NOT_PUBLISHED: '未发布'
  })[row.syncStatus] || row.syncStatus;

const load = async () => {
  loading.value = true;
  try {
    const res = await listFreeSwitchAcls(query);
    rows.value = res.rows;
    total.value = res.total;
  } finally {
    loading.value = false;
  }
};
const loadNodes = async () => {
  const res = await listFreeSwitchNodes({ pageNum: 1, pageSize: 200, enabled: true });
  nodes.value = res.rows;
};
const resetForm = () => Object.assign(form, emptyForm());
const openCreate = () => {
  resetForm();
  form.nodeId = nodes.value[0]?.id;
  drawer.title = '新增访问控制 ACL';
  drawer.visible = true;
};
const openUpdate = async (row: FreeSwitchAclVO) => {
  resetForm();
  Object.assign(form, (await getFreeSwitchAcl(row.id)).data);
  form.entries = form.entries.map((entry) => ({ ...entry }));
  drawer.title = '修改访问控制 ACL';
  drawer.visible = true;
};
const addEntry = () => form.entries.push({ action: 'ALLOW', cidr: '', description: '' });
const submit = () =>
  formRef.value?.validate(async (valid) => {
    if (!valid) return;
    if (!form.entries.length || form.entries.some((entry) => !entry.cidr.trim())) {
      proxy?.$modal.msgError('请至少配置一条完整的 IP/CIDR 规则');
      return;
    }
    submitting.value = true;
    try {
      form.id ? await updateFreeSwitchAcl(form.id, form) : await createFreeSwitchAcl(form);
      proxy?.$modal.msgSuccess('草稿保存成功');
      drawer.visible = false;
      await load();
    } finally {
      submitting.value = false;
    }
  });
const publish = async (row: FreeSwitchAclVO) => {
  await proxy?.$modal.confirm(`发布后 ACL ${row.aclCode} 将立即同步到 FreeSWITCH，确认继续吗？`);
  await publishFreeSwitchAcl(row.id);
  proxy?.$modal.msgSuccess('ACL 已发布并同步');
  await load();
};
const rollback = async (row: FreeSwitchAclVO) => {
  await proxy?.$modal.confirm(`确认将 ${row.aclName} 回滚到上一发布版本吗？`);
  await rollbackFreeSwitchAcl(row.id);
  proxy?.$modal.msgSuccess('ACL 已回滚');
  await load();
};
const remove = async (row: FreeSwitchAclVO) => {
  await proxy?.$modal.confirm(`确认删除未发布 ACL ${row.aclName} 吗？`);
  await deleteFreeSwitchAcl(row.id);
  proxy?.$modal.msgSuccess('删除成功');
  await load();
};
const openTest = (row: FreeSwitchAclVO) => {
  Object.assign(testDialog, { visible: true, aclId: row.id, ip: '', result: undefined });
};
const runTest = async () => {
  if (!testDialog.aclId || !testDialog.ip.trim()) return;
  testDialog.loading = true;
  try {
    testDialog.result = (await testFreeSwitchAclIp(testDialog.aclId, testDialog.ip)).data;
  } finally {
    testDialog.loading = false;
  }
};
const preview = async (row: FreeSwitchAclVO) => {
  previewDialog.xml = (await previewFreeSwitchAcl(row.id)).data;
  previewDialog.visible = true;
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
  gap: 14px;
  margin-bottom: 14px;
}
.hint {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}
.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 8px 0 12px;
  font-weight: 600;
}
.operation-actions {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 14px;
  white-space: nowrap;
}
.operation-actions :deep(.el-button + .el-button) {
  margin-left: 0;
}
.more-arrow {
  margin-left: 3px;
}
</style>
