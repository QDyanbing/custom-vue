# componentRenderUtils.ts 说明

## 概述

`componentRenderUtils.ts` 提供组件更新时的辅助判断逻辑，供 `renderer.ts` 的 `updateComponent` 使用。当父组件重新渲染产生新的子组件 VNode 时，渲染器需要判断"子组件是否真的需要触发一次子树更新"，这个判断就由本模块完成。

## shouldUpdateComponent(n1, n2)

对比新旧两个组件 VNode，返回 `true` 表示子组件需要触发更新（调用 `instance.update()`），`false` 则跳过。

判断依据（按优先级）：

1. **插槽（children）**：新旧 VNode 任一方有 `children`，直接返回 `true`（当前简化处理，有插槽就认为需要更新）
2. **旧 VNode 无 props**：如果旧的没有 props，看新的是否有——有则需要更新，没有则不需要
3. **新 VNode 无 props**：旧有新无，说明 props 被清空，需要更新
4. **双方都有 props**：调用 `hasPropsChanged` 做浅比较

```ts
if (prevChildren || nextChildren) return true;
if (!prevProps) return !!nextProps;
if (!nextProps) return true;
return hasPropsChanged(prevProps, nextProps);
```

## hasPropsChanged(prevProps, nextProps)

对两组 props 做浅比较：

- 先比键数量：数量不同直接返回 `true`
- 再逐个键做 `!==` 严格比较：任何一个不同返回 `true`
- 全部通过返回 `false`

这里只做一层浅比较（和 Vue3 源码行为一致），不递归对比嵌套对象。

## 调用关系

```
renderer.ts
  └── updateComponent(n1, n2)
        ├── shouldUpdateComponent(n1, n2) → true
        │     └── hasPropsChanged(prevProps, nextProps)
        │     → instance.next = n2; instance.update()
        └── shouldUpdateComponent(n1, n2) → false
              → 跳过更新，仅复用 el
```

## 相关文档

- [renderer.md](./renderer.md)：`updateComponent` 调用 `shouldUpdateComponent` 决定是否走更新
- [componentProps.md](./componentProps.md)：`updateProps` 负责真正把新 props 写入实例
- [component.md](./component.md)：组件实例结构
