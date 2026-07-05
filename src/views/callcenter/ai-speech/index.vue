<template>
  <div class="p-2">
    <el-card shadow="hover">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="语音服务商" name="provider">
          <div class="mb-3">
            <el-button v-hasPermi="['callcenter:ai-speech:create']" type="primary" plain icon="Plus" @click="openProviderDrawer()">
              新增服务商
            </el-button>
          </div>
          <el-table v-loading="providerLoading" :data="providers">
            <el-table-column label="编码" prop="providerCode" min-width="140" />
            <el-table-column label="名称" prop="providerName" min-width="160" />
            <el-table-column label="类型" prop="providerType" width="150" />
            <el-table-column label="能力" min-width="260">
              <template #default="{ row }">
                <el-space wrap>
                  <el-tag v-if="row.ttsEnabled" type="success">TTS</el-tag>
                  <el-tag v-if="row.recordingAsrEnabled" type="primary">录音 ASR</el-tag>
                  <el-tag v-if="row.streamingAsrEnabled" type="warning">流式 ASR</el-tag>
                </el-space>
              </template>
            </el-table-column>
            <el-table-column label="默认用途" min-width="280">
              <template #default="{ row }">
                <el-space wrap>
                  <el-tag v-if="row.defaultTts" effect="dark" type="success">默认 TTS</el-tag>
                  <el-tag v-if="row.defaultRecordingAsr" effect="dark">默认录音 ASR</el-tag>
                  <el-tag v-if="row.defaultStreamingAsr" effect="dark" type="warning">默认流式 ASR</el-tag>
                  <span v-if="!row.defaultTts && !row.defaultRecordingAsr && !row.defaultStreamingAsr">-</span>
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
            <el-table-column label="操作" width="280" align="center" fixed="right">
              <template #default="{ row }">
                <el-button v-if="row.ttsEnabled" v-hasPermi="['callcenter:ai-speech:test']" link type="primary" @click="openTtsTest(row)"
                  >TTS测试</el-button
                >
                <el-button v-if="row.recordingAsrEnabled" v-hasPermi="['callcenter:ai-speech:test']" link type="primary" @click="openAsrTest(row)"
                  >ASR测试</el-button
                >
                <el-button v-hasPermi="['callcenter:ai-speech:update']" link type="primary" @click="openProviderDrawer(row)">修改</el-button>
                <el-button v-hasPermi="['callcenter:ai-speech:delete']" link type="danger" @click="removeProvider(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="语音模板" name="template">
          <div class="mb-3">
            <el-button v-hasPermi="['callcenter:ai-speech:create']" type="primary" plain icon="Plus" @click="openTemplateDialog()"
              >新增模板</el-button
            >
          </div>
          <el-table v-loading="templateLoading" :data="templates">
            <el-table-column label="模板编码" prop="templateCode" min-width="180" />
            <el-table-column label="模板名称" prop="templateName" min-width="160" />
            <el-table-column label="业务类型" prop="businessType" min-width="180" />
            <el-table-column label="模板内容" prop="templateText" min-width="280" show-overflow-tooltip />
            <el-table-column label="默认音色" prop="defaultVoice" width="120" />
            <el-table-column label="状态" width="90">
              <template #default="{ row }"
                ><el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '停用' }}</el-tag></template
              >
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
              <el-select v-model="taskQuery.taskType" clearable style="width: 140px"
                ><el-option label="TTS" value="TTS" /><el-option label="ASR" value="ASR"
              /></el-select>
            </el-form-item>
            <el-form-item label="业务类型"><el-input v-model="taskQuery.businessType" clearable placeholder="AGENT_NUMBER_PROMPT" /></el-form-item>
            <el-form-item label="状态">
              <el-select v-model="taskQuery.status" clearable style="width: 140px">
                <el-option label="处理中" value="PROCESSING" /><el-option label="成功" value="SUCCESS" /><el-option label="失败" value="FAILED" />
              </el-select>
            </el-form-item>
            <el-form-item
              ><el-button type="primary" icon="Search" @click="loadTasks">查询</el-button
              ><el-button icon="Refresh" @click="resetTaskQuery">重置</el-button></el-form-item
            >
          </el-form>
          <el-table v-loading="taskLoading" :data="tasks">
            <el-table-column label="任务ID" prop="id" min-width="170" />
            <el-table-column label="类型" prop="taskType" width="90" />
            <el-table-column label="业务类型" prop="businessType" min-width="170" />
            <el-table-column label="业务ID" prop="businessId" min-width="170" />
            <el-table-column label="文本" prop="textContent" min-width="260" show-overflow-tooltip />
            <el-table-column label="状态" width="100"
              ><template #default="{ row }"
                ><el-tag :type="taskStatusType(row.status)">{{ taskStatusText(row.status) }}</el-tag></template
              ></el-table-column
            >
            <el-table-column label="失败原因" prop="failureReason" min-width="240" show-overflow-tooltip />
            <el-table-column label="开始时间" prop="startedAt" width="180" />
            <el-table-column label="完成时间" prop="finishedAt" width="180" />
          </el-table>
          <pagination
            v-show="taskTotal > 0"
            v-model:page="taskQuery.pageNum"
            v-model:limit="taskQuery.pageSize"
            :total="taskTotal"
            @pagination="loadTasks"
          />
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <el-drawer v-model="providerDrawer.visible" :title="providerDrawer.title" size="820px" append-to-body destroy-on-close>
      <el-form ref="providerFormRef" :model="providerForm" :rules="providerRules" label-width="132px">
        <section class="provider-section">
          <h3>基础信息与认证</h3>
          <el-row :gutter="16">
            <el-col :span="12"
              ><el-form-item label="服务商编码" prop="providerCode"><el-input v-model="providerForm.providerCode" /></el-form-item
            ></el-col>
            <el-col :span="12"
              ><el-form-item label="服务商名称" prop="providerName"><el-input v-model="providerForm.providerName" /></el-form-item
            ></el-col>
            <el-col :span="12">
              <el-form-item label="服务商类型" prop="providerType">
                <el-select v-model="providerForm.providerType" style="width: 100%" @change="handleProviderTypeChange">
                  <el-option label="通用 HTTP" value="CUSTOM_HTTP" /><el-option label="阿里云百炼" value="ALIYUN_DASHSCOPE" /><el-option
                    label="阿里云 NLS"
                    value="ALIYUN_NLS"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12"
              ><el-form-item label="超时秒数"
                ><el-input-number v-model="providerForm.timeoutSeconds" :min="1" :max="120" style="width: 100%" /></el-form-item
            ></el-col>
            <el-col :span="12">
              <el-form-item label="认证方式"
                ><el-select v-model="providerForm.authType" style="width: 100%"
                  ><el-option label="无" value="NONE" /><el-option label="Bearer Token" value="BEARER" /><el-option
                    label="Header Token"
                    value="HEADER" /></el-select
              ></el-form-item>
            </el-col>
            <el-col :span="12"
              ><el-form-item label="Header名称"
                ><el-input
                  v-model="providerForm.authHeaderName"
                  :placeholder="providerForm.providerType === 'ALIYUN_NLS' ? 'AccessKey ID' : 'Header Token 时填写'" /></el-form-item
            ></el-col>
            <el-col :span="24"
              ><el-form-item label="Token/Secret"
                ><el-input
                  v-model="providerForm.authToken"
                  type="password"
                  show-password
                  placeholder="修改时留空表示不修改；NLS 填 AccessKey Secret" /></el-form-item
            ></el-col>
            <el-col :span="24"
              ><el-form-item label="公共参数 JSON"
                ><el-input
                  v-model="providerForm.remark"
                  type="textarea"
                  :rows="3"
                  placeholder='NLS 示例：{"appKey":"xxx","region":"cn-shanghai"}' /></el-form-item
            ></el-col>
          </el-row>
        </section>

        <section class="provider-section">
          <div class="section-title">
            <h3>TTS 语音合成</h3>
            <el-switch v-model="providerForm.ttsEnabled" />
          </div>
          <el-row v-if="providerForm.ttsEnabled" :gutter="16">
            <el-col :span="24"
              ><el-form-item label="TTS 请求地址"
                ><el-input v-model="providerForm.endpointUrl" placeholder="阿里云 NLS 可留空按区域使用默认网关" /></el-form-item
            ></el-col>
            <el-col :span="8"
              ><el-form-item label="请求方法"
                ><el-select v-model="providerForm.httpMethod" style="width: 100%"><el-option label="POST" value="POST" /></el-select></el-form-item
            ></el-col>
            <el-col :span="8"
              ><el-form-item label="默认音色"><el-input v-model="providerForm.defaultVoice" /></el-form-item
            ></el-col>
            <el-col :span="8"
              ><el-form-item label="默认格式"
                ><el-select v-model="providerForm.defaultFormat" style="width: 100%"
                  ><el-option label="wav" value="wav" /><el-option label="mp3" value="mp3" /></el-select></el-form-item
            ></el-col>
            <el-col :span="12"
              ><el-form-item label="采样率"
                ><el-input-number v-model="providerForm.defaultSampleRate" :min="8000" :step="1000" style="width: 100%" /></el-form-item
            ></el-col>
          </el-row>
        </section>

        <section class="provider-section">
          <div class="section-title">
            <h3>ASR 语音识别</h3>
            <el-space
              ><span>录音</span><el-switch v-model="providerForm.recordingAsrEnabled" :disabled="providerForm.providerType !== 'ALIYUN_NLS'" /><span
                >流式</span
              ><el-switch v-model="providerForm.streamingAsrEnabled" :disabled="providerForm.providerType !== 'ALIYUN_NLS'"
            /></el-space>
          </div>
          <el-alert
            v-if="providerForm.streamingAsrEnabled"
            class="mb-3"
            type="info"
            :closable="false"
            title="流式 ASR 仅完成服务商配置预留，本阶段尚未接入 FreeSWITCH 实时音频。"
          />
          <el-row v-if="providerForm.recordingAsrEnabled || providerForm.streamingAsrEnabled" :gutter="16">
            <el-col :span="24"
              ><el-form-item label="录音 ASR 地址"
                ><el-input
                  v-model="providerForm.recordingAsrEndpointUrl"
                  placeholder="wss://nls-gateway-cn-shanghai.aliyuncs.com/ws/v1" /></el-form-item
            ></el-col>
            <el-col :span="24"
              ><el-form-item label="流式 ASR 地址"
                ><el-input
                  v-model="providerForm.streamingAsrEndpointUrl"
                  placeholder="wss://nls-gateway-cn-shanghai.aliyuncs.com/ws/v1" /></el-form-item
            ></el-col>
            <el-col :span="8"
              ><el-form-item label="语言"><el-input v-model="providerForm.asrLanguage" /></el-form-item
            ></el-col>
            <el-col :span="8"
              ><el-form-item label="默认格式"
                ><el-select v-model="providerForm.asrFormat" style="width: 100%"
                  ><el-option v-for="item in asrFormats" :key="item" :label="item" :value="item" /></el-select></el-form-item
            ></el-col>
            <el-col :span="8"
              ><el-form-item label="采样率"
                ><el-select v-model="providerForm.asrSampleRate" style="width: 100%"
                  ><el-option v-for="rate in sampleRates" :key="rate" :label="`${rate} Hz`" :value="rate" /></el-select></el-form-item
            ></el-col>
            <el-col :span="8"
              ><el-form-item label="自动标点"><el-switch v-model="providerForm.asrEnablePunctuation" /></el-form-item
            ></el-col>
            <el-col :span="8"
              ><el-form-item label="数字格式化"><el-switch v-model="providerForm.asrEnableItn" /></el-form-item
            ></el-col>
            <el-col :span="8"
              ><el-form-item label="中间结果"><el-switch v-model="providerForm.asrEnableIntermediateResult" /></el-form-item
            ></el-col>
            <el-col :span="12"
              ><el-form-item label="静音断句(ms)"
                ><el-input-number v-model="providerForm.asrSilenceTimeoutMs" :min="200" :max="5000" :step="100" style="width: 100%" /></el-form-item
            ></el-col>
            <el-col :span="12"
              ><el-form-item label="最大单句(ms)"
                ><el-input-number v-model="providerForm.asrMaxSentenceMs" :min="1000" :max="300000" :step="1000" style="width: 100%" /></el-form-item
            ></el-col>
            <el-col :span="24"
              ><el-form-item label="ASR扩展参数"
                ><el-input
                  v-model="providerForm.asrOptionsJson"
                  type="textarea"
                  :rows="3"
                  placeholder='厂商扩展 JSON，例如：{"enable_words":true}' /></el-form-item
            ></el-col>
          </el-row>
        </section>

        <section class="provider-section">
          <h3>状态与默认用途</h3>
          <el-row :gutter="16">
            <el-col :span="6"
              ><el-form-item label="服务商启用"><el-switch v-model="providerForm.enabled" /></el-form-item
            ></el-col>
            <el-col :span="6"
              ><el-form-item label="默认 TTS"><el-switch v-model="providerForm.defaultTts" :disabled="!providerForm.ttsEnabled" /></el-form-item
            ></el-col>
            <el-col :span="6"
              ><el-form-item label="默认录音 ASR"
                ><el-switch v-model="providerForm.defaultRecordingAsr" :disabled="!providerForm.recordingAsrEnabled" /></el-form-item
            ></el-col>
            <el-col :span="6"
              ><el-form-item label="默认流式 ASR"
                ><el-switch v-model="providerForm.defaultStreamingAsr" :disabled="!providerForm.streamingAsrEnabled" /></el-form-item
            ></el-col>
          </el-row>
        </section>
      </el-form>
      <template #footer
        ><el-button @click="providerDrawer.visible = false">取消</el-button
        ><el-button type="primary" @click="submitProvider">保存</el-button></template
      >
    </el-drawer>

    <el-dialog v-model="templateDialog.visible" :title="templateDialog.title" width="680px" append-to-body>
      <el-form ref="templateFormRef" :model="templateForm" :rules="templateRules" label-width="110px">
        <el-form-item label="模板编码" prop="templateCode"><el-input v-model="templateForm.templateCode" /></el-form-item>
        <el-form-item label="模板名称" prop="templateName"><el-input v-model="templateForm.templateName" /></el-form-item>
        <el-form-item label="业务类型" prop="businessType"
          ><el-input v-model="templateForm.businessType" placeholder="AGENT_NUMBER_PROMPT"
        /></el-form-item>
        <el-form-item label="模板内容" prop="templateText"
          ><el-input v-model="templateForm.templateText" type="textarea" :rows="4" placeholder="工号{extension}为您服务"
        /></el-form-item>
        <el-form-item label="默认音色"><el-input v-model="templateForm.defaultVoice" /></el-form-item>
        <el-form-item label="状态"><el-switch v-model="templateForm.enabled" /></el-form-item>
        <el-form-item label="备注"><el-input v-model="templateForm.remark" type="textarea" :rows="2" /></el-form-item>
      </el-form>
      <template #footer
        ><el-button @click="templateDialog.visible = false">取消</el-button
        ><el-button type="primary" @click="submitTemplate">保存</el-button></template
      >
    </el-dialog>

    <el-dialog v-model="ttsTestDialog.visible" title="TTS 生成测试" width="560px" append-to-body>
      <el-form label-width="90px"
        ><el-form-item label="测试文本"><el-input v-model="ttsTestForm.text" type="textarea" :rows="3" /></el-form-item
        ><el-form-item label="音色"><el-input v-model="ttsTestForm.voice" placeholder="留空使用默认音色" /></el-form-item
      ></el-form>
      <audio v-if="ttsTestResult.playbackUrl" :src="ttsTestResult.playbackUrl" controls style="width: 100%" />
      <template #footer
        ><el-button @click="ttsTestDialog.visible = false">关闭</el-button
        ><el-button type="primary" :loading="ttsTesting" @click="submitTtsTest">生成测试音频</el-button></template
      >
    </el-dialog>

    <el-dialog v-model="asrTestDialog.visible" title="录音 ASR 测试" width="760px" append-to-body>
      <el-alert class="mb-3" type="info" :closable="false" title="测试文件只发送给语音服务商，不上传 MinIO，也不创建正式转写任务。" />
      <el-form label-width="100px">
        <el-form-item label="测试音频">
          <el-upload
            :auto-upload="false"
            :limit="1"
            accept=".wav,.pcm,.opus,.opu,.speex"
            :on-change="handleAsrFileChange"
            :on-remove="handleAsrFileRemove"
            ><el-button type="primary" plain>选择音频</el-button></el-upload
          >
        </el-form-item>
        <el-row :gutter="16"
          ><el-col :span="12"
            ><el-form-item label="音频格式"
              ><el-select v-model="asrTestForm.format" clearable style="width: 100%" placeholder="按文件扩展名识别"
                ><el-option v-for="item in asrFormats" :key="item" :label="item" :value="item" /></el-select></el-form-item></el-col
          ><el-col :span="12"
            ><el-form-item label="采样率"
              ><el-select v-model="asrTestForm.sampleRate" clearable style="width: 100%" placeholder="使用服务商默认值"
                ><el-option v-for="rate in sampleRates" :key="rate" :label="`${rate} Hz`" :value="rate" /></el-select></el-form-item></el-col
        ></el-row>
      </el-form>
      <el-descriptions v-if="asrTestResult" :column="1" border
        ><el-descriptions-item label="识别全文"
          ><div class="asr-full-text">{{ asrTestResult.fullText || '未识别到有效文本' }}</div></el-descriptions-item
        ></el-descriptions
      >
      <el-table v-if="asrTestResult?.segments?.length" class="mt-3" :data="asrTestResult.segments" max-height="300">
        <el-table-column label="序号" prop="sentenceIndex" width="80" /><el-table-column label="开始" width="100"
          ><template #default="{ row }">{{ formatMs(row.startMs) }}</template></el-table-column
        ><el-table-column label="结束" width="100"
          ><template #default="{ row }">{{ formatMs(row.endMs) }}</template></el-table-column
        ><el-table-column label="文本" prop="text" min-width="300" /><el-table-column label="置信度" width="100"
          ><template #default="{ row }">{{ formatConfidence(row.confidence) }}</template></el-table-column
        >
      </el-table>
      <template #footer
        ><el-button @click="asrTestDialog.visible = false">关闭</el-button
        ><el-button type="primary" :loading="asrTesting" @click="submitAsrTest">开始识别</el-button></template
      >
    </el-dialog>
  </div>
</template>

<script setup name="AiSpeech" lang="ts">
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
  TtsTestVO
} from '@/api/callcenter/ai-speech/types';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;
const activeTab = ref('provider');
const providerLoading = ref(false);
const templateLoading = ref(false);
const taskLoading = ref(false);
const providers = ref<AiSpeechProviderVO[]>([]);
const templates = ref<AiSpeechTemplateVO[]>([]);
const tasks = ref<AiSpeechTaskVO[]>([]);
const taskTotal = ref(0);
const providerFormRef = ref<ElFormInstance>();
const templateFormRef = ref<ElFormInstance>();
const providerDrawer = reactive<DialogOption>({ visible: false, title: '' });
const templateDialog = reactive<DialogOption>({ visible: false, title: '' });
const ttsTestDialog = reactive<DialogOption>({ visible: false, title: '' });
const asrTestDialog = reactive<DialogOption>({ visible: false, title: '' });
const ttsTesting = ref(false);
const asrTesting = ref(false);
const testingProviderId = ref<string | number>();
const asrTestFile = ref<File>();
const asrFormats = ['wav', 'pcm', 'opus', 'opu', 'speex'];
const sampleRates = [8000, 16000, 24000, 48000];

const defaultProviderForm: AiSpeechProviderForm = {
  providerCode: '',
  providerName: '',
  providerType: 'CUSTOM_HTTP',
  ttsEnabled: true,
  recordingAsrEnabled: false,
  streamingAsrEnabled: false,
  defaultTts: false,
  defaultRecordingAsr: false,
  defaultStreamingAsr: false,
  endpointUrl: '',
  httpMethod: 'POST',
  authType: 'NONE',
  defaultVoice: 'default',
  defaultFormat: 'wav',
  defaultSampleRate: 8000,
  timeoutSeconds: 30,
  asrLanguage: 'zh-CN',
  asrFormat: 'wav',
  asrSampleRate: 8000,
  asrEnablePunctuation: true,
  asrEnableItn: true,
  asrEnableIntermediateResult: false,
  asrSilenceTimeoutMs: 800,
  asrMaxSentenceMs: 60000,
  enabled: true
};
const providerForm = ref<AiSpeechProviderForm>({ ...defaultProviderForm });
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
const ttsTestForm = ref({ text: '工号1001为您服务', voice: '', format: 'wav', sampleRate: 8000 });
const ttsTestResult = ref<TtsTestVO>({});
const asrTestForm = ref<{ format?: string; sampleRate?: number }>({});
const asrTestResult = ref<AsrTestVO>();

const providerRules = {
  providerCode: [{ required: true, message: '服务商编码不能为空', trigger: 'blur' }],
  providerName: [{ required: true, message: '服务商名称不能为空', trigger: 'blur' }],
  providerType: [{ required: true, message: '服务商类型不能为空', trigger: 'change' }]
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
    tasks.value = res.rows;
    taskTotal.value = res.total;
  } finally {
    taskLoading.value = false;
  }
};
const reloadAll = () => Promise.all([loadProviders(), loadTemplates(), loadTasks()]);

const openProviderDrawer = (row?: AiSpeechProviderVO) => {
  providerForm.value = row ? { ...defaultProviderForm, ...row, authToken: '' } : { ...defaultProviderForm };
  providerDrawer.title = row ? '修改语音服务商' : '新增语音服务商';
  providerDrawer.visible = true;
};
const handleProviderTypeChange = (type: string) => {
  if (type === 'ALIYUN_NLS') {
    const gateway = 'wss://nls-gateway-cn-shanghai.aliyuncs.com/ws/v1';
    Object.assign(providerForm.value, {
      authType: 'HEADER',
      defaultVoice: 'xiaoyun',
      defaultFormat: 'wav',
      defaultSampleRate: 8000,
      recordingAsrEnabled: true,
      streamingAsrEnabled: true,
      recordingAsrEndpointUrl: gateway,
      streamingAsrEndpointUrl: gateway,
      remark: providerForm.value.remark || '{"appKey":"","region":"cn-shanghai"}'
    });
  } else {
    Object.assign(providerForm.value, {
      recordingAsrEnabled: false,
      streamingAsrEnabled: false,
      defaultRecordingAsr: false,
      defaultStreamingAsr: false
    });
  }
  if (type === 'ALIYUN_DASHSCOPE') {
    Object.assign(providerForm.value, {
      endpointUrl: providerForm.value.endpointUrl || 'https://dashscope.aliyuncs.com/compatible-mode/v1/audio/speech',
      authType: 'BEARER',
      authHeaderName: '',
      defaultVoice: 'Cherry',
      remark: providerForm.value.remark || '{"model":"qwen-tts"}'
    });
  }
};
const submitProvider = () =>
  providerFormRef.value?.validate(async (valid) => {
    if (!valid) return;
    if (!providerForm.value.ttsEnabled && !providerForm.value.recordingAsrEnabled && !providerForm.value.streamingAsrEnabled)
      return proxy?.$modal.msgError('至少启用一种语音能力');
    providerForm.value.id ? await updateSpeechProvider(providerForm.value) : await createSpeechProvider(providerForm.value);
    proxy?.$modal.msgSuccess('保存成功');
    providerDrawer.visible = false;
    await loadProviders();
  });
const removeProvider = async (row: AiSpeechProviderVO) => {
  await proxy?.$modal.confirm(`确认删除语音服务商 ${row.providerName} 吗？`);
  await deleteSpeechProvider(row.id);
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

const openTtsTest = (row: AiSpeechProviderVO) => {
  testingProviderId.value = row.id;
  ttsTestResult.value = {};
  ttsTestForm.value = {
    text: '工号1001为您服务',
    voice: row.defaultVoice || '',
    format: row.defaultFormat || 'wav',
    sampleRate: row.defaultSampleRate || 8000
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
  if (!testingProviderId.value || !asrTestFile.value) return proxy?.$modal.msgError('请先选择测试音频');
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
