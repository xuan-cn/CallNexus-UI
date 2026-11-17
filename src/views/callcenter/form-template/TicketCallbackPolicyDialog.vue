<template>
  <el-dialog
    v-model="visible"
    :title="`回访策略 · ${templateName}`"
    width="min(620px, 94vw)"
    append-to-body
    :close-on-click-modal="false"
    :close-on-press-escape="!saving"
    :show-close="!saving"
  >
    <div v-loading="loading" class="min-h-24">
      <el-form v-if="policy" label-position="top">
        <el-alert
          class="mb-4"
          type="info"
          :closable="false"
          title="此策略单独保存。自动回访只处理使用此模板、之后办结的工单；修改策略会停止旧策略尚未拨出的自动回访。"
        />
        <el-form-item label="回访方式">
          <el-radio-group v-model="policy.mode">
            <el-radio value="OFF">关闭</el-radio>
            <el-radio value="MANUAL">仅手动</el-radio>
            <el-radio value="AUTO">办结后自动（仍可手动补访）</el-radio>
          </el-radio-group>
        </el-form-item>
        <template v-if="policy.mode === 'AUTO'">
          <el-form-item label="回访号码来源">
            <el-checkbox v-model="policy.allowInboundCaller">允许使用原来电号码回访</el-checkbox>
            <div class="app-hint w-full">只对关联了呼入记录的工单生效，仍需在工单中核对并确认号码，不会直接拨打。</div>
          </el-form-item>
          <el-form-item label="专用回访任务">
            <el-select v-model="policy.taskId" class="w-full" filterable placeholder="请选择专用 AI 自动外呼任务">
              <el-option v-for="item in policy.tasks" :key="item.id" :label="item.name" :value="item.id" />
            </el-select>
            <div class="app-hint">拨打时段、并发、频率和重拨规则在自动外呼任务中配置。</div>
          </el-form-item>
          <div class="flex flex-wrap gap-4">
            <el-form-item label="办结后等待（分钟）">
              <el-input-number v-model="policy.delayMinutes" :min="0" :max="10080" />
            </el-form-item>
            <el-form-item label="办结后有效期（分钟）">
              <el-input-number v-model="policy.expiryMinutes" :min="1" :max="43200" />
            </el-form-item>
          </div>
        </template>
      </el-form>
    </div>
    <template #footer>
      <el-button :disabled="saving" @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="saving" :disabled="!policy || loading" @click="save">保存回访策略</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { getTicketCallbackPolicy, updateTicketCallbackPolicy } from '@/api/callcenter/form-template';
import type { TicketCallbackPolicy } from '@/api/callcenter/form-template/types';

const visible = ref(false);
const loading = ref(false);
const saving = ref(false);
const templateName = ref('');
const policy = ref<TicketCallbackPolicy>();
let templateId: string | number | undefined;
let loadVersion = 0;

const open = async (id: string | number, name: string) => {
  const version = ++loadVersion;
  templateId = id;
  templateName.value = name;
  policy.value = undefined;
  loading.value = true;
  visible.value = true;
  try {
    const { data } = await getTicketCallbackPolicy(id);
    if (version === loadVersion) {
      policy.value = {
        ...data,
        taskId: data.tasks.some((task) => task.id === data.taskId) ? data.taskId : undefined,
        allowInboundCaller: data.allowInboundCaller === true
      };
    }
  } finally {
    if (version === loadVersion) loading.value = false;
  }
};

const save = async () => {
  if (templateId == null || !policy.value || saving.value) return;
  const { mode, taskId, delayMinutes, expiryMinutes, allowInboundCaller } = policy.value;
  const automatic = mode === 'AUTO';
  if (automatic && !taskId) {
    ElMessage.warning('请选择可用的专用回访任务');
    return;
  }
  if (automatic && (!Number.isInteger(delayMinutes) || !Number.isInteger(expiryMinutes) || expiryMinutes <= delayMinutes)) {
    ElMessage.warning('请输入整数分钟，且有效期必须大于等待时间');
    return;
  }
  saving.value = true;
  try {
    await updateTicketCallbackPolicy(templateId, {
      mode,
      taskId: automatic ? taskId : undefined,
      delayMinutes: automatic ? delayMinutes : 30,
      expiryMinutes: automatic ? expiryMinutes : 1440,
      allowInboundCaller: automatic && allowInboundCaller
    });
    ElMessage.success('已保存模板回访策略');
    visible.value = false;
  } finally {
    saving.value = false;
  }
};

defineExpose({ open });
</script>
