<template>
  <div class="p-2">
    <el-card shadow="never">
      <el-tabs v-model="tab">
        <el-tab-pane label="模型服务商" name="provider">
          <el-button type="primary" plain icon="Plus" class="mb-3" @click="editProvider()">新增服务商</el-button>
          <el-table v-loading="loading" :data="providers">
            <el-table-column label="编码" prop="providerCode" min-width="150" /><el-table-column label="名称" prop="providerName" min-width="160" />
            <el-table-column label="协议" prop="providerType" width="180" /><el-table-column label="服务地址" prop="baseUrl" min-width="260" show-overflow-tooltip />
            <el-table-column label="API Key" width="100"><template #default="{ row }"><el-tag :type="row.apiKeyConfigured ? 'success' : 'danger'">{{ row.apiKeyConfigured ? '已配置' : '未配置' }}</el-tag></template></el-table-column>
            <el-table-column label="状态" width="90"><template #default="{ row }"><el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '停用' }}</el-tag></template></el-table-column>
            <el-table-column label="操作" width="190" fixed="right"><template #default="{ row }"><el-button link type="primary" @click="testProvider(row)">测试</el-button><el-button link type="primary" @click="editProvider(row)">修改</el-button><el-button link type="danger" @click="removeProvider(row)">删除</el-button></template></el-table-column>
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="Chat / Embedding 模型" name="model">
          <el-button type="primary" plain icon="Plus" class="mb-3" @click="editModel()">新增模型</el-button>
          <el-table v-loading="loading" :data="models">
            <el-table-column label="模型编码" prop="modelCode" min-width="150" /><el-table-column label="模型名称" prop="modelName" min-width="190" />
            <el-table-column label="服务商" prop="providerName" min-width="150" /><el-table-column label="能力" prop="capability" width="120" />
            <el-table-column label="向量维度" prop="vectorDimension" width="110" /><el-table-column label="默认" width="80"><template #default="{ row }">{{ row.defaultModel ? '是' : '否' }}</template></el-table-column>
            <el-table-column label="状态" width="90"><template #default="{ row }"><el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '停用' }}</el-tag></template></el-table-column>
            <el-table-column label="操作" width="190" fixed="right"><template #default="{ row }"><el-button link type="primary" @click="testModel(row)">测试</el-button><el-button link type="primary" @click="editModel(row)">修改</el-button><el-button link type="danger" @click="removeModel(row)">删除</el-button></template></el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <el-dialog v-model="providerDialog" :title="providerForm.id ? '修改模型服务商' : '新增模型服务商'" width="680px">
      <el-form :model="providerForm" label-width="110px">
        <el-row :gutter="16"><el-col :span="12"><el-form-item label="服务商编码"><el-input v-model="providerForm.providerCode" /></el-form-item></el-col><el-col :span="12"><el-form-item label="服务商名称"><el-input v-model="providerForm.providerName" /></el-form-item></el-col></el-row>
        <el-form-item label="协议类型"><el-select v-model="providerForm.providerType" style="width:100%"><el-option label="OpenAI 兼容" value="OPENAI_COMPATIBLE" /></el-select></el-form-item>
        <el-form-item label="服务地址"><el-input v-model="providerForm.baseUrl" placeholder="http://127.0.0.1:11434/v1" /></el-form-item>
        <el-form-item label="API Key"><el-input v-model="providerForm.apiKey" type="password" show-password placeholder="修改时留空表示不变；Ollama 可填 ollama" /></el-form-item>
        <el-row :gutter="16"><el-col :span="12"><el-form-item label="连接超时"><el-input-number v-model="providerForm.connectTimeoutSeconds" :min="1" style="width:100%" /></el-form-item></el-col><el-col :span="12"><el-form-item label="读取超时"><el-input-number v-model="providerForm.readTimeoutSeconds" :min="1" style="width:100%" /></el-form-item></el-col></el-row>
        <el-form-item label="扩展配置"><el-input v-model="providerForm.extraConfigJson" type="textarea" :rows="3" placeholder="JSON，可选" /></el-form-item><el-form-item label="启用"><el-switch v-model="providerForm.enabled" /></el-form-item>
      </el-form><template #footer><el-button @click="providerDialog=false">取消</el-button><el-button type="primary" @click="saveProvider">保存</el-button></template>
    </el-dialog>
    <el-dialog v-model="modelDialog" :title="modelForm.id ? '修改模型' : '新增模型'" width="680px">
      <el-form :model="modelForm" label-width="110px">
        <el-form-item label="服务商"><el-select v-model="modelForm.providerId" style="width:100%"><el-option v-for="p in providers" :key="p.id" :label="p.providerName" :value="p.id" /></el-select></el-form-item>
        <el-row :gutter="16"><el-col :span="12"><el-form-item label="模型编码"><el-input v-model="modelForm.modelCode" /></el-form-item></el-col><el-col :span="12"><el-form-item label="模型名称"><el-input v-model="modelForm.modelName" /></el-form-item></el-col></el-row>
        <el-form-item label="模型能力"><el-radio-group v-model="modelForm.capability"><el-radio-button value="CHAT">Chat</el-radio-button><el-radio-button value="EMBEDDING">Embedding</el-radio-button></el-radio-group></el-form-item>
        <el-alert v-if="modelForm.capability==='EMBEDDING'" class="mb-4" type="info" :closable="false" title="向量维度由模型测试自动检测并保存，避免手工填写错误。" />
        <el-row :gutter="16"><el-col :span="12"><el-form-item label="批量大小"><el-input-number v-model="modelForm.maxBatchSize" :min="1" style="width:100%" /></el-form-item></el-col><el-col :span="12"><el-form-item label="最大输入"><el-input-number v-model="modelForm.maxInputTokens" :min="1" style="width:100%" /></el-form-item></el-col></el-row>
        <el-form-item label="请求参数"><el-input v-model="modelForm.requestOptionsJson" type="textarea" :rows="3" placeholder="OpenAI 请求参数 JSON，可选" /></el-form-item>
        <el-form-item label="默认/启用"><el-switch v-model="modelForm.defaultModel" active-text="默认模型" class="mr-6" /><el-switch v-model="modelForm.enabled" active-text="启用" /></el-form-item>
      </el-form><template #footer><el-button @click="modelDialog=false">取消</el-button><el-button type="primary" @click="saveModel">保存</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { createAiModel, createModelProvider, deleteAiModel, deleteModelProvider, listAiModels, listModelProviders, testAiModel, testModelProvider, updateAiModel, updateModelProvider } from '@/api/callcenter/ai-knowledge';
import type { AiModelForm, AiModelProviderForm, AiModelProviderVO, AiModelVO } from '@/api/callcenter/ai-knowledge/types';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;
const tab = ref('provider'); const loading = ref(false); const providers = ref<AiModelProviderVO[]>([]); const models = ref<AiModelVO[]>([]);
const providerDialog = ref(false); const modelDialog = ref(false);
const providerDefaults = (): AiModelProviderForm => ({ providerCode:'', providerName:'', providerType:'OPENAI_COMPATIBLE', baseUrl:'http://127.0.0.1:11434/v1', apiKey:'', organizationId:'', connectTimeoutSeconds:10, readTimeoutSeconds:120, extraConfigJson:'', enabled:true });
const modelDefaults = (): AiModelForm => ({ providerId:'', modelCode:'', modelName:'', capability:'CHAT', maxBatchSize:32, maxInputTokens:8192, defaultModel:false, requestOptionsJson:'', enabled:true });
const providerForm = ref<AiModelProviderForm>(providerDefaults()); const modelForm = ref<AiModelForm>(modelDefaults());
const load = async () => { loading.value=true; try { const [p,m]=await Promise.all([listModelProviders(),listAiModels()]); providers.value=p.data||[]; models.value=m.data||[]; } finally { loading.value=false; } };
const editProvider = (row?: AiModelProviderVO) => { providerForm.value=row ? { ...row, apiKey:'' } : providerDefaults(); providerDialog.value=true; };
const editModel = (row?: AiModelVO) => { modelForm.value=row ? { ...row } : modelDefaults(); modelDialog.value=true; };
const saveProvider = async () => { const f=providerForm.value; f.id ? await updateModelProvider(f.id,f) : await createModelProvider(f); providerDialog.value=false; proxy?.$modal.msgSuccess('保存成功'); await load(); };
const saveModel = async () => { const f=modelForm.value; f.id ? await updateAiModel(f.id,f) : await createAiModel(f); modelDialog.value=false; proxy?.$modal.msgSuccess('保存成功'); await load(); };
const testProvider = async (row: AiModelProviderVO) => { const response = await testModelProvider(row.id); const data = response.data as any; proxy?.$modal.msgSuccess(`${data?.message || '模型服务连接成功'}，发现 ${data?.modelCount ?? 0} 个模型`); };
const testModel = async (row: AiModelVO) => { const response = await testAiModel(row.id); const data = response.data as any; const detail = row.capability === 'EMBEDDING' ? `向量维度 ${data?.dimension}` : `回答：${data?.content || '连接成功'}`; proxy?.$modal.msgSuccess(`模型测试成功，${detail}，耗时 ${data?.elapsedMs ?? 0} ms`); await load(); };
const removeProvider = async (row:AiModelProviderVO) => { await proxy?.$modal.confirm(`确认删除服务商“${row.providerName}”吗？`); await deleteModelProvider(row.id); await load(); };
const removeModel = async (row:AiModelVO) => { await proxy?.$modal.confirm(`确认删除模型“${row.modelName}”吗？`); await deleteAiModel(row.id); await load(); };
onMounted(load);
</script>
