import { getCurrentInstance } from './component';

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
  if (!target[type]) {
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
