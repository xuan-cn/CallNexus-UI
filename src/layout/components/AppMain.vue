<template>
  <section class="app-main">
    <router-view v-slot="{ Component, route }">
      <!-- 关闭动画时 css=false，避免仍走 animate.css 的 1s fadeIn / out-in 空窗 -->
      <transition
        name="route-fade"
        :css="animationEnable"
        :mode="animationEnable ? 'out-in' : undefined"
      >
        <keep-alive :include="tagsViewStore.cachedViews">
          <component :is="Component" v-if="!!Component && !route.meta.link" :key="route.path" />
        </keep-alive>
      </transition>
    </router-view>
    <iframe-toggle />
  </section>
</template>

<script setup name="AppMain" lang="ts">
import { useSettingsStore } from '@/store/modules/settings';
import { useTagsViewStore } from '@/store/modules/tagsView';

import IframeToggle from './IframeToggle/index.vue';
const route = useRoute();
const tagsViewStore = useTagsViewStore();
const settingsStore = useSettingsStore();
const animationEnable = computed(() => settingsStore.animationEnable);

onMounted(() => {
  addIframe();
});

watchEffect(() => {
  addIframe();
});

function addIframe() {
  if (route.meta.link) {
    useTagsViewStore().addIframeView(route);
  }
}
</script>

<style lang="scss" scoped>
.app-main {
  /*
   * 主内容区固定为视口高度：
   * - 普通 CRUD 页内容超出时，在这里滚动（恢复可看全）
   * - 需要「铺满 + 表内滚动」的页面自行 height: calc(100vh - 84px) + overflow: hidden
   *   会刚好占满本区域，不会再叠一层外层滚动
   */
  box-sizing: border-box;
  width: 100%;
  height: 100vh;
  position: relative;
  overflow-x: hidden;
  overflow-y: auto;
}

.fixed-header + .app-main {
  padding-top: 50px;
}

.hasTagsView {
  .fixed-header + .app-main {
    padding-top: 84px;
  }
}

.route-fade-enter-active {
  transition: opacity 0.18s ease;
}

.route-fade-enter-from {
  opacity: 0;
}
</style>
<style lang="scss">
// fix css style bug in open el-dialog
.el-popup-parent--hidden {
  .fixed-header {
    padding-right: 6px;
  }
}

::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background-color: var(--el-fill-color-lighter);
}

::-webkit-scrollbar-thumb {
  background-color: var(--el-text-color-placeholder);
  border-radius: 999px;
}
</style>
