<template>
  <div class="screen-launch" aria-hidden="true" />
</template>

<script setup lang="ts">
import { onBeforeMount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useTagsViewStore } from '@/store/modules/tagsView';

defineOptions({ name: 'ScreenLaunch' });

const route = useRoute();
const router = useRouter();
const tagsViewStore = useTagsViewStore();

const resolveScreenTarget = () => {
  const fromMeta = typeof route.meta.screenPath === 'string' ? route.meta.screenPath : '';
  const fromQuery = typeof route.query.screenPath === 'string' ? route.query.screenPath : '';
  const fromPath = route.path.includes('/data-screen/ai')
    ? '/screen/ai'
    : route.path.includes('/data-screen/home')
      ? '/screen/home'
      : '';
  return fromMeta || fromQuery || fromPath;
};

onBeforeMount(async () => {
  const target = resolveScreenTarget() || '/index';
  // 中间入口页不留后台标签；同窗口进入全屏大屏，避免新窗口重新拉菜单权限
  await tagsViewStore.delView(route);
  await router.replace(target);
});
</script>

<style scoped>
.screen-launch {
  min-height: 120px;
}
</style>
