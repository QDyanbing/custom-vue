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

```ts
if (nextValue) {
  for (const key in nextValue as any) {
    style[key] = nextValue[key];
  }
}
```

- 当 `nextValue` 为真值（对象 / 字符串）时：
  - 遍历 `nextValue` 上的所有 key
  - 直接写入 `el.style[key]`

常见场景：从空样式更新到有样式，或者修改某些样式属性。

### 2. 清理多余样式

```ts
if (prevValue) {
  for (const key in prevValue as any) {
    if (!(key in (nextValue as any))) {
      style[key] = null;
    }
  }
}
```

- 当 `prevValue` 存在时：
  - 遍历旧样式 `prevValue`
  - 对于那些在 `prevValue` 中存在，但在 `nextValue` 中不存在的 key，手动把 `style[key]` 置为 `null`
- 这样可以删除已经被移除的样式字段，避免“老样式残留”

### 3. 值为 null/undefined 的情况

- 如果 `nextValue` 为 `null/undefined`，不会进入“写入新样式”的分支
- 但如果 `prevValue` 存在，仍会执行“清理多余样式”逻辑，把所有旧 key 清空

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

