<template>
  <div class="p-2">
    <el-card shadow="never">
      <template #header><strong>短信管理</strong><span class="ml-3 text-gray-500 app-hint">业务短信配置，不影响登录验证码</span></template>
      <el-tabs v-model="tab" @tab-change="load">
        <el-tab-pane v-if="can('sms-channel:list')" label="短信渠道" name="channels">
          <div class="mb-4">
            <el-button v-hasPermi="['callcenter:sms-channel:manage']" type="primary" icon="Plus" @click="editChannel()">新增渠道</el-button
            ><el-button icon="Refresh" @click="load">刷新</el-button>
          </div>
          <el-table v-loading="loading" :data="channels" border>
            <el-table-column label="配置名称" prop="channelName" min-width="160" />
            <el-table-column label="服务商" width="100"
              ><template #default="{ row }">{{ row.supplier === 'ALIBABA' ? '阿里云' : '腾讯云' }}</template></el-table-column
            >
            <el-table-column label="短信签名" prop="signature" min-width="160" />
            <el-table-column label="凭证" width="100"
              ><template #default="{ row }">{{ row.keyConfigured && row.secretConfigured ? '已配置' : '未配置' }}</template></el-table-column
            >
            <el-table-column label="单号码频率" width="180"
              ><template #default="{ row }">{{ row.minuteLimit }} 条/分钟，{{ row.dailyLimit }} 条/天</template></el-table-column
            >
            <el-table-column label="状态" width="90"
              ><template #default="{ row }"
                ><el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '停用' }}</el-tag></template
              ></el-table-column
            >
            <el-table-column label="操作" width="180"
              ><template #default="{ row }"
                ><el-button v-hasPermi="['callcenter:sms-channel:manage']" link type="primary" @click="editChannel(row)">编辑</el-button
                ><el-button v-hasPermi="['callcenter:sms-channel:test']" link type="primary" :disabled="!row.enabled" @click="testChannel(row)"
                  >测试发送</el-button
                ></template
              ></el-table-column
            >
          </el-table>
        </el-tab-pane>
        <el-tab-pane v-if="can('sms-template:list')" label="短信模板" name="templates">
          <el-alert
            class="mb-4"
            type="info"
            :closable="false"
            title="此处维护服务商已审核模板的本地映射，不会向服务商创建或提交审核模板。正文和变量必须与审核模板一致。"
          />
          <div class="mb-4">
            <el-button v-hasPermi="['callcenter:sms-template:manage']" type="primary" icon="Plus" @click="editTemplate()">新增模板</el-button
            ><el-button icon="Refresh" @click="load">刷新</el-button>
          </div>
          <el-table v-loading="loading" :data="templates" border>
            <el-table-column label="模板名称" prop="templateName" min-width="150" />
            <el-table-column label="短信渠道" min-width="150"
              ><template #default="{ row }">{{
                templateChannels.find((c) => String(c.id) === String(row.channelId))?.channelName || row.channelId
              }}</template></el-table-column
            >
            <el-table-column label="服务商模板编号" prop="providerTemplateId" min-width="160" />
            <el-table-column label="正文" prop="content" min-width="240" show-overflow-tooltip />
            <el-table-column label="状态" width="90"
              ><template #default="{ row }"
                ><el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '停用' }}</el-tag></template
              ></el-table-column
            >
            <el-table-column label="操作" width="90"
              ><template #default="{ row }"
                ><el-button v-hasPermi="['callcenter:sms-template:manage']" link type="primary" @click="editTemplate(row)">编辑</el-button></template
              ></el-table-column
            >
          </el-table>
        </el-tab-pane>
        <el-tab-pane v-if="can('sms-record:list')" label="发送记录" name="records">
          <el-alert
            class="mb-4"
            type="info"
            :closable="false"
            title="服务商已受理不等于客户已收到。本阶段未接入送达回执；结果未知不会自动重发，请到服务商核实。"
          />
          <el-form inline :model="query">
            <el-form-item label="手机号"
              ><el-input v-model="query.phone" clearable placeholder="完整手机号" @keyup.enter="searchRecords"
            /></el-form-item>
            <el-form-item label="状态"
              ><el-select v-model="query.status" clearable style="width: 160px"
                ><el-option v-for="(label, value) in smsStatusLabels" :key="value" :label="label" :value="value" /></el-select
            ></el-form-item>
            <el-form-item
              ><el-button type="primary" @click="searchRecords">查询</el-button><el-button icon="Refresh" @click="load">刷新</el-button></el-form-item
            >
          </el-form>
          <SmsRecordTable v-loading="loading" :records="records" />
          <pagination v-show="total > 0" v-model:page="query.pageNum" v-model:limit="query.pageSize" :total="total" @pagination="load" />
        </el-tab-pane>
      </el-tabs>
      <el-empty v-if="!tab" description="请联系管理员分配短信渠道、模板或记录查询权限" />
    </el-card>

    <el-drawer
      v-model="channelVisible"
      :title="channelForm.id ? '编辑短信渠道' : '新增短信渠道'"
      size="580px"
      append-to-body
      :close-on-click-modal="false"
    >
      <el-alert class="mb-4" type="info" :closable="false" title="密钥仅用于后端发送，加密存储，不回显。编辑时密钥留空表示保留原值。" />
      <el-form ref="channelRef" :model="channelForm" :rules="channelRules" label-width="120px" :disabled="saving">
        <el-form-item label="配置名称" prop="channelName"><el-input v-model="channelForm.channelName" maxlength="64" /></el-form-item>
        <el-form-item label="服务商" prop="supplier"
          ><el-select v-model="channelForm.supplier"
            ><el-option label="阿里云" value="ALIBABA" /><el-option label="腾讯云" value="TENCENT" /></el-select
        ></el-form-item>
        <el-form-item label="AccessKey ID"
          ><el-input
            v-model="channelForm.accessKeyId"
            type="password"
            show-password
            autocomplete="new-password"
            :placeholder="channelForm.id ? '留空保留原值' : '必填'"
        /></el-form-item>
        <el-form-item label="AccessKey Secret"
          ><el-input
            v-model="channelForm.accessKeySecret"
            type="password"
            show-password
            autocomplete="new-password"
            :placeholder="channelForm.id ? '留空保留原值' : '必填'"
        /></el-form-item>
        <el-form-item v-if="channelForm.supplier === 'TENCENT'" label="SDK App ID" prop="sdkAppId"
          ><el-input v-model="channelForm.sdkAppId" maxlength="64"
        /></el-form-item>
        <el-form-item label="短信签名" prop="signature"
          ><el-input v-model="channelForm.signature" placeholder="服务商审核通过的签名，不含【】" maxlength="64"
        /></el-form-item>
        <el-form-item label="每分钟上限"
          ><el-input-number v-model="channelForm.minuteLimit" :min="1" :max="10" /><span class="ml-2">条/单号码</span></el-form-item
        >
        <el-form-item label="每日上限"
          ><el-input-number v-model="channelForm.dailyLimit" :min="1" :max="1000" /><span class="ml-2">条/单号码</span></el-form-item
        >
        <el-form-item label="启用"><el-switch v-model="channelForm.enabled" /></el-form-item>
      </el-form>
      <template #footer
        ><el-button :disabled="saving" @click="channelVisible = false">取消</el-button
        ><el-button type="primary" :loading="saving" @click="saveChannel">保存</el-button></template
      >
    </el-drawer>

    <el-drawer
      v-model="templateVisible"
      :title="templateForm.id ? '编辑短信模板' : '新增短信模板'"
      size="720px"
      append-to-body
      :close-on-click-modal="false"
    >
      <el-form ref="templateRef" :model="templateForm" :rules="templateRules" label-width="120px" :disabled="saving">
        <el-form-item label="模板名称" prop="templateName"><el-input v-model="templateForm.templateName" maxlength="64" /></el-form-item>
        <el-form-item label="短信渠道" prop="channelId"
          ><el-select v-model="templateForm.channelId" style="width: 100%"
            ><el-option v-for="channel in templateChannels" :key="channel.id" :label="channel.channelName" :value="channel.id!" /></el-select
        ></el-form-item>
        <el-form-item label="服务商模板编号" prop="providerTemplateId"
          ><el-input v-model="templateForm.providerTemplateId" maxlength="64"
        /></el-form-item>
        <el-form-item label="模板正文" prop="content"
          ><el-input
            v-model="templateForm.content"
            type="textarea"
            :rows="5"
            maxlength="2000"
            show-word-limit
            placeholder="例如：您好，${name}，请根据短信指引提交材料。"
        /></el-form-item>
        <el-form-item label="变量映射">
          <div class="sms-variables">
            <div v-for="(variable, index) in templateForm.variables" :key="index" class="sms-variable">
              <el-input v-model="variable.key" placeholder="变量名 / 腾讯云序号" maxlength="32" />
              <el-select v-model="variable.source"
                ><el-option label="手动填写" value="MANUAL" /><el-option label="客户姓名" value="CUSTOMER_NAME" /><el-option
                  label="客户主号码"
                  value="PRIMARY_PHONE"
              /></el-select>
              <el-button link type="danger" @click="templateForm.variables.splice(index, 1)">删除</el-button>
            </div>
            <el-button :disabled="templateForm.variables.length >= 20" @click="templateForm.variables.push({ key: '', source: 'MANUAL' })"
              >添加变量</el-button
            >
            <div class="text-gray-500 mt-2 app-hint">正文使用 ${变量名}，必须与变量配置一致。腾讯云按 1、2、3 顺序配置，正文使用 ${1}、${2}。</div>
          </div>
        </el-form-item>
        <el-form-item label="启用"><el-switch v-model="templateForm.enabled" /></el-form-item>
      </el-form>
      <template #footer
        ><el-button :disabled="saving" @click="templateVisible = false">取消</el-button
        ><el-button type="primary" :loading="saving" @click="saveTemplate">保存</el-button></template
      >
    </el-drawer>
    <SendSmsDrawer v-model="testVisible" :test-channel-id="testChannelId" @submitted="load" />
  </div>
</template>
<script setup name="BusinessSmsManagement" lang="ts">
import { ElMessage } from 'element-plus';
import { checkPermi } from '@/utils/permission';
import {
  smsChannels,
  smsTemplates,
  smsTemplateChannels,
  smsRecords,
  saveSmsChannel,
  saveSmsTemplate,
  smsStatusLabels,
  type SmsChannel,
  type SmsTemplate,
  type SmsRecord
} from '@/api/callcenter/sms';
import SmsRecordTable from '@/components/BusinessSms/SmsRecordTable.vue';
import SendSmsDrawer from '@/components/BusinessSms/SendSmsDrawer.vue';
const can = (permission: string) => checkPermi([`callcenter:${permission}`]);
const tab = ref(can('sms-channel:list') ? 'channels' : can('sms-template:list') ? 'templates' : can('sms-record:list') ? 'records' : '');
const loading = ref(false);
const saving = ref(false);
const channels = ref<SmsChannel[]>([]);
const templateChannels = ref<SmsChannel[]>([]);
const templates = ref<SmsTemplate[]>([]);
const records = ref<SmsRecord[]>([]);
const total = ref(0);
const query = reactive({ pageNum: 1, pageSize: 10, phone: '', status: '' });
const channelVisible = ref(false);
const templateVisible = ref(false);
const testVisible = ref(false);
const testChannelId = ref<string | number>();
const channelRef = ref<ElFormInstance>();
const templateRef = ref<ElFormInstance>();
const initialChannel = (): SmsChannel => ({
  channelName: '',
  supplier: 'ALIBABA',
  accessKeyId: '',
  accessKeySecret: '',
  sdkAppId: '',
  signature: '',
  enabled: true,
  minuteLimit: 1,
  dailyLimit: 30
});
const initialTemplate = (): SmsTemplate => ({
  channelId: undefined,
  templateName: '',
  providerTemplateId: '',
  content: '',
  variables: [],
  enabled: true
});
const channelForm = ref<SmsChannel>(initialChannel());
const templateForm = ref<SmsTemplate>(initialTemplate());
const required = { required: true, message: '请填写此项', trigger: 'blur' };
const channelRules = { channelName: [required], supplier: [required], signature: [required], sdkAppId: [required] };
const templateRules = { channelId: [required], templateName: [required], providerTemplateId: [required], content: [required] };
let generation = 0;
async function load() {
  const current = ++generation;
  const active = tab.value;
  if (!active) return;
  loading.value = true;
  try {
    if (active === 'channels') {
      const res = await smsChannels();
      if (current === generation) channels.value = res.data;
    }
    if (active === 'templates') {
      const res = await smsTemplates();
      if (current !== generation) return;
      templates.value = res.data;
      templateChannels.value = (await smsTemplateChannels()).data;
    }
    if (active === 'records') {
      const res = await smsRecords(query);
      if (current === generation) {
        records.value = res.rows;
        total.value = res.total;
      }
    }
  } finally {
    if (current === generation) loading.value = false;
  }
}
function editChannel(row?: SmsChannel) {
  channelForm.value = row ? { ...row, accessKeyId: '', accessKeySecret: '' } : initialChannel();
  channelRef.value?.clearValidate();
  channelVisible.value = true;
}
function editTemplate(row?: SmsTemplate) {
  templateForm.value = row ? { ...row, variables: row.variables.map((variable) => ({ ...variable })) } : initialTemplate();
  templateRef.value?.clearValidate();
  templateVisible.value = true;
}
function testChannel(row: SmsChannel) {
  testChannelId.value = row.id;
  testVisible.value = true;
}
async function saveChannel() {
  if (!(await channelRef.value?.validate())) return;
  if (!channelForm.value.id && (!channelForm.value.accessKeyId?.trim() || !channelForm.value.accessKeySecret?.trim())) {
    ElMessage.warning('请填写渠道账号密钥');
    return;
  }
  saving.value = true;
  try {
    await saveSmsChannel({ ...channelForm.value });
    channelVisible.value = false;
    channelForm.value = initialChannel();
    ElMessage.success('渠道配置已保存');
    await load();
  } finally {
    saving.value = false;
  }
}
async function saveTemplate() {
  if (!(await templateRef.value?.validate())) return;
  saving.value = true;
  try {
    await saveSmsTemplate({ ...templateForm.value, variables: templateForm.value.variables.map((variable) => ({ ...variable })) });
    templateVisible.value = false;
    ElMessage.success('模板已保存');
    await load();
  } finally {
    saving.value = false;
  }
}
function searchRecords() {
  query.pageNum = 1;
  void load();
}
watch(channelVisible, (value) => {
  if (!value) {
    channelForm.value.accessKeyId = '';
    channelForm.value.accessKeySecret = '';
  }
});
onBeforeUnmount(() => {
  ++generation;
});
onMounted(load);
</script>
<style scoped>
.sms-variables {
  width: 100%;
}
.sms-variable {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 8px;
  margin-bottom: 10px;
}
</style>
