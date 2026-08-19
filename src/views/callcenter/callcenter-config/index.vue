<template>
  <div class="callcenter-config-page">
    <div class="config-shell">
      <aside class="config-side">
        <div class="side-head">
          <strong>配置分组</strong>
          <small>按业务域浏览默认项</small>
        </div>
        <div class="side-list">
          <button
            v-for="group in groups"
            :key="group.groupCode"
            type="button"
            class="group-item"
            :class="{ active: group.groupCode === activeGroupCode }"
            @click="selectGroup(group.groupCode)"
          >
            <span class="group-icon" :data-code="group.groupCode">{{ groupInitial(group.groupName) }}</span>
            <span class="group-copy">
              <strong>{{ group.groupName }}</strong>
              <small>{{ group.groupCode }}</small>
            </span>
            <span class="group-count">{{ group.items.length }}</span>
          </button>
        </div>
      </aside>

      <section v-loading="loading" class="config-main">
        <div class="main-hero">
          <div class="hero-copy">
            <span class="hero-eyebrow">配置中心</span>
            <h3>呼叫中心配置中心</h3>
            <p>租户级默认配置。业务模块自身配置优先，这里只作为默认值和后续扩展入口。</p>
          </div>
          <el-input v-model="keyword" clearable placeholder="搜索配置项" class="hero-search">
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>

        <div v-if="activeGroup" class="section-toolbar">
          <div class="section-title">
            <span class="section-kicker">{{ activeGroup.groupCode }}</span>
            <h2>{{ activeGroup.groupName }}</h2>
            <small>{{ filteredItems.length }} 项{{ keyword.trim() ? '匹配' : '配置' }}</small>
          </div>
          <div class="section-actions">
            <el-tag v-if="dirty" type="warning" effect="light" round>有未保存修改</el-tag>
            <el-button icon="Refresh" @click="reloadActiveGroup">刷新</el-button>
            <el-button v-hasPermi="['callcenter:config:update']" type="primary" @click="saveActiveGroup">保存本组配置</el-button>
          </div>
        </div>

        <el-empty v-if="!activeGroup" class="config-empty" description="暂无配置分组" />

        <div v-else-if="!filteredItems.length" class="config-empty">
          <el-empty description="没有匹配的配置项" :image-size="72" />
        </div>

        <div v-else class="config-list">
          <article
            v-for="item in filteredItems"
            :key="item.configKey"
            class="config-item"
            :class="{ dirty: formValues[item.configKey] !== originalValues[item.configKey] }"
          >
            <div class="config-copy">
              <div class="config-title">
                <strong>{{ item.configName }}</strong>
                <el-tag v-if="item.riskLevel === 'HIGH'" type="danger" effect="light" round size="small">高风险</el-tag>
                <el-tag v-else-if="item.riskLevel === 'MEDIUM'" type="warning" effect="light" round size="small">中风险</el-tag>
                <el-tag
                  v-if="formValues[item.configKey] !== originalValues[item.configKey]"
                  type="warning"
                  effect="plain"
                  round
                  size="small"
                >
                  已修改
                </el-tag>
              </div>
              <p>{{ item.description || item.configKey }}</p>
              <div class="config-meta">
                <span class="meta-chip">键 {{ item.configKey }}</span>
                <span class="meta-chip" :class="{ tenant: item.source === 'TENANT' }">
                  {{ item.source === 'TENANT' ? '租户自定义' : '系统默认' }}
                </span>
                <span v-if="item.unit" class="meta-chip">单位 {{ item.unit }}</span>
              </div>
            </div>

            <div class="config-editor">
              <el-switch
                v-if="item.editorType === 'SWITCH'"
                v-model="formValues[item.configKey]"
                active-value="true"
                inactive-value="false"
                active-text="开启"
                inactive-text="关闭"
              />
              <el-input-number
                v-else-if="item.editorType === 'NUMBER'"
                :model-value="numberValue(item.configKey)"
                :min="0"
                controls-position="right"
                @update:model-value="(value) => setNumberValue(item.configKey, value)"
              />
              <el-select v-else-if="item.editorType === 'SELECT'" v-model="formValues[item.configKey]" class="editor-control">
                <el-option v-for="option in options(item)" :key="option.value" :label="option.label" :value="option.value" />
              </el-select>
              <el-input v-else v-model="formValues[item.configKey]" class="editor-control" />
              <el-button v-hasPermi="['callcenter:config:update']" link type="primary" @click="resetItem(item)">恢复默认</el-button>
            </div>
          </article>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup name="CallCenterConfig" lang="ts">
import {
  getCallCenterConfigGroup,
  listCallCenterConfigGroups,
  resetCallCenterConfigItem,
  saveCallCenterConfigGroup
} from '@/api/callcenter/callcenter-config';
import type { CallCenterConfigGroup, CallCenterConfigItem, CallCenterConfigOption } from '@/api/callcenter/callcenter-config/types';
import { Search } from '@element-plus/icons-vue';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;
const loading = ref(false);
const keyword = ref('');
const groups = ref<CallCenterConfigGroup[]>([]);
const activeGroupCode = ref('');
const activeGroup = computed(() => groups.value.find((item) => item.groupCode === activeGroupCode.value));
const formValues = reactive<Record<string, string>>({});
const originalValues = reactive<Record<string, string>>({});
const filteredItems = computed(() => {
  const items = activeGroup.value?.items || [];
  const text = keyword.value.trim().toLowerCase();
  if (!text) return items;
  return items.filter((item) => `${item.configName}${item.configKey}${item.description || ''}`.toLowerCase().includes(text));
});
const dirty = computed(() => Object.keys(formValues).some((key) => formValues[key] !== originalValues[key]));

const groupInitial = (name: string) => (name || '?').trim().charAt(0);

const fillForm = (group: CallCenterConfigGroup) => {
  Object.keys(formValues).forEach((key) => delete formValues[key]);
  Object.keys(originalValues).forEach((key) => delete originalValues[key]);
  group.items.forEach((item) => {
    const value = item.effectiveValue ?? item.defaultValue ?? '';
    formValues[item.configKey] = value;
    originalValues[item.configKey] = value;
  });
};

const loadGroups = async () => {
  loading.value = true;
  try {
    const res = await listCallCenterConfigGroups();
    groups.value = res.data;
    if (!activeGroupCode.value && groups.value.length > 0) {
      activeGroupCode.value = groups.value[0].groupCode;
    }
    if (activeGroup.value) fillForm(activeGroup.value);
  } finally {
    loading.value = false;
  }
};

const selectGroup = async (groupCode: string) => {
  if (dirty.value) {
    await proxy?.$modal.confirm('当前分组有未保存修改，切换后将丢失这些修改，确认继续吗？');
  }
  activeGroupCode.value = groupCode;
  await reloadActiveGroup();
};

const reloadActiveGroup = async () => {
  if (!activeGroupCode.value) return;
  loading.value = true;
  try {
    const res = await getCallCenterConfigGroup(activeGroupCode.value);
    const index = groups.value.findIndex((item) => item.groupCode === activeGroupCode.value);
    if (index >= 0) groups.value[index] = res.data;
    else groups.value.push(res.data);
    fillForm(res.data);
  } finally {
    loading.value = false;
  }
};

const saveActiveGroup = async () => {
  if (!activeGroup.value) return;
  const changedHighRisk = activeGroup.value.items.some(
    (item) => item.riskLevel === 'HIGH' && formValues[item.configKey] !== originalValues[item.configKey]
  );
  if (changedHighRisk) {
    await proxy?.$modal.confirm('本次包含高风险配置变更，保存后可能影响录音、媒体或 FreeSWITCH 行为，确认保存吗？');
  }
  await saveCallCenterConfigGroup(activeGroup.value.groupCode, {
    items: activeGroup.value.items.map((item) => ({
      configKey: item.configKey,
      configValue: formValues[item.configKey]
    }))
  });
  proxy?.$modal.msgSuccess('保存成功');
  await reloadActiveGroup();
};

const resetItem = async (item: CallCenterConfigItem) => {
  await proxy?.$modal.confirm(`确认将“${item.configName}”恢复为系统默认值吗？`);
  await resetCallCenterConfigItem(item.configKey);
  proxy?.$modal.msgSuccess('已恢复默认值');
  await reloadActiveGroup();
};

const numberValue = (key: string) => Number(formValues[key] || 0);
const setNumberValue = (key: string, value: number | undefined) => {
  formValues[key] = String(value ?? 0);
};

const options = (item: CallCenterConfigItem): CallCenterConfigOption[] => {
  if (!item.optionsJson) return [];
  try {
    return JSON.parse(item.optionsJson);
  } catch (error) {
    console.warn('配置项选项解析失败', item.configKey, error);
    return [];
  }
};

onMounted(loadGroups);
</script>

<style scoped lang="scss">
.callcenter-config-page {
  box-sizing: border-box;
  height: calc(100vh - 84px);
  padding: 16px 18px;
  overflow: hidden;
}

.config-shell {
  display: grid;
  grid-template-columns: 248px minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr);
  align-items: stretch;
  gap: 14px;
  height: 100%;
  min-height: 0;
}

.config-side,
.config-main {
  display: flex;
  flex-direction: column;
  align-self: stretch;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  border: 1px solid #dce8f6;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 10px 24px rgba(28, 48, 78, 0.05);
}

.config-side {
  padding: 14px;
  background:
    linear-gradient(180deg, rgba(247, 251, 255, 0.9), rgba(255, 255, 255, 0.96)),
    #fff;
}

.side-head {
  flex: none;
  margin-bottom: 12px;
  padding: 4px 4px 12px;
  border-bottom: 1px solid #eef3f8;

  strong {
    display: block;
    color: #15233d;
    font-size: 15px;
  }

  small {
    color: #7b8798;
    font-size: 12px;
  }
}

.side-list {
  display: grid;
  flex: 1;
  align-content: start;
  gap: 8px;
  min-height: 0;
  overflow: auto;
  padding-right: 2px;
}

.group-item {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  width: 100%;
  padding: 10px 10px 10px 12px;
  text-align: left;
  cursor: pointer;
  border: 1px solid transparent;
  border-radius: 12px;
  background: transparent;
  transition: border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;

  &:hover {
    border-color: #dce8f6;
    background: #f7fbff;
  }

  &.active {
    border-color: #c9ddf7;
    background: linear-gradient(90deg, #eef6ff, #f7fbff);
    box-shadow: inset 3px 0 0 #3b82f6;
  }
}

.group-icon {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  color: #3f5270;
  font-size: 14px;
  font-weight: 700;
  border-radius: 10px;
  background: #eef3f9;

  .group-item.active & {
    color: #1d4ed8;
    background: #dbeafe;
  }
}

.group-copy {
  display: grid;
  gap: 2px;
  min-width: 0;

  strong {
    overflow: hidden;
    color: #15233d;
    font-size: 13px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  small {
    overflow: hidden;
    color: #8b97aa;
    font-size: 11px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.group-count {
  flex: none;
  min-width: 28px;
  padding: 2px 8px;
  color: #5b6b82;
  font-size: 12px;
  font-weight: 600;
  text-align: center;
  border-radius: 999px;
  background: #eef3f9;

  .group-item.active & {
    color: #1d4ed8;
    background: #dbeafe;
  }
}

.config-main {
  padding: 16px;
}

.main-hero {
  display: flex;
  flex: none;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
  padding: 16px 18px;
  border: 1px solid #dce8f8;
  border-radius: 14px;
  background:
    radial-gradient(circle at 100% 0%, rgba(56, 189, 248, 0.12), transparent 42%),
    linear-gradient(135deg, #f4f9ff, #eef5ff);
}

.hero-copy {
  min-width: 0;

  h3 {
    margin: 4px 0 6px;
    color: #15233d;
    font-size: 20px;
    line-height: 1.25;
  }

  p {
    margin: 0;
    max-width: 640px;
    color: #6b7c93;
    font-size: 13px;
    line-height: 1.55;
  }
}

.hero-eyebrow {
  color: #6b7c93;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.hero-search {
  flex: none;
  width: 240px;
}

.section-toolbar {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  padding: 10px 12px;
  border: 1px solid #e8eef6;
  border-radius: 12px;
  background: #f7faff;
}

.section-title {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px 12px;
  min-width: 0;

  h2 {
    margin: 0;
    color: #15233d;
    font-size: 16px;
  }

  small {
    color: #7b8798;
    font-size: 12px;
  }
}

.section-kicker {
  color: #8a95a8;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.section-actions {
  display: flex;
  flex: none;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.config-list {
  display: grid;
  flex: 1;
  align-content: start;
  gap: 10px;
  min-height: 0;
  overflow: auto;
  padding-right: 2px;
}

.config-empty {
  display: grid;
  flex: 1;
  place-items: center;
  min-height: 0;
}

.config-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 20px;
  align-items: center;
  padding: 16px 18px;
  border: 1px solid #e8eef6;
  border-radius: 14px;
  background: linear-gradient(180deg, #ffffff, #fbfcff);
  transition: border-color 0.18s ease, box-shadow 0.18s ease;

  &:hover {
    border-color: #cfe0f5;
    box-shadow: 0 8px 18px rgba(28, 48, 78, 0.05);
  }

  &.dirty {
    border-color: #f0d9a8;
    background: linear-gradient(180deg, #fffdf8, #fffaf0);
  }
}

.config-title {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;

  strong {
    color: #15233d;
    font-size: 15px;
  }
}

.config-copy {
  min-width: 0;

  p {
    margin: 8px 0 10px;
    color: #5f6f86;
    font-size: 13px;
    line-height: 1.5;
  }
}

.config-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.meta-chip {
  padding: 2px 8px;
  color: #5b6b82;
  font-size: 12px;
  border: 1px solid #e2eaf4;
  border-radius: 999px;
  background: #f5f8fc;

  &.tenant {
    color: #1d4ed8;
    border-color: #cfe0ff;
    background: #eff6ff;
  }
}

.config-editor {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  min-width: 280px;
}

.editor-control {
  width: 220px;
}

@media (max-width: 1100px) {
  .callcenter-config-page {
    height: auto;
    min-height: calc(100vh - 84px);
    overflow: auto;
  }

  .config-shell {
    grid-template-columns: 1fr;
    grid-template-rows: auto;
    height: auto;
  }

  .config-side,
  .config-main {
    height: auto;
  }

  .config-side {
    max-height: none;
  }

  .side-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    overflow: visible;
  }

  .config-main {
    min-height: 560px;
  }

  .main-hero {
    flex-direction: column;
  }

  .hero-search {
    width: 100%;
  }

  .section-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .config-item {
    grid-template-columns: 1fr;
  }

  .config-editor {
    justify-content: flex-start;
    min-width: 0;
  }
}
</style>
