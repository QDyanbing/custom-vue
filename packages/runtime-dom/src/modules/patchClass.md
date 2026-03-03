# patchClass 说明

## 概述

`patchClass.ts` 负责更新元素的 `class`。它是 `patchProp` 分派链路中的一环，用于处理 `key === 'class'` 的情况。

实现目标：

- 当传入字符串时，直接设置为元素的类名
- 当传入 `null/undefined` 时，移除 `class` attribute

## 函数签名

```ts
export function patchClass(el: HTMLElement, value?: string) {
  if (value === undefined || value === null) {
    el.removeAttribute('class');
  } else {
    el.className = value;
  }
}
```

- **`el`**：目标元素
- **`value`**：class 字符串；不传或为 `null/undefined` 视为“移除 class”

## 行为说明

### 1. 设置 class

```ts
patchClass(el, 'btn primary');
// 等价于：el.className = 'btn primary';
```

- 直接覆盖原有类名
- 由上层保证传入的是拼接好的 class 字符串（例如从对象 / 数组形式转换而来）

### 2. 移除 class

```ts
patchClass(el, null);
// 或
patchClass(el, undefined);
```

- 这两种情况都会执行 `el.removeAttribute('class')`
- 彻底移除 `class` 属性，而不是设置为空字符串

## 与 patchProp 的配合

在 `patchProp` 中：

```ts
if (key === 'class') {
  return patchClass(el, nextValue);
}
```

- 渲染器在 diff props 时发现 `class` 变化，就会通过这里调用 `patchClass`
- `patchClass` 只处理“如何反映到 DOM”，并不关心 class 字符串是如何计算出来的

整体上，这个模块保持了最小实现，却覆盖了 DOM 层面关于 `class` 更新的常见需求。

