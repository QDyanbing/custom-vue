import { type VNode } from './vnode';
import { proxyRefs } from '@vue/reactivity';
import { normalizePropsOptions, initProps } from './componentProps';
import { isFunction } from '@vue/shared';

/**
 * 创建组件实例
 * @param vnode 虚拟节点
 * @returns 组件实例
 */
export function createComponentInstance(vnode) {
  const { type } = vnode;

  debugger;

  const instance = {
    type,
    vnode,
    props: {},
    attrs: {},
    subTree: null, // 子树，就是render的返回值
    isMounted: false, // 是否已挂载
    render: null, // 渲染函数
    setupState: null, // setup返回的状态
    propsOptions: normalizePropsOptions(type.props), // 用户声明的props选项
  };

  return instance;
}

/**
 * 初始化组件状态
 * @param instance 组件实例
 * @returns 无返回值，结果挂在 instance.setupState 与 instance.render 上
 */
export function setupComponent(instance) {
  const { type } = instance;

  initProps(instance);

  const setupContext = createSetupContext(instance);

  if (isFunction(type.setup)) {
    const setupResult = proxyRefs(type.setup(instance.props, setupContext));
    // 拿到setup返回的状态
    instance.setupState = setupResult;
  }

  // 将render函数赋值给instance
  instance.render = type.render;
}

function createSetupContext(instance) {
  return {
    get attrs() {
      return instance.attrs;
    },
  };
}
