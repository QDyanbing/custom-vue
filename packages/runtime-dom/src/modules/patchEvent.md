# patchEvent 说明

## 概述

`patchEvent.ts` 负责更新元素上的事件监听函数。通过“invoker 包装器 + 元素私有缓存”的方式，避免在每次 props 更新时频繁地 `addEventListener` / `removeEventListener`。

核心点：

- 事件只在首次绑定和完全移除时操作 DOM 监听器
- 更新事件回调时，仅替换 invoker 上的 `value` 引用

## Invoker 设计

```ts
type EventValue = (e: Event) => any;
type Invoker = ((e: Event) => void) & { value: EventValue };
```

### createInvoker

```ts
function createInvoker(fn: EventValue): Invoker {
  const invoker = ((e: Event) => {
    invoker.value(e);
  }) as Invoker;

  invoker.value = fn;
  return invoker;
}
```

- `invoker` 本身是注册到 `addEventListener` 上的回调
- 实际要执行的用户回调保存在 `invoker.value` 中
- 更新事件时，只需要替换 `invoker.value`，无需移除 / 重新绑定 DOM 事件

## 元素上的事件缓存

```ts
const veiKey = Symbol('_vei');
```

- 使用 `Symbol` 作为 key 挂到元素实例上，避免和用户自定义属性冲突
- 每个元素维护一个对象 `invokers`，以事件 key（如 `onClick`）为索引缓存 invoker：

```ts
const invokers = ((el as any)[veiKey] ??= {});
const existingInvoker = invokers[key];
```

## patchEvent 行为

```ts
export function patchEvent(
  el: HTMLElement,
  key: string,
  prevValue: any,
  nextValue: any
) {
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
```

### 1. 绑定或更新事件

- 当 `nextValue` 为真值：
  - **已有 invoker**：只更新 `existingInvoker.value = nextValue`
  - **没有 invoker**：创建新 invoker，缓存到 `invokers[key]`，并调用 `addEventListener`

### 2. 移除事件

- 当 `nextValue` 为 `null/undefined`：
  - 如果存在 `existingInvoker`，调用 `removeEventListener`
  - 同时把缓存置为 `undefined`

## 示例

```ts
// 初次绑定
patchEvent(el, 'onClick', null, handleClick);

// 更新回调
patchEvent(el, 'onClick', handleClick, handleNewClick);

// 移除事件
patchEvent(el, 'onClick', handleNewClick, null);
```

- 初次绑定：会真正调用一次 `addEventListener('click', invoker)`
- 更新回调：不动 DOM 监听器，只替换 `invoker.value`
- 移除事件：调用 `removeEventListener('click', existingInvoker)` 并清理缓存

这种设计在频繁更新 props 的情况下可以减少 DOM 事件的解绑 / 绑定次数，提升性能。

