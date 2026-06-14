<template>
  <Icon v-if="isIconify" :icon="iconClass" :class="['svg-icon', 'menu-icon-iconify', className]" :style="{ color }" />
  <svg-icon v-else :icon-class="iconClass" :class-name="className" :color="color" />
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';
import { propTypes } from '@/utils/propTypes';

const props = defineProps({
  iconClass: propTypes.string.def(''),
  className: propTypes.string.def(''),
  color: propTypes.string.def('')
});

/**
 * 通过命名空间前缀（含冒号）判定为 Iconify 图标。
 * 例如 `mdi:home`、`ep:setting` 走 Iconify，`system`、`user` 走本地 SvgIcon。
 */
const isIconify = computed(() => typeof props.iconClass === 'string' && props.iconClass.includes(':'));
</script>

<style lang="scss" scoped>
/**
 * 复用全局 .svg-icon 的尺寸/对齐/间距规则（margin-right、is-active 配色等），
 * 此处仅做 Iconify 渲染需要的最小覆盖。
 */
.menu-icon-iconify {
  width: 1em;
  height: 1em;
  vertical-align: -2px;
  font-size: inherit;
}
</style>
