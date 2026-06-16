<template>
  <div class="p-2">
    <el-tabs v-model="activeTab">
      <el-tab-pane label="语音留言" name="messages">
        <el-card class="mb-2" shadow="hover">
          <el-form :model="messageQuery" :inline="true">
            <el-form-item label="留言箱">
              <el-select v-model="messageQuery.voicemailBoxId" clearable filterable style="width: 180px">
                <el-option v-for="box in boxList" :key="box.id" :label="box.boxName" :value="box.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="主叫">
              <el-input v-model="messageQuery.callerNumber" clearable />
            </el-form-item>
            <el-form-item label="状态">
              <el-select v-model="messageQuery.status" clearable style="width: 140px">
                <el-option label="未处理" value="UNHANDLED" />
                <el-option label="已处理" value="HANDLED" />
                <el-option label="无效" value="INVALID" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" icon="Search" @click="loadMessages">查询</el-button>
              <el-button icon="Refresh" @click="resetMessageQuery">重置</el-button>
            </el-form-item>
          </el-form>
        </el-card>

        <el-card shadow="hover">
          <el-table v-loading="messageLoading" :data="messageList">
            <el-table-column label="留言箱" min-width="140">
              <template #default="{ row }">{{ boxName(row.voicemailBoxId) }}</template>
            </el-table-column>
            <el-table-column label="主叫号码" prop="callerNumber" min-width="130" />
            <el-table-column label="被叫号码" prop="calledNumber" min-width="130" />
            <el-table-column label="时长" width="100">
              <template #default="{ row }">{{ durationLabel(row.durationMs) }}</template>
            </el-table-column>
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="row.status === 'UNHANDLED' ? 'warning' : row.status === 'HANDLED' ? 'success' : 'info'">
                  {{ statusLabel(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="时间" min-width="170">
              <template #default="{ row }">{{ formatTime(row.createTime) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="180" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" @click="openMessage(row.id)">详情</el-button>
                <el-button v-if="row.status !== 'HANDLED'" link type="success" @click="markHandled(row.id)">已处理</el-button>
              </template>
            </el-table-column>
          </el-table>
          <pagination
            v-show="messageTotal > 0"
            v-model:page="messageQuery.pageNum"
            v-model:limit="messageQuery.pageSize"
            :total="messageTotal"
            @pagination="loadMessages"
          />
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="留言箱配置" name="boxes">
        <el-card shadow="hover">
          <template #header>
            <el-button type="primary" plain icon="Plus" @click="openBoxForm()">新增留言箱</el-button>
          </template>
          <el-table v-loading="boxLoading" :data="boxList">
            <el-table-column label="编码" prop="boxCode" min-width="140" />
            <el-table-column label="名称" prop="boxName" min-width="160" />
            <el-table-column label="提示音" prop="promptMediaName" min-width="180" />
            <el-table-column label="最长秒数" prop="maxSeconds" width="100" />
            <el-table-column label="状态" width="90">
              <template #default="{ row }">
                <el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '停用' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="创建时间" min-width="170">
              <template #default="{ row }">{{ formatTime(row.createTime) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="130" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" icon="Edit" @click="openBoxForm(row)" />
                <el-button link type="danger" icon="Delete" @click="removeBox(row)" />
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="messageDialog.visible" title="语音留言详情" width="720px" append-to-body>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="留言箱">{{ boxName(currentMessage.voicemailBoxId) }}</el-descriptions-item>
        <el-descriptions-item label="状态">{{ statusLabel(currentMessage.status) }}</el-descriptions-item>
        <el-descriptions-item label="主叫号码">{{ currentMessage.callerNumber || '-' }}</el-descriptions-item>
        <el-descriptions-item label="被叫号码">{{ currentMessage.calledNumber || '-' }}</el-descriptions-item>
        <el-descriptions-item label="通话ID">{{ currentMessage.businessCallId || '-' }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ formatTime(currentMessage.createTime) }}</el-descriptions-item>
      </el-descriptions>
      <audio v-if="currentMessage.playbackUrl" class="mt-4 w-full" controls :src="currentMessage.playbackUrl" />
      <el-empty v-else class="mt-4" description="暂无可播放录音" />
      <el-input v-model="handleRemark" class="mt-4" type="textarea" maxlength="500" show-word-limit placeholder="处理备注" />
      <template #footer>
        <el-button @click="messageDialog.visible = false">关闭</el-button>
        <el-button type="info" @click="handleCurrent('INVALID')">标记无效</el-button>
        <el-button type="primary" @click="handleCurrent('HANDLED')">标记已处理</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="boxDialog.visible" :title="boxDialog.title" width="640px" append-to-body>
      <el-form ref="boxFormRef" :model="boxForm" :rules="boxRules" label-width="110px">
        <el-form-item label="编码" prop="boxCode">
          <el-input v-model="boxForm.boxCode" />
        </el-form-item>
        <el-form-item label="名称" prop="boxName">
          <el-input v-model="boxForm.boxName" />
        </el-form-item>
        <el-form-item label="提示音" prop="promptMediaId">
          <el-select v-model="boxForm.promptMediaId" filterable style="width: 100%">
            <el-option v-for="media in promptOptions" :key="media.id" :label="media.assetName" :value="media.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="最长秒数" prop="maxSeconds">
          <el-input-number v-model="boxForm.maxSeconds" :min="10" :max="600" />
        </el-form-item>
        <el-form-item label="静音阈值" prop="silenceThreshold">
          <el-input-number v-model="boxForm.silenceThreshold" :min="0" :max="1000" />
        </el-form-item>
        <el-form-item label="静音次数" prop="silenceHits">
          <el-input-number v-model="boxForm.silenceHits" :min="1" :max="20" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="boxForm.enabled" active-text="启用" inactive-text="停用" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="boxForm.remark" type="textarea" maxlength="500" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="boxDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="submitBox">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="VoiceMail" lang="ts">
import {
  createVoiceMailBox,
  deleteVoiceMailBox,
  getVoiceMailMessage,
  handleVoiceMailMessage,
  listVoiceMailBoxes,
  listVoiceMailMessages,
  updateVoiceMailBox
} from '@/api/callcenter/voicemail';
import type { VoiceMailBoxForm, VoiceMailBoxVO, VoiceMailMessageQuery, VoiceMailMessageVO } from '@/api/callcenter/voicemail/types';
import { listMediaAssets } from '@/api/callcenter/media-asset';
import type { MediaAssetVO } from '@/api/callcenter/media-asset/types';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;
const activeTab = ref('messages');
const messageLoading = ref(false);
const boxLoading = ref(false);
const messageList = ref<VoiceMailMessageVO[]>([]);
const messageTotal = ref(0);
const boxList = ref<VoiceMailBoxVO[]>([]);
const promptOptions = ref<MediaAssetVO[]>([]);
const messageQuery = reactive<VoiceMailMessageQuery>({ pageNum: 1, pageSize: 10 });
const messageDialog = reactive<DialogOption>({ visible: false, title: '' });
const currentMessage = ref<Partial<VoiceMailMessageVO>>({});
const handleRemark = ref('');
const boxDialog = reactive<DialogOption>({ visible: false, title: '' });
const boxFormRef = ref<ElFormInstance>();
const boxForm = ref<VoiceMailBoxForm>({
  boxCode: '',
  boxName: '',
  promptMediaId: undefined,
  maxSeconds: 120,
  silenceThreshold: 200,
  silenceHits: 5,
  enabled: true
});
const boxRules = {
  boxCode: [{ required: true, message: '请输入留言箱编码', trigger: 'blur' }],
  boxName: [{ required: true, message: '请输入留言箱名称', trigger: 'blur' }],
  promptMediaId: [{ required: true, message: '请选择留言提示音', trigger: 'change' }]
};

const statusLabel = (status?: string) => ({ UNHANDLED: '未处理', HANDLED: '已处理', INVALID: '无效' })[status || ''] || status || '-';
const boxName = (id?: string | number) => boxList.value.find((item) => String(item.id) === String(id))?.boxName || '-';
const durationLabel = (durationMs?: number) => (durationMs ? `${Math.round(durationMs / 1000)}秒` : '-');
const formatTime = (time?: string) => (time ? proxy?.parseTime(time) || '-' : '-');

const loadBoxes = async () => {
  boxLoading.value = true;
  try {
    const res = await listVoiceMailBoxes({ pageNum: 1, pageSize: 1000 });
    boxList.value = res.rows;
  } finally {
    boxLoading.value = false;
  }
};

const loadMessages = async () => {
  messageLoading.value = true;
  try {
    const res = await listVoiceMailMessages(messageQuery);
    messageList.value = res.rows;
    messageTotal.value = res.total;
  } finally {
    messageLoading.value = false;
  }
};

const loadPrompts = async () => {
  const res = await listMediaAssets({ pageNum: 1, pageSize: 1000, category: 'IVR_PROMPT', enabled: true });
  promptOptions.value = res.rows.filter((item) => item.publishStatus === 'PUBLISHED');
};

const resetMessageQuery = () => {
  Object.assign(messageQuery, { pageNum: 1, pageSize: 10, voicemailBoxId: undefined, callerNumber: '', calledNumber: '', status: undefined });
  loadMessages();
};

const openMessage = async (id: string | number) => {
  const res = await getVoiceMailMessage(id);
  currentMessage.value = res.data;
  handleRemark.value = res.data.handleRemark || '';
  messageDialog.visible = true;
};

const handleCurrent = async (status: string) => {
  if (!currentMessage.value.id) return;
  await handleVoiceMailMessage(currentMessage.value.id, { status, handleRemark: handleRemark.value });
  proxy?.$modal.msgSuccess('处理成功');
  messageDialog.visible = false;
  await loadMessages();
};

const markHandled = async (id: string | number) => {
  await handleVoiceMailMessage(id, { status: 'HANDLED' });
  proxy?.$modal.msgSuccess('处理成功');
  await loadMessages();
};

const openBoxForm = (row?: VoiceMailBoxVO) => {
  boxForm.value = row
    ? { ...row }
    : { boxCode: '', boxName: '', promptMediaId: undefined, maxSeconds: 120, silenceThreshold: 200, silenceHits: 5, enabled: true };
  boxDialog.title = row ? '修改留言箱' : '新增留言箱';
  boxDialog.visible = true;
};

const submitBox = () =>
  boxFormRef.value?.validate(async (valid) => {
    if (!valid) return;
    boxForm.value.id ? await updateVoiceMailBox(boxForm.value) : await createVoiceMailBox(boxForm.value);
    proxy?.$modal.msgSuccess('保存成功');
    boxDialog.visible = false;
    await loadBoxes();
  });

const removeBox = async (row: VoiceMailBoxVO) => {
  await proxy?.$modal.confirm(`确认删除留言箱 ${row.boxName} 吗？`);
  await deleteVoiceMailBox(row.id);
  proxy?.$modal.msgSuccess('删除成功');
  await loadBoxes();
};

onMounted(async () => {
  await Promise.all([loadBoxes(), loadPrompts()]);
  await loadMessages();
});
</script>
