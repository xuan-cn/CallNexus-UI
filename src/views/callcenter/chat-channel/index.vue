<template>
  <div class="p-2">
    <el-card shadow="hover">
      <el-form :model="query" inline>
        <el-form-item label="渠道名称">
          <el-input v-model="query.channelName" clearable @keyup.enter="load" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.enabled" clearable placeholder="全部" style="width: 130px">
            <el-option label="启用" :value="true" />
            <el-option label="停用" :value="false" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Search" @click="load">查询</el-button>
        </el-form-item>
      </el-form>

      <div class="toolbar">
        <el-button v-hasPermi="['callcenter:chat-channel:create']" type="primary" plain icon="Plus" @click="openCreate">
          新增渠道
        </el-button>
        <span class="hint">渠道 key 用于网站嵌入，不暴露租户 ID 和后台登录凭证。</span>
      </div>

      <el-table v-loading="loading" :data="rows">
        <el-table-column label="渠道名称" prop="channelName" min-width="170" />
        <el-table-column label="渠道 Key" min-width="270">
          <template #default="{ row }">
            <code>{{ row.channelKey }}</code>
          </template>
        </el-table-column>
        <el-table-column label="接待技能组" min-width="160">
          <template #default="{ row }">{{ skillGroupName(row.skillGroupId) }}</template>
        </el-table-column>
        <el-table-column label="AI 接待" min-width="180">
          <template #default="{ row }">
            <el-tag v-if="row.aiEnabled" type="success">{{ aiAgentName(row.aiAgentId) }}</el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '停用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="showEmbed(row)">嵌入代码</el-button>
            <el-button v-hasPermi="['callcenter:chat-channel:update']" link type="primary" @click="openUpdate(row)">修改</el-button>
            <el-button v-hasPermi="['callcenter:chat-channel:delete']" link type="danger" @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <pagination v-show="total > 0" v-model:page="query.pageNum" v-model:limit="query.pageSize" :total="total" @pagination="load" />
    </el-card>

    <el-drawer v-model="drawer.visible" :title="drawer.title" size="640px" append-to-body>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="110px">
        <el-form-item label="渠道名称" prop="channelName">
          <el-input v-model="form.channelName" />
        </el-form-item>
        <el-form-item label="接待技能组">
          <el-select v-model="form.skillGroupId" clearable filterable style="width: 100%">
            <el-option v-for="group in skillGroups" :key="group.id" :label="group.groupName" :value="group.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="AI 接待">
          <el-switch v-model="form.aiEnabled" active-text="启用" inactive-text="停用" />
        </el-form-item>
        <el-form-item v-if="form.aiEnabled" label="AI 助手" prop="aiAgentId">
          <el-select v-model="form.aiAgentId" clearable filterable placeholder="请选择 AI 助手" style="width: 100%">
            <el-option v-for="agent in aiAgents" :key="agent.id" :label="agent.agentName" :value="agent.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="欢迎语">
          <el-input v-model="form.welcomeMessage" type="textarea" :rows="3" maxlength="1000" show-word-limit />
        </el-form-item>
        <el-form-item label="离线提示">
          <el-input v-model="form.offlineMessage" type="textarea" :rows="3" maxlength="1000" show-word-limit />
        </el-form-item>
        <el-form-item label="允许嵌入来源">
          <el-input
            v-model="form.allowedOrigins"
            type="textarea"
            :rows="4"
            placeholder="每行一个完整来源，例如 https://www.example.com；留空表示不限制"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="form.enabled" active-text="启用" inactive-text="停用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="drawer.visible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submit">保存</el-button>
      </template>
    </el-drawer>

    <el-dialog v-model="embed.visible" title="网站嵌入代码" width="760px" append-to-body>
      <el-alert title="把脚本放到网站 body 结束标签之前。渠道停用后，入口将无法建立新会话。" type="info" :closable="false" show-icon />
      <el-input v-model="embed.code" class="embed-code" type="textarea" :rows="7" readonly />
      <template #footer>
        <el-button @click="openVisitorPage">打开访客页</el-button>
        <el-button type="primary" @click="copyEmbed">复制代码</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="ChatChannelManagement" lang="ts">
import {
  ChatChannelForm,
  ChatChannelVO,
  createChatChannel,
  deleteChatChannel,
  getChatChannel,
  listChatChannels,
  updateChatChannel
} from '@/api/callcenter/chat';
import { listAiAgents } from '@/api/callcenter/ai-knowledge';
import type { AiAgentVO } from '@/api/callcenter/ai-knowledge/types';
import { listSkillGroups } from '@/api/callcenter/skill-group';
import type { SkillGroupVO } from '@/api/callcenter/skill-group/types';
import type { ElFormInstance } from 'element-plus';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;
const loading = ref(false);
const submitting = ref(false);
const rows = ref<ChatChannelVO[]>([]);
const total = ref(0);
const skillGroups = ref<SkillGroupVO[]>([]);
const aiAgents = ref<AiAgentVO[]>([]);
const query = reactive({ pageNum: 1, pageSize: 10, channelName: undefined as string | undefined, enabled: undefined as boolean | undefined });
const drawer = reactive({ visible: false, title: '' });
const formRef = ref<ElFormInstance>();
const formId = ref<string | number>();
const form = reactive<ChatChannelForm>({ channelName: '', aiEnabled: false, enabled: true });
const embed = reactive({ visible: false, code: '', channelKey: '' });
const rules = {
  channelName: [{ required: true, message: '请输入渠道名称', trigger: 'blur' }],
  aiAgentId: [{ required: true, message: '请选择 AI 助手', trigger: 'change' }]
};

const load = async () => {
  loading.value = true;
  try {
    const res = await listChatChannels(query);
    rows.value = res.rows || [];
    total.value = res.total || 0;
  } finally {
    loading.value = false;
  }
};

const loadSkillGroups = async () => {
  const res = await listSkillGroups();
  skillGroups.value = (res.data || []).filter((group) => group.enabled);
};

const loadAiAgents = async () => {
  const res = await listAiAgents();
  aiAgents.value = (res.data || []).filter((agent) => agent.enabled);
};

const skillGroupName = (id?: string | number) => {
  if (!id) return '未指定';
  return skillGroups.value.find((group) => String(group.id) === String(id))?.groupName || `技能组 ${id}`;
};

const aiAgentName = (id?: string | number) => {
  if (!id) return 'AI 助手';
  return aiAgents.value.find((agent) => String(agent.id) === String(id))?.agentName || `AI 助手 ${id}`;
};

const reset = () => {
  formId.value = undefined;
  Object.assign(form, {
    channelName: '',
    skillGroupId: undefined,
    aiEnabled: false,
    aiAgentId: undefined,
    welcomeMessage: '您好，请问有什么可以帮您？',
    offlineMessage: '当前暂无客服在线，请稍后再试。',
    allowedOrigins: '',
    enabled: true,
    version: undefined
  });
};

const openCreate = () => {
  reset();
  drawer.title = '新增在线客服渠道';
  drawer.visible = true;
};

const openUpdate = async (row: ChatChannelVO) => {
  reset();
  const detail = (await getChatChannel(row.id)).data;
  formId.value = row.id;
  Object.assign(form, detail);
  drawer.title = '修改在线客服渠道';
  drawer.visible = true;
};

const submit = () =>
  formRef.value?.validate(async (valid) => {
    if (!valid) return;
    submitting.value = true;
    try {
      if (!form.aiEnabled) form.aiAgentId = undefined;
      formId.value ? await updateChatChannel(formId.value, form) : await createChatChannel(form);
      proxy?.$modal.msgSuccess('渠道保存成功');
      drawer.visible = false;
      await load();
    } finally {
      submitting.value = false;
    }
  });

const remove = async (row: ChatChannelVO) => {
  await proxy?.$modal.confirm(`确认删除渠道“${row.channelName}”吗？`);
  await deleteChatChannel(row.id);
  proxy?.$modal.msgSuccess('删除成功');
  await load();
};

const baseUrl = () => `${window.location.origin}${import.meta.env.BASE_URL}`.replace(/\/+$/, '');

const showEmbed = (row: ChatChannelVO) => {
  embed.channelKey = row.channelKey;
  embed.code =
    `<script src="${baseUrl()}/callnexus-chat-widget.js"\n` +
    `  data-base-url="${baseUrl()}"\n` +
    `  data-channel-key="${row.channelKey}"\n` +
    `  data-title="${row.channelName}"><\/script>`;
  embed.visible = true;
};

const copyEmbed = async () => {
  await navigator.clipboard.writeText(embed.code);
  proxy?.$modal.msgSuccess('嵌入代码已复制');
};

const openVisitorPage = () => window.open(`${baseUrl()}/chat/${embed.channelKey}`, '_blank');

onMounted(async () => {
  await Promise.all([loadSkillGroups(), loadAiAgents(), load()]);
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

code {
  color: var(--el-color-primary);
}

.embed-code {
  margin-top: 18px;
}
</style>
