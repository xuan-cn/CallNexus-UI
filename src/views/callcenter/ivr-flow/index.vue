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
        <el-table-column label="操作" width="220" align="center">
          <template #default="{ row }">
            <el-button v-hasPermi="['callcenter:ivr-flow:update']" link type="primary" icon="Share" @click="openDesigner(row)">设计</el-button>
            <el-button v-hasPermi="['callcenter:ivr-flow:publish']" link type="success" icon="Promotion" @click="handlePublish(row)">发布</el-button>
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
      <IvrFlowDesigner ref="designerRef" v-model="graph" :media-options="mediaOptions" />
    </el-dialog>
  </div>
</template>

<script setup name="IvrFlow" lang="ts">
import { createIvrFlow, deleteIvrFlow, getIvrFlow, listIvrFlows, publishIvrFlow, updateIvrFlow } from '@/api/callcenter/ivr-flow';
import { IvrFlowForm, IvrFlowVO, IvrGraph } from '@/api/callcenter/ivr-flow/types';
import { listNodeGroups } from '@/api/callcenter/freeswitch-node-group';
import { NodeGroupVO } from '@/api/callcenter/freeswitch-node-group/types';
import { listMediaAssets } from '@/api/callcenter/media-asset';
import { MediaAssetVO } from '@/api/callcenter/media-asset/types';
import IvrFlowDesigner from '@/components/callcenter/IvrFlowDesigner/index.vue';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;
const loading = ref(false);
const saving = ref(false);
const publishing = ref(false);
const createDialog = ref(false);
const designerVisible = ref(false);
const createFormRef = ref<ElFormInstance>();
const designerRef = ref<InstanceType<typeof IvrFlowDesigner>>();
const flows = ref<IvrFlowVO[]>([]);
const groups = ref<NodeGroupVO[]>([]);
const mediaOptions = ref<MediaAssetVO[]>([]);
const editing = reactive<Partial<IvrFlowVO>>({});
const graph = ref<IvrGraph>({ nodes: [], edges: [] });
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
    const [flowRes, groupRes, mediaRes] = await Promise.all([
      listIvrFlows(),
      listNodeGroups(),
      listMediaAssets({ pageNum: 1, pageSize: 1000, category: 'IVR_PROMPT', enabled: true })
    ]);
    flows.value = flowRes.data;
    groups.value = groupRes.data.filter((item) => item.enabled);
    mediaOptions.value = mediaRes.rows.filter((item) => item.publishStatus === 'PUBLISHED');
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
</style>
