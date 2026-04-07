# patchStyle 说明

## 概述

`patchStyle.ts` 负责更新元素的行内样式（`el.style`）。它接收上一次和这一次的样式对象，通过“写新值 + 清理旧 key”来保持 DOM 上的样式和 VNode 一致。

```ts
export function patchStyle(
  el: HTMLElement,
  prevValue: Style,
  nextValue: Style
): void { ... }
```

- **`Style` 类型**：`string | Record<string, string | string[]> | null`
- 在当前实现中，按 key 写入 `style[key]`，适配对象形式的样式

## 更新规则

### 1. 写入新的样式

- 当 `nextValue` 为真值时：
  - **字符串**（例如 `style="color: red"` 编译结果）：调用 `el.setAttribute('style', nextValue)`，整段覆盖行内样式
  - **对象**：遍历 key，写入 `el.style[key]`

```ts
if (nextValue) {
  if (isString(nextValue)) {
    el.setAttribute('style', nextValue as string);
  } else {
    for (const key in nextValue as any) {
      style[key] = nextValue[key];
    }
  }
}
```

### 2. 清理多余样式（对象形态）

当 `prevValue` 为对象时，会遍历旧 key；若新对象中对应项为 `undefined` 或 `null`，则把 `style[key]` 置为 `null`，避免残留。

```ts
if (prevValue) {
  for (const key in prevValue as any) {
    if (nextValue?.[key] === undefined || nextValue?.[key] === null) {
      style[key] = null;
    }
  }
}
```

（当 `nextValue` 为字符串时，对象形式的 `prevValue` 上各 key 在新结果里往往为 `undefined`，会走清理分支。）

### 3. 值为 null/undefined 的情况

- 如果 `nextValue` 为 `null/undefined`，不会进入“写入新样式”的对象/字符串分支
- 若 `prevValue` 仍存在，仍会按上一节清理旧 key

## 示例

```ts
// 旧样式
const prev = { color: 'red', fontSize: '14px' };

// 新样式
const next = { color: 'blue' };

patchStyle(el, prev, next);
```

执行后：

- `el.style.color = 'blue'`
- `el.style.fontSize = null`（因为新样式里已经没有 `fontSize` 了）

## 总结

`patchStyle` 的实现遵循了“最小惊讶”原则：

- 更新时只写入新样式中出现的 key
- 同时清理旧样式中多余的 key，避免遗留样式造成显示异常

渲染器只需要保证在 diff 阶段传入正确的 `prevValue` 和 `nextValue`，就可以由 `patchStyle` 负责让 DOM 样式和 VNode 描述保持同步。

