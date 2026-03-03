# patchAttr 说明

## 概述

`patchAttr.ts` 负责更新普通 attribute（属性），通过 `setAttribute` / `removeAttribute` 直接作用在元素上。它处理的是除了 `class`、`style`、事件以外的其他 props。

```ts
export function patchAttr(el: HTMLElement, key: string, value: any) {
  if (value === undefined || value === null) {
    el.removeAttribute(key);
  } else {
    el.setAttribute(key, value);
  }
}
```

- **`el`**：目标元素
- **`key`**：attribute 名称，例如 `id`、`title`、`data-*` 等
- **`value`**：新值；为 `null/undefined` 表示移除该 attribute

## 行为说明

### 1. 设置 / 覆盖 attribute

```ts
patchAttr(el, 'id', 'foo');
// 等价于：el.setAttribute('id', 'foo');
```

- 如果该 attribute 不存在，会新建
- 如果已存在，会覆盖原有值

### 2. 移除 attribute

```ts
patchAttr(el, 'id', null);
// 或
patchAttr(el, 'id', undefined);
```

- 都会触发 `el.removeAttribute('id')`
- 用统一规则处理“无值”场景，避免在其他地方做分支判断

## 与 patchProp 的配合

在 `patchProp` 中，当前实现的分派逻辑大致如下：

```ts
if (key === 'class') { ... }
if (key === 'style') { ... }
if (isOn(key)) { ... }

patchAttr(el, key, nextValue);
```

- 未命中前三种情况时，统一按 attribute 处理
- 例如：`id`、`title`、`data-id`、`aria-label` 等

`patchAttr` 的职责非常单一：负责把“普通属性”的值直接映射到 DOM attribute 上，配合其他模块一起构成完整的 DOM 属性更新机制。

