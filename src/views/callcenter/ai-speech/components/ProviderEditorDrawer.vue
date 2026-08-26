<template>
  <el-drawer v-model="visible" :title="form.id ? '修改语音服务商' : '新增语音服务商'" size="760px" destroy-on-close>
    <el-form ref="formRef" :model="form" :rules="rules" label-width="112px">
      <el-alert type="info" :closable="false" show-icon class="provider-tip">
        <template #title>只需配置服务商、凭证和要启用的能力，接口地址默认由系统维护。</template>
      </el-alert>

      <el-divider content-position="left">基础信息</el-divider>
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="服务商" prop="providerType">
            <el-select v-model="form.providerType" :disabled="Boolean(form.id)" style="width: 100%" @change="changeProvider">
              <el-option v-for="item in definitions" :key="item.providerType" :label="item.label" :value="item.providerType">
                <div class="provider-option">
                  <span>{{ item.label }}</span>
                  <small>{{ item.description }}</small>
                </div>
              </el-option>
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="配置名称" prop="providerName">
            <el-input v-model="form.providerName" maxlength="64" placeholder="例如：生产环境百炼语音" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item label="状态">
        <el-switch v-model="form.enabled" active-text="启用" inactive-text="停用" />
      </el-form-item>

      <template v-if="definition?.credentialFields.length">
        <el-divider content-position="left">账号凭证</el-divider>
        <el-row :gutter="16">
          <el-col v-for="field in definition.credentialFields" :key="field.key" :span="12">
            <el-form-item :label="field.label" :required="field.required">
              <el-select v-if="field.type === 'SELECT'" v-model="credentials[field.key]" style="width: 100%">
                <el-option v-for="option in field.options" :key="option.value" :label="option.label" :value="option.value" />
              </el-select>
              <el-input
                v-else
                v-model="credentials[field.key]"
                :type="field.secret ? 'password' : 'text'"
                :show-password="field.secret"
                :placeholder="secretPlaceholder(field)"
                autocomplete="new-password"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </template>

      <div class="capability-title">
        <span>能力配置</span>
        <div v-if="form.id" class="catalog-status">
          <small v-if="catalog">{{ catalog.source === 'DYNAMIC' ? '服务商目录' : '内置目录' }} · {{ catalog.refreshedAt }}</small>
          <el-button link type="primary" :loading="catalogLoading" @click="loadCatalog(true)">刷新模型/音色</el-button>
        </div>
      </div>
      <div class="capability-list">
        <section v-for="item in supportedCapabilities" :key="item.capability" class="capability-card">
          <div class="capability-header">
            <div>
              <strong>{{ item.label }}</strong>
              <span>{{ capabilityDescription[item.capability] }}</span>
            </div>
            <el-switch v-model="dynamicForm[capabilityBinding[item.capability].enabled]" />
          </div>
          <el-row v-if="dynamicForm[capabilityBinding[item.capability].enabled]" :gutter="16" class="capability-fields">
            <el-col :span="item.supportsVoiceList ? 12 : 24">
              <el-form-item label="模型" label-width="58px">
                <el-select
                  v-model="dynamicForm[capabilityBinding[item.capability].model]"
                  filterable
                  allow-create
                  default-first-option
                  style="width: 100%"
                  placeholder="选择或输入模型名称"
                >
                  <el-option v-for="model in capabilityModels(item)" :key="model.id" :value="model.id" :label="model.label">
                    <span>{{ model.label }}</span>
                    <el-tag v-if="model.recommended" size="small" type="success" class="recommended">推荐</el-tag>
                  </el-option>
                </el-select>
                <div v-if="selectedModelHint(item)" class="model-hint">{{ selectedModelHint(item) }}</div>
              </el-form-item>
            </el-col>
            <el-col v-if="item.supportsVoiceList" :span="12">
              <el-form-item label="音色" label-width="58px">
                <div class="voice-field">
                  <el-select
                    v-model="dynamicForm[capabilityBinding[item.capability].voice]"
                    filterable
                    allow-create
                    default-first-option
                    clearable
                    placeholder="选择或输入音色名称"
                  >
                    <el-option v-for="voice in capabilityVoices(item)" :key="voice.id" :label="voice.label" :value="voice.id">
                      <span>{{ voice.label }}</span>
                      <el-tag v-if="voice.recommended" size="small" type="success" class="recommended">推荐</el-tag>
                    </el-option>
                  </el-select>
                  <el-button
                    v-if="item.capability === 'TTS' && form.id"
                    v-hasPermi="['callcenter:ai-speech:test']"
                    :loading="previewing === item.capability"
                    @click="previewVoice(item)"
                  >试听</el-button>
                </div>
              </el-form-item>
            </el-col>
          </el-row>
        </section>
      </div>

      <el-collapse class="advanced-collapse">
        <el-collapse-item title="高级配置" name="advanced">
          <el-alert title="只有私有化部署、代理转发或厂商地址变化时才需要自定义接口地址。" type="warning" :closable="false" show-icon />
          <div v-for="item in enabledCapabilities" :key="item.capability" class="endpoint-row">
            <span>{{ item.label }}</span>
            <el-radio-group v-model="dynamicForm[capabilityBinding[item.capability].mode]" size="small">
              <el-radio-button value="AUTO">系统默认</el-radio-button>
              <el-radio-button value="CUSTOM">自定义</el-radio-button>
            </el-radio-group>
            <el-input
              v-if="dynamicForm[capabilityBinding[item.capability].mode] === 'CUSTOM'"
              v-model="dynamicForm[capabilityBinding[item.capability].endpoint]"
              placeholder="请输入完整 HTTP/WS 地址"
            />
          </div>
          <el-row :gutter="16" class="audio-settings">
            <el-col :span="8">
              <el-form-item label="输出格式" label-width="78px"><el-input v-model="form.defaultFormat" /></el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="输出采样率" label-width="88px"
                ><el-input-number v-model="form.defaultSampleRate" :min="8000" :step="8000"
              /></el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="超时秒数" label-width="78px"><el-input-number v-model="form.timeoutSeconds" :min="1" :max="300" /></el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="备注" label-width="78px"><el-input v-model="form.remark" type="textarea" :rows="2" /></el-form-item>
        </el-collapse-item>
      </el-collapse>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button v-hasPermi="['callcenter:ai-speech:test']" :loading="validating" @click="previewValidate">保存前检查</el-button>
      <el-button type="primary" :loading="submitting" @click="submit">保存配置</el-button>
    </template>
  </el-drawer>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus';
import {
  createSpeechProvider,
  getSpeechProviderCatalog,
  testTtsProvider,
  testSpeechProviderPreviewConnection,
  updateSpeechProvider,
  validateSpeechProvider
} from '@/api/callcenter/ai-speech';
import type {
  AiSpeechProviderForm,
  AiSpeechProviderVO,
  SpeechCapability,
  SpeechCapabilityDefinitionVO,
  SpeechFieldDefinitionVO,
  SpeechModelDefinitionVO,
  SpeechProviderCatalogVO,
  SpeechProviderDefinitionVO
} from '@/api/callcenter/ai-speech/types';

const props = defineProps<{
  modelValue: boolean;
  provider?: AiSpeechProviderVO;
  definitions: SpeechProviderDefinitionVO[];
}>();
const emit = defineEmits<{ (e: 'update:modelValue', value: boolean): void; (e: 'saved'): void }>();
const { proxy } = getCurrentInstance() as ComponentInternalInstance;
const formRef = ref<FormInstance>();
const submitting = ref(false);
const validating = ref(false);
const catalogLoading = ref(false);
const previewing = ref<SpeechCapability>();
const catalog = ref<SpeechProviderCatalogVO>();
const credentials = reactive<Record<string, any>>({});

const visible = computed({ get: () => props.modelValue, set: (value) => emit('update:modelValue', value) });
const definition = computed(() => props.definitions.find((item) => item.providerType === form.value.providerType));
const supportedCapabilities = computed(() =>
  Object.values(definition.value?.capabilities || {}).filter((item): item is SpeechCapabilityDefinitionVO => Boolean(item?.supported))
);
const enabledCapabilities = computed(() =>
  supportedCapabilities.value.filter((item) => Boolean(form.value[capabilityBinding[item.capability].enabled]))
);

type FormKey = keyof AiSpeechProviderForm;
const capabilityBinding: Record<SpeechCapability, { enabled: FormKey; model: FormKey; voice: FormKey; mode: FormKey; endpoint: FormKey }> = {
  TTS: { enabled: 'ttsEnabled', model: 'ttsModel', voice: 'ttsVoice', mode: 'ttsEndpointMode', endpoint: 'endpointUrl' },
  STREAMING_TTS: {
    enabled: 'streamingTtsEnabled',
    model: 'streamingTtsModel',
    voice: 'streamingTtsVoice',
    mode: 'streamingTtsEndpointMode',
    endpoint: 'streamingTtsEndpointUrl'
  },
  RECORDING_ASR: {
    enabled: 'recordingAsrEnabled',
    model: 'recordingAsrModel',
    voice: 'defaultVoice',
    mode: 'recordingAsrEndpointMode',
    endpoint: 'recordingAsrEndpointUrl'
  },
  STREAMING_ASR: {
    enabled: 'streamingAsrEnabled',
    model: 'streamingAsrModel',
    voice: 'defaultVoice',
    mode: 'streamingAsrEndpointMode',
    endpoint: 'streamingAsrEndpointUrl'
  }
};
const capabilityDescription: Record<SpeechCapability, string> = {
  TTS: '将文本合成为完整音频',
  STREAMING_TTS: '边合成边播放，降低首句等待',
  RECORDING_ASR: '识别录音文件和通话录音',
  STREAMING_ASR: '通话过程中实时返回识别结果'
};

const rules: FormRules = {
  providerType: [{ required: true, message: '请选择服务商', trigger: 'change' }],
  providerName: [{ required: true, message: '请输入配置名称', trigger: 'blur' }]
};

const emptyForm = (): AiSpeechProviderForm => ({
  providerName: '',
  providerType: props.definitions[0]?.providerType || '',
  ttsEnabled: false,
  streamingTtsEnabled: false,
  recordingAsrEnabled: false,
  streamingAsrEnabled: false,
  defaultTts: false,
  defaultStreamingTts: false,
  defaultRecordingAsr: false,
  defaultStreamingAsr: false,
  endpointUrl: '',
  httpMethod: 'POST',
  authType: 'NONE',
  defaultFormat: 'wav',
  defaultSampleRate: 8000,
  timeoutSeconds: 60,
  asrLanguage: 'zh-CN',
  asrFormat: 'wav',
  asrSampleRate: 16000,
  asrEnablePunctuation: true,
  asrEnableItn: true,
  asrEnableIntermediateResult: true,
  asrSilenceTimeoutMs: 800,
  asrMaxSentenceMs: 15000,
  enabled: true,
  remark: '',
  ttsEndpointMode: 'AUTO',
  streamingTtsEndpointMode: 'AUTO',
  recordingAsrEndpointMode: 'AUTO',
  streamingAsrEndpointMode: 'AUTO'
});
const form = ref<AiSpeechProviderForm>(emptyForm());
const dynamicForm = computed(() => form.value as unknown as Record<string, any>);

const applyDefinitionDefaults = (selected?: SpeechProviderDefinitionVO, initializeCapabilities = true) => {
  if (!selected) return;
  form.value.providerName ||= selected.label;
  for (const item of Object.values(selected.capabilities)) {
    if (!item?.supported) continue;
    const binding = capabilityBinding[item.capability];
    if (initializeCapabilities) form.value[binding.enabled] = true as never;
    if (!form.value[binding.model]) form.value[binding.model] = item.defaultModel as never;
    if (!form.value[binding.mode]) form.value[binding.mode] = (selected.providerType === 'CUSTOM_HTTP' ? 'CUSTOM' : 'AUTO') as never;
  }
  for (const field of selected.credentialFields) {
    if (field.defaultValue !== undefined && credentials[field.key] === undefined) credentials[field.key] = field.defaultValue;
  }
};

const reset = () => {
  catalog.value = undefined;
  Object.keys(credentials).forEach((key) => delete credentials[key]);
  form.value = props.provider ? { ...emptyForm(), ...props.provider, credentials: {} } : emptyForm();
  Object.assign(credentials, props.provider?.credentialValues || {});
  applyDefinitionDefaults(definition.value, !props.provider);
  if (form.value.id) void loadCatalog(false);
};

const loadCatalog = async (refresh = false) => {
  if (!form.value.id) return;
  catalogLoading.value = true;
  try {
    const res = await getSpeechProviderCatalog(form.value.id, refresh);
    catalog.value = res.data;
    if (refresh) proxy?.$modal.msgSuccess(res.data.message);
  } finally {
    catalogLoading.value = false;
  }
};

const capabilityModels = (item: SpeechCapabilityDefinitionVO) =>
  catalog.value?.capabilities[item.capability]?.models?.length ? catalog.value.capabilities[item.capability]!.models : item.models;

const selectedModel = (item: SpeechCapabilityDefinitionVO): SpeechModelDefinitionVO | undefined => {
  const value = dynamicForm.value[capabilityBinding[item.capability].model];
  return capabilityModels(item).find((model) => model.id === value);
};

const capabilityVoices = (item: SpeechCapabilityDefinitionVO) => {
  const dynamic = catalog.value?.capabilities[item.capability]?.voices || [];
  if (dynamic.length) return dynamic;
  return selectedModel(item)?.voices || [];
};

const selectedModelHint = (item: SpeechCapabilityDefinitionVO) => {
  const model = selectedModel(item);
  if (!model) return '';
  const parts: string[] = [];
  if (model.formats?.length) parts.push(`格式：${model.formats.join('、')}`);
  if (model.sampleRates?.length) parts.push(`采样率：${model.sampleRates.join('、')} Hz`);
  return parts.join('；');
};

const previewVoice = async (item: SpeechCapabilityDefinitionVO) => {
  if (!form.value.id) return;
  previewing.value = item.capability;
  try {
    const binding = capabilityBinding[item.capability];
    const res = await testTtsProvider(form.value.id, {
      text: '您好，这是一段音色试听。',
      voice: String(form.value[binding.voice] || ''),
      format: form.value.defaultFormat,
      sampleRate: form.value.defaultSampleRate
    });
    if (!res.data.playbackUrl) throw new Error('服务商没有返回可播放音频');
    await new Audio(res.data.playbackUrl).play();
  } catch (error) {
    proxy?.$modal.msgError(error instanceof Error ? error.message : '音色试听失败');
  } finally {
    previewing.value = undefined;
  }
};

watch(
  () => props.modelValue,
  (open) => {
    if (open) nextTick(reset);
  }
);
watch(
  () => props.definitions,
  () => {
    if (props.modelValue && !form.value.providerType) reset();
  },
  { deep: true }
);

const changeProvider = () => {
  const type = form.value.providerType;
  form.value = { ...emptyForm(), providerType: type };
  Object.keys(credentials).forEach((key) => delete credentials[key]);
  applyDefinitionDefaults(definition.value);
};

const secretPlaceholder = (field: SpeechFieldDefinitionVO) => {
  if (field.secret && props.provider?.configuredSecretFields?.includes(field.key)) return '已配置，留空表示不修改';
  return field.placeholder || '';
};

const validateConfiguration = () => {
  if (!enabledCapabilities.value.length) throw new Error('请至少启用一项语音能力');
  for (const field of definition.value?.credentialFields || []) {
    const configured = props.provider?.configuredSecretFields?.includes(field.key);
    if (field.required && !configured && !String(credentials[field.key] ?? '').trim()) throw new Error(`请填写${field.label}`);
  }
  for (const item of enabledCapabilities.value) {
    const binding = capabilityBinding[item.capability];
    if (!String(form.value[binding.model] ?? '').trim()) throw new Error(`请选择${item.label}模型`);
    if (form.value[binding.mode] === 'CUSTOM' && !String(form.value[binding.endpoint] ?? '').trim()) throw new Error(`请输入${item.label}接口地址`);
  }
};

const submit = async () => {
  await formRef.value?.validate();
  try {
    validateConfiguration();
  } catch (error) {
    proxy?.$modal.msgError(error instanceof Error ? error.message : '请检查配置');
    return;
  }
  submitting.value = true;
  try {
    form.value.credentials = { ...credentials };
    if (form.value.id) await updateSpeechProvider(form.value);
    else await createSpeechProvider(form.value);
    proxy?.$modal.msgSuccess('保存成功');
    visible.value = false;
    emit('saved');
  } finally {
    submitting.value = false;
  }
};

const previewValidate = async () => {
  await formRef.value?.validate();
  try {
    validateConfiguration();
  } catch (error) {
    proxy?.$modal.msgError(error instanceof Error ? error.message : '请检查配置');
    return;
  }
  validating.value = true;
  try {
    form.value.credentials = { ...credentials };
    await validateSpeechProvider(form.value);
    const res = await testSpeechProviderPreviewConnection(form.value);
    proxy?.$modal.msgSuccess(`${res.data.message}（${res.data.durationMs}ms）`);
  } finally {
    validating.value = false;
  }
};
</script>

<style scoped lang="scss">
.provider-tip {
  margin-bottom: 18px;
}
.provider-option {
  display: flex;
  justify-content: space-between;
  gap: 24px;
}
.provider-option small {
  color: var(--el-text-color-secondary);
}
.capability-list {
  display: grid;
  gap: 12px;
}
.capability-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 24px 0 14px;
  color: var(--el-text-color-primary);
  font-weight: 600;
}
.catalog-status {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 400;
  color: var(--el-text-color-secondary);
}
.capability-card {
  padding: 14px 16px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  background: var(--el-fill-color-lighter);
}
.capability-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.capability-header strong {
  display: block;
}
.capability-header span {
  display: block;
  margin-top: 3px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.capability-fields {
  margin-top: 14px;
}
.capability-fields :deep(.el-form-item) {
  margin-bottom: 0;
}
.recommended {
  margin-left: 8px;
}
.voice-field {
  display: flex;
  width: 100%;
  gap: 8px;
}
.voice-field .el-select {
  flex: 1;
}
.model-hint {
  margin-top: 4px;
  color: var(--el-text-color-secondary);
  font-size: 11px;
  line-height: 16px;
}
.advanced-collapse {
  margin-top: 18px;
}
.endpoint-row {
  display: grid;
  grid-template-columns: 120px 180px 1fr;
  align-items: center;
  gap: 12px;
  margin: 14px 0;
}
.audio-settings {
  margin-top: 20px;
}
</style>
