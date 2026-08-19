<template>
  <div class="p-2">
    <el-card class="mb-2" shadow="hover">
      <el-form ref="queryFormRef" :model="queryParams" :inline="true">
        <el-form-item label="节点编码" prop="nodeCode"><el-input v-model="queryParams.nodeCode" clearable @keyup.enter="handleQuery" /></el-form-item>
        <el-form-item label="节点名称" prop="nodeName"><el-input v-model="queryParams.nodeName" clearable @keyup.enter="handleQuery" /></el-form-item>
        <el-form-item label="状态" prop="enabled">
          <el-select v-model="queryParams.enabled" clearable style="width: 120px">
            <el-option label="启用" :value="true" /><el-option label="停用" :value="false" />
          </el-select>
        </el-form-item>
        <el-form-item
          ><el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button
          ><el-button icon="Refresh" @click="resetQuery">重置</el-button></el-form-item
        >
      </el-form>
    </el-card>

    <el-card shadow="hover">
      <template #header>
        <el-button v-hasPermi="['callcenter:freeswitch-node:create']" type="primary" plain icon="Plus" @click="handleAdd">新增节点</el-button>
      </template>
      <el-table v-loading="loading" :data="nodeList">
        <el-table-column label="节点编码" prop="nodeCode" min-width="130" />
        <el-table-column label="节点名称" prop="nodeName" min-width="150" />
        <el-table-column label="SIP 域" prop="sipDomain" min-width="170" />
        <el-table-column label="SIP Profile" prop="sipProfileName" width="120" />
        <el-table-column label="外部 SIP/RTP" min-width="180">
          <template #default="{ row }">
            <span v-if="row.autoNatEnabled">auto-nat</span>
            <span v-else>{{ row.extSipIp || row.sipIp }} / {{ row.extRtpIp || row.rtpIp }}</span>
          </template>
        </el-table-column>
        <el-table-column label="WebSocket 地址" prop="wssUrl" min-width="230" />
        <el-table-column label="ESL 地址" min-width="170"
          ><template #default="{ row }">{{ row.eslHost }}:{{ row.eslPort }}</template></el-table-column
        >
        <el-table-column label="媒体 Agent" width="130">
          <template #default="{ row }">
            <el-tag :type="row.agentEnabled ? (row.agentLastHeartbeat ? 'success' : 'warning') : 'info'">
              {{ row.agentEnabled ? (row.agentLastHeartbeat ? '已连接' : '待连接') : '未启用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90"
          ><template #default="{ row }"
            ><el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '停用' }}</el-tag></template
          ></el-table-column
        >
        <el-table-column label="操作" width="180" align="center" fixed="right">
          <template #default="{ row }">
            <el-button v-hasPermi="['callcenter:freeswitch-node:query']" link type="primary" icon="Document" @click="handleProfilePreview(row)" />
            <el-button v-hasPermi="['callcenter:freeswitch-node:agent-token']" link type="primary" icon="Key" @click="handleAgentToken(row)" />
            <el-button v-hasPermi="['callcenter:freeswitch-node:update']" link type="primary" icon="Edit" @click="handleUpdate(row)" />
            <el-button v-hasPermi="['callcenter:freeswitch-node:delete']" link type="danger" icon="Delete" @click="handleDelete(row)" />
          </template>
        </el-table-column>
      </el-table>
      <pagination v-show="total > 0" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" :total="total" @pagination="getList" />
    </el-card>

    <el-dialog v-model="dialog.visible" :title="dialog.title" width="600px" append-to-body>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="节点编码" prop="nodeCode"><el-input v-model="form.nodeCode" placeholder="例如 FS_LOCAL_01" /></el-form-item>
        <el-form-item label="节点名称" prop="nodeName"><el-input v-model="form.nodeName" placeholder="例如 本地FreeSWITCH" /></el-form-item>
        <el-form-item label="SIP 域" prop="sipDomain"><el-input v-model="form.sipDomain" placeholder="例如 freeswitch.local" /></el-form-item>
        <el-form-item label="WebSocket 地址" prop="wssUrl">
          <el-input v-model="form.wssUrl" placeholder="开发 ws://节点IP:5066；生产 wss://域名:7443" />
        </el-form-item>
        <el-form-item label="ESL 主机" prop="eslHost"><el-input v-model="form.eslHost" placeholder="后端可访问的 FreeSWITCH 地址" /></el-form-item>
        <el-form-item label="ESL 端口" prop="eslPort"
          ><el-input-number v-model="form.eslPort" :min="1" :max="65535" controls-position="right"
        /></el-form-item>
        <el-form-item :label="form.id ? '新ESL密码' : 'ESL密码'" prop="eslPassword">
          <el-input v-model="form.eslPassword" type="password" show-password :placeholder="form.id ? '留空表示不修改' : '请输入ESL密码'" />
        </el-form-item>
        <el-form-item v-if="form.id" label="媒体 Agent"
          ><el-switch v-model="form.agentEnabled" active-text="启用" inactive-text="停用"
        /></el-form-item>
        <el-form-item v-if="form.id" label="媒体根目录"><el-input v-model="form.mediaRootPath" /></el-form-item>
        <el-divider content-position="left">网络与 SIP Profile</el-divider>
        <el-alert
          title="这里维护 FreeSWITCH external profile 的 Contact/SDP 对外地址。关闭 Auto NAT 后，网关 Contact 会使用固定对外 SIP IP。"
          type="info"
          :closable="false"
          show-icon
          class="mb-3"
        />
        <el-form-item label="Profile 名称" prop="sipProfileName">
          <el-input v-model="form.sipProfileName" placeholder="external" />
        </el-form-item>
        <el-form-item label="本机 SIP IP" prop="sipIp">
          <el-input v-model="form.sipIp" placeholder="$${local_ip_v4} 或 192.168.0.176" />
        </el-form-item>
        <el-form-item label="本机 RTP IP" prop="rtpIp">
          <el-input v-model="form.rtpIp" placeholder="$${local_ip_v4} 或 192.168.0.176" />
        </el-form-item>
        <el-form-item label="Auto NAT">
          <el-switch v-model="form.autoNatEnabled" active-text="启用" inactive-text="固定IP" />
        </el-form-item>
        <el-form-item label="对外 SIP IP" prop="extSipIp">
          <el-input v-model="form.extSipIp" :disabled="form.autoNatEnabled" placeholder="例如 192.168.0.176；Auto NAT 开启时使用 auto-nat" />
        </el-form-item>
        <el-form-item label="对外 RTP IP" prop="extRtpIp">
          <el-input v-model="form.extRtpIp" :disabled="form.autoNatEnabled" placeholder="例如 192.168.0.176；Auto NAT 开启时使用 auto-nat" />
        </el-form-item>
        <el-form-item v-if="form.id" label="状态"><el-switch v-model="form.enabled" active-text="启用" inactive-text="停用" /></el-form-item>
      </el-form>
      <template #footer
        ><el-button @click="dialog.visible = false">取消</el-button><el-button type="primary" @click="submitForm">确定</el-button></template
      >
    </el-dialog>

    <el-drawer v-model="profilePreview.visible" title="SIP Profile 配置预览" size="560px" append-to-body>
      <el-alert
        title="把 XML 片段同步到 FreeSWITCH 对应 sip_profiles 文件后，执行下方命令生效。当前版本先提供预览与人工应用。"
        type="warning"
        :closable="false"
        show-icon
        class="mb-3"
      />
      <div class="preview-title">Profile：{{ profilePreview.data?.profileName }}</div>
      <el-input :model-value="profilePreview.data?.xmlSnippet || ''" type="textarea" :rows="8" readonly />
      <div class="preview-title mt-4">生效命令</div>
      <el-input :model-value="profilePreview.data?.applyCommands || ''" type="textarea" :rows="5" readonly />
    </el-drawer>
  </div>
</template>

<script setup name="FreeSwitchNode" lang="ts">
import {
  createFreeSwitchNode,
  deleteFreeSwitchNode,
  getFreeSwitchNode,
  listFreeSwitchNodes,
  previewFreeSwitchNodeSipProfile,
  resetFreeSwitchNodeAgentToken,
  updateFreeSwitchNode
} from '@/api/callcenter/freeswitch-node';
import { FreeSwitchNodeForm, FreeSwitchNodeQuery, FreeSwitchNodeSipProfilePreview, FreeSwitchNodeVO } from '@/api/callcenter/freeswitch-node/types';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;
const loading = ref(false);
const total = ref(0);
const nodeList = ref<FreeSwitchNodeVO[]>([]);
const queryFormRef = ref<ElFormInstance>();
const formRef = ref<ElFormInstance>();
const dialog = reactive<DialogOption>({ visible: false, title: '' });
const profilePreview = reactive<{ visible: boolean; data?: FreeSwitchNodeSipProfilePreview }>({ visible: false });
const initialForm: FreeSwitchNodeForm = {
  nodeCode: '',
  nodeName: '',
  sipDomain: 'freeswitch.local',
  wssUrl: 'wss://freeswitch.local:7443',
  eslHost: '',
  eslPort: 8021,
  eslPassword: '',
  agentEnabled: false,
  mediaRootPath: '/var/lib/freeswitch/sounds/callnexus',
  sipProfileName: 'external',
  sipIp: '$${local_ip_v4}',
  rtpIp: '$${local_ip_v4}',
  autoNatEnabled: true,
  extSipIp: '',
  extRtpIp: '',
  enabled: true
};
const data = reactive<PageData<FreeSwitchNodeForm, FreeSwitchNodeQuery>>({
  form: { ...initialForm },
  queryParams: { pageNum: 1, pageSize: 10, nodeCode: '', nodeName: '', enabled: undefined },
  rules: {
    nodeCode: [{ required: true, pattern: /^[A-Za-z0-9_-]{2,32}$/, message: '请输入合法节点编码', trigger: 'blur' }],
    nodeName: [{ required: true, message: '节点名称不能为空', trigger: 'blur' }],
    sipDomain: [{ required: true, message: 'SIP 域不能为空', trigger: 'blur' }],
    wssUrl: [
      {
        required: true,
        pattern: import.meta.env.DEV ? /^wss?:\/\/.+$/ : /^wss:\/\/.+$/,
        message: import.meta.env.DEV ? '开发环境地址必须以 ws:// 或 wss:// 开头' : '生产环境地址必须以 wss:// 开头',
        trigger: 'blur'
      }
    ],
    eslHost: [{ required: true, message: 'ESL 主机不能为空', trigger: 'blur' }],
    sipProfileName: [{ required: true, pattern: /^[A-Za-z0-9_-]{1,32}$/, message: '请输入合法 Profile 名称', trigger: 'blur' }],
    eslPassword: [
      {
        validator: (_: unknown, value: string, callback: (error?: Error) => void) =>
          !form.value.id && !value ? callback(new Error('ESL 密码不能为空')) : callback(),
        trigger: 'blur'
      }
    ]
  }
});
const { form, queryParams, rules } = toRefs(data);

const getList = async () => {
  loading.value = true;
  try {
    const res = await listFreeSwitchNodes(queryParams.value);
    nodeList.value = res.rows;
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
  dialog.title = '新增话务服务节点';
  dialog.visible = true;
};
const handleUpdate = async (row: FreeSwitchNodeVO) => {
  reset();
  const res = await getFreeSwitchNode(row.id);
  Object.assign(form.value, res.data, { eslPassword: '' });
  dialog.title = '修改话务服务节点';
  dialog.visible = true;
};
const submitForm = () =>
  formRef.value?.validate(async (valid) => {
    if (!valid) return;
    form.value.id ? await updateFreeSwitchNode(form.value) : await createFreeSwitchNode(form.value);
    proxy?.$modal.msgSuccess('操作成功');
    dialog.visible = false;
    await getList();
  });
const handleDelete = async (row: FreeSwitchNodeVO) => {
  await proxy?.$modal.confirm(`确认删除节点 ${row.nodeName} 吗？`);
  await deleteFreeSwitchNode(row.id);
  proxy?.$modal.msgSuccess('删除成功');
  await getList();
};
const handleAgentToken = async (row: FreeSwitchNodeVO) => {
  await proxy?.$modal.confirm(`确认生成或重置节点 ${row.nodeName} 的 Agent Token 吗？旧 Token 将立即失效。`);
  const res = await resetFreeSwitchNodeAgentToken(row.id);
  await proxy?.$modal.alert(`请立即保存，该 Token 仅展示一次：\n${res.data}`);
  await getList();
};
const handleProfilePreview = async (row: FreeSwitchNodeVO) => {
  const res = await previewFreeSwitchNodeSipProfile(row.id);
  profilePreview.data = res.data;
  profilePreview.visible = true;
};
onMounted(getList);
</script>

<style scoped>
.preview-title {
  margin-bottom: 8px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}
</style>
