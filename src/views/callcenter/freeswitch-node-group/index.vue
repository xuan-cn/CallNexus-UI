<template>
  <div class="p-2">
    <el-card shadow="hover">
      <template #header>
        <el-button v-hasPermi="['callcenter:freeswitch-node-group:create']" type="primary" plain icon="Plus" @click="handleAdd">新增节点组</el-button>
      </template>
      <el-table v-loading="loading" :data="groups">
        <el-table-column label="节点组编码" prop="groupCode" min-width="150" />
        <el-table-column label="节点组名称" prop="groupName" min-width="170" />
        <el-table-column label="成员数" prop="memberCount" width="90" />
        <el-table-column label="状态" width="90">
          <template #default="{ row }"><el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '停用' }}</el-tag></template>
        </el-table-column>
        <el-table-column label="备注" prop="remark" min-width="200" show-overflow-tooltip />
        <el-table-column label="操作" width="130" align="center">
          <template #default="{ row }">
            <el-button v-hasPermi="['callcenter:freeswitch-node-group:update']" link type="primary" icon="Edit" @click="handleUpdate(row)" />
            <el-button v-hasPermi="['callcenter:freeswitch-node-group:delete']" link type="danger" icon="Delete" @click="handleDelete(row)" />
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialog.visible" :title="dialog.title" width="620px" append-to-body>
      <el-alert class="mb-4" type="info" :closable="false" title="向节点组新增成员后，系统会自动补同步该组当前有效发布的媒体。" />
      <el-form ref="formRef" :model="form" :rules="rules" label-width="110px">
        <el-form-item label="节点组编码" prop="groupCode"><el-input v-model="form.groupCode" /></el-form-item>
        <el-form-item label="节点组名称" prop="groupName"><el-input v-model="form.groupName" /></el-form-item>
        <el-form-item label="成员节点" prop="nodeIds">
          <el-select v-model="form.nodeIds" multiple filterable style="width: 100%">
            <el-option v-for="node in nodes" :key="node.id" :label="`${node.nodeName}（${node.nodeCode}）`" :value="node.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态"><el-switch v-model="form.enabled" active-text="启用" inactive-text="停用" /></el-form-item>
        <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" :rows="3" maxlength="500" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="dialog.visible = false">取消</el-button><el-button type="primary" @click="submit">保存</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup name="FreeSwitchNodeGroup" lang="ts">
import { createNodeGroup, deleteNodeGroup, getNodeGroup, listNodeGroups, updateNodeGroup } from '@/api/callcenter/freeswitch-node-group';
import { NodeGroupForm, NodeGroupVO } from '@/api/callcenter/freeswitch-node-group/types';
import { listFreeSwitchNodes } from '@/api/callcenter/freeswitch-node';
import { FreeSwitchNodeVO } from '@/api/callcenter/freeswitch-node/types';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;
const loading = ref(false);
const groups = ref<NodeGroupVO[]>([]);
const nodes = ref<FreeSwitchNodeVO[]>([]);
const formRef = ref<ElFormInstance>();
const dialog = reactive({ visible: false, title: '' });
const form = reactive<NodeGroupForm>({ groupCode: '', groupName: '', nodeIds: [], enabled: true, remark: '' });
const rules = {
  groupCode: [{ required: true, pattern: /^[A-Za-z0-9_-]{2,32}$/, message: '请输入合法节点组编码', trigger: 'blur' }],
  groupName: [{ required: true, message: '请输入节点组名称', trigger: 'blur' }],
  nodeIds: [{ required: true, type: 'array', min: 1, message: '至少选择一个节点', trigger: 'change' }]
};
const load = async () => {
  loading.value = true;
  try {
    const [groupRes, nodeRes] = await Promise.all([listNodeGroups(), listFreeSwitchNodes({ pageNum: 1, pageSize: 1000, enabled: true })]);
    groups.value = groupRes.data;
    nodes.value = nodeRes.rows;
  } finally { loading.value = false; }
};
const reset = () => Object.assign(form, { id: undefined, groupCode: '', groupName: '', nodeIds: [], enabled: true, remark: '', version: undefined });
const handleAdd = () => { reset(); dialog.title = '新增 FreeSWITCH 节点组'; dialog.visible = true; };
const handleUpdate = async (row: NodeGroupVO) => { reset(); Object.assign(form, (await getNodeGroup(row.id)).data); dialog.title = '修改 FreeSWITCH 节点组'; dialog.visible = true; };
const submit = () => formRef.value?.validate(async (valid) => {
  if (!valid) return;
  form.id ? await updateNodeGroup(form) : await createNodeGroup(form);
  proxy?.$modal.msgSuccess('保存成功'); dialog.visible = false; await load();
});
const handleDelete = async (row: NodeGroupVO) => {
  await proxy?.$modal.confirm(`确认删除节点组 ${row.groupName} 吗？`);
  await deleteNodeGroup(row.id); proxy?.$modal.msgSuccess('删除成功'); await load();
};
onMounted(load);
</script>
