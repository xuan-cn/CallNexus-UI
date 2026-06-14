<template>
  <div class="p-2">
    <el-card shadow="hover">
      <template #header>
        <el-button v-hasPermi="['callcenter:skill-group:create']" type="primary" plain icon="Plus" @click="handleAdd">新增技能组</el-button>
      </template>
      <el-table v-loading="loading" :data="groups">
        <el-table-column label="技能组编码" prop="groupCode" min-width="150" />
        <el-table-column label="技能组名称" prop="groupName" min-width="170" />
        <el-table-column label="坐席数量" prop="memberCount" width="100" />
        <el-table-column label="状态" width="90">
          <template #default="{ row }"><el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '停用' }}</el-tag></template>
        </el-table-column>
        <el-table-column label="备注" prop="remark" min-width="200" show-overflow-tooltip />
        <el-table-column label="操作" width="130" align="center">
          <template #default="{ row }">
            <el-button v-hasPermi="['callcenter:skill-group:update']" link type="primary" icon="Edit" @click="handleUpdate(row)" />
            <el-button v-hasPermi="['callcenter:skill-group:delete']" link type="danger" icon="Delete" @click="handleDelete(row)" />
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialog.visible" :title="dialog.title" width="620px" append-to-body>
      <el-alert class="mb-4" type="info" :closable="false" title="技能组决定哪些坐席可以接听关联队列的来电。" />
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="技能组编码" prop="groupCode"><el-input v-model="form.groupCode" placeholder="例如 SALES_SUPPORT" /></el-form-item>
        <el-form-item label="技能组名称" prop="groupName"><el-input v-model="form.groupName" /></el-form-item>
        <el-form-item label="成员坐席" prop="agentIds">
          <el-select v-model="form.agentIds" multiple filterable style="width: 100%">
            <el-option v-for="agent in agents" :key="agent.id" :label="`${agent.agentName}（${agent.agentCode}）`" :value="agent.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态"><el-switch v-model="form.enabled" active-text="启用" inactive-text="停用" /></el-form-item>
        <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" :rows="3" maxlength="500" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="dialog.visible = false">取消</el-button><el-button type="primary" @click="submit">保存</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup name="SkillGroup" lang="ts">
import { createSkillGroup, deleteSkillGroup, getSkillGroup, listSkillGroups, updateSkillGroup } from '@/api/callcenter/skill-group';
import { SkillGroupForm, SkillGroupVO } from '@/api/callcenter/skill-group/types';
import { listAgents } from '@/api/callcenter/agent';
import { AgentVO } from '@/api/callcenter/agent/types';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;
const loading = ref(false);
const groups = ref<SkillGroupVO[]>([]);
const agents = ref<AgentVO[]>([]);
const formRef = ref<ElFormInstance>();
const dialog = reactive({ visible: false, title: '' });
const form = reactive<SkillGroupForm>({ groupCode: '', groupName: '', agentIds: [], enabled: true, remark: '' });
const rules = {
  groupCode: [{ required: true, pattern: /^[A-Za-z0-9_-]{2,32}$/, message: '请输入合法技能组编码', trigger: 'blur' }],
  groupName: [{ required: true, message: '请输入技能组名称', trigger: 'blur' }],
  agentIds: [{ required: true, type: 'array', min: 1, message: '至少选择一名坐席', trigger: 'change' }]
};
const load = async () => {
  loading.value = true;
  try {
    const [groupRes, agentRes] = await Promise.all([listSkillGroups(), listAgents({ pageNum: 1, pageSize: 1000, enabled: true })]);
    groups.value = groupRes.data;
    agents.value = agentRes.rows;
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
const submit = () => formRef.value?.validate(async (valid) => {
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
onMounted(load);
</script>
