import { ShapeFlags } from '@vue/shared';
import { getCurrentInstance } from '../component';

export const isKeepAlive = (type: any) => type?.__isKeepAlive;

export const KeepAlive = {
  name: 'KeepAlive',
  __isKeepAlive: true,
  setup(props, { slots }) {
    const instance = getCurrentInstance();
    const { options } = instance.ctx.renderer;
    const { createElement, insert } = options;

    /**
     * 缓存组件的实例:
     * 1. 组件的实例: component => vnode
     * 2. 组件的 key: key => vnode
     *
     */
    const cache = new Map();
    const storageContainer = createElement('div');

    // 虽然unmount不卸载了，但是我自己需要把这个虚拟节点放到某一处，我不希望他还在页面中显示
    instance.ctx.deactivate = (vnode: any) => {
      insert(vnode.el, storageContainer);
    };

    return () => {
      const vnode = slots.default?.();

      const key = vnode.key ? vnode.key : vnode.type;

      cache.set(key, vnode);

      // 标记组件应该被 keep-alive,告诉 unmount 别帮我卸载组件
      vnode.shapeFlag |= ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE;

      return vnode;
    };
  },
};
