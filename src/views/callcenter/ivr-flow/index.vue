<template>
  <div class="p-2">
    <el-card shadow="hover">
      <template #header>
        <el-button v-hasPermi="['callcenter:ivr-flow:create']" type="primary" plain icon="Plus" @click="handleAdd">新增 IVR 流程</el-button>
      </template>
      <el-table v-loading="loading" :data="flows">
        <el-table-column label="流程编码" prop="flowCode" min-width="140" />
        <el-table-column label="流程名称" prop="flowName" min-width="180" />
        <el-table-column label="节点组" prop="nodeGroupName" min-width="170" />
        <el-table-column label="版本" width="90"
          ><template #default="{ row }">v{{ row.latestVersionNo }}</template></el-table-column
        >
        <el-table-column label="发布状态" width="110">
          <template #default="{ row }"
            ><el-tag :type="row.publishStatus === 'PUBLISHED' ? 'success' : 'info'">{{
              row.publishStatus === 'PUBLISHED' ? '已发布' : '草稿'
            }}</el-tag></template
          >
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }"
            ><el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '停用' }}</el-tag></template
          >
        </el-table-column>
        <el-table-column label="操作" width="350" align="center">
          <template #default="{ row }">
            <el-button v-hasPermi="['callcenter:ivr-flow:update']" link type="primary" icon="Share" @click="openDesigner(row)">设计</el-button>
            <el-button v-hasPermi="['callcenter:ivr-flow:query']" link type="primary" icon="Clock" @click="openVersions(row)">版本</el-button>
            <el-button v-hasPermi="['callcenter:ivr-flow:publish']" link type="success" icon="Promotion" @click="handlePublish(row)">发布</el-button>
            <el-button
              v-if="row.publishStatus === 'PUBLISHED'"
              v-hasPermi="['callcenter:ivr-flow:publish']"
              link
              type="warning"
              icon="SwitchButton"
              @click="handleUnpublish(row)"
            >
              取消发布
            </el-button>
            <el-button
              v-hasPermi="['callcenter:ivr-flow:delete']"
              link
              type="danger"
              icon="Delete"
              :disabled="row.publishStatus === 'PUBLISHED'"
              @click="handleDelete(row)"
            />
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="createDialog" title="新增 IVR 流程" width="620px" append-to-body>
      <el-form ref="createFormRef" :model="createForm" :rules="rules" label-width="100px">
        <el-form-item label="流程编码" prop="flowCode"><el-input v-model="createForm.flowCode" placeholder="例如 service_hotline" /></el-form-item>
        <el-form-item label="流程名称" prop="flowName"><el-input v-model="createForm.flowName" /></el-form-item>
        <el-form-item label="节点组" prop="nodeGroupId">
          <el-select v-model="createForm.nodeGroupId" style="width: 100%">
            <el-option v-for="group in groups" :key="group.id" :label="group.groupName" :value="group.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注"><el-input v-model="createForm.remark" type="textarea" :rows="3" maxlength="500" /></el-form-item>
      </el-form>
      <template #footer
        ><el-button @click="createDialog = false">取消</el-button><el-button type="primary" @click="submitCreate">创建并设计</el-button></template
      >
    </el-dialog>

    <el-dialog v-model="designerVisible" title="IVR 流程设计器" fullscreen append-to-body destroy-on-close>
      <div class="designer-toolbar">
        <div>
          <strong>{{ editing.flowName }}</strong>
          <el-tag class="ml-2" size="small">{{ editing.nodeGroupName }}</el-tag>
          <el-tag class="ml-2" size="small" :type="editing.publishStatus === 'PUBLISHED' ? 'success' : 'info'">
            {{ editing.publishStatus === 'PUBLISHED' ? `已发布 v${editing.latestVersionNo}` : '草稿' }}
          </el-tag>
        </div>
        <div>
          <el-button @click="designerVisible = false">关闭</el-button>
          <el-button v-hasPermi="['callcenter:ivr-flow:update']" type="primary" :loading="saving" @click="saveGraph">保存草稿</el-button>
          <el-button v-hasPermi="['callcenter:ivr-flow:publish']" type="success" :loading="publishing" @click="publishFromDesigner"
            >发布版本</el-button
          >
        </div>
      </div>
      <IvrFlowDesigner ref="designerRef" v-model="graph" :media-options="mediaOptions" :queue-options="availableQueueOptions" :business-hours-options="businessHoursOptions" :voicemail-options="voicemailOptions" :ai-agent-options="aiAgentOptions" />
    </el-dialog>

    <el-drawer v-model="versionDrawerVisible" title="IVR 发布版本历史" size="960px" append-to-body>
      <div class="version-header">
        <strong>{{ versionFlow.flowName }}</strong>
        <span class="text-gray-500">当前最新版本：v{{ versionFlow.latestVersionNo || 0 }}</span>
      </div>
      <el-table v-loading="versionLoading" :data="versions">
        <el-table-column label="版本" width="90">
          <template #default="{ row }">
            <el-tag :type="row.currentVersion ? 'success' : 'info'">v{{ row.versionNo }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="发布时间" prop="publishedAt" min-width="170" />
        <el-table-column label="节点" prop="nodeCount" width="70" />
        <el-table-column label="连线" prop="edgeCount" width="70" />
        <el-table-column label="节点类型" min-width="210">
          <template #default="{ row }">{{ nodeTypeSummary(row) }}</template>
        </el-table-column>
        <el-table-column label="与最新版本差异" min-width="280">
          <template #default="{ row }">{{ versionDifference(row) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="140" align="center">
          <template #default="{ row }">
            <el-button link type="primary" @click="previewVersion(row)">预览</el-button>
            <el-button
              v-if="!row.currentVersion"
              v-hasPermi="['callcenter:ivr-flow:publish']"
              link
              type="warning"
              @click="rollbackVersion(row)"
            >
              回滚
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-drawer>

    <el-dialog v-model="previewVisible" :title="`IVR 版本预览：v${previewVersionNo}`" fullscreen append-to-body destroy-on-close>
      <IvrFlowDesigner v-model="previewGraph" :media-options="mediaOptions" :queue-options="queueOptions" :business-hours-options="businessHoursOptions" :voicemail-options="voicemailOptions" :ai-agent-options="aiAgentOptions" readonly />
    </el-dialog>
  </div>
</template>

<script setup name="IvrFlow" lang="ts">
import {
  createIvrFlow,
  deleteIvrFlow,
  getIvrFlow,
  getIvrFlowVersion,
  listIvrFlows,
  listIvrFlowVersions,
  publishIvrFlow,
  rollbackIvrFlowVersion,
  unpublishIvrFlow,
  updateIvrFlow
} from '@/api/callcenter/ivr-flow';
import { IvrFlowForm, IvrFlowVersionVO, IvrFlowVO, IvrGraph, IvrNodeType } from '@/api/callcenter/ivr-flow/types';
import { listNodeGroups } from '@/api/callcenter/freeswitch-node-group';
import { NodeGroupVO } from '@/api/callcenter/freeswitch-node-group/types';
import { listMediaAssets } from '@/api/callcenter/media-asset';
import { MediaAssetVO } from '@/api/callcenter/media-asset/types';
import { listCallQueues } from '@/api/callcenter/call-queue';
import { CallQueueVO } from '@/api/callcenter/call-queue/types';
import { listBusinessHoursPlans } from '@/api/callcenter/business-hours';
import type { BusinessHoursPlan } from '@/api/callcenter/business-hours/types';
import { listVoiceMailBoxes } from '@/api/callcenter/voicemail';
import type { VoiceMailBoxVO } from '@/api/callcenter/voicemail/types';
import { listAiAgents } from '@/api/callcenter/ai-knowledge';
import type { AiAgentVO } from '@/api/callcenter/ai-knowledge/types';
import IvrFlowDesigner from '@/components/callcenter/IvrFlowDesigner/index.vue';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;
const loading = ref(false);
const saving = ref(false);
const publishing = ref(false);
const createDialog = ref(false);
const designerVisible = ref(false);
const versionDrawerVisible = ref(false);
const versionLoading = ref(false);
const previewVisible = ref(false);
const previewVersionNo = ref(0);
const createFormRef = ref<ElFormInstance>();
const designerRef = ref<InstanceType<typeof IvrFlowDesigner>>();
const flows = ref<IvrFlowVO[]>([]);
const groups = ref<NodeGroupVO[]>([]);
const mediaOptions = ref<MediaAssetVO[]>([]);
const queueOptions = ref<CallQueueVO[]>([]);
const businessHoursOptions = ref<BusinessHoursPlan[]>([]);
const voicemailOptions = ref<VoiceMailBoxVO[]>([]);
const aiAgentOptions = ref<AiAgentVO[]>([]);
const editing = reactive<Partial<IvrFlowVO>>({});
const graph = ref<IvrGraph>({ nodes: [], edges: [] });
const previewGraph = ref<IvrGraph>({ nodes: [], edges: [] });
const versions = ref<IvrFlowVersionVO[]>([]);
const versionFlow = reactive<Partial<IvrFlowVO>>({});
const nodeTypeLabels: Record<IvrNodeType, string> = {
  START: '开始',
  PLAYBACK: '播放',
  DTMF: '按键',
  EXTENSION: '分机',
  QUEUE: '队列',
  BUSINESS_HOURS: '工作时间',
  VOICEMAIL: '语音留言',
  AI_AGENT: 'AI 语音助手',
  HANGUP: '挂断'
};
const availableQueueOptions = computed(() => {
  const flowNodeIds = (editing.nodeIds || []).map(String);
  return queueOptions.value.filter((queue) => {
    const queueNodeIds = (queue.nodeIds || []).map(String);
    return flowNodeIds.length > 0 && flowNodeIds.every((nodeId) => queueNodeIds.includes(nodeId));
  });
});
const rules = {
  flowCode: [{ required: true, pattern: /^[A-Za-z0-9_-]{2,32}$/, message: '请输入合法流程编码', trigger: 'blur' }],
  flowName: [{ required: true, message: '请输入流程名称', trigger: 'blur' }],
  nodeGroupId: [{ required: true, message: '请选择节点组', trigger: 'change' }]
};
const createForm = reactive<IvrFlowForm>({ flowCode: '', flowName: '', nodeGroupId: undefined, draftGraphJson: '', enabled: true, remark: '' });
const defaultGraph = (): IvrGraph => ({
  nodes: [
    { id: 'start', type: 'START', name: '开始', x: 180, y: 220, config: {} },
    { id: 'hangup', type: 'HANGUP', name: '挂断', x: 500, y: 220, config: {} }
  ],
  edges: [{ id: 'start_hangup', source: 'start', target: 'hangup', condition: '' }]
});
const load = async () => {
  loading.value = true;
  try {
    const [flowRes, groupRes, mediaRes, queueRes, businessHoursRes, voicemailRes, aiAgentRes] = await Promise.all([
      listIvrFlows(),
      listNodeGroups(),
      listMediaAssets({ pageNum: 1, pageSize: 1000, category: 'IVR_PROMPT', enabled: true }),
      listCallQueues(),
      listBusinessHoursPlans(),
      listVoiceMailBoxes({ pageNum: 1, pageSize: 1000, enabled: true }),
      listAiAgents()
    ]);
    flows.value = flowRes.data;
    groups.value = groupRes.data.filter((item) => item.enabled);
    mediaOptions.value = mediaRes.rows.filter((item) => item.publishStatus === 'PUBLISHED');
    queueOptions.value = queueRes.data.filter((item) => item.enabled && item.syncStatus === 'SYNCED');
    businessHoursOptions.value = businessHoursRes.data.filter((item) => item.enabled);
    voicemailOptions.value = voicemailRes.rows.filter((item) => item.enabled);
    aiAgentOptions.value = aiAgentRes.data.filter((item) => item.enabled);
  } finally {
    loading.value = false;
  }
};
const handleAdd = () => {
  Object.assign(createForm, {
    id: undefined,
    flowCode: '',
    flowName: '',
    nodeGroupId: groups.value.length === 1 ? groups.value[0].id : undefined,
    enabled: true,
    remark: ''
  });
  createDialog.value = true;
};
const submitCreate = () =>
  createFormRef.value?.validate(async (valid) => {
    if (!valid) return;
    createForm.draftGraphJson = JSON.stringify(defaultGraph());
    const res = await createIvrFlow(createForm);
    createDialog.value = false;
    await load();
    await openDesigner({ id: res.data } as IvrFlowVO);
  });
const openDesigner = async (row: IvrFlowVO) => {
  const flow = (await getIvrFlow(row.id)).data;
  Object.assign(editing, flow);
  graph.value = JSON.parse(flow.draftGraphJson) as IvrGraph;
  designerVisible.value = true;
};
const currentGraph = () => designerRef.value?.getGraph() || graph.value;
const saveGraph = async () => {
  saving.value = true;
  try {
    graph.value = currentGraph();
    await updateIvrFlow({
      id: editing.id,
      flowCode: editing.flowCode!,
      flowName: editing.flowName!,
      nodeGroupId: editing.nodeGroupId,
      draftGraphJson: JSON.stringify(graph.value),
      enabled: editing.enabled!,
      remark: editing.remark,
      version: editing.version
    });
    proxy?.$modal.msgSuccess('草稿保存成功');
    Object.assign(editing, (await getIvrFlow(editing.id!)).data);
    await load();
  } finally {
    saving.value = false;
  }
};
const handlePublish = async (row: IvrFlowVO) => {
  await proxy?.$modal.confirm(`确认发布 IVR 流程“${row.flowName}”的新版本吗？`);
  await publishIvrFlow(row.id);
  proxy?.$modal.msgSuccess('发布成功');
  await load();
};
const loadVersions = async () => {
  if (!versionFlow.id) return;
  versionLoading.value = true;
  try {
    versions.value = (await listIvrFlowVersions(versionFlow.id)).data;
  } finally {
    versionLoading.value = false;
  }
};
const openVersions = async (row: IvrFlowVO) => {
  Object.assign(versionFlow, row);
  versionDrawerVisible.value = true;
  await loadVersions();
};
const nodeTypeSummary = (version: IvrFlowVersionVO) =>
  Object.entries(version.nodeTypeCounts || {})
    .map(([type, count]) => `${nodeTypeLabels[type as IvrNodeType] || type} ${count}`)
    .join('、');
const versionDifference = (version: IvrFlowVersionVO) => {
  const latest = versions.value.find((item) => item.versionNo === versionFlow.latestVersionNo);
  if (!latest || latest.versionNo === version.versionNo) {
    return '当前最新版本';
  }
  const signed = (value: number) => (value > 0 ? `+${value}` : String(value));
  const typeChanges = Object.keys({ ...latest.nodeTypeCounts, ...version.nodeTypeCounts })
    .map((type) => {
      const difference = (version.nodeTypeCounts[type as IvrNodeType] || 0) - (latest.nodeTypeCounts[type as IvrNodeType] || 0);
      return difference === 0 ? '' : `${nodeTypeLabels[type as IvrNodeType] || type} ${signed(difference)}`;
    })
    .filter(Boolean)
    .join('、');
  const summary = `节点 ${signed(version.nodeCount - latest.nodeCount)}，连线 ${signed(version.edgeCount - latest.edgeCount)}`;
  return typeChanges ? `${summary}；${typeChanges}` : summary;
};
const previewVersion = async (version: IvrFlowVersionVO) => {
  const detail = (await getIvrFlowVersion(version.flowId, version.versionNo)).data;
  if (!detail.graphJson) {
    proxy?.$modal.msgError('版本流程数据不存在');
    return;
  }
  previewVersionNo.value = detail.versionNo;
  previewGraph.value = JSON.parse(detail.graphJson) as IvrGraph;
  previewVisible.value = true;
};
const rollbackVersion = async (version: IvrFlowVersionVO) => {
  await proxy?.$modal.confirm(`确认将流程回滚到 v${version.versionNo} 吗？系统将创建一个新的发布版本，不会覆盖历史记录。`);
  await rollbackIvrFlowVersion(version.flowId, version.versionNo);
  proxy?.$modal.msgSuccess(`已基于 v${version.versionNo} 创建新的发布版本`);
  await load();
  Object.assign(versionFlow, flows.value.find((flow) => String(flow.id) === String(version.flowId)) || versionFlow);
  await loadVersions();
};
const handleUnpublish = async (row: IvrFlowVO) => {
  await proxy?.$modal.confirm(`确认取消发布 IVR 流程“${row.flowName}”吗？历史发布版本将继续保留。`);
  await unpublishIvrFlow(row.id);
  proxy?.$modal.msgSuccess('已取消发布');
  await load();
};
const publishFromDesigner = async () => {
  publishing.value = true;
  try {
    await saveGraph();
    await publishIvrFlow(editing.id!);
    proxy?.$modal.msgSuccess('发布成功');
    Object.assign(editing, (await getIvrFlow(editing.id!)).data);
    await load();
  } finally {
    publishing.value = false;
  }
};
const handleDelete = async (row: IvrFlowVO) => {
  await proxy?.$modal.confirm(`确认删除 IVR 流程“${row.flowName}”吗？`);
  await deleteIvrFlow(row.id);
  await load();
};
onMounted(load);
</script>

<style scoped>
.designer-toolbar {
  height: 54px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  border-bottom: 1px solid #e5e7eb;
}
.version-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
}
</style>
