import { type VNode } from './vnode';

/**
 * 创建组件实例
 * @param vnode 虚拟节点
 * @returns 组件实例
 */
export function createComponentInstance(vnode: VNode) {
  const { type } = vnode;

  const instance = {
    type,
    vnode,
    props: {},
    attrs: {},
    subTree: null, // 子树，就是render的返回值
    isMounted: false, // 是否已挂载
    render: null, // 渲染函数
  };

  return instance;
}

/**
 * 初始化组件状态
 * @param instance 组件实例
 */
export function setupComponent(instance) {
  const { type } = instance;

  instance.render = type.render;
}
