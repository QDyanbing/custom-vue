import { type VNode } from './vnode';
import { proxyRefs } from '@vue/reactivity';
import { normalizePropsOptions, initProps } from './componentProps';
import { hasOwn, isFunction, isObject } from '@vue/shared';
import { nextTick } from './scheduler';
import { initSlots } from './componentSlots';

/**
 * 创建组件实例。
 *
 * 只负责根据传入的组件 VNode 构造一个“空壳”实例对象，并记录：
 * - 组件定义（type）
 * - 对应的 VNode
 * - 父组件实例（parent，根组件时为 null）
 * - 应用上下文（appContext，根组件从 vnode.appContext 取，子组件从 parent.appContext 继承）
 * - props / attrs 占位对象
 * - 用于组件挂载与更新的渲染相关字段（subTree / isMounted / render / setupState）
 *
 * props / attrs 的实际填充由 `setupComponent` 内部调用 `initProps` 完成。
 *
 * @param vnode 组件类型的 VNode
 * @param parent 父组件实例，根组件挂载时由渲染器传入 null
 * @returns 组件实例对象
 */
export function createComponentInstance(vnode, parent) {
  const { type } = vnode;

  const appContext = parent ? parent.appContext : vnode.appContext;

  const instance: any = {
    type,
    vnode,
    appContext, // createApp 产生的 appContext
    parent, // 父组件
    props: {},
    attrs: {},
    slots: {},
    refs: {},
    subTree: null, // 子树（render 返回的 VNode）
    isMounted: false, // 是否已挂载
    render: null, // 渲染函数
    setupState: {}, // setup 返回的状态
    propsOptions: normalizePropsOptions(type.props), // 用户声明的 props 选项
    provides: Object.create(parent ? parent.provides : appContext.provides), // 我要注入给子组件访问的属性
  };

  instance.ctx = { _: instance };
  instance.emit = (event, ...args) => emit(instance, event, ...args);
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
  // 初始化属性
  initProps(instance);
  // 初始化插槽
  initSlots(instance);
  // 初始化状态
  setupStatefulComponent(instance);
}

const publicPropertiesMap = {
  /**
   * `this.$el`：
   *
   * 返回组件根元素对应的真实 DOM 节点。
   * 实际取自 `instance.vnode.el`——渲染器在 mountComponent/componentUpdateFn
   * 里会把子树根节点的 el 赋给组件 VNode，从而让 `$el` 能读到最新的根 DOM。
   */
  $el: i => i.vnode.el,
  $attrs: i => i.attrs,
  /**
   * `this.$emit(event, ...args)`：
   *
   * 触发组件事件。内部通过将事件名转换为 `onXxx` 的形式，
   * 从 `vnode.props` 中查找对应的事件处理函数并调用。
   */
  $emit: i => i.emit,
  $slots: i => i.slots,
  $refs: i => i.refs,
  /**
   * `this.$nextTick(fn)`：
   *
   * - 等价于把 `scheduler.nextTick` 的 this 绑定为当前组件实例（i）
   * - 使得 `nextTick` 内部以 `fn.call(this)` 执行时，this 指向组件实例
   *
   * 注意：这里返回的是一个“已 bind 的函数”；真正调度行为在 `scheduler.ts`。
   */
  $nextTick: i => {
    return nextTick.bind(i);
  },
  /**
   * `this.$forceUpdate()`：
   *
   * 触发当前组件实例的更新（调用渲染器在 mount 时挂到实例上的 `instance.update`）。
   * 当前实现会走 scheduler（异步微任务）还是同步执行，取决于渲染器里 effect 是否设置了 scheduler。
   */
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

    // 设置当前组件实例
    setCurrentInstance(instance);

    // 执行 setup
    const setupResult = type.setup(instance.props, setupContext);

    // 清除当前组件实例
    unsetCurrentInstance();

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
 * 当前实现了三个属性：
 * - `attrs`：通过 getter 始终从最新的 `instance.attrs` 读取，
 *   以便父组件更新 attrs 时能拿到最新值
 * - `emit`：触发组件事件，内部委托给模块级的 `emit` 函数
 * - `slots`：直接引用 `instance.slots`，由 `initSlots` / `updateSlots` 维护
 *
 * @param instance 组件实例
 */
function createSetupContext(instance) {
  return {
    // 处理组件传递的属性(除了props之外的属性)
    get attrs() {
      return instance.attrs;
    },
    // 处理组件传递的事件
    emit(event, ...args) {
      emit(instance, event, ...args);
    },
    // 处理组件传递的插槽
    slots: instance.slots,
    expose(exposed) {
      // 把用户传递的exposed对象挂载到组件实例上
      instance.exposed = exposed;
    },
  };
}

export function getComponentPublicInstance(instance) {
  if (instance.exposed) {
    // 用户可以访问 exposed 和 publicPropertiesMap

    // 如果已经存在代理对象，则直接返回
    if (instance.exposedProxy) return instance.exposedProxy;

    // 创建代理对象
    instance.exposedProxy = new Proxy(proxyRefs(instance.exposed), {
      get(target, key) {
        if (key in target) {
          return target[key];
        }
        if (key in publicPropertiesMap) {
          return publicPropertiesMap[key](instance);
        }
      },
    });

    return instance.exposedProxy;
  }
  return instance.proxy;
}

/**
 * 触发组件事件。
 *
 * 将事件名转为 `onXxx` 形式（如 `foo` → `onFoo`），
 * 从 `instance.vnode.props` 中取出对应的处理函数并执行。
 *
 * 调用方式：
 * - 在 `setup` 中通过 `context.emit('foo', 1, 2)` 触发
 * - 在模板中通过 `this.$emit('foo', 1, 2)` 触发
 *
 * @param instance 组件实例
 * @param event 事件名（如 'foo'）
 * @param args 传递给事件处理函数的参数
 */
function emit(instance, event, ...args) {
  /**
   * 转换一下事件名
   * foo -> onFoo
   * bar -> onBar
   */
  const eventName = `on${event[0].toUpperCase() + event.slice(1)}`;

  // 拿到事件处理函数
  const handler = instance.vnode.props[eventName];

  // 如果是个函数就执行
  if (isFunction(handler)) {
    handler(...args);
  }
}

// 当前组件实例
let currentInstance = null;

/**
 * 设置当前组件实例
 * @param instance 组件实例
 */
export function setCurrentInstance(instance) {
  currentInstance = instance;
}

/**
 * 获取当前组件实例
 * @returns 当前组件实例
 */
export function getCurrentInstance() {
  return currentInstance;
}

/**
 * 清除当前组件实例
 */
export function unsetCurrentInstance() {
  currentInstance = null;
}

/**
 * 当前正在渲染的组件实例
 */
let currentRenderingInstance = null;

/**
 * 设置当前正在渲染的组件实例
 * @param instance 组件实例
 */
export function setCurrentRenderingInstance(instance) {
  currentRenderingInstance = instance;
}

/**
 * 获取当前正在渲染的组件实例
 * @returns 当前正在渲染的组件实例
 */
export function getCurrentRenderingInstance() {
  return currentRenderingInstance;
}

/**
 * 清除当前正在渲染的组件实例
 */
export function unsetCurrentRenderingInstance() {
  currentRenderingInstance = null;
}
