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

    // 激活缓存的组件,renderer会调用这个方法在keepalive需要将之前缓存的组件实例插入到页面中
    instance.ctx.activate = (vnode: any, container: Element, anchor: Element) => {
      insert(vnode.el, container, anchor);
    };

    // 虽然unmount不卸载了，但是我自己需要把这个虚拟节点放到某一处，我不希望他还在页面中显示
    instance.ctx.deactivate = (vnode: any) => {
      insert(vnode.el, storageContainer);
    };

    return () => {
      const vnode = slots.default?.();

      const key = vnode.key ? vnode.key : vnode.type;

      const cachedVNode = cache.get(key);

      if (cachedVNode) {
        // 复用缓存过的组件实例，复用dom节点
        vnode.component = cachedVNode.component;
        vnode.el = cachedVNode.el;
        // 再打一个标记，告诉renderer，不要重新挂载组件，直接复用缓存过的组件实例
        vnode.shapeFlag |= ShapeFlags.COMPONENT_KEPT_ALIVE;
      }

      cache.set(key, vnode);

      // 标记组件应该被 keep-alive,告诉 unmount 别帮我卸载组件
      vnode.shapeFlag |= ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE;

      return vnode;
    };
  },
};
