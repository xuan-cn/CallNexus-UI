<template>
  <div class="relative" :style="{ 'width': width }">
    <el-input v-model="modelValue" readonly placeholder="点击选择图标" @click="togglePopover">
      <template #prepend>
        <menu-icon :icon-class="modelValue" />
      </template>
    </el-input>

    <el-popover shadow="none" :visible="visible" placement="bottom-end" trigger="click" :width="480">
      <template #reference>
        <div class="cursor-pointer text-[#999] absolute right-[10px] top-0 height-[32px] leading-[32px]" @click="togglePopover">
          <i-ep-caret-top v-show="visible"></i-ep-caret-top>
          <i-ep-caret-bottom v-show="!visible"></i-ep-caret-bottom>
        </div>
      </template>

      <el-tabs v-model="activeTab" class="icon-select-tabs" @tab-change="handleTabChange">
        <el-tab-pane label="本地" name="local" />
        <el-tab-pane label="Material" name="mdi" />
        <el-tab-pane label="Element" name="ep" />
      </el-tabs>

      <el-input v-model="filterValue" class="p-2" placeholder="搜索图标" clearable />

      <div v-if="loading" class="icon-loading">加载中...</div>
      <el-scrollbar v-else height="280px">
        <ul class="icon-list">
          <el-tooltip
            v-for="(iconName, index) in pagedIcons"
            :key="index"
            :content="iconName"
            placement="bottom"
            effect="light"
          >
            <li :class="['icon-item', { active: modelValue == iconName }]" @click="selectedIcon(iconName)">
              <menu-icon color="var(--el-text-color-regular)" :icon-class="iconName" />
            </li>
          </el-tooltip>
          <li v-if="!filteredIcons.length" class="icon-empty">无匹配图标</li>
        </ul>

        <div v-if="filteredIcons.length > pageSize" class="icon-more">
          <el-button v-if="pageSize < filteredIcons.length" link type="primary" @click="loadMore">
            加载更多（已显示 {{ pagedIcons.length }} / {{ filteredIcons.length }}）
          </el-button>
        </div>
      </el-scrollbar>
    </el-popover>
  </div>
</template>

<script setup lang="ts">
import localIcons from '@/components/IconSelect/requireIcons';
import { loadIconCollection, type IconifyPrefix } from '@/components/IconSelect/iconifyLoader';
import { propTypes } from '@/utils/propTypes';

const props = defineProps({
  modelValue: propTypes.string.isRequired,
  width: propTypes.string.def('400px')
});

const emit = defineEmits(['update:modelValue']);
const visible = ref(false);
const { modelValue, width } = toRefs(props);

type TabKey = 'local' | IconifyPrefix;
const activeTab = ref<TabKey>('local');
const loading = ref(false);
const filterValue = ref('');
const pageSize = ref(120);

/** 各 tab 对应的图标全集，按需加载 */
const iconPool = reactive<Record<TabKey, string[]>>({
  local: localIcons,
  mdi: [],
  ep: []
});

/** 当前 tab 全量图标 */
const currentIcons = computed<string[]>(() => iconPool[activeTab.value] || []);

/** 关键字过滤后的列表 */
const filteredIcons = computed(() => {
  const keyword = filterValue.value.trim().toLowerCase();
  if (!keyword) return currentIcons.value;
  return currentIcons.value.filter((name) => name.toLowerCase().includes(keyword));
});

/** 分页展示，避免一次渲染数千节点 */
const pagedIcons = computed(() => filteredIcons.value.slice(0, pageSize.value));

const togglePopover = () => {
  visible.value = !visible.value;
};

const ensureLoaded = async (key: TabKey) => {
  if (key === 'local') return;
  if (iconPool[key].length) return;
  loading.value = true;
  try {
    iconPool[key] = await loadIconCollection(key);
  } catch (e) {
    console.error('[IconSelect] 加载图标集失败', key, e);
    iconPool[key] = [];
  } finally {
    loading.value = false;
  }
};

const handleTabChange = (key: TabKey) => {
  activeTab.value = key;
  filterValue.value = '';
  pageSize.value = 120;
  ensureLoaded(key);
};

const loadMore = () => {
  pageSize.value += 240;
};

/**
 * 选择图标
 */
const selectedIcon = (iconName: string) => {
  emit('update:modelValue', iconName);
  visible.value = false;
};

/** 弹窗首次打开时，按当前值自动定位到对应 tab */
watch(visible, (val) => {
  if (!val) return;
  const v = props.modelValue || '';
  if (v.startsWith('mdi:')) activeTab.value = 'mdi';
  else if (v.startsWith('ep:')) activeTab.value = 'ep';
  else activeTab.value = 'local';
  ensureLoaded(activeTab.value);
});
</script>

<style lang="scss" scoped>
.el-scrollbar {
  max-height: calc(50vh - 40px) !important;
  overflow-y: auto;
}
.icon-select-tabs {
  margin: 0 8px;
}
.icon-loading {
  padding: 24px;
  text-align: center;
  color: var(--el-text-color-secondary);
}
.icon-list {
  display: flex;
  flex-wrap: wrap;
  padding-left: 10px;
  margin-top: 6px;
}
.icon-item {
  cursor: pointer;
  width: calc(10% - 8px);
  margin: 0 8px 8px 0;
  padding: 6px 0;
  display: flex;
  flex-direction: column;
  justify-items: center;
  align-items: center;
  border: 1px solid #ccc;
  border-radius: 3px;
  font-size: 18px;
  &:hover {
    border-color: var(--el-color-primary);
    color: var(--el-color-primary);
    transition: all 0.2s;
    transform: scaleX(1.1);
  }
}
.icon-empty {
  padding: 24px;
  width: 100%;
  text-align: center;
  color: var(--el-text-color-secondary);
  list-style: none;
}
.icon-more {
  text-align: center;
  padding: 6px 0 12px;
}
.active {
  border-color: var(--el-color-primary);
  color: var(--el-color-primary);
}
</style>
