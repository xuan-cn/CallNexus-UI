<template>
  <div class="p-2">
    <el-card shadow="hover">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="TTS服务商" name="provider">
          <div class="mb-3">
            <el-button v-hasPermi="['callcenter:ai-speech:create']" type="primary" plain icon="Plus" @click="openProviderDialog()">
              新增服务商
            </el-button>
          </div>
          <el-table v-loading="providerLoading" :data="providers">
            <el-table-column label="编码" prop="providerCode" min-width="140" />
            <el-table-column label="名称" prop="providerName" min-width="160" />
            <el-table-column label="类型" prop="providerType" width="120" />
            <el-table-column label="请求地址" prop="endpointUrl" min-width="260" show-overflow-tooltip />
            <el-table-column label="认证方式" prop="authType" width="120" />
            <el-table-column label="默认音色" prop="defaultVoice" width="120" />
            <el-table-column label="格式" prop="defaultFormat" width="90" />
            <el-table-column label="采样率" prop="defaultSampleRate" width="100" />
            <el-table-column label="状态" width="90">
              <template #default="{ row }">
                <el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '停用' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="220" align="center" fixed="right">
              <template #default="{ row }">
                <el-button v-hasPermi="['callcenter:ai-speech:test']" link type="primary" @click="openTestDialog(row)">测试</el-button>
                <el-button v-hasPermi="['callcenter:ai-speech:update']" link type="primary" @click="openProviderDialog(row)">修改</el-button>
                <el-button v-hasPermi="['callcenter:ai-speech:delete']" link type="danger" @click="removeProvider(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="语音模板" name="template">
          <div class="mb-3">
            <el-button v-hasPermi="['callcenter:ai-speech:create']" type="primary" plain icon="Plus" @click="openTemplateDialog()">
              新增模板
            </el-button>
          </div>
          <el-table v-loading="templateLoading" :data="templates">
            <el-table-column label="模板编码" prop="templateCode" min-width="180" />
            <el-table-column label="模板名称" prop="templateName" min-width="160" />
            <el-table-column label="业务类型" prop="businessType" min-width="180" />
            <el-table-column label="模板内容" prop="templateText" min-width="280" show-overflow-tooltip />
            <el-table-column label="默认音色" prop="defaultVoice" width="120" />
            <el-table-column label="状态" width="90">
              <template #default="{ row }">
                <el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '停用' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="150" align="center" fixed="right">
              <template #default="{ row }">
                <el-button v-hasPermi="['callcenter:ai-speech:update']" link type="primary" @click="openTemplateDialog(row)">修改</el-button>
                <el-button v-hasPermi="['callcenter:ai-speech:delete']" link type="danger" @click="removeTemplate(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="生成任务" name="task">
          <el-form :inline="true" :model="taskQuery" class="mb-2">
            <el-form-item label="业务类型">
              <el-input v-model="taskQuery.businessType" clearable placeholder="AGENT_NUMBER_PROMPT" />
            </el-form-item>
            <el-form-item label="状态">
              <el-select v-model="taskQuery.status" clearable style="width: 140px">
                <el-option label="处理中" value="PROCESSING" />
                <el-option label="成功" value="SUCCESS" />
                <el-option label="失败" value="FAILED" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" icon="Search" @click="loadTasks">查询</el-button>
              <el-button icon="Refresh" @click="resetTaskQuery">重置</el-button>
            </el-form-item>
          </el-form>
          <el-table v-loading="taskLoading" :data="tasks">
            <el-table-column label="任务ID" prop="id" min-width="170" />
            <el-table-column label="业务类型" prop="businessType" min-width="170" />
            <el-table-column label="业务ID" prop="businessId" min-width="170" />
            <el-table-column label="文本" prop="textContent" min-width="260" show-overflow-tooltip />
            <el-table-column label="输出媒体" prop="outputMediaId" min-width="170" />
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="taskStatusType(row.status)">{{ taskStatusText(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="失败原因" prop="failureReason" min-width="240" show-overflow-tooltip />
            <el-table-column label="开始时间" prop="startedAt" width="180" />
            <el-table-column label="完成时间" prop="finishedAt" width="180" />
          </el-table>
          <pagination v-show="taskTotal > 0" v-model:page="taskQuery.pageNum" v-model:limit="taskQuery.pageSize" :total="taskTotal" @pagination="loadTasks" />
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <el-dialog v-model="providerDialog.visible" :title="providerDialog.title" width="720px" append-to-body>
      <el-form ref="providerFormRef" :model="providerForm" :rules="providerRules" label-width="120px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="服务商编码" prop="providerCode"><el-input v-model="providerForm.providerCode" /></el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="服务商名称" prop="providerName"><el-input v-model="providerForm.providerName" /></el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="服务商类型" prop="providerType">
              <el-select v-model="providerForm.providerType" style="width: 100%" @change="handleProviderTypeChange">
                <el-option label="通用HTTP" value="CUSTOM_HTTP" />
                <el-option label="阿里云百炼" value="ALIYUN_DASHSCOPE" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="请求方法" prop="httpMethod">
              <el-select v-model="providerForm.httpMethod" style="width: 100%"><el-option label="POST" value="POST" /></el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="请求地址" prop="endpointUrl"><el-input v-model="providerForm.endpointUrl" /></el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="认证方式" prop="authType">
              <el-select v-model="providerForm.authType" style="width: 100%">
                <el-option label="无" value="NONE" />
                <el-option label="Bearer Token" value="BEARER" />
                <el-option label="Header Token" value="HEADER" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="Header名称" prop="authHeaderName"><el-input v-model="providerForm.authHeaderName" placeholder="Header Token时填写" /></el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="Token" prop="authToken"><el-input v-model="providerForm.authToken" type="password" show-password placeholder="修改时留空表示不修改" /></el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="默认音色" prop="defaultVoice"><el-input v-model="providerForm.defaultVoice" /></el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="默认格式" prop="defaultFormat">
              <el-select v-model="providerForm.defaultFormat" style="width: 100%"><el-option label="wav" value="wav" /><el-option label="mp3" value="mp3" /></el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="采样率" prop="defaultSampleRate"><el-input-number v-model="providerForm.defaultSampleRate" :min="8000" :step="1000" style="width: 100%" /></el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="超时秒数" prop="timeoutSeconds"><el-input-number v-model="providerForm.timeoutSeconds" :min="1" :max="120" style="width: 100%" /></el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态" prop="enabled"><el-switch v-model="providerForm.enabled" /></el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="备注" prop="remark"><el-input v-model="providerForm.remark" type="textarea" :rows="2" /></el-form-item>
          </el-col>
          <el-col v-if="providerForm.providerType === 'ALIYUN_DASHSCOPE'" :span="24">
            <el-alert
              type="info"
              show-icon
              :closable="false"
              title="阿里云百炼配置：Token 填 DashScope API Key，推荐地址使用 /compatible-mode/v1/audio/speech，备注填写 {&quot;model&quot;:&quot;qwen-tts&quot;}，默认音色可填 Cherry。"
            />
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="providerDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="submitProvider">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="templateDialog.visible" :title="templateDialog.title" width="680px" append-to-body>
      <el-form ref="templateFormRef" :model="templateForm" :rules="templateRules" label-width="110px">
        <el-form-item label="模板编码" prop="templateCode"><el-input v-model="templateForm.templateCode" /></el-form-item>
        <el-form-item label="模板名称" prop="templateName"><el-input v-model="templateForm.templateName" /></el-form-item>
        <el-form-item label="业务类型" prop="businessType"><el-input v-model="templateForm.businessType" placeholder="AGENT_NUMBER_PROMPT" /></el-form-item>
        <el-form-item label="模板内容" prop="templateText">
          <el-input v-model="templateForm.templateText" type="textarea" :rows="4" placeholder="工号{extension}为您服务" />
        </el-form-item>
        <el-form-item label="默认音色" prop="defaultVoice"><el-input v-model="templateForm.defaultVoice" /></el-form-item>
        <el-form-item label="状态" prop="enabled"><el-switch v-model="templateForm.enabled" /></el-form-item>
        <el-form-item label="备注" prop="remark"><el-input v-model="templateForm.remark" type="textarea" :rows="2" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="templateDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="submitTemplate">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="testDialog.visible" title="测试TTS生成" width="560px" append-to-body>
      <el-form label-width="90px">
        <el-form-item label="测试文本"><el-input v-model="testForm.text" type="textarea" :rows="3" /></el-form-item>
        <el-form-item label="音色"><el-input v-model="testForm.voice" placeholder="留空使用默认音色" /></el-form-item>
      </el-form>
      <audio v-if="testResult.playbackUrl" :src="testResult.playbackUrl" controls style="width: 100%" />
      <el-alert v-if="testResult.failureReason" class="mt-2" type="error" :title="testResult.failureReason" show-icon />
      <template #footer>
        <el-button @click="testDialog.visible = false">关闭</el-button>
        <el-button type="primary" :loading="testing" @click="submitTest">生成测试音频</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="AiSpeech" lang="ts">
import {
  createSpeechTemplate,
  createTtsProvider,
  deleteSpeechTemplate,
  deleteTtsProvider,
  listSpeechTasks,
  listSpeechTemplates,
  listTtsProviders,
  testTtsProvider,
  updateSpeechTemplate,
  updateTtsProvider
} from '@/api/callcenter/ai-speech';
import {
  AiSpeechTaskQuery,
  AiSpeechTaskVO,
  AiSpeechTemplateForm,
  AiSpeechTemplateVO,
  AiTtsProviderForm,
  AiTtsProviderVO,
  TtsTestVO
} from '@/api/callcenter/ai-speech/types';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;
const activeTab = ref('provider');
const providerLoading = ref(false);
const templateLoading = ref(false);
const taskLoading = ref(false);
const providers = ref<AiTtsProviderVO[]>([]);
const templates = ref<AiSpeechTemplateVO[]>([]);
const tasks = ref<AiSpeechTaskVO[]>([]);
const taskTotal = ref(0);
const providerFormRef = ref<ElFormInstance>();
const templateFormRef = ref<ElFormInstance>();
const providerDialog = reactive<DialogOption>({ visible: false, title: '' });
const templateDialog = reactive<DialogOption>({ visible: false, title: '' });
const testDialog = reactive<DialogOption>({ visible: false, title: '' });
const testing = ref(false);
const testingProviderId = ref<string | number>();

const defaultProviderForm: AiTtsProviderForm = {
  providerCode: '',
  providerName: '',
  providerType: 'CUSTOM_HTTP',
  endpointUrl: '',
  httpMethod: 'POST',
  authType: 'NONE',
  defaultVoice: 'default',
  defaultFormat: 'wav',
  defaultSampleRate: 8000,
  timeoutSeconds: 30,
  enabled: true
};
const providerForm = ref<AiTtsProviderForm>({ ...defaultProviderForm });
const defaultTemplateForm: AiSpeechTemplateForm = {
  templateCode: '',
  templateName: '',
  businessType: 'AGENT_NUMBER_PROMPT',
  templateText: '工号{extension}为您服务',
  defaultVoice: 'default',
  enabled: true
};
const templateForm = ref<AiSpeechTemplateForm>({ ...defaultTemplateForm });
const taskQuery = ref<AiSpeechTaskQuery>({ pageNum: 1, pageSize: 10 });
const testForm = ref({ text: '工号1001为您服务', voice: '', format: 'wav', sampleRate: 8000 });
const testResult = ref<TtsTestVO>({ status: '' });

const providerRules = {
  providerCode: [{ required: true, message: '服务商编码不能为空', trigger: 'blur' }],
  providerName: [{ required: true, message: '服务商名称不能为空', trigger: 'blur' }],
  endpointUrl: [{ required: true, message: '请求地址不能为空', trigger: 'blur' }]
};
const templateRules = {
  templateCode: [{ required: true, message: '模板编码不能为空', trigger: 'blur' }],
  templateName: [{ required: true, message: '模板名称不能为空', trigger: 'blur' }],
  businessType: [{ required: true, message: '业务类型不能为空', trigger: 'blur' }],
  templateText: [{ required: true, message: '模板内容不能为空', trigger: 'blur' }]
};

const loadProviders = async () => {
  providerLoading.value = true;
  try {
    const res = await listTtsProviders();
    providers.value = res.data || [];
  } finally {
    providerLoading.value = false;
  }
};
const loadTemplates = async () => {
  templateLoading.value = true;
  try {
    const res = await listSpeechTemplates();
    templates.value = res.data || [];
  } finally {
    templateLoading.value = false;
  }
};
const loadTasks = async () => {
  taskLoading.value = true;
  try {
    const res = await listSpeechTasks(taskQuery.value);
    tasks.value = res.rows;
    taskTotal.value = res.total;
  } finally {
    taskLoading.value = false;
  }
};
const reloadAll = () => Promise.all([loadProviders(), loadTemplates(), loadTasks()]);

const openProviderDialog = (row?: AiTtsProviderVO) => {
  providerForm.value = row ? { ...defaultProviderForm, ...row, authToken: '' } : { ...defaultProviderForm };
  providerDialog.title = row ? '修改TTS服务商' : '新增TTS服务商';
  providerDialog.visible = true;
};
const handleProviderTypeChange = (type: string) => {
  if (type !== 'ALIYUN_DASHSCOPE') {
    return;
  }
  providerForm.value.endpointUrl = providerForm.value.endpointUrl || 'https://dashscope.aliyuncs.com/compatible-mode/v1/audio/speech';
  providerForm.value.authType = 'BEARER';
  providerForm.value.authHeaderName = '';
  providerForm.value.defaultVoice = providerForm.value.defaultVoice && providerForm.value.defaultVoice !== 'default' ? providerForm.value.defaultVoice : 'Cherry';
  providerForm.value.defaultFormat = providerForm.value.defaultFormat || 'wav';
  providerForm.value.defaultSampleRate = providerForm.value.defaultSampleRate || 8000;
  providerForm.value.remark = providerForm.value.remark || '{"model":"qwen-tts"}';
};
const submitProvider = () =>
  providerFormRef.value?.validate(async (valid) => {
    if (!valid) return;
    providerForm.value.id ? await updateTtsProvider(providerForm.value) : await createTtsProvider(providerForm.value);
    proxy?.$modal.msgSuccess('保存成功');
    providerDialog.visible = false;
    await loadProviders();
  });
const removeProvider = async (row: AiTtsProviderVO) => {
  await proxy?.$modal.confirm(`确认删除TTS服务商 ${row.providerName} 吗？`);
  await deleteTtsProvider(row.id);
  proxy?.$modal.msgSuccess('删除成功');
  await loadProviders();
};

const openTemplateDialog = (row?: AiSpeechTemplateVO) => {
  templateForm.value = row ? { ...defaultTemplateForm, ...row } : { ...defaultTemplateForm };
  templateDialog.title = row ? '修改语音模板' : '新增语音模板';
  templateDialog.visible = true;
};
const submitTemplate = () =>
  templateFormRef.value?.validate(async (valid) => {
    if (!valid) return;
    templateForm.value.id ? await updateSpeechTemplate(templateForm.value) : await createSpeechTemplate(templateForm.value);
    proxy?.$modal.msgSuccess('保存成功');
    templateDialog.visible = false;
    await loadTemplates();
  });
const removeTemplate = async (row: AiSpeechTemplateVO) => {
  await proxy?.$modal.confirm(`确认删除语音模板 ${row.templateName} 吗？`);
  await deleteSpeechTemplate(row.id);
  proxy?.$modal.msgSuccess('删除成功');
  await loadTemplates();
};

const openTestDialog = (row: AiTtsProviderVO) => {
  testingProviderId.value = row.id;
  testResult.value = { status: '' };
  testForm.value = { text: '工号1001为您服务', voice: row.defaultVoice || '', format: row.defaultFormat || 'wav', sampleRate: row.defaultSampleRate || 8000 };
  testDialog.visible = true;
};
const submitTest = async () => {
  if (!testingProviderId.value) return;
  testing.value = true;
  try {
    const res = await testTtsProvider(testingProviderId.value, testForm.value);
    testResult.value = res.data;
    if (res.data.status === 'SUCCESS') {
      proxy?.$modal.msgSuccess('测试音频生成成功');
    }
  } finally {
    testing.value = false;
  }
};

const resetTaskQuery = () => {
  taskQuery.value = { pageNum: 1, pageSize: 10 };
  loadTasks();
};
const taskStatusText = (status: string) => ({ PROCESSING: '处理中', SUCCESS: '成功', FAILED: '失败' }[status] || status);
const taskStatusType = (status: string) => ({ PROCESSING: 'warning', SUCCESS: 'success', FAILED: 'danger' }[status] || 'info');

onMounted(reloadAll);
</script>
