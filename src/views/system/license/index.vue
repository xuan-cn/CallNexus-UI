<template>
  <div v-loading="loading" class="license-page p-2">
    <el-card shadow="never" class="license-overview">
      <div class="license-header">
        <div>
          <h1>授权管理</h1>
          <p class="license-hint">首次导出会生成部署身份。续期只需导入新的授权文件。</p>
        </div>
        <el-space wrap>
          <el-button icon="Download" :loading="exporting" @click="downloadRequest">导出授权申请</el-button>
          <el-button
            type="primary"
            icon="Upload"
            :disabled="!status?.deploymentId || !status?.issuerConfigured"
            :loading="importing"
            @click="picker?.click()"
          >
            导入正式授权
          </el-button>
        </el-space>
        <input ref="picker" type="file" accept=".json,.lic,application/json" hidden @change="uploadLicense" />
      </div>
      <dl v-if="status" class="license-summary">
        <div>
          <dt>授权状态</dt>
          <dd>
            <el-tag :type="stateMeta[status.state].type" effect="light">{{ stateMeta[status.state].label }}</el-tag>
          </dd>
        </div>
        <div>
          <dt>有效期至</dt>
          <dd>{{ status.licenseId && !status.expiresAt ? '永久' : formatDate(status.expiresAt) }}</dd>
        </div>
        <div>
          <dt>最近导入</dt>
          <dd>{{ formatDate(status.importedAt) }}</dd>
        </div>
      </dl>
      <el-alert
        v-if="status && !status.issuerConfigured"
        type="info"
        class="mt-2"
        :closable="false"
        title="当前后端未内置签发方公钥，仅可导出申请，暂不能导入授权。"
      />
      <el-alert v-if="status?.message" class="mt-2" type="error" :closable="false" :title="status.message" />
      <el-alert v-if="exportError" class="mt-2" type="error" :closable="false" :title="exportError" />
    </el-card>

    <el-card v-if="status" shadow="never">
      <template #header><h2>功能与额度</h2></template>
      <div v-if="status.licenseId" class="license-entitlements">
        <section class="license-group">
          <h3>功能授权</h3>
          <dl>
            <div v-for="item in featureRows" :key="item.code" class="license-row">
              <dt>{{ item.label }}</dt>
              <dd>
                <el-tag v-if="item.enforced" :type="item.enabled ? 'success' : 'info'" size="small" effect="plain">
                  {{ item.enabled ? '已启用' : '未启用' }}
                </el-tag>
                <span v-else>{{ item.enabled ? '启用' : '禁用' }}（仅展示）</span>
              </dd>
            </div>
          </dl>
        </section>
        <section class="license-group">
          <h3>额度上限</h3>
          <dl>
            <div v-for="item in limitRows" :key="item.code" class="license-row">
              <dt>{{ item.label }}</dt>
              <dd>{{ item.value === -1 ? '不限' : item.value }}{{ item.enforced ? '' : '（仅展示）' }}</dd>
            </div>
          </dl>
        </section>
      </div>
      <p v-if="status.licenseId" class="license-hint">以上为签发值，不是实时用量。授权有效时才可开始新的受限业务。</p>
      <div v-else class="license-empty">
        <strong>暂无可展示的授权条款</strong>
        <p class="license-hint">{{ status.deploymentId ? '导入正式授权后，可在此查看功能与额度。' : '请先导出授权申请，获取正式授权后再导入。' }}</p>
      </div>
    </el-card>

    <el-card v-if="status" shadow="never">
      <template #header><h2>部署信息</h2></template>
      <dl class="license-identity">
        <div>
          <dt>部署 ID</dt>
          <dd>{{ status.deploymentId || '尚未生成' }}</dd>
        </div>
        <div>
          <dt>授权编号</dt>
          <dd>{{ status.licenseId || '—' }}</dd>
        </div>
        <div class="license-fingerprint">
          <dt>公钥指纹</dt>
          <dd>{{ status.publicKeyFingerprint || '—' }}</dd>
        </div>
      </dl>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus';
import { saveAs } from 'file-saver';
import { exportLicenseRequest, getLicenseStatus, importLicense, type LicenseStatus } from '@/api/system/license';

const loading = ref(false);
const exporting = ref(false);
const importing = ref(false);
const status = ref<LicenseStatus>();
const picker = ref<HTMLInputElement>();
const exportError = ref('');
const stateMeta = {
  UNLICENSED: { label: '未导入', type: 'info' },
  VALID: { label: '有效', type: 'success' },
  EXPIRED: { label: '已过期', type: 'danger' },
  INVALID: { label: '无效', type: 'danger' },
  NOT_YET_VALID: { label: '尚未生效', type: 'warning' }
} as const;
const featureLabels: Record<string, string> = {
  auto_outbound: '自动外呼',
  ai_voice: 'AI 语音机器人',
  ai_workflow: 'AI 流程',
  knowledge_base: '知识库',
  ticket_callback: '工单回访',
  quality_check: '质检',
  sms: '短信',
  open_api: '开放 API'
};
const limitLabels: Record<string, string> = {
  ai_concurrent_calls: 'AI 通话并发',
  ai_robots: '启用的 AI 流程机器人',
  seats: '启用的坐席',
  extensions: '已创建的分机',
  telephony_nodes: '话务节点数',
  concurrent_calls: '普通通话并发'
};
const enforcedFeatures = ['auto_outbound', 'ai_voice'];
const enforcedLimits = ['ai_concurrent_calls', 'ai_robots', 'seats', 'extensions'];
const featureRows = computed(() => {
  const features = status.value?.features ?? {};
  return [...new Set([...enforcedFeatures, ...Object.keys(features)])].map((code) => ({
    code,
    label: featureLabels[code] ?? code,
    enabled: features[code] === true,
    enforced: enforcedFeatures.includes(code)
  }));
});
const limitRows = computed(() => {
  const limits = status.value?.limits ?? {};
  return [...new Set([...enforcedLimits, ...Object.keys(limits)])].map((code) => ({
    code,
    label: limitLabels[code] ?? code,
    value: limits[code] ?? -1,
    enforced: enforcedLimits.includes(code)
  }));
});

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '—';
}

async function refresh() {
  loading.value = true;
  try {
    status.value = (await getLicenseStatus()).data;
  } finally {
    loading.value = false;
  }
}

async function downloadRequest() {
  exporting.value = true;
  exportError.value = '';
  try {
    const response = await exportLicenseRequest();
    const body = JSON.parse(await response.text());
    if (typeof body.payload !== 'string' || typeof body.signature !== 'string') {
      exportError.value = body.msg || '未收到有效的授权申请文件';
      return;
    }
    saveAs(response, 'callnexus-license-request.json');
    await refresh();
  } catch {
    exportError.value = '导出失败，请检查登录状态及持久化身份目录配置。';
  } finally {
    exporting.value = false;
  }
}

async function uploadLicense(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file || importing.value) return;
  if (file.size === 0 || file.size > 32 * 1024) {
    ElMessage.warning('请选择不超过 32 KB 的非空授权文件');
    return;
  }
  importing.value = true;
  try {
    status.value = (await importLicense(file)).data;
    ElMessage.success('授权已导入');
  } catch {
    // The request client displays import errors; keep the current status on screen.
  } finally {
    importing.value = false;
  }
}

onMounted(() => void refresh().catch(() => undefined));
</script>

<style scoped>
.license-page {
  display: grid;
  gap: 12px;
  align-content: start;
}
.license-page :is(h1, h2, h3, p, dl, dd) {
  margin: 0;
}
.license-page h1 {
  font-size: 20px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}
.license-page h2 {
  font-size: 14px;
  font-weight: 600;
}
.license-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.license-page .license-hint {
  font-size: 10px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
}
.license-summary,
.license-identity {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px 24px;
}
.license-overview .license-summary {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--el-border-color-lighter);
}
.license-summary dt,
.license-identity dt {
  margin-bottom: 6px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.license-summary dd {
  font-size: 14px;
  font-weight: 600;
}
.license-identity dd {
  overflow-wrap: anywhere;
  font-family: monospace;
}
.license-fingerprint {
  grid-column: 1 / -1;
}
.license-entitlements {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 28px;
}
.license-group h3 {
  padding-bottom: 8px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  font-weight: 600;
}
.license-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  min-height: 36px;
  gap: 12px;
  border-top: 1px solid var(--el-border-color-lighter);
}
.license-row dt {
  overflow-wrap: anywhere;
}
.license-row dd {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.license-empty {
  padding: 10px 0;
  color: var(--el-text-color-regular);
}
@media (max-width: 760px) {
  .license-entitlements,
  .license-identity,
  .license-overview .license-summary {
    grid-template-columns: minmax(0, 1fr);
    row-gap: 12px;
  }
}
</style>
