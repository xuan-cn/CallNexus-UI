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
            <el-table-column label="默认用途" min-width="320">
              <template #default="{ row }">
                <el-space wrap>
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
            <el-table-column label="操作" width="300" align="center" fixed="right">
              <template #default="{ row }">
                <el-button v-if="row.ttsEnabled" v-hasPermi="['callcenter:ai-speech:test']" link type="primary" @click="openTtsTest(row)">
                  TTS测试
                </el-button>
                <el-button v-if="row.recordingAsrEnabled" v-hasPermi="['callcenter:ai-speech:test']" link type="primary" @click="openAsrTest(row)">
                  ASR测试
                </el-button>
                <el-button v-hasPermi="['callcenter:ai-speech:update']" link type="primary" @click="openProviderDrawer(row)">修改</el-button>
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
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <el-drawer v-model="providerDrawer.visible" :title="providerForm.id ? '修改语音服务商' : '新增语音服务商'" size="1080px">
      <el-form ref="providerFormRef" :model="providerForm" :rules="providerRules" label-width="140px">
        <section class="provider-section">
          <h3>基础信息与认证</h3>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="服务商编码" prop="providerCode">
                <el-input v-model="providerForm.providerCode" placeholder="如 ALIYUN_DASHSCOPE" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="服务商名称" prop="providerName">
                <el-input v-model="providerForm.providerName" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="服务商类型" prop="providerType">
                <el-select v-model="providerForm.providerType" @change="handleProviderTypeChange">
                  <el-option label="通用HTTP" value="CUSTOM_HTTP" />
                  <el-option label="阿里云百炼 DashScope" value="ALIYUN_DASHSCOPE" />
                  <el-option label="阿里云智能语音 NLS" value="ALIYUN_NLS" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="认证方式" prop="authType">
                <el-select v-model="providerForm.authType">
                  <el-option label="无" value="NONE" />
                  <el-option label="Bearer Token" value="BEARER" />
                  <el-option label="Header Token" value="HEADER" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col v-if="providerForm.authType === 'HEADER'" :span="12">
              <el-form-item label="Header名称">
                <el-input v-model="providerForm.authHeaderName" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="Token/API Key">
                <el-input v-model="providerForm.authToken" type="password" show-password placeholder="修改时留空表示不变" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="超时时间">
                <el-input-number v-model="providerForm.timeoutSeconds" :min="5" :max="300" />
                <span class="ml-2 text-gray-500">秒</span>
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="备注/扩展JSON">
                <el-input v-model="providerForm.remark" type="textarea" :rows="3" placeholder='百炼可填 {"workspaceId":"xxx"}' />
              </el-form-item>
            </el-col>
          </el-row>
        </section>

        <section class="provider-section">
          <div class="section-title">
            <h3>TTS 语音合成</h3>
            <el-switch v-model="providerForm.ttsEnabled" active-text="启用" inactive-text="停用" />
          </div>
          <el-row :gutter="16">
            <el-col :span="24">
              <el-form-item label="TTS地址">
                <el-input v-model="providerForm.endpointUrl" placeholder="HTTP TTS 接口地址" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="请求方法">
                <el-select v-model="providerForm.httpMethod">
                  <el-option label="POST" value="POST" />
                  <el-option label="GET" value="GET" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="默认音色">
                <el-input v-model="providerForm.defaultVoice" />
              </el-form-item>
            </el-col>
            <el-col :span="4">
              <el-form-item label="格式">
                <el-select v-model="providerForm.defaultFormat">
                  <el-option label="wav" value="wav" />
                  <el-option label="mp3" value="mp3" />
                  <el-option label="pcm" value="pcm" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="4">
              <el-form-item label="采样率">
                <el-input-number v-model="providerForm.defaultSampleRate" :min="8000" :max="48000" :step="1000" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="默认TTS">
                <el-switch v-model="providerForm.defaultTts" />
              </el-form-item>
            </el-col>
          </el-row>
        </section>

        <section class="provider-section">
          <div class="section-title">
            <h3>实时 TTS</h3>
            <el-switch v-model="providerForm.streamingTtsEnabled" active-text="启用" inactive-text="停用" />
          </div>
          <el-row :gutter="16">
            <el-col :span="24">
              <el-form-item label="实时TTS地址">
                <el-input v-model="providerForm.streamingTtsEndpointUrl" placeholder="wss://dashscope.aliyuncs.com/api-ws/v1/realtime" />
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="实时TTS参数">
                <el-input
                  v-model="providerForm.streamingTtsOptionsJson"
                  type="textarea"
                  :rows="3"
                  placeholder='{"model":"qwen3-tts-flash-realtime","speech_rate":1.0,"volume":50}'
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="默认实时TTS">
                <el-switch v-model="providerForm.defaultStreamingTts" />
              </el-form-item>
            </el-col>
          </el-row>
        </section>

        <section class="provider-section">
          <div class="section-title">
            <h3>ASR 语音识别</h3>
            <el-space>
              <span>录音ASR</span><el-switch v-model="providerForm.recordingAsrEnabled" />
              <span>流式ASR</span><el-switch v-model="providerForm.streamingAsrEnabled" />
            </el-space>
          </div>
          <el-row :gutter="16">
            <el-col :span="24">
              <el-form-item label="录音ASR地址">
                <el-input v-model="providerForm.recordingAsrEndpointUrl" placeholder="录音文件识别地址，可留空使用服务商默认值" />
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="流式ASR地址">
                <el-input v-model="providerForm.streamingAsrEndpointUrl" placeholder="wss://dashscope.aliyuncs.com/api-ws/v1/realtime" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="语言">
                <el-input v-model="providerForm.asrLanguage" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="音频格式">
                <el-select v-model="providerForm.asrFormat">
                  <el-option label="wav" value="wav" />
                  <el-option label="pcm" value="pcm" />
                  <el-option label="opus" value="opus" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="采样率">
                <el-input-number v-model="providerForm.asrSampleRate" :min="8000" :max="48000" :step="1000" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="静音断句">
                <el-input-number v-model="providerForm.asrSilenceTimeoutMs" :min="200" :max="10000" :step="100" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="标点">
                <el-switch v-model="providerForm.asrEnablePunctuation" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="数字格式化">
                <el-switch v-model="providerForm.asrEnableItn" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="中间结果">
                <el-switch v-model="providerForm.asrEnableIntermediateResult" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="默认录音ASR">
                <el-switch v-model="providerForm.defaultRecordingAsr" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="默认流式ASR">
                <el-switch v-model="providerForm.defaultStreamingAsr" />
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="ASR扩展参数">
                <el-input v-model="providerForm.asrOptionsJson" type="textarea" :rows="3" placeholder='{"model":"qwen3-asr-flash","enable_itn":false}' />
              </el-form-item>
            </el-col>
          </el-row>
        </section>

        <el-form-item label="状态">
          <el-switch v-model="providerForm.enabled" active-text="启用" inactive-text="停用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="providerDrawer.visible = false">取消</el-button>
        <el-button type="primary" :loading="providerSubmitting" @click="submitProvider">保存</el-button>
      </template>
    </el-drawer>

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
          <el-col :span="8"><el-form-item label="音色"><el-input v-model="ttsTestForm.voice" /></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="格式"><el-input v-model="ttsTestForm.format" /></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="采样率"><el-input-number v-model="ttsTestForm.sampleRate" :min="8000" :max="48000" /></el-form-item></el-col>
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
import { UploadFilled } from '@element-plus/icons-vue';
import type { FormInstance, FormRules } from 'element-plus';
import {
  createSpeechProvider,
  createSpeechTemplate,
  deleteSpeechProvider,
  deleteSpeechTemplate,
  listSpeechProviders,
  listSpeechTasks,
  listSpeechTemplates,
  testAsrProvider,
  testTtsProvider,
  updateSpeechProvider,
  updateSpeechTemplate
} from '@/api/callcenter/ai-speech';
import type {
  AiSpeechProviderForm,
  AiSpeechProviderVO,
  AiSpeechTaskQuery,
  AiSpeechTaskVO,
  AiSpeechTemplateForm,
  AiSpeechTemplateVO,
  AsrTestVO,
  TtsTestForm,
  TtsTestVO
} from '@/api/callcenter/ai-speech/types';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;

const activeTab = ref('provider');
const providerLoading = ref(false);
const templateLoading = ref(false);
const taskLoading = ref(false);
const providerSubmitting = ref(false);
const templateSubmitting = ref(false);
const providers = ref<AiSpeechProviderVO[]>([]);
const templates = ref<AiSpeechTemplateVO[]>([]);
const tasks = ref<AiSpeechTaskVO[]>([]);

const providerFormRef = ref<FormInstance>();
const templateFormRef = ref<FormInstance>();
const providerDrawer = reactive({ visible: false });
const templateDialog = reactive({ visible: false });
const ttsTestDialog = reactive({ visible: false });
const asrTestDialog = reactive({ visible: false });
const taskQuery = ref<AiSpeechTaskQuery>({ pageNum: 1, pageSize: 10 });

const providerForm = ref<AiSpeechProviderForm>(defaultProviderForm());
const templateForm = ref<AiSpeechTemplateForm>(defaultTemplateForm());
const ttsTestForm = ref<TtsTestForm>({ text: '工号1001为您服务', format: 'wav', sampleRate: 8000 });
const ttsTestResult = ref<TtsTestVO>();
const ttsTesting = ref(false);
const asrTestForm = ref<{ format?: string; sampleRate?: number }>({});
const asrTestFile = ref<File>();
const asrTestResult = ref<AsrTestVO>();
const asrTesting = ref(false);
const testingProviderId = ref<string | number>();

const providerRules: FormRules = {
  providerCode: [{ required: true, message: '请输入服务商编码', trigger: 'blur' }],
  providerName: [{ required: true, message: '请输入服务商名称', trigger: 'blur' }],
  providerType: [{ required: true, message: '请选择服务商类型', trigger: 'change' }]
};
const templateRules: FormRules = {
  templateCode: [{ required: true, message: '请输入模板编码', trigger: 'blur' }],
  templateName: [{ required: true, message: '请输入模板名称', trigger: 'blur' }],
  businessType: [{ required: true, message: '请输入业务类型', trigger: 'blur' }],
  templateText: [{ required: true, message: '请输入模板内容', trigger: 'blur' }]
};

function defaultProviderForm(): AiSpeechProviderForm {
  return {
    providerCode: '',
    providerName: '',
    providerType: 'ALIYUN_DASHSCOPE',
    ttsEnabled: true,
    streamingTtsEnabled: true,
    recordingAsrEnabled: true,
    streamingAsrEnabled: false,
    defaultTts: false,
    defaultStreamingTts: false,
    defaultRecordingAsr: false,
    defaultStreamingAsr: false,
    endpointUrl: 'https://{workspaceId}.cn-beijing.maas.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
    httpMethod: 'POST',
    authType: 'BEARER',
    authHeaderName: '',
    authToken: '',
    defaultVoice: 'Cherry',
    defaultFormat: 'wav',
    defaultSampleRate: 8000,
    timeoutSeconds: 60,
    streamingTtsEndpointUrl: 'wss://dashscope.aliyuncs.com/api-ws/v1/realtime',
    streamingTtsOptionsJson: '{"model":"qwen3-tts-flash-realtime","speech_rate":1.0,"volume":50}',
    recordingAsrEndpointUrl: 'https://{workspaceId}.cn-beijing.maas.aliyuncs.com/compatible-mode/v1/chat/completions',
    streamingAsrEndpointUrl: '',
    asrLanguage: 'zh-CN',
    asrFormat: 'wav',
    asrSampleRate: 16000,
    asrEnablePunctuation: true,
    asrEnableItn: true,
    asrEnableIntermediateResult: true,
    asrSilenceTimeoutMs: 800,
    asrMaxSentenceMs: 15000,
    asrOptionsJson: '{"model":"qwen3-asr-flash","enable_itn":false}',
    enabled: true,
    remark: ''
  };
}

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
  loadProviders();
  loadTemplates();
  loadTasks();
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
    tasks.value = res.data || [];
  } finally {
    taskLoading.value = false;
  }
};

const openProviderDrawer = (row?: AiSpeechProviderVO) => {
  providerForm.value = row ? { ...defaultProviderForm(), ...row, authToken: '' } : defaultProviderForm();
  providerDrawer.visible = true;
};
const handleProviderTypeChange = (type: string) => {
  if (type === 'ALIYUN_DASHSCOPE') {
    providerForm.value = {
      ...providerForm.value,
      authType: 'BEARER',
      endpointUrl: 'https://{workspaceId}.cn-beijing.maas.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
      ttsEnabled: true,
      streamingTtsEnabled: true,
      recordingAsrEnabled: true,
      streamingAsrEnabled: false,
      defaultVoice: providerForm.value.defaultVoice || 'Cherry',
      defaultFormat: 'wav',
      defaultSampleRate: 8000,
      streamingTtsEndpointUrl: 'wss://dashscope.aliyuncs.com/api-ws/v1/realtime',
      streamingTtsOptionsJson: '{"model":"qwen3-tts-flash-realtime","speech_rate":1.0,"volume":50}',
      recordingAsrEndpointUrl: 'https://{workspaceId}.cn-beijing.maas.aliyuncs.com/compatible-mode/v1/chat/completions',
      streamingAsrEndpointUrl: '',
      asrOptionsJson: '{"model":"qwen3-asr-flash","enable_itn":false}'
    };
  }
  if (type === 'ALIYUN_NLS') {
    providerForm.value = {
      ...providerForm.value,
      authType: 'NONE',
      ttsEnabled: false,
      streamingTtsEnabled: false,
      recordingAsrEnabled: true,
      streamingAsrEnabled: true,
      endpointUrl: '',
      recordingAsrEndpointUrl: 'wss://nls-gateway-cn-shanghai.aliyuncs.com/ws/v1',
      streamingAsrEndpointUrl: 'wss://nls-gateway-cn-shanghai.aliyuncs.com/ws/v1',
      asrOptionsJson: '{}'
    };
  }
};
const submitProvider = async () => {
  await providerFormRef.value?.validate();
  providerSubmitting.value = true;
  try {
    if (providerForm.value.id) {
      await updateSpeechProvider(providerForm.value);
    } else {
      await createSpeechProvider(providerForm.value);
    }
    proxy?.$modal.msgSuccess('保存成功');
    providerDrawer.visible = false;
    loadProviders();
  } finally {
    providerSubmitting.value = false;
  }
};
const removeProvider = async (row: AiSpeechProviderVO) => {
  await proxy?.$modal.confirm(`确认删除语音服务商“${row.providerName}”？`);
  await deleteSpeechProvider(row.id);
  proxy?.$modal.msgSuccess('删除成功');
  loadProviders();
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
    proxy?.$modal.msgSuccess('测试音频生成成功');
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
  } finally {
    asrTesting.value = false;
  }
};

const resetTaskQuery = () => {
  taskQuery.value = { pageNum: 1, pageSize: 10 };
  loadTasks();
};
const taskStatusText = (status: string) => ({ PROCESSING: '处理中', SUCCESS: '成功', FAILED: '失败' })[status] || status;
const taskStatusType = (status: string) => ({ PROCESSING: 'warning', SUCCESS: 'success', FAILED: 'danger' })[status] || 'info';
const formatMs = (value?: number) => (value == null ? '-' : `${(value / 1000).toFixed(2)}s`);
const formatConfidence = (value?: number) => (value == null ? '-' : `${(Number(value) * 100).toFixed(1)}%`);

onMounted(reloadAll);
</script>

<style scoped>
.provider-section {
  margin-bottom: 20px;
  padding: 18px 18px 4px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 10px;
}
.provider-section h3 {
  margin: 0 0 18px;
  color: var(--el-text-color-primary);
  font-size: 16px;
}
.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}
.section-title h3 {
  margin: 0;
}
.asr-full-text {
  min-height: 70px;
  white-space: pre-wrap;
  line-height: 1.7;
}
</style>
