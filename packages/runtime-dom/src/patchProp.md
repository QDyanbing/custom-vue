# patchProp 说明

## 概述

`patchProp.ts` 统一负责更新单个元素上的属性，根据 key 不同分派到对应的处理模块。

## 目录

- [函数签名](#函数签名)
- [分派规则](#分派规则)
- [使用示例](#使用示例)

- `class` → `patchClass`
- `style` → `patchStyle`
- 事件（`onXxx`）→ `patchEvent`
- 其他 → `patchAttr`

它是 DOM 平台属性更新的总入口，由渲染器在 diff 过程中调用。

## 函数签名

```ts
export function patchProp(
  el: HTMLElement,
  key: string,
  prevValue: any,
  nextValue: any
) { ... }
```

- **`el`**：要更新的目标元素
- **`key`**：属性名，例如 `class`、`style`、`onClick`、`id` 等
- **`prevValue`**：上一次渲染时的值
- **`nextValue`**：当前要设置的新值

渲染器会在 diff 阶段比对新旧 props，并把差异通过 `patchProp` 反映到真实 DOM 上。

## 分派规则

### 1. class

```ts
if (key === 'class') {
  return patchClass(el, nextValue);
}
```

- 始终把 `nextValue` 当作 class 字符串处理
- 传入 `null/undefined` 时在 `patchClass` 中移除 `class` 特性

### 2. style

```ts
if (key === 'style') {
  return patchStyle(el, prevValue, nextValue);
}
```

- 同时接收 `prevValue` 和 `nextValue`
- 由 `patchStyle` 负责写入新的样式，并清理旧样式中多余的 key

### 3. 事件

```ts
if (isOn(key)) {
  return patchEvent(el, key, prevValue, nextValue);
}
```

- 使用 `isOn(key)` 判断是否为事件（通常是 `onXxx` 形式）
- 委托给 `patchEvent` 处理 add/remove 和更新回调

### 4. 其他 attribute

```ts
patchAttr(el, key, nextValue);
```

- 剩余情况均视为普通 attribute
- 由 `patchAttr` 使用 `setAttribute` / `removeAttribute` 完成更新

## 使用示例

假设有如下 VNode diff 结果：

```ts
// 旧 props
const oldProps = { class: 'btn', onClick: handleClick, id: 'foo' };

// 新 props
const newProps = { class: 'btn primary', onClick: handleNewClick };
```

diff 时会触发一系列调用：

1. `patchProp(el, 'class', 'btn', 'btn primary')`
2. `patchProp(el, 'onClick', handleClick, handleNewClick)`
3. `patchProp(el, 'id', 'foo', null)` → 移除 `id`

`patchProp` 只负责把调用分发到具体的模块上，从而让 DOM 属性更新逻辑集中又清晰，便于扩展和维护。

