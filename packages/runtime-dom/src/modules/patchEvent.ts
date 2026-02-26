type EventValue = (e: Event) => any;
type Invoker = ((e: Event) => void) & { value: EventValue };

/**
 * 创建一个可复用的事件调用器（invoker）。
 *
 * @remarks
 * 事件更新时，不需要反复 `remove/addEventListener`：
 * 只要复用同一个 invoker，并替换 `invoker.value` 即可。
 */
function createInvoker(fn: EventValue): Invoker {
  const invoker = ((e: Event) => {
    invoker.value(e);
  }) as Invoker;

  invoker.value = fn;
  return invoker;
}

/**
 * 挂在元素上的私有存储，用来缓存事件 invoker。
 *
 * @remarks
 * 用 `Symbol` 避免和用户自定义属性名冲突。
 */
const veiKey = Symbol('_vei');

/**
 * 更新元素事件监听。
 *
 * @param el 目标元素
 * @param key 事件 key（例如 `onClick`）
 * @param prevValue 上一次回调
 * @param nextValue 这一次回调；传入 `null/undefined` 表示移除监听
 *
 * @remarks
 * - 首次绑定：创建 invoker，缓存到元素上，并 `addEventListener`
 * - 更新回调：复用 invoker，仅替换 `invoker.value`
 * - 移除：`removeEventListener`，并清掉缓存
 */
export function patchEvent(el: HTMLElement, key: string, prevValue: any, nextValue: any) {
  const name = key.slice(2).toLowerCase();
  const invokers = ((el as any)[veiKey] ??= {});
  const existingInvoker = invokers[key];

  if (nextValue) {
    if (existingInvoker) {
      existingInvoker.value = nextValue;
      return;
    }

    const invoker = createInvoker(nextValue);
    invokers[key] = invoker;

    el.addEventListener(name, invoker);
  } else {
    if (existingInvoker) {
      el.removeEventListener(name, existingInvoker);
      invokers[key] = undefined;
    }
  }
}
