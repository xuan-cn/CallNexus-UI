<template>
  <div class="p-2 callcenter-config-page">
    <el-card shadow="hover">
      <template #header>
        <div class="page-header">
          <div>
            <h3>呼叫中心配置中心</h3>
            <p>租户级默认配置。业务模块自身配置优先，这里只作为默认值和后续扩展入口。</p>
          </div>
          <el-input v-model="keyword" clearable placeholder="搜索配置项" style="width: 240px" />
        </div>
      </template>

      <div class="config-layout">
        <aside class="config-groups">
          <button
            v-for="group in groups"
            :key="group.groupCode"
            type="button"
            :class="{ active: group.groupCode === activeGroupCode }"
            @click="selectGroup(group.groupCode)"
          >
            <strong>{{ group.groupName }}</strong>
            <span>{{ group.items.length }} 项配置</span>
          </button>
        </aside>

        <section v-loading="loading" class="config-content">
          <div v-if="activeGroup" class="config-section-header">
            <div>
              <span class="section-kicker">{{ activeGroup.groupCode }}</span>
              <h2>{{ activeGroup.groupName }}</h2>
            </div>
            <div class="section-actions">
              <el-tag v-if="dirty" type="warning" effect="plain">有未保存修改</el-tag>
              <el-button icon="Refresh" @click="reloadActiveGroup">刷新</el-button>
              <el-button v-hasPermi="['callcenter:config:update']" type="primary" @click="saveActiveGroup">保存本组配置</el-button>
            </div>
          </div>

          <el-empty v-if="!activeGroup" description="暂无配置分组" />

          <div v-else class="config-list">
            <article v-for="item in filteredItems" :key="item.configKey" class="config-item">
              <div class="config-copy">
                <div class="config-title">
                  <strong>{{ item.configName }}</strong>
                  <el-tag v-if="item.riskLevel === 'HIGH'" type="danger" effect="plain">高风险</el-tag>
                  <el-tag v-else-if="item.riskLevel === 'MEDIUM'" type="warning" effect="plain">中风险</el-tag>
                </div>
                <p>{{ item.description || item.configKey }}</p>
                <div class="config-meta">
                  <span>键：{{ item.configKey }}</span>
                  <span>来源：{{ item.source === 'TENANT' ? '租户自定义' : '系统默认' }}</span>
                  <span v-if="item.unit">单位：{{ item.unit }}</span>
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
                <el-select v-else-if="item.editorType === 'SELECT'" v-model="formValues[item.configKey]" style="width: 220px">
                  <el-option v-for="option in options(item)" :key="option.value" :label="option.label" :value="option.value" />
                </el-select>
                <el-input v-else v-model="formValues[item.configKey]" style="width: 260px" />
                <el-button v-hasPermi="['callcenter:config:update']" link type="primary" @click="resetItem(item)">恢复默认</el-button>
              </div>
            </article>
          </div>
        </section>
      </div>
    </el-card>
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
  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    h3 {
      margin: 0 0 6px;
      font-size: 18px;
    }
    p {
      margin: 0;
      color: #7a8497;
      font-size: 13px;
    }
  }
}

.config-layout {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 18px;
  min-height: 620px;
}

.config-groups {
  display: grid;
  align-content: flex-start;
  gap: 10px;
  padding-right: 14px;
  border-right: 1px solid #e8edf5;
  button {
    display: grid;
    gap: 4px;
    width: 100%;
    padding: 14px;
    text-align: left;
    cursor: pointer;
    border: 1px solid #e5ebf5;
    border-radius: 12px;
    background: #fff;
    transition: all 0.2s ease;
    strong {
      color: #263248;
      font-size: 14px;
    }
    span {
      color: #98a2b3;
      font-size: 12px;
    }
  }
  button.active {
    border-color: #0b4b83;
    background: #f0f7ff;
    box-shadow: 0 8px 20px rgba(5, 59, 112, 0.08);
  }
}

.config-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  h2 {
    margin: 4px 0 0;
    font-size: 20px;
  }
}

.section-kicker {
  color: #8a95a8;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
}

.section-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.config-list {
  display: grid;
  gap: 12px;
}

.config-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 24px;
  align-items: center;
  padding: 18px;
  border: 1px solid #e8edf5;
  border-radius: 14px;
  background: #fff;
}

.config-title {
  display: flex;
  align-items: center;
  gap: 8px;
  strong {
    color: #1f2a3d;
    font-size: 15px;
  }
}

.config-copy {
  p {
    margin: 8px 0;
    color: #69758a;
    font-size: 13px;
  }
}

.config-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  color: #98a2b3;
  font-size: 12px;
}

.config-editor {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
}

@media (max-width: 1100px) {
  .config-layout {
    grid-template-columns: 1fr;
  }
  .config-groups {
    grid-template-columns: repeat(2, 1fr);
    padding-right: 0;
    border-right: 0;
  }
  .config-item {
    grid-template-columns: 1fr;
  }
  .config-editor {
    justify-content: flex-start;
  }
}
</style>
