/**
 * Iconify 图标集懒加载工具
 *
 * 仅在用户打开图标选择器时按需加载 mdi / ep JSON，避免影响首屏。
 * 加载到的图标名通过 `getIconNames(prefix)` 返回，使用方拼接 `prefix:name` 即可被
 * `@iconify/vue` 的 `<Icon>` 组件解析。
 */

export type IconifyPrefix = 'mdi' | 'ep';

interface CollectionPayload {
  prefix: string;
  icons: Record<string, unknown>;
  aliases?: Record<string, unknown>;
}

const cache = new Map<IconifyPrefix, string[]>();
const loaders: Record<IconifyPrefix, () => Promise<{ default: CollectionPayload }>> = {
  mdi: () => import('@iconify/json/json/mdi.json'),
  ep: () => import('@iconify/json/json/ep.json')
};

/**
 * 加载某个图标集，并返回完整图标名（含前缀，例如 `mdi:home`）。
 */
export const loadIconCollection = async (prefix: IconifyPrefix): Promise<string[]> => {
  const cached = cache.get(prefix);
  if (cached) {
    return cached;
  }
  const mod = await loaders[prefix]();
  const data = mod.default;
  const names = [
    ...Object.keys(data.icons || {}),
    ...Object.keys(data.aliases || {})
  ].map((name) => `${data.prefix}:${name}`);
  cache.set(prefix, names);
  return names;
};
