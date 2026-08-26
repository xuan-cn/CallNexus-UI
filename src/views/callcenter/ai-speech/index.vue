<template>
  <div class="p-2 ai-speech-page">
    <el-card shadow="hover">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="语音服务商" name="provider">
          <div class="mb-3">
            <el-button v-hasPermi="['callcenter:ai-speech:create']" type="primary" plain icon="Plus" @click="openProviderDrawer()">
              新增服务商
            </el-button>
          </div>
          <el-table v-loading="providerLoading" :data="providers">
            <el-table-column label="编码" prop="providerCode" min-width="150" />
            <el-table-column label="名称" prop="providerName" min-width="160" />
            <el-table-column label="类型" prop="providerType" width="170" />
            <el-table-column label="能力" min-width="310">
              <template #default="{ row }">
                <el-space wrap>
                  <el-tag v-if="row.ttsEnabled" type="success">TTS</el-tag>
                  <el-tag v-if="row.streamingTtsEnabled" type="success">实时 TTS</el-tag>
                  <el-tag v-if="row.recordingAsrEnabled" type="primary">录音 ASR</el-tag>
                  <el-tag v-if="row.streamingAsrEnabled" type="warning">流式 ASR</el-tag>
                  <span v-if="!row.ttsEnabled && !row.streamingTtsEnabled && !row.recordingAsrEnabled && !row.streamingAsrEnabled">-</span>
                </el-space>
              </template>
            </el-table-column>
            <el-table-column label="默认用途" min-width="430">
              <template #default="{ row }">
                <el-space class="default-purpose-tags">
                  <el-tag v-if="row.defaultTts" effect="dark" type="success">默认 TTS</el-tag>
                  <el-tag v-if="row.defaultStreamingTts" effect="dark" type="success">默认实时 TTS</el-tag>
                  <el-tag v-if="row.defaultRecordingAsr" effect="dark">默认录音 ASR</el-tag>
                  <el-tag v-if="row.defaultStreamingAsr" effect="dark" type="warning">默认流式 ASR</el-tag>
                  <span v-if="!row.defaultTts && !row.defaultStreamingTts && !row.defaultRecordingAsr && !row.defaultStreamingAsr">-</span>
                </el-space>
              </template>
            </el-table-column>
            <el-table-column label="认证" width="100">
              <template #default="{ row }">
                <el-tag :type="row.authConfigured ? 'success' : 'info'">{{ row.authConfigured ? '已配置' : '未配置' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="90">
              <template #default="{ row }">
                <el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '停用' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="最近测试" width="150">
              <template #default="{ row }">
                <el-tooltip v-if="row.lastTestStatus" :content="row.lastTestMessage || ''" placement="top">
                  <div class="last-test">
                    <el-tag size="small" :type="row.lastTestStatus === 'SUCCESS' ? 'success' : 'danger'">
                      {{ row.lastTestStatus === 'SUCCESS' ? '通过' : '失败' }}
                    </el-tag>
                    <small>{{ row.lastTestTime || '-' }}</small>
                  </div>
                </el-tooltip>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="220" align="center" fixed="right">
              <template #default="{ row }">
                <div class="provider-actions">
                  <el-dropdown v-hasPermi="['callcenter:ai-speech:test']" trigger="click" @command="(command) => handleProviderTest(command, row)">
                    <el-button link type="primary" :loading="providerTestRunning === row.id">测试<el-icon class="el-icon--right"><ArrowDown /></el-icon></el-button>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item command="connection">连接检查</el-dropdown-item>
                        <el-dropdown-item v-if="row.ttsEnabled" command="tts">普通 TTS</el-dropdown-item>
                        <el-dropdown-item v-if="row.recordingAsrEnabled" command="asr">录音 ASR</el-dropdown-item>
                        <el-dropdown-item v-if="row.streamingTtsEnabled" command="streamingTts">实时 TTS 握手</el-dropdown-item>
                        <el-dropdown-item v-if="row.streamingAsrEnabled" command="streamingAsr">实时 ASR 握手</el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                  <el-button v-hasPermi="['callcenter:ai-speech:update']" link type="primary" @click="openProviderDrawer(row)">修改</el-button>
                  <el-button v-hasPermi="['callcenter:ai-speech:delete']" link type="danger" @click="removeProvider(row)">删除</el-button>
                </div>
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
            <el-table-column label="模板内容" prop="templateText" min-width="300" show-overflow-tooltip />
            <el-table-column label="默认音色" prop="defaultVoice" width="140" />
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

        <el-tab-pane label="语音任务" name="task">
          <el-form :inline="true" :model="taskQuery" class="mb-2">
            <el-form-item label="任务类型">
              <el-select v-model="taskQuery.taskType" clearable style="width: 150px">
                <el-option label="TTS生成" value="TTS_GENERATE" />
                <el-option label="ASR识别" value="ASR" />
                <el-option label="录音转写" value="CALL_TRANSCRIBE" />
              </el-select>
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
            <el-table-column label="任务类型" prop="taskType" width="140" />
            <el-table-column label="业务类型" prop="businessType" width="160" />
            <el-table-column label="服务商" prop="providerType" width="150" />
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="taskStatusType(row.status)">{{ taskStatusText(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="失败原因" prop="failureReason" min-width="260" show-overflow-tooltip />
            <el-table-column label="创建时间" prop="createTime" width="180" />
            <el-table-column label="完成时间" prop="finishedAt" width="180" />
          </el-table>
          <pagination
            v-show="taskTotal > 0"
            v-model:page="taskQuery.pageNum"
            v-model:limit="taskQuery.pageSize"
            :total="taskTotal"
            :auto-scroll="false"
            @pagination="loadTasks"
          />
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <ProviderEditorDrawer v-model="providerDrawer.visible" :provider="editingProvider" :definitions="providerDefinitions" @saved="loadProviders" />

    <el-dialog v-model="templateDialog.visible" :title="templateForm.id ? '修改语音模板' : '新增语音模板'" width="720px">
      <el-form ref="templateFormRef" :model="templateForm" :rules="templateRules" label-width="110px">
        <el-form-item label="模板编码" prop="templateCode"><el-input v-model="templateForm.templateCode" /></el-form-item>
        <el-form-item label="模板名称" prop="templateName"><el-input v-model="templateForm.templateName" /></el-form-item>
        <el-form-item label="业务类型" prop="businessType"><el-input v-model="templateForm.businessType" /></el-form-item>
        <el-form-item label="模板内容" prop="templateText"><el-input v-model="templateForm.templateText" type="textarea" :rows="4" /></el-form-item>
        <el-form-item label="默认音色"><el-input v-model="templateForm.defaultVoice" /></el-form-item>
        <el-form-item label="状态"><el-switch v-model="templateForm.enabled" /></el-form-item>
        <el-form-item label="备注"><el-input v-model="templateForm.remark" type="textarea" :rows="2" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="templateDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="templateSubmitting" @click="submitTemplate">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="ttsTestDialog.visible" title="TTS 测试" width="650px">
      <el-form :model="ttsTestForm" label-width="90px">
        <el-form-item label="测试文本"><el-input v-model="ttsTestForm.text" type="textarea" :rows="3" /></el-form-item>
        <el-row :gutter="12">
          <el-col :span="8"
            ><el-form-item label="音色"><el-input v-model="ttsTestForm.voice" /></el-form-item
          ></el-col>
          <el-col :span="8"
            ><el-form-item label="格式"><el-input v-model="ttsTestForm.format" /></el-form-item
          ></el-col>
          <el-col :span="8"
            ><el-form-item label="采样率"><el-input-number v-model="ttsTestForm.sampleRate" :min="8000" :max="48000" /></el-form-item
          ></el-col>
        </el-row>
      </el-form>
      <el-alert v-if="ttsTestResult?.playbackUrl" type="success" show-icon :closable="false" class="mb-2">
        <template #title>测试音频已生成</template>
      </el-alert>
      <audio v-if="ttsTestResult?.playbackUrl" :src="ttsTestResult.playbackUrl" controls style="width: 100%" />
      <template #footer>
        <el-button @click="ttsTestDialog.visible = false">关闭</el-button>
        <el-button type="primary" :loading="ttsTesting" @click="submitTtsTest">开始测试</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="asrTestDialog.visible" title="ASR 录音识别测试" width="760px">
      <el-upload drag :auto-upload="false" :limit="1" :on-change="handleAsrFileChange" :on-remove="handleAsrFileRemove">
        <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
        <div class="el-upload__text">拖入音频文件，或点击选择</div>
        <template #tip><div class="el-upload__tip">支持 WAV / PCM / OPUS，测试文件不会上传到 MinIO。</div></template>
      </el-upload>
      <el-row :gutter="12" class="mt-3">
        <el-col :span="12"><el-input v-model="asrTestForm.format" placeholder="格式，如 wav" /></el-col>
        <el-col :span="12"><el-input-number v-model="asrTestForm.sampleRate" :min="8000" :max="48000" /></el-col>
      </el-row>
      <el-card v-if="asrTestResult" class="mt-3" shadow="never">
        <template #header>识别结果</template>
        <div class="asr-full-text">{{ asrTestResult.fullText || '未识别到文本' }}</div>
        <el-table :data="asrTestResult.segments || []" size="small" class="mt-3">
          <el-table-column label="序号" prop="sentenceIndex" width="80" />
          <el-table-column label="时间" width="160">
            <template #default="{ row }">{{ formatMs(row.startMs) }} - {{ formatMs(row.endMs) }}</template>
          </el-table-column>
          <el-table-column label="文本" prop="text" min-width="260" />
          <el-table-column label="置信度" width="100">
            <template #default="{ row }">{{ formatConfidence(row.confidence) }}</template>
          </el-table-column>
        </el-table>
      </el-card>
      <template #footer>
        <el-button @click="asrTestDialog.visible = false">关闭</el-button>
        <el-button type="primary" :loading="asrTesting" @click="submitAsrTest">开始识别</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ArrowDown, UploadFilled } from '@element-plus/icons-vue';
import type { FormInstance, FormRules } from 'element-plus';
import {
  createSpeechTemplate,
  deleteSpeechProvider,
  deleteSpeechTemplate,
  listSpeechProviderDefinitions,
  listSpeechProviders,
  listSpeechTasks,
  listSpeechTemplates,
  testAsrProvider,
  testSpeechProviderConnection,
  testStreamingSpeechProvider,
  testTtsProvider,
  updateSpeechTemplate
} from '@/api/callcenter/ai-speech';
import type {
  AiSpeechProviderVO,
  SpeechProviderDefinitionVO,
  AiSpeechTaskQuery,
  AiSpeechTaskVO,
  AiSpeechTemplateForm,
  AiSpeechTemplateVO,
  AsrTestVO,
  TtsTestForm,
  TtsTestVO
} from '@/api/callcenter/ai-speech/types';
import ProviderEditorDrawer from './components/ProviderEditorDrawer.vue';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;

const activeTab = ref('provider');
const providerLoading = ref(false);
const templateLoading = ref(false);
const taskLoading = ref(false);
const templateSubmitting = ref(false);
const providers = ref<AiSpeechProviderVO[]>([]);
const providerDefinitions = ref<SpeechProviderDefinitionVO[]>([]);
const editingProvider = ref<AiSpeechProviderVO>();
const templates = ref<AiSpeechTemplateVO[]>([]);
const tasks = ref<AiSpeechTaskVO[]>([]);
const taskTotal = ref(0);

const templateFormRef = ref<FormInstance>();
const providerDrawer = reactive({ visible: false });
const templateDialog = reactive({ visible: false });
const ttsTestDialog = reactive({ visible: false });
const asrTestDialog = reactive({ visible: false });
const taskQuery = ref<AiSpeechTaskQuery>({ pageNum: 1, pageSize: 10 });

const templateForm = ref<AiSpeechTemplateForm>(defaultTemplateForm());
const ttsTestForm = ref<TtsTestForm>({ text: '工号1001为您服务', format: 'wav', sampleRate: 8000 });
const ttsTestResult = ref<TtsTestVO>();
const ttsTesting = ref(false);
const asrTestForm = ref<{ format?: string; sampleRate?: number }>({});
const asrTestFile = ref<File>();
const asrTestResult = ref<AsrTestVO>();
const asrTesting = ref(false);
const testingProviderId = ref<string | number>();
const providerTestRunning = ref<string | number>();

const templateRules: FormRules = {
  templateCode: [{ required: true, message: '请输入模板编码', trigger: 'blur' }],
  templateName: [{ required: true, message: '请输入模板名称', trigger: 'blur' }],
  businessType: [{ required: true, message: '请输入业务类型', trigger: 'blur' }],
  templateText: [{ required: true, message: '请输入模板内容', trigger: 'blur' }]
};

function defaultTemplateForm(): AiSpeechTemplateForm {
  return {
    templateCode: '',
    templateName: '',
    businessType: '',
    templateText: '',
    defaultVoice: '',
    enabled: true,
    remark: ''
  };
}

const reloadAll = () => {
  loadProviderDefinitions();
  loadProviders();
  loadTemplates();
  loadTasks();
};
const loadProviderDefinitions = async () => {
  const res = await listSpeechProviderDefinitions();
  providerDefinitions.value = res.data || [];
};
const loadProviders = async () => {
  providerLoading.value = true;
  try {
    const res = await listSpeechProviders();
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
    tasks.value = res.rows || [];
    taskTotal.value = res.total || 0;
  } finally {
    taskLoading.value = false;
  }
};

const openProviderDrawer = (row?: AiSpeechProviderVO) => {
  editingProvider.value = row ? { ...row } : undefined;
  providerDrawer.visible = true;
};

const removeProvider = async (row: AiSpeechProviderVO) => {
  await proxy?.$modal.confirm(`确认删除语音服务商“${row.providerName}”？`);
  await deleteSpeechProvider(row.id);
  proxy?.$modal.msgSuccess('删除成功');
  loadProviders();
};

const handleProviderTest = async (command: string, row: AiSpeechProviderVO) => {
  if (command === 'tts') return openTtsTest(row);
  if (command === 'asr') return openAsrTest(row);
  providerTestRunning.value = row.id;
  try {
    const res = command === 'connection'
      ? await testSpeechProviderConnection(row.id)
      : await testStreamingSpeechProvider(row.id, command === 'streamingTts' ? 'STREAMING_TTS' : 'STREAMING_ASR');
    proxy?.$modal.msgSuccess(`${res.data.message}（${res.data.durationMs}ms）`);
    await loadProviders();
  } finally {
    providerTestRunning.value = undefined;
  }
};

const openTemplateDialog = (row?: AiSpeechTemplateVO) => {
  templateForm.value = row ? { ...row } : defaultTemplateForm();
  templateDialog.visible = true;
};
const submitTemplate = async () => {
  await templateFormRef.value?.validate();
  templateSubmitting.value = true;
  try {
    if (templateForm.value.id) {
      await updateSpeechTemplate(templateForm.value);
    } else {
      await createSpeechTemplate(templateForm.value);
    }
    proxy?.$modal.msgSuccess('保存成功');
    templateDialog.visible = false;
    loadTemplates();
  } finally {
    templateSubmitting.value = false;
  }
};
const removeTemplate = async (row: AiSpeechTemplateVO) => {
  await proxy?.$modal.confirm(`确认删除语音模板“${row.templateName}”？`);
  await deleteSpeechTemplate(row.id);
  proxy?.$modal.msgSuccess('删除成功');
  loadTemplates();
};

const openTtsTest = (row: AiSpeechProviderVO) => {
  testingProviderId.value = row.id;
  ttsTestResult.value = undefined;
  ttsTestForm.value = {
    text: '工号1001为您服务',
    voice: row.defaultVoice,
    format: row.defaultFormat,
    sampleRate: row.defaultSampleRate
  };
  ttsTestDialog.visible = true;
};
const submitTtsTest = async () => {
  if (!testingProviderId.value) return;
  ttsTesting.value = true;
  try {
    const res = await testTtsProvider(testingProviderId.value, ttsTestForm.value);
    ttsTestResult.value = res.data;
    proxy?.$modal.msgSuccess('TTS 测试音频生成成功');
    await loadProviders();
  } finally {
    ttsTesting.value = false;
  }
};
const openAsrTest = (row: AiSpeechProviderVO) => {
  testingProviderId.value = row.id;
  asrTestFile.value = undefined;
  asrTestResult.value = undefined;
  asrTestForm.value = { format: row.asrFormat, sampleRate: row.asrSampleRate };
  asrTestDialog.visible = true;
};
const handleAsrFileChange = (uploadFile: any) => {
  asrTestFile.value = uploadFile.raw;
};
const handleAsrFileRemove = () => {
  asrTestFile.value = undefined;
};
const submitAsrTest = async () => {
  if (!testingProviderId.value || !asrTestFile.value) {
    proxy?.$modal.msgError('请先选择测试音频');
    return;
  }
  const data = new FormData();
  data.append('file', asrTestFile.value);
  if (asrTestForm.value.format) data.append('format', asrTestForm.value.format);
  if (asrTestForm.value.sampleRate) data.append('sampleRate', String(asrTestForm.value.sampleRate));
  asrTesting.value = true;
  try {
    const res = await testAsrProvider(testingProviderId.value, data);
    asrTestResult.value = res.data;
    proxy?.$modal.msgSuccess('录音识别完成');
    await loadProviders();
  } finally {
    asrTesting.value = false;
  }
};

const resetTaskQuery = () => {
  taskQuery.value = { pageNum: 1, pageSize: 10 };
  loadTasks();
};
const taskStatusText = (status: string) => ({ PROCESSING: '处理中', SUCCESS: '成功', FAILED: '失败' })[status] || status;
const taskStatusType = (status: string): 'success' | 'warning' | 'danger' | 'info' => {
  if (status === 'PROCESSING') return 'warning';
  if (status === 'SUCCESS') return 'success';
  if (status === 'FAILED') return 'danger';
  return 'info';
};
const formatMs = (value?: number) => (value == null ? '-' : `${(value / 1000).toFixed(2)}s`);
const formatConfidence = (value?: number) => (value == null ? '-' : `${(Number(value) * 100).toFixed(1)}%`);

onMounted(reloadAll);
</script>

<style scoped>
.provider-section {
  margin-bottom: 20px;
  padding: 18px 18px 6px;
  background: #fff;
  border: 1px solid var(--el-border-color-light);
  border-radius: 12px;
}
.provider-section h3 {
  margin: 0;
  color: var(--el-text-color-primary);
  font-size: 16px;
}
.provider-section p {
  margin: 6px 0 0;
  color: var(--el-text-color-secondary);
  font-size: 13px;
  line-height: 1.5;
}
.provider-summary {
  background: linear-gradient(180deg, #f7fbff 0%, #fff 100%);
}
.last-test {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}
.last-test small {
  color: var(--el-text-color-secondary);
  font-size: 11px;
}
.provider-actions {
  display: inline-flex;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: center;
  gap: 12px;
  white-space: nowrap;
}
.provider-actions :deep(.el-button) {
  margin-left: 0;
}
.provider-actions :deep(.el-dropdown) {
  display: inline-flex;
  align-items: center;
}
.section-title {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 18px;
  gap: 16px;
}
.section-title h3 {
  margin: 0;
}
.speech-provider-form :deep(.el-form-item) {
  margin-bottom: 18px;
}
.capability-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 12px;
}
.capability-card {
  min-height: 126px;
  padding: 14px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  background: var(--el-fill-color-extra-light);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 10px;
}
.capability-card strong {
  display: block;
  color: var(--el-text-color-primary);
  font-size: 14px;
}
.capability-card p {
  min-height: 38px;
  margin: 6px 0 0;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.field-hint {
  margin-left: 8px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.provider-advanced {
  margin-bottom: 18px;
  padding: 0 18px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 12px;
}
.provider-advanced :deep(.el-collapse-item__header) {
  font-weight: 600;
}
.provider-advanced :deep(.el-collapse-item__content) {
  padding-bottom: 4px;
}
.provider-product-grid {
  display: grid;
  width: 100%;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}
.provider-product-grid :deep(.el-radio-button) {
  width: 100%;
}
.provider-product-grid :deep(.el-radio-button__inner) {
  display: flex;
  width: 100%;
  min-height: 72px;
  padding: 12px 14px;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 6px;
  border: 1px solid var(--el-border-color);
  border-radius: 10px;
  box-shadow: none;
  text-align: left;
}
.provider-product-grid :deep(.el-radio-button:first-child .el-radio-button__inner),
.provider-product-grid :deep(.el-radio-button:last-child .el-radio-button__inner) {
  border-radius: 10px;
}
.provider-product-grid :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
  border-color: var(--el-color-primary);
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  box-shadow: none;
}
.provider-product-grid small {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  font-weight: 400;
}
.planned-provider-row {
  display: flex;
  margin: -2px 0 18px 112px;
  align-items: center;
  gap: 8px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.credential-section {
  border-color: var(--el-color-primary-light-7);
  background: var(--el-color-primary-light-9);
}
.default-purpose-tags {
  display: inline-flex;
  max-width: 100%;
  flex-wrap: nowrap;
  white-space: nowrap;
}
.default-purpose-tags :deep(.el-space__item) {
  flex: 0 0 auto;
}
.asr-full-text {
  min-height: 70px;
  white-space: pre-wrap;
  line-height: 1.7;
}
</style>
