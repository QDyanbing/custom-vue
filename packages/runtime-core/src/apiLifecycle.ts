/**
 * 组件生命周期 API。
 *
 * 提供 onBeforeMount / onMounted / onBeforeUpdate / onUpdated / onBeforeUnmount / onUnmounted，
 * 以及供渲染器调用的 triggerHook。钩子通过 injectHook 挂到组件实例上，执行前会设置 currentInstance 便于 getCurrentInstance() 使用。
 */
import { getCurrentInstance, setCurrentInstance, unsetCurrentInstance } from './component';

export enum LifecycleHooks {
  // 挂载
  BEFORE_MOUNT = 'bm',
  MOUNTED = 'm',
  // 更新
  BEFORE_UPDATE = 'bu',
  UPDATED = 'u',
  // 卸载
  BEFORE_UNMOUNT = 'bum',
  UNMOUNTED = 'um',
}

/**
 * 创建生命周期钩子函数。
 * 返回的函数接收 hook 与可选的 target（默认 getCurrentInstance()），将 hook 注入到对应实例的 type 队列中。
 */
function createHook(type: LifecycleHooks) {
  return (hook: () => void, target = getCurrentInstance()) => {
    injectHook(target, hook, type);
  };
}

/**
 * 注入生命周期
 * @param target 当前组件实例
 * @param hook 生命周期函数
 * @param type 生命周期类型
 */
function injectHook(target: any, hook: () => void, type: LifecycleHooks) {
  // 如果当前组件实例没有这个生命周期，则创建一个数组
  if (target[type] == null) {
    target[type] = [];
  }

  // 将生命周期函数添加到数组中
  target[type].push(hook);
}

// 挂载
export const onBeforeMount = createHook(LifecycleHooks.BEFORE_MOUNT);
export const onMounted = createHook(LifecycleHooks.MOUNTED);
// 更新
export const onBeforeUpdate = createHook(LifecycleHooks.BEFORE_UPDATE);
export const onUpdated = createHook(LifecycleHooks.UPDATED);
// 卸载
export const onBeforeUnmount = createHook(LifecycleHooks.BEFORE_UNMOUNT);
export const onUnmounted = createHook(LifecycleHooks.UNMOUNTED);

/**
 * 触发生命周期钩子
 * @param instance 当前组件的实例
 * @param type 生命周期的类型 bm m bu bum
 */
export function triggerHooks(instance: any, type: LifecycleHooks) {
  const hooks = instance[type];

  if (hooks) {
    setCurrentInstance(instance);
    try {
      hooks.forEach(hook => hook());
    } finally {
      unsetCurrentInstance();
    }
  }
}
