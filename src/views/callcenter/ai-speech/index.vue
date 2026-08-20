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

    <el-drawer v-model="providerDrawer.visible" :title="providerForm.id ? '修改语音服务商' : '新增语音服务商'" size="1040px">
      <el-form ref="providerFormRef" class="speech-provider-form" :model="providerForm" :rules="providerRules" label-width="112px">
        <el-alert class="mb-3" type="info" show-icon :closable="false" title="选择产品后只填写对应凭证即可，接口地址和协议参数已使用系统模板。" />

        <section class="provider-section provider-summary">
          <div class="section-title">
            <div>
              <h3>选择语音产品</h3>
              <p>千问语音属于阿里云百炼；不同厂商使用独立适配器，业务侧仍使用统一的 TTS / ASR 能力。</p>
            </div>
            <el-switch v-model="providerForm.enabled" active-text="启用" inactive-text="停用" />
          </div>
          <el-form-item label="语音产品" prop="providerType">
            <el-radio-group
              v-model="providerForm.providerType"
              class="provider-product-grid"
              :disabled="!!providerForm.id"
              @change="handleProviderTypeChange"
            >
              <el-radio-button value="ALIYUN_DASHSCOPE">
                <strong>阿里云百炼</strong>
                <small>千问 TTS / ASR / 实时语音</small>
              </el-radio-button>
              <el-radio-button value="ALIYUN_NLS">
                <strong>阿里云 NLS</strong>
                <small>智能语音交互 TTS / ASR</small>
              </el-radio-button>
              <el-radio-button value="FUNASR">
                <strong>FunASR</strong>
                <small>本地部署 · 句级 ASR</small>
              </el-radio-button>
              <el-radio-button value="KOKORO_LOCAL">
                <strong>Kokoro 本地 TTS</strong>
                <small>本地部署 · 流式语音合成</small>
              </el-radio-button>
              <el-radio-button value="OPENAI_COMPATIBLE">
                <strong>OpenAI 兼容</strong>
                <small>标准 Audio API</small>
              </el-radio-button>
              <el-radio-button value="CUSTOM_HTTP">
                <strong>自定义服务</strong>
                <small>本地或第三方 HTTP</small>
              </el-radio-button>
            </el-radio-group>
          </el-form-item>
          <div class="planned-provider-row">
            <span>待接入：</span>
            <el-tag type="info">火山引擎</el-tag>
            <el-tag type="info">科大讯飞</el-tag>
            <span>接入适配器后会自动出现对应的简易凭证表单。</span>
          </div>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="服务商名称" prop="providerName">
                <el-input v-model="providerForm.providerName" placeholder="如 阿里云百炼" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="服务商编码" prop="providerCode">
                <el-input v-model="providerForm.providerCode" :disabled="!!providerForm.id" placeholder="系统自动生成，也可修改" />
              </el-form-item>
            </el-col>
          </el-row>
        </section>

        <section class="provider-section credential-section">
          <div class="section-title">
            <div>
              <h3>账号凭证</h3>
              <p>{{ providerCredentialHint }}</p>
            </div>
            <el-tag v-if="editingAuthConfigured" type="success">密钥已配置</el-tag>
          </div>
          <el-row v-if="providerForm.providerType === 'ALIYUN_NLS'" :gutter="16">
            <el-col :span="12">
              <el-form-item label="AppKey" required>
                <el-input v-model="simpleCredential.appKey" placeholder="智能语音交互项目 AppKey" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="区域">
                <el-select v-model="simpleCredential.region" style="width: 100%">
                  <el-option label="上海 cn-shanghai" value="cn-shanghai" />
                  <el-option label="北京 cn-beijing" value="cn-beijing" />
                  <el-option label="深圳 cn-shenzhen" value="cn-shenzhen" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="AccessKeyId" required>
                <el-input v-model="simpleCredential.accessKeyId" placeholder="RAM 子用户 AccessKey ID" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="AccessKeySecret" :required="!editingAuthConfigured">
                <el-input
                  v-model="simpleCredential.secret"
                  type="password"
                  show-password
                  :placeholder="editingAuthConfigured ? '已配置，留空表示不修改' : 'RAM 子用户 AccessKey Secret'"
                />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row v-else-if="providerForm.providerType === 'ALIYUN_DASHSCOPE'" :gutter="16">
            <el-col :span="12">
              <el-form-item label="API Key" :required="!editingAuthConfigured">
                <el-input
                  v-model="simpleCredential.secret"
                  type="password"
                  show-password
                  :placeholder="editingAuthConfigured ? '已配置，留空表示不修改' : '百炼 DASHSCOPE_API_KEY'"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="WorkspaceId">
                <el-input v-model="simpleCredential.workspaceId" placeholder="业务空间调用时填写，公共模式可留空" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row v-else-if="providerForm.providerType === 'FUNASR'" :gutter="16">
            <el-col :span="12">
              <el-form-item label="认证方式">
                <el-select v-model="providerForm.authType" style="width: 100%">
                  <el-option label="无认证（内网部署）" value="NONE" />
                  <el-option label="Bearer Token" value="BEARER" />
                  <el-option label="Header Token" value="HEADER" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col v-if="providerForm.authType === 'HEADER'" :span="12">
              <el-form-item label="Header名称">
                <el-input v-model="providerForm.authHeaderName" placeholder="例如 X-API-Key" />
              </el-form-item>
            </el-col>
            <el-col v-if="providerForm.authType !== 'NONE'" :span="12">
              <el-form-item label="访问密钥" :required="!editingAuthConfigured">
                <el-input
                  v-model="simpleCredential.secret"
                  type="password"
                  show-password
                  :placeholder="editingAuthConfigured ? '已配置，留空表示不修改' : '反向代理启用认证时填写'"
                />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row v-else-if="providerForm.providerType === 'KOKORO_LOCAL'" :gutter="16">
            <el-col :span="12">
              <el-form-item label="认证方式">
                <el-select v-model="providerForm.authType" style="width: 100%">
                  <el-option label="无认证（内网部署）" value="NONE" />
                  <el-option label="Bearer Token" value="BEARER" />
                  <el-option label="Header Token" value="HEADER" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col v-if="providerForm.authType === 'HEADER'" :span="12">
              <el-form-item label="Header名称">
                <el-input v-model="providerForm.authHeaderName" placeholder="例如 X-API-Key" />
              </el-form-item>
            </el-col>
            <el-col v-if="providerForm.authType !== 'NONE'" :span="12">
              <el-form-item label="访问密钥" :required="!editingAuthConfigured">
                <el-input
                  v-model="simpleCredential.secret"
                  type="password"
                  show-password
                  :placeholder="editingAuthConfigured ? '已配置，留空表示不修改' : '反向代理启用认证时填写'"
                />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row v-else :gutter="16">
            <el-col :span="12">
              <el-form-item label="API Key" :required="providerForm.authType !== 'NONE' && !editingAuthConfigured">
                <el-input
                  v-model="simpleCredential.secret"
                  type="password"
                  show-password
                  :placeholder="editingAuthConfigured ? '已配置，留空表示不修改' : '服务访问密钥'"
                />
              </el-form-item>
            </el-col>
            <el-col v-if="providerForm.providerType === 'CUSTOM_HTTP'" :span="12">
              <el-form-item label="服务地址">
                <el-input v-model="providerForm.endpointUrl" placeholder="https:// 或 http:// 服务地址" />
              </el-form-item>
            </el-col>
          </el-row>
        </section>

        <section class="provider-section">
          <div class="section-title">
            <div>
              <h3>能力与默认用途</h3>
              <p>打开能力代表这个服务商可用于对应场景；默认用途决定业务自动选择哪一条服务商。</p>
            </div>
          </div>
          <div class="capability-grid">
            <div v-if="providerForm.providerType !== 'FUNASR'" class="capability-card">
              <div>
                <strong>TTS 语音合成</strong>
                <p>坐席提示音、普通语音合成。</p>
              </div>
              <el-switch v-model="providerForm.ttsEnabled" />
              <el-checkbox v-model="providerForm.defaultTts" :disabled="!providerForm.ttsEnabled">设为默认</el-checkbox>
            </div>
            <div v-if="providerForm.providerType !== 'FUNASR'" class="capability-card">
              <div>
                <strong>实时 TTS</strong>
                <p>AI 实时对话时按分句流式合成。</p>
              </div>
              <el-switch v-model="providerForm.streamingTtsEnabled" />
              <el-checkbox v-model="providerForm.defaultStreamingTts" :disabled="!providerForm.streamingTtsEnabled">设为默认</el-checkbox>
            </div>
            <div v-if="providerForm.providerType !== 'KOKORO_LOCAL'" class="capability-card">
              <div>
                <strong>录音 ASR</strong>
                <p>通话录音、上传文件转文字。</p>
              </div>
              <el-switch v-model="providerForm.recordingAsrEnabled" />
              <el-checkbox v-model="providerForm.defaultRecordingAsr" :disabled="!providerForm.recordingAsrEnabled">设为默认</el-checkbox>
            </div>
            <div v-if="providerForm.providerType !== 'FUNASR' && providerForm.providerType !== 'KOKORO_LOCAL'" class="capability-card">
              <div>
                <strong>实时 ASR</strong>
                <p>AI 通话实时识别客户语音。</p>
              </div>
              <el-switch v-model="providerForm.streamingAsrEnabled" />
              <el-checkbox v-model="providerForm.defaultStreamingAsr" :disabled="!providerForm.streamingAsrEnabled">设为默认</el-checkbox>
            </div>
          </div>
        </section>

        <section v-if="providerForm.providerType === 'FUNASR'" class="provider-section">
          <div class="section-title">
            <div>
              <h3>FunASR 识别配置</h3>
              <p>当前沿用 UniMRCP 断句，一句话收齐后调用本地 FunASR HTTP 接口，不改变现有通话流程。</p>
            </div>
          </div>
          <el-row :gutter="16">
            <el-col :span="24">
              <el-form-item label="服务地址" required>
                <el-input v-model="providerForm.recordingAsrEndpointUrl" placeholder="http://FunASR服务器IP:8000/v1/audio/transcriptions" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="模型名称">
                <el-input v-model="funAsrOptions.model" placeholder="sensevoice" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="服务采样率">
                <el-select v-model="providerForm.asrSampleRate" style="width: 100%">
                  <el-option label="16000 Hz（推荐）" :value="16000" />
                  <el-option label="8000 Hz" :value="8000" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="超时时间">
                <el-input-number v-model="providerForm.timeoutSeconds" :min="5" :max="300" style="width: 100%" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-alert type="info" show-icon :closable="false" title="电话侧通常上传 8kHz PCM，系统会转换为标准 16kHz 单声道 WAV 后提交到 FunASR。" />
        </section>

        <section v-if="providerForm.providerType === 'KOKORO_LOCAL'" class="provider-section">
          <div class="section-title">
            <div>
              <h3>Kokoro 本地合成配置</h3>
              <p>服务输出 24kHz PCM，CallNexus 会实时转换为电话侧使用的 8kHz PCM，不需要修改 UniMRCP 或 FreeSWITCH。</p>
            </div>
          </div>
          <el-row :gutter="16">
            <el-col :span="24">
              <el-form-item label="服务地址" required>
                <el-input v-model="providerForm.endpointUrl" placeholder="http://Kokoro服务器IP:8880，可填写基础地址或 /v1/audio/speech 完整地址" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="模型名称">
                <el-input v-model="kokoroOptions.model" placeholder="kokoro" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="默认音色">
                <el-select v-model="providerForm.defaultVoice" filterable allow-create default-first-option style="width: 100%" placeholder="如 zf_001">
                  <el-option v-for="voice in kokoroVoices" :key="voice" :label="voice" :value="voice" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="音色列表">
                <el-button :loading="kokoroVoicesLoading" :disabled="!providerForm.id" @click="loadKokoroVoices">刷新音色</el-button>
                <span v-if="!providerForm.id" class="field-hint">保存后可读取</span>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="语速">
                <el-input-number v-model="kokoroOptions.speed" :min="0.25" :max="4" :step="0.05" :precision="2" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="语言代码">
                <el-input v-model="kokoroOptions.langCode" placeholder="中文使用 z" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="输出采样率">
                <el-select v-model="providerForm.defaultSampleRate" style="width: 100%">
                  <el-option label="8000 Hz（电话推荐）" :value="8000" />
                  <el-option label="16000 Hz" :value="16000" />
                  <el-option label="24000 Hz" :value="24000" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="服务采样率">
                <el-input-number v-model="kokoroOptions.sourceSampleRate" :min="8000" :max="48000" :step="1000" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="音量倍数">
                <el-input-number v-model="kokoroOptions.volumeMultiplier" :min="0.1" :max="3" :step="0.1" :precision="1" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="超时时间">
                <el-input-number v-model="providerForm.timeoutSeconds" :min="5" :max="300" style="width: 100%" />
              </el-form-item>
            </el-col>
          </el-row>
        </section>

        <el-collapse v-if="providerForm.providerType !== 'FUNASR' && providerForm.providerType !== 'KOKORO_LOCAL'" v-model="advancedSections" class="provider-advanced">
          <el-collapse-item title="高级配置（通常无需修改）" name="common">
            <el-row :gutter="16">
              <el-col :span="8">
                <el-form-item label="默认音色">
                  <el-input v-model="providerForm.defaultVoice" placeholder="如 Cherry、xiaoyun、alloy" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="TTS格式">
                  <el-select v-model="providerForm.defaultFormat" style="width: 100%">
                    <el-option label="wav" value="wav" />
                    <el-option label="mp3" value="mp3" />
                    <el-option label="pcm" value="pcm" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="TTS采样率">
                  <el-input-number v-model="providerForm.defaultSampleRate" :min="8000" :max="48000" :step="1000" style="width: 100%" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="ASR语言">
                  <el-input v-model="providerForm.asrLanguage" placeholder="zh-CN" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="ASR格式">
                  <el-select v-model="providerForm.asrFormat" style="width: 100%">
                    <el-option label="wav" value="wav" />
                    <el-option label="pcm" value="pcm" />
                    <el-option label="opus" value="opus" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="ASR采样率">
                  <el-input-number v-model="providerForm.asrSampleRate" :min="8000" :max="48000" :step="1000" style="width: 100%" />
                </el-form-item>
              </el-col>
            </el-row>
          </el-collapse-item>
          <el-collapse-item title="认证配置" name="auth">
            <el-row :gutter="16">
              <el-col :span="8">
                <el-form-item label="认证方式" prop="authType">
                  <el-select v-model="providerForm.authType" style="width: 100%">
                    <el-option label="无" value="NONE" />
                    <el-option label="Bearer Token" value="BEARER" />
                    <el-option label="Header Token" value="HEADER" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col v-if="providerForm.authType === 'HEADER'" :span="8">
                <el-form-item label="Header名称">
                  <el-input v-model="providerForm.authHeaderName" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="Token/API Key">
                  <el-input v-model="simpleCredential.secret" type="password" show-password placeholder="请在上方账号凭证中填写" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="超时时间">
                  <el-input-number v-model="providerForm.timeoutSeconds" :min="5" :max="300" style="width: 100%" />
                </el-form-item>
              </el-col>
            </el-row>
          </el-collapse-item>

          <el-collapse-item title="TTS 地址与实时参数" name="tts">
            <el-row :gutter="16">
              <el-col :span="6">
                <el-form-item label="请求方法">
                  <el-select v-model="providerForm.httpMethod" style="width: 100%">
                    <el-option label="POST" value="POST" />
                    <el-option label="GET" value="GET" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="18">
                <el-form-item label="TTS地址">
                  <el-input v-model="providerForm.endpointUrl" placeholder="HTTP TTS 接口地址" />
                </el-form-item>
              </el-col>
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
            </el-row>
          </el-collapse-item>

          <el-collapse-item title="ASR 地址与识别参数" name="asr">
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
                <el-form-item label="静音断句">
                  <el-input-number v-model="providerForm.asrSilenceTimeoutMs" :min="200" :max="10000" :step="100" style="width: 100%" />
                </el-form-item>
              </el-col>
              <el-col :span="6">
                <el-form-item label="最长单句">
                  <el-input-number v-model="providerForm.asrMaxSentenceMs" :min="1000" :max="60000" :step="1000" style="width: 100%" />
                </el-form-item>
              </el-col>
              <el-col :span="4">
                <el-form-item label="标点">
                  <el-switch v-model="providerForm.asrEnablePunctuation" />
                </el-form-item>
              </el-col>
              <el-col :span="4">
                <el-form-item label="ITN">
                  <el-switch v-model="providerForm.asrEnableItn" />
                </el-form-item>
              </el-col>
              <el-col :span="4">
                <el-form-item label="中间结果">
                  <el-switch v-model="providerForm.asrEnableIntermediateResult" />
                </el-form-item>
              </el-col>
              <el-col :span="24">
                <el-form-item label="ASR扩展参数">
                  <el-input
                    v-model="providerForm.asrOptionsJson"
                    type="textarea"
                    :rows="3"
                    placeholder='{"fileModel":"qwen3-asr-flash","realtimeModel":"qwen3-asr-flash-realtime"}'
                  />
                </el-form-item>
              </el-col>
            </el-row>
          </el-collapse-item>

          <el-collapse-item title="备注与厂商扩展JSON" name="remark">
            <el-form-item label="扩展JSON">
              <el-input
                v-model="providerForm.remark"
                type="textarea"
                :rows="4"
                placeholder='百炼可填 {"workspaceId":"xxx"}；其他厂商按适配器要求填写。'
              />
            </el-form-item>
          </el-collapse-item>
        </el-collapse>
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
import { UploadFilled } from '@element-plus/icons-vue';
import type { FormInstance, FormRules } from 'element-plus';
import {
  createSpeechProvider,
  createSpeechTemplate,
  deleteSpeechProvider,
  deleteSpeechTemplate,
  listSpeechProviderVoices,
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
const taskTotal = ref(0);

const providerFormRef = ref<FormInstance>();
const templateFormRef = ref<FormInstance>();
const providerDrawer = reactive({ visible: false });
const templateDialog = reactive({ visible: false });
const ttsTestDialog = reactive({ visible: false });
const asrTestDialog = reactive({ visible: false });
const taskQuery = ref<AiSpeechTaskQuery>({ pageNum: 1, pageSize: 10 });

const providerForm = ref<AiSpeechProviderForm>(defaultProviderForm());
const advancedSections = ref<string[]>([]);
const editingAuthConfigured = ref(false);
const simpleCredential = reactive({
  appKey: '',
  accessKeyId: '',
  secret: '',
  region: 'cn-shanghai',
  workspaceId: ''
});
const funAsrOptions = reactive({
  model: 'sensevoice'
});
const kokoroOptions = reactive({
  model: 'kokoro',
  speed: 1,
  langCode: 'z',
  sourceSampleRate: 24000,
  volumeMultiplier: 1
});
const kokoroVoices = ref<string[]>([]);
const kokoroVoicesLoading = ref(false);
const providerCredentialHint = computed(() => {
  if (providerForm.value.providerType === 'ALIYUN_NLS') {
    return '只需填写智能语音交互项目 AppKey 和 RAM 子用户 AccessKey，服务地址由区域自动生成。';
  }
  if (providerForm.value.providerType === 'ALIYUN_DASHSCOPE') {
    return '千问语音使用百炼 API Key；仅使用业务空间专属地址时才需要 WorkspaceId。';
  }
  if (providerForm.value.providerType === 'OPENAI_COMPATIBLE') {
    return '填写兼容服务的 API Key，标准接口地址已预置，可在高级配置中覆盖。';
  }
  if (providerForm.value.providerType === 'FUNASR') {
    return '填写已部署的 FunASR HTTP 转写地址；内网部署通常不需要认证。';
  }
  if (providerForm.value.providerType === 'KOKORO_LOCAL') {
    return '填写 Kokoro FastAPI 地址；内网部署默认无需密钥，模型、音色和语速在下方直接配置。';
  }
  return '填写自建或第三方服务地址和访问密钥，协议细节可在高级配置中覆盖。';
});
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
    endpointUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/audio/speech',
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
    recordingAsrEndpointUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    streamingAsrEndpointUrl: '',
    asrLanguage: 'zh-CN',
    asrFormat: 'wav',
    asrSampleRate: 16000,
    asrEnablePunctuation: true,
    asrEnableItn: true,
    asrEnableIntermediateResult: true,
    asrSilenceTimeoutMs: 800,
    asrMaxSentenceMs: 15000,
    asrOptionsJson: '{"fileModel":"qwen3-asr-flash","realtimeModel":"qwen3-asr-flash-realtime"}',
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
    tasks.value = res.rows || [];
    taskTotal.value = res.total || 0;
  } finally {
    taskLoading.value = false;
  }
};

const openProviderDrawer = (row?: AiSpeechProviderVO) => {
  providerForm.value = row ? { ...defaultProviderForm(), ...row, authToken: '' } : defaultProviderForm();
  editingAuthConfigured.value = Boolean(row?.authConfigured);
  advancedSections.value = [];
  hydrateSimpleCredential(row);
  hydrateFunAsrOptions(row);
  hydrateKokoroOptions(row);
  if (!row) {
    handleProviderTypeChange(providerForm.value.providerType);
  } else if (row.providerType === 'KOKORO_LOCAL') {
    loadKokoroVoices();
  }
  providerDrawer.visible = true;
};

const parseRemark = (remark?: string): Record<string, unknown> => {
  if (!remark?.trim()) {
    return {};
  }
  try {
    const value = JSON.parse(remark);
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
};

const hydrateSimpleCredential = (row?: AiSpeechProviderVO) => {
  const config = parseRemark(row?.remark);
  simpleCredential.appKey = String(config.appKey || config.app_key || '');
  simpleCredential.accessKeyId = row?.authHeaderName || '';
  simpleCredential.secret = '';
  simpleCredential.region = String(config.region || 'cn-shanghai');
  simpleCredential.workspaceId = String(config.workspaceId || config.workspace_id || '');
};

const hydrateFunAsrOptions = (row?: AiSpeechProviderVO) => {
  const options = parseRemark(row?.asrOptionsJson);
  funAsrOptions.model = String(options.model || 'sensevoice');
};

const hydrateKokoroOptions = (row?: AiSpeechProviderVO) => {
  const options = parseRemark(row?.remark);
  kokoroOptions.model = String(options.model || 'kokoro');
  kokoroOptions.speed = Number(options.speed || 1);
  kokoroOptions.langCode = String(options.langCode || 'z');
  kokoroOptions.sourceSampleRate = Number(options.sourceSampleRate || 24000);
  kokoroOptions.volumeMultiplier = Number(options.volumeMultiplier || 1);
  kokoroVoices.value = row?.defaultVoice ? [row.defaultVoice] : [];
};

const loadKokoroVoices = async () => {
  if (!providerForm.value.id || providerForm.value.providerType !== 'KOKORO_LOCAL') return;
  kokoroVoicesLoading.value = true;
  try {
    const response = await listSpeechProviderVoices(providerForm.value.id);
    kokoroVoices.value = response.data || [];
    if (!providerForm.value.defaultVoice && kokoroVoices.value.length > 0) {
      providerForm.value.defaultVoice = kokoroVoices.value[0];
    }
  } finally {
    kokoroVoicesLoading.value = false;
  }
};

const setProductIdentity = (type: string) => {
  if (providerForm.value.id) {
    return;
  }
  const identity: Record<string, { code: string; name: string }> = {
    ALIYUN_DASHSCOPE: { code: 'ALIYUN_DASHSCOPE', name: '阿里云百炼' },
    ALIYUN_NLS: { code: 'ALIYUN_NLS', name: '阿里云 NLS' },
    FUNASR: { code: 'FUNASR', name: 'FunASR 本地识别' },
    KOKORO_LOCAL: { code: 'KOKORO_LOCAL', name: 'Kokoro 本地语音' },
    OPENAI_COMPATIBLE: { code: 'OPENAI_COMPATIBLE', name: 'OpenAI 兼容语音' },
    CUSTOM_HTTP: { code: 'CUSTOM_HTTP', name: '自定义语音服务' }
  };
  const selected = identity[type];
  if (selected) {
    providerForm.value.providerCode = selected.code;
    providerForm.value.providerName = selected.name;
  }
};

const handleProviderTypeChange = (type: string) => {
  setProductIdentity(type);
  editingAuthConfigured.value = false;
  simpleCredential.appKey = '';
  simpleCredential.accessKeyId = '';
  simpleCredential.secret = '';
  simpleCredential.region = 'cn-shanghai';
  simpleCredential.workspaceId = '';
  funAsrOptions.model = 'sensevoice';
  kokoroOptions.model = 'kokoro';
  kokoroOptions.speed = 1;
  kokoroOptions.langCode = 'z';
  kokoroOptions.sourceSampleRate = 24000;
  kokoroOptions.volumeMultiplier = 1;
  kokoroVoices.value = [];
  if (type === 'OPENAI_COMPATIBLE') {
    providerForm.value = {
      ...providerForm.value,
      authType: 'BEARER',
      ttsEnabled: true,
      streamingTtsEnabled: false,
      recordingAsrEnabled: true,
      streamingAsrEnabled: false,
      endpointUrl: 'https://api.openai.com/v1/audio/speech',
      httpMethod: 'POST',
      defaultVoice: providerForm.value.defaultVoice || 'alloy',
      defaultFormat: 'wav',
      defaultSampleRate: 24000,
      streamingTtsEndpointUrl: '',
      streamingTtsOptionsJson: '',
      recordingAsrEndpointUrl: 'https://api.openai.com/v1/audio/transcriptions',
      streamingAsrEndpointUrl: '',
      asrFormat: 'wav',
      asrSampleRate: 16000,
      asrOptionsJson: '{}',
      remark: providerForm.value.remark || '{"ttsModel":"gpt-4o-mini-tts","asrModel":"whisper-1"}'
    };
  }
  if (type === 'ALIYUN_DASHSCOPE') {
    providerForm.value = {
      ...providerForm.value,
      authType: 'BEARER',
      endpointUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/audio/speech',
      ttsEnabled: true,
      streamingTtsEnabled: true,
      recordingAsrEnabled: true,
      streamingAsrEnabled: false,
      defaultVoice: providerForm.value.defaultVoice || 'Cherry',
      defaultFormat: 'wav',
      defaultSampleRate: 8000,
      streamingTtsEndpointUrl: 'wss://dashscope.aliyuncs.com/api-ws/v1/realtime',
      streamingTtsOptionsJson: '{"model":"qwen3-tts-flash-realtime","speech_rate":1.0,"volume":50}',
      recordingAsrEndpointUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      streamingAsrEndpointUrl: '',
      asrOptionsJson: '{"fileModel":"qwen3-asr-flash","realtimeModel":"qwen3-asr-flash-realtime"}'
    };
  }
  if (type === 'ALIYUN_NLS') {
    providerForm.value = {
      ...providerForm.value,
      authType: 'NONE',
      ttsEnabled: true,
      streamingTtsEnabled: false,
      recordingAsrEnabled: true,
      streamingAsrEnabled: true,
      endpointUrl: '',
      defaultVoice: 'xiaoyun',
      defaultFormat: 'wav',
      defaultSampleRate: 8000,
      recordingAsrEndpointUrl: 'wss://nls-gateway-cn-shanghai.aliyuncs.com/ws/v1',
      streamingAsrEndpointUrl: 'wss://nls-gateway-cn-shanghai.aliyuncs.com/ws/v1',
      asrOptionsJson: '{}'
    };
  }
  if (type === 'FUNASR') {
    providerForm.value = {
      ...providerForm.value,
      authType: 'NONE',
      authHeaderName: '',
      ttsEnabled: false,
      streamingTtsEnabled: false,
      recordingAsrEnabled: true,
      streamingAsrEnabled: false,
      defaultTts: false,
      defaultStreamingTts: false,
      defaultRecordingAsr: false,
      defaultStreamingAsr: false,
      endpointUrl: '',
      streamingTtsEndpointUrl: '',
      streamingTtsOptionsJson: '',
      recordingAsrEndpointUrl: 'http://127.0.0.1:8000/v1/audio/transcriptions',
      streamingAsrEndpointUrl: '',
      asrLanguage: 'zh-CN',
      asrFormat: 'wav',
      asrSampleRate: 16000,
      asrEnablePunctuation: true,
      asrEnableItn: true,
      asrEnableIntermediateResult: false,
      asrOptionsJson: '{"model":"sensevoice","audioFs":16000}',
      timeoutSeconds: 60,
      remark: ''
    };
  }
  if (type === 'KOKORO_LOCAL') {
    providerForm.value = {
      ...providerForm.value,
      authType: 'NONE',
      authHeaderName: '',
      ttsEnabled: true,
      streamingTtsEnabled: true,
      recordingAsrEnabled: false,
      streamingAsrEnabled: false,
      defaultRecordingAsr: false,
      defaultStreamingAsr: false,
      endpointUrl: 'http://127.0.0.1:8880',
      httpMethod: 'POST',
      defaultVoice: 'zf_001',
      defaultFormat: 'wav',
      defaultSampleRate: 8000,
      streamingTtsEndpointUrl: '',
      streamingTtsOptionsJson: '',
      recordingAsrEndpointUrl: '',
      streamingAsrEndpointUrl: '',
      timeoutSeconds: 60,
      remark: '{"model":"kokoro","speed":1,"langCode":"z","sourceSampleRate":24000,"volumeMultiplier":1}'
    };
  }
  if (type === 'CUSTOM_HTTP') {
    providerForm.value = {
      ...providerForm.value,
      authType: 'BEARER',
      ttsEnabled: true,
      streamingTtsEnabled: false,
      recordingAsrEnabled: false,
      streamingAsrEnabled: false,
      endpointUrl: '',
      streamingTtsEndpointUrl: '',
      recordingAsrEndpointUrl: '',
      streamingAsrEndpointUrl: ''
    };
  }
};

const applySimpleCredential = () => {
  const type = providerForm.value.providerType;
  const config = parseRemark(providerForm.value.remark);
  if (type === 'ALIYUN_NLS') {
    if (!simpleCredential.appKey.trim()) {
      throw new Error('请输入阿里云 NLS AppKey');
    }
    if (!simpleCredential.accessKeyId.trim()) {
      throw new Error('请输入阿里云 NLS AccessKeyId');
    }
    if (!editingAuthConfigured.value && !simpleCredential.secret.trim()) {
      throw new Error('请输入阿里云 NLS AccessKeySecret');
    }
    config.appKey = simpleCredential.appKey.trim();
    config.region = simpleCredential.region;
    delete config.app_key;
    providerForm.value.authHeaderName = simpleCredential.accessKeyId.trim();
    providerForm.value.recordingAsrEndpointUrl = `wss://nls-gateway-${simpleCredential.region}.aliyuncs.com/ws/v1`;
    providerForm.value.streamingAsrEndpointUrl = providerForm.value.recordingAsrEndpointUrl;
  } else if (type === 'ALIYUN_DASHSCOPE') {
    if (!editingAuthConfigured.value && !simpleCredential.secret.trim()) {
      throw new Error('请输入阿里云百炼 API Key');
    }
    if (simpleCredential.workspaceId.trim()) {
      config.workspaceId = simpleCredential.workspaceId.trim();
    } else {
      delete config.workspaceId;
      delete config.workspace_id;
    }
  } else if (type === 'FUNASR') {
    const endpoint = providerForm.value.recordingAsrEndpointUrl?.trim() || '';
    if (!endpoint) {
      throw new Error('请输入 FunASR HTTP 地址');
    }
    if (!/^https?:\/\//i.test(endpoint)) {
      throw new Error('FunASR 地址必须以 http:// 或 https:// 开头');
    }
    if (providerForm.value.authType !== 'NONE' && !editingAuthConfigured.value && !simpleCredential.secret.trim()) {
      throw new Error('请输入 FunASR 访问密钥');
    }
    providerForm.value.recordingAsrEndpointUrl = endpoint;
    providerForm.value.asrOptionsJson = JSON.stringify({
      model: funAsrOptions.model.trim() || 'sensevoice',
      audioFs: providerForm.value.asrSampleRate || 16000
    });
  } else if (type === 'KOKORO_LOCAL') {
    const endpoint = providerForm.value.endpointUrl?.trim() || '';
    if (!endpoint) {
      throw new Error('请输入 Kokoro 服务地址');
    }
    if (!/^https?:\/\//i.test(endpoint)) {
      throw new Error('Kokoro 服务地址必须以 http:// 或 https:// 开头');
    }
    if (!providerForm.value.defaultVoice?.trim()) {
      throw new Error('请选择或输入 Kokoro 默认音色');
    }
    if (providerForm.value.authType !== 'NONE' && !editingAuthConfigured.value && !simpleCredential.secret.trim()) {
      throw new Error('请输入 Kokoro 访问密钥');
    }
    providerForm.value.endpointUrl = endpoint;
    config.model = kokoroOptions.model.trim() || 'kokoro';
    config.speed = kokoroOptions.speed;
    config.langCode = kokoroOptions.langCode.trim() || 'z';
    config.sourceSampleRate = kokoroOptions.sourceSampleRate || 24000;
    config.volumeMultiplier = kokoroOptions.volumeMultiplier;
  } else if (providerForm.value.authType !== 'NONE' && !editingAuthConfigured.value && !simpleCredential.secret.trim()) {
    throw new Error('请输入 API Key');
  }
  if (simpleCredential.secret.trim()) {
    providerForm.value.authToken = simpleCredential.secret.trim();
  }
  providerForm.value.remark = Object.keys(config).length ? JSON.stringify(config) : '';
};

const submitProvider = async () => {
  await providerFormRef.value?.validate();
  try {
    applySimpleCredential();
  } catch (error) {
    proxy?.$modal.msgError(error instanceof Error ? error.message : '请检查账号凭证');
    return;
  }
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
    proxy?.$modal.msgSuccess('TTS 测试音频生成成功');
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
