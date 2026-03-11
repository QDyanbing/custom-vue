import { type VNode } from './vnode';
import { proxyRefs } from '@vue/reactivity';
import { normalizePropsOptions, initProps } from './componentProps';
import { isFunction } from '@vue/shared';

/**
 * 创建组件实例。
 *
 * 只负责根据传入的组件 VNode 构造一个“空壳”实例对象，并记录：
 * - 组件定义（type）
 * - 对应的 VNode
 * - props / attrs 占位对象
 * - 用于组件挂载与更新的渲染相关字段（subTree / isMounted / render / setupState）
 *
 * props / attrs 的实际填充由 `setupComponent` 内部调用 `initProps` 完成。
 *
 * @param vnode 组件类型的 VNode
 * @returns 组件实例对象
 */
export function createComponentInstance(vnode) {
  const { type } = vnode;

  const instance: any = {
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

  instance.ctx = { _: instance };

  return instance;
}

/**
 * 初始化组件状态。
 *
 * 职责：
 * - 调用 `initProps` 按组件 `props` 选项解析出响应式的 `instance.props` 与普通 `instance.attrs`
 * - 创建 `setupContext`，目前暴露只读的 `attrs`
 * - 若组件实现了 `setup`，则以 `(props, context)` 形式调用，并对返回值做 `proxyRefs` 处理后挂到 `instance.setupState`
 * - 将组件定义上的 `render` 函数赋值给 `instance.render`
 *
 * 渲染器在 `mountComponent` 中调用本函数，之后通过 `instance.render.call(instance.setupState)` 渲染子树。
 *
 * @param instance 组件实例
 * @returns 无返回值，结果挂在 `instance.setupState` 与 `instance.render` 上
 */
export function setupComponent(instance) {
  initProps(instance);

  setupStatefulComponent(instance);
}

const publicInstanceProxyHandlers = {
  get(target, key, receiver) {
    debugger;
  },
};

function setupStatefulComponent(instance) {
  const { type } = instance;

  instance.proxy = new Proxy(instance.ctx, publicInstanceProxyHandlers);

  if (isFunction(type.setup)) {
    const setupContext = createSetupContext(instance);
    // 保存 setupContext
    instance.setupState = setupContext;
    const setupResult = proxyRefs(type.setup(instance.props, setupContext));
    // 拿到setup返回的状态
    instance.setupState = setupResult;
  }

  // 将render函数赋值给instance
  instance.render = type.render;
}

/**
 * 为组件的 `setup` 创建上下文对象。
 *
 * 当前仅实现 `attrs`，并通过 getter 始终从最新的 `instance.attrs` 读取，
 * 以便后续若父组件更新 attrs 时，这里能拿到最新值。
 *
 * @param instance 组件实例
 */
function createSetupContext(instance) {
  return {
    get attrs() {
      return instance.attrs;
    },
  };
}
