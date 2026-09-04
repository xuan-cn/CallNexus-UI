<template>
  <div class="screen-launch" aria-hidden="true" />
</template>

<script setup lang="ts">
import { onBeforeMount } from 'vue';
import { useRoute, useRouter } from 'vue-router';

defineOptions({ name: 'ScreenLaunch' });

const route = useRoute();
const router = useRouter();

onBeforeMount(() => {
  const target = typeof route.meta.screenPath === 'string' ? route.meta.screenPath : '';
  if (target) {
    router.replace(target);
    return;
  }
  router.replace('/index');
});
</script>

<style scoped>
.screen-launch {
  min-height: 120px;
}
</style>
