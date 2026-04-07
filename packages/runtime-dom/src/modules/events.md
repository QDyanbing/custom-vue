# events.ts（patchEvent）说明

## 概述

`events.ts` 提供 `patchEvent`，负责更新元素上的事件监听函数。通过「invoker 包装器 + 元素私有缓存」，避免在每次 props 更新时频繁地 `addEventListener` / `removeEventListener`。

本文件由原先的 `patchEvent.ts` 重命名而来，逻辑入口名仍为 `patchEvent`，供 `patchProp` 调用。

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
- 每个元素维护一个对象 `invokers`，以事件的原始 prop 名（如 `onClick`）为索引缓存 invoker：

```ts
const invokers = ((el as any)[veiKey] ??= {});
const existingInvoker = invokers[rawName];
```

## patchEvent 行为

```ts
export function patchEvent(el: HTMLElement, rawName: string, nextValue: any) {
  const name = rawName.slice(2).toLowerCase();
  // ...
}
```

- 第一个参数为 `rawName`（例如 `onClick`），内部 `slice(2)` 得到 DOM 事件名 `click`
- `nextValue` 为本次要绑定的回调；为假值时表示移除监听（不再单独传入 `prevValue`，由 `patchProp` 在 diff 层面对比新旧 props）

### 1. 绑定或更新事件

- 当 `nextValue` 为真值：
  - **已有 invoker**：只更新 `existingInvoker.value = nextValue`
  - **没有 invoker**：创建新 invoker，缓存到 `invokers[rawName]`，并调用 `addEventListener`

### 2. 移除事件

- 当 `nextValue` 为 `null/undefined`：
  - 如果存在 `existingInvoker`，调用 `removeEventListener`
  - 同时把缓存置为 `undefined`

## 与 patchProp 的配合

`patchProp` 在识别到 `on[A-Z]` 形式的 key 时调用 `patchEvent(el, key, nextValue)`，上一轮的旧值由渲染器在 props diff 中处理，不传入本函数。

这种设计在频繁更新 props 的情况下可以减少 DOM 事件的解绑 / 绑定次数。
