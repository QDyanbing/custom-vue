import { type VNode } from './vnode';
import { proxyRefs } from '@vue/reactivity';
import { normalizePropsOptions, initProps } from './componentProps';
import { hasOwn, isFunction, isObject } from '@vue/shared';
import { nextTick } from './scheduler';
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
    slots: {},
    refs: {},
    subTree: null, // 子树（render 返回的 VNode）
    isMounted: false, // 是否已挂载
    render: null, // 渲染函数
    setupState: {}, // setup 返回的状态
    propsOptions: normalizePropsOptions(type.props), // 用户声明的 props 选项
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
 * - 创建组件代理 `instance.proxy`（用于 render 的 this）
 * - 若组件实现了 `setup`，则以 `(props, context)` 形式调用：
 *   - 返回对象：对返回值做 `proxyRefs` 后挂到 `instance.setupState`
 *   - 返回函数：认为它就是渲染函数，赋给 `instance.render`
 * - 若 `setup` 没有提供渲染函数，则兜底使用组件定义上的 `type.render`
 *
 * 渲染器在 `mountComponent` 中调用本函数，之后通过 `instance.render.call(instance.proxy)` 渲染子树。
 *
 * @param instance 组件实例
 * @returns 无返回值，结果挂在 `instance.setupState` 与 `instance.render` 上
 */
export function setupComponent(instance) {
  initProps(instance);

  setupStatefulComponent(instance);
}

const publicPropertiesMap = {
  $attrs: i => i.attrs,
  $slots: i => i.slots,
  $refs: i => i.refs,
  $nextTick: i => {
    return nextTick.bind(i);
  },
  $forceUpdate: i => {
    return () => i.update();
  },
};

const publicInstanceProxyHandlers = {
  get(target, key, receiver) {
    const { _: instance } = target;
    const { setupState, props } = instance;
    /**
     * 属性访问顺序：
     * 1. 先从 setupState 中取（setup 返回的状态）
     * 2. 再从 props 中取（声明为 props 的输入）
     * 3. 最后支持 $attrs/$slots/$refs 等公共属性
     */

    // 去setupState中查找
    if (hasOwn(setupState, key)) {
      return setupState[key];
    }

    // 去props中查找
    if (hasOwn(props, key)) {
      return props[key];
    }

    /**
     * $attrs
     * $slots
     * $refs
     */
    if (hasOwn(publicPropertiesMap, key)) {
      const publicGetter = publicPropertiesMap[key];
      return publicGetter(instance);
    }

    return instance[key];
  },
  set(target, key, value, receiver) {
    const { _: instance } = target;
    const { setupState } = instance;
    if (hasOwn(setupState, key)) {
      // 当前最小实现：只允许写入 setupState 的同名字段
      setupState[key] = value;
    }

    return true;
  },
};

function setupStatefulComponent(instance) {
  const { type } = instance;

  instance.proxy = new Proxy(instance.ctx, publicInstanceProxyHandlers);

  if (isFunction(type.setup)) {
    const setupContext = createSetupContext(instance);
    // 保存 setupContext
    instance.setupContext = setupContext;
    const setupResult = type.setup(instance.props, setupContext);

    handleSetupResult(instance, setupResult);
  }

  if (!instance.render) {
    // 如果上面的都处理完了还是没有返回值，则使用组件定义上的render函数
    instance.render = type.render;
  }
}

function handleSetupResult(instance, setupResult) {
  if (isFunction(setupResult)) {
    // 如果 setup 返回的是一个函数，则认为它就是渲染函数
    instance.render = setupResult;
  } else if (isObject(setupResult)) {
    // 拿到 setup 返回的状态
    instance.setupState = proxyRefs(setupResult);
  }
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
