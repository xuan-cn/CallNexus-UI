<template>
  <div class="p-2">
    <el-card shadow="hover">
      <template #header>
        <el-button v-hasPermi="['callcenter:call-queue:create']" type="primary" plain icon="Plus" @click="handleAdd">新增队列</el-button>
      </template>
      <el-table v-loading="loading" :data="queues">
        <el-table-column label="队列编码" prop="queueCode" min-width="140" />
        <el-table-column label="队列名称" prop="queueName" min-width="160" />
        <el-table-column label="技能组" prop="skillGroupName" min-width="160" />
        <el-table-column label="节点组" prop="nodeGroupName" min-width="160" />
        <el-table-column label="分配策略" min-width="140"
          ><template #default="{ row }">{{ strategyLabel(row.strategy) }}</template></el-table-column
        >
        <el-table-column label="最大等待" width="100"
          ><template #default="{ row }">{{ row.maxWaitSeconds }} 秒</template></el-table-column
        >
        <el-table-column label="同步状态" width="140">
          <template #default="{ row }">
            <el-tooltip :disabled="!row.syncError" :content="row.syncError" placement="top">
              <el-tag :type="syncTagType(row.syncStatus)" :class="{ 'sync-error-tag': !!row.syncError }" @click="showSyncError(row)">
                {{ syncLabel(row.syncStatus) }}
              </el-tag>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }"
            ><el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '停用' }}</el-tag></template
          >
        </el-table-column>
        <el-table-column label="操作" width="200" align="center">
          <template #default="{ row }">
            <el-button v-hasPermi="['callcenter:call-queue:update']" link type="primary" icon="Edit" @click="handleUpdate(row)" />
            <el-button v-hasPermi="['callcenter:call-queue:update']" link type="success" :loading="syncingId === row.id" @click="handleSync(row)">
              同步
            </el-button>
            <el-button v-hasPermi="['callcenter:call-queue:delete']" link type="danger" icon="Delete" @click="handleDelete(row)" />
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialog.visible" :title="dialog.title" width="720px" append-to-body>
      <el-alert class="mb-4" type="info" :closable="false" title="队列将来电按分配策略送给技能组中的在线坐席。" />
      <el-form ref="formRef" :model="form" :rules="rules" label-width="120px">
        <el-row :gutter="16">
          <el-col :span="12"
            ><el-form-item label="队列编码" prop="queueCode"><el-input v-model="form.queueCode" placeholder="例如 SUPPORT_QUEUE" /></el-form-item
          ></el-col>
          <el-col :span="12"
            ><el-form-item label="队列名称" prop="queueName"><el-input v-model="form.queueName" /></el-form-item
          ></el-col>
          <el-col :span="12"
            ><el-form-item label="FreeSWITCH节点组" prop="nodeGroupId"
              ><el-select v-model="form.nodeGroupId" style="width: 100%"
                ><el-option v-for="item in nodeGroups" :key="item.id" :label="item.groupName" :value="item.id" /></el-select></el-form-item
          ></el-col>
          <el-col :span="12"
            ><el-form-item label="接听技能组" prop="skillGroupId"
              ><el-select v-model="form.skillGroupId" style="width: 100%"
                ><el-option v-for="item in skillGroups" :key="item.id" :label="item.groupName" :value="item.id" /></el-select></el-form-item
          ></el-col>
          <el-col :span="12"
            ><el-form-item label="分配策略" prop="strategy"
              ><el-select v-model="form.strategy" style="width: 100%"
                ><el-option v-for="item in strategies" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item
          ></el-col>
          <el-col :span="12"
            ><el-form-item label="队列等待音"
              ><el-select v-model="form.waitMediaId" clearable style="width: 100%"
                ><el-option v-for="item in mediaOptions" :key="item.id" :label="item.assetName" :value="item.id" /></el-select></el-form-item
          ></el-col>
          <el-col :span="12">
            <el-form-item label="默认主叫">
              <el-select v-model="form.callerNumberId" clearable filterable style="width: 100%" placeholder="队列回呼/后续外呼使用">
                <el-option v-for="item in callerNumberOptions" :key="item.id" :label="callerNumberLabel(item)" :value="item.id" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-collapse>
          <el-collapse-item title="高级参数" name="advanced">
            <el-row :gutter="16">
              <el-col :span="12"
                ><el-form-item label="最大等待"
                  ><el-input-number v-model="form.maxWaitSeconds" :min="10" :max="86400" /><span class="unit"
                    >秒，逐个分配时必须大于振铃超时</span
                  ></el-form-item
                ></el-col
              >
              <el-col :span="12"
                ><el-form-item label="振铃超时"
                  ><el-input-number v-model="form.ringTimeoutSeconds" :min="5" :max="300" /><span class="unit"
                    >秒，写入 FreeSWITCH leg_timeout</span
                  ></el-form-item
                ></el-col
              >
              <el-col :span="12"
                ><el-form-item label="最大未接次数"
                  ><el-input-number v-model="form.maxNoAnswer" :min="0" :max="100" /><span class="unit">由 CallNexus 控制</span></el-form-item
                ></el-col
              >
              <el-col :span="12"
                ><el-form-item label="话后整理"
                  ><el-input-number v-model="form.wrapUpSeconds" :min="0" :max="3600" /><span class="unit"
                    >秒，结束后自动示闲；0 表示立即示闲</span
                  ></el-form-item
                ></el-col
              >
            </el-row>
          </el-collapse-item>
        </el-collapse>
        <el-form-item class="mt-4" label="状态"><el-switch v-model="form.enabled" active-text="启用" inactive-text="停用" /></el-form-item>
        <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" :rows="3" maxlength="500" /></el-form-item>
      </el-form>
      <template #footer
        ><el-button @click="dialog.visible = false">取消</el-button><el-button type="primary" @click="submit">保存</el-button></template
      >
    </el-dialog>
  </div>
</template>

<script setup name="CallQueue" lang="ts">
import { createCallQueue, deleteCallQueue, getCallQueue, listCallQueues, syncCallQueue, updateCallQueue } from '@/api/callcenter/call-queue';
import { CallQueueForm, CallQueueVO, QueueStrategy } from '@/api/callcenter/call-queue/types';
import { listSkillGroups } from '@/api/callcenter/skill-group';
import { SkillGroupVO } from '@/api/callcenter/skill-group/types';
import { listNodeGroups } from '@/api/callcenter/freeswitch-node-group';
import { NodeGroupVO } from '@/api/callcenter/freeswitch-node-group/types';
import { listMediaAssets } from '@/api/callcenter/media-asset';
import { MediaAssetVO } from '@/api/callcenter/media-asset/types';
import { getCallCenterConfigGroup } from '@/api/callcenter/callcenter-config';
import { listPhoneNumbers } from '@/api/callcenter/phone-number';
import type { PhoneNumberVO } from '@/api/callcenter/phone-number/types';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;
const loading = ref(false);
const syncingId = ref<string | number>();
const queues = ref<CallQueueVO[]>([]);
const skillGroups = ref<SkillGroupVO[]>([]);
const nodeGroups = ref<NodeGroupVO[]>([]);
const mediaOptions = ref<MediaAssetVO[]>([]);
const callerNumberOptions = ref<PhoneNumberVO[]>([]);
const formRef = ref<ElFormInstance>();
const dialog = reactive({ visible: false, title: '' });
const strategies: Array<{ label: string; value: QueueStrategy }> = [
  { label: '最长空闲坐席', value: 'LONGEST_IDLE_AGENT' },
  { label: '轮询', value: 'ROUND_ROBIN' },
  { label: '按优先级顺序', value: 'TOP_DOWN' },
  { label: '全部振铃', value: 'RING_ALL' }
];
const queueDefaults = reactive({
  maxWaitSeconds: 300,
  ringTimeoutSeconds: 20,
  maxNoAnswer: 3,
  wrapUpSeconds: 10
});
const initialForm = (): CallQueueForm => ({
  id: undefined,
  queueCode: '',
  queueName: '',
  nodeGroupId: '',
  skillGroupId: '',
  strategy: 'LONGEST_IDLE_AGENT',
  waitMediaId: undefined,
  callerNumberId: undefined,
  maxWaitSeconds: queueDefaults.maxWaitSeconds,
  ringTimeoutSeconds: queueDefaults.ringTimeoutSeconds,
  maxNoAnswer: queueDefaults.maxNoAnswer,
  wrapUpSeconds: queueDefaults.wrapUpSeconds,
  enabled: true,
  remark: '',
  version: undefined
});
const form = reactive<CallQueueForm>(initialForm());
const rules = {
  queueCode: [{ required: true, pattern: /^[A-Za-z0-9_-]{2,32}$/, message: '请输入合法队列编码', trigger: 'blur' }],
  queueName: [{ required: true, message: '请输入队列名称', trigger: 'blur' }],
  nodeGroupId: [{ required: true, message: '请选择 FreeSWITCH 节点组', trigger: 'change' }],
  skillGroupId: [{ required: true, message: '请选择接听技能组', trigger: 'change' }],
  strategy: [{ required: true, message: '请选择分配策略', trigger: 'change' }]
};
const strategyLabel = (value: QueueStrategy) => strategies.find((item) => item.value === value)?.label || value;
const syncLabel = (value: CallQueueVO['syncStatus']) =>
  ({ NOT_SYNCED: '未同步', SYNCED: '已同步', PARTIAL: '部分成功', FAILED: '失败' })[value] || value;
const syncTagType = (value: CallQueueVO['syncStatus']) =>
  value === 'SYNCED' ? 'success' : value === 'PARTIAL' ? 'warning' : value === 'FAILED' ? 'danger' : 'info';
const numberConfigValue = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const callerNumberLabel = (item: PhoneNumberVO) => `${item.number} - ${item.numberName || item.gatewayName || '主叫号码'}`;
const showSyncError = (row: CallQueueVO) => {
  if (!row.syncError) return;
  ElMessageBox.alert(row.syncError, `${row.queueName}同步失败原因`, {
    confirmButtonText: '关闭',
    type: 'error'
  });
};
const loadQueueDefaults = async () => {
  try {
    const { data } = await getCallCenterConfigGroup('QUEUE');
    const valueOf = (key: string) => data.items.find((item) => item.configKey === key)?.effectiveValue;
    queueDefaults.maxWaitSeconds = numberConfigValue(valueOf('queue.defaultMaxWaitSeconds'), queueDefaults.maxWaitSeconds);
    queueDefaults.ringTimeoutSeconds = numberConfigValue(valueOf('queue.defaultRingTimeoutSeconds'), queueDefaults.ringTimeoutSeconds);
    queueDefaults.maxNoAnswer = numberConfigValue(valueOf('queue.defaultMaxNoAnswer'), queueDefaults.maxNoAnswer);
  } catch {
    return;
  }

  try {
    const { data } = await getCallCenterConfigGroup('AGENT');
    const valueOf = (key: string) => data.items.find((item) => item.configKey === key)?.effectiveValue;
    queueDefaults.wrapUpSeconds = numberConfigValue(valueOf('agent.defaultAfterCallSeconds'), queueDefaults.wrapUpSeconds);
  } catch {
    return;
  }
};
const load = async () => {
  loading.value = true;
  try {
    const [queueRes, skillRes, nodeRes, mediaRes, callerRes] = await Promise.all([
      listCallQueues(),
      listSkillGroups(),
      listNodeGroups(),
      listMediaAssets({ pageNum: 1, pageSize: 1000, category: 'QUEUE_WAIT_MUSIC', enabled: true }),
      listPhoneNumbers({ pageNum: 1, pageSize: 1000, enabled: true })
    ]);
    queues.value = queueRes.data;
    skillGroups.value = skillRes.data.filter((item) => item.enabled);
    nodeGroups.value = nodeRes.data.filter((item) => item.enabled);
    mediaOptions.value = mediaRes.rows.filter((item) => item.publishStatus === 'PUBLISHED');
    callerNumberOptions.value = callerRes.rows.filter((item) => ['CALLER_ID', 'BOTH'].includes(item.numberType) && !!item.gatewayId);
  } finally {
    loading.value = false;
  }
};
const reset = () => Object.assign(form, initialForm());
const handleAdd = () => {
  reset();
  dialog.title = '新增呼叫队列';
  dialog.visible = true;
};
const handleUpdate = async (row: CallQueueVO) => {
  reset();
  Object.assign(form, (await getCallQueue(row.id)).data);
  dialog.title = '修改呼叫队列';
  dialog.visible = true;
};
const submit = () =>
  formRef.value?.validate(async (valid) => {
    if (!valid) return;
    if (form.strategy !== 'RING_ALL' && form.maxWaitSeconds <= form.ringTimeoutSeconds) {
      proxy?.$modal.msgError('逐个分配坐席时，队列最大等待时间必须大于单个坐席振铃超时时间');
      return;
    }
    form.id ? await updateCallQueue(form) : await createCallQueue(form);
    proxy?.$modal.msgSuccess('保存成功');
    dialog.visible = false;
    await load();
  });
const handleDelete = async (row: CallQueueVO) => {
  await proxy?.$modal.confirm(`确认删除呼叫队列“${row.queueName}”吗？`);
  await deleteCallQueue(row.id);
  proxy?.$modal.msgSuccess('删除成功');
  await load();
};
const handleSync = async (row: CallQueueVO) => {
  syncingId.value = row.id;
  try {
    await syncCallQueue(row.id);
    proxy?.$modal.msgSuccess('已同步到 FreeSWITCH');
  } finally {
    syncingId.value = undefined;
    await load();
  }
};
onMounted(async () => {
  await loadQueueDefaults();
  await load();
});
</script>

<style scoped>
.unit {
  margin-left: 8px;
  color: var(--el-text-color-secondary);
}

.sync-error-tag {
  cursor: pointer;
}
</style>
