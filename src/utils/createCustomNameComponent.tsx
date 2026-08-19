/**
 * 后台返回的路由动态生成 name，解决 keep-alive 缓存匹配问题。
 * 详见 https://github.com/vbenjs/vue-vben-admin/issues/3927
 */
import { Component, DefineComponent, defineComponent, h } from 'vue';

interface Options {
  name?: string;
}

export function createCustomNameComponent(loader: () => Promise<any>, options: Options = {}): () => Promise<Component> {
  const { name } = options;
  let component: Component | null = null;

  const load = async () => {
    const module = await loader();
    component = module?.default ?? null;
    if (!component) {
      throw new Error(`Cannot resolve component ${name || ''}`);
    }
  };

  return async () => {
    if (!component) {
      await load();
    }

    return defineComponent({
      name,
      inheritAttrs: false,
      setup(_, { attrs, slots }) {
        // 透传 attrs/slots，避免 Vue 3.5 + keep-alive 卸载时拿到空 vnode
        return () => {
          if (!component) {
            return null;
          }
          return h(component as DefineComponent, attrs, slots);
        };
      }
    });
  };
}
