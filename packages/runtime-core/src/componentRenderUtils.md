# componentRenderUtils.ts 说明

## 概述

`componentRenderUtils.ts` 提供两类与组件渲染相关的工具：

- 组件是否需要更新的判断：`shouldUpdateComponent`
- 安全执行组件 render 并记录“当前正在渲染的实例”：`renderComponentRoot`（配合 `getCurrentRenderingInstance` / `normalizeRef` / `setRef` 使用）

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

## renderComponentRoot(instance)

`renderComponentRoot` 负责执行组件渲染函数，并区分两类组件：

- 有状态组件：执行 `instance.render.call(instance.proxy)`，并在执行前后维护“当前正在渲染的实例”
- 函数组件：执行 `vnode.type(vnode.props, ctx)`，其中 `ctx` 只暴露 `attrs / slots / emit`

```ts
export function renderComponentRoot(instance) {
  const { vnode } = instance;
  if (vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
    setCurrentRenderingInstance(instance);
    const subTree = instance.render.call(instance.proxy);
    unsetCurrentRenderingInstance();
    return subTree;
  } else {
    return vnode.type(vnode.props, {
      get attrs() {
        return instance.attrs;
      },
      slots: instance.slots,
      emit: instance.emit,
    });
  }
}
```

调用特点：

- 在 `renderer.ts` 的 `setupRenderEffect` 中，首渲和更新都会通过 `renderComponentRoot(instance)` 拿到子树 VNode。
- 有状态组件分支会在调用前设置当前渲染实例，调用后清理；函数组件分支不会设置该状态。
- 函数组件通过第二个参数拿到运行时上下文：
  - `attrs`：通过 getter 暴露 `instance.attrs`，读取时拿到最新值
  - `slots`：读取 `instance.slots`
  - `emit`：复用 `instance.emit`

这与模板 ref 的实现有关：

- `vnode.ts` 中的 `normalizeRef` 会通过 `getCurrentRenderingInstance()` 取得当前实例，构造 `{ r: rawRef, i: instance }`。
- `renderTemplateRef.ts` 中的 `setRef` 再根据这个实例和 VNode，把 DOM 或组件 public 实例写入对应的 ref。

因此，只有在有状态组件的 render 执行期间，`normalizeRef` 才能拿到正确的“当前组件实例”，完成 `ref` → `instance` 的关联。函数组件本身没有公开实例可供模板 ref 记录。

## 调用关系

```
renderer.ts
  └── updateComponent(n1, n2)
        ├── shouldUpdateComponent(n1, n2) → true
        │     └── hasPropsChanged(prevProps, nextProps)
        │     → instance.next = n2; instance.update()
        └── shouldUpdateComponent(n1, n2) → false
              → 跳过更新，仅复用 el

renderer.ts
  └── setupRenderEffect(instance)
        └── componentUpdateFn()
              ├── 首次/更新调用 renderComponentRoot(instance)
              └── 得到 subTree 后交给 patch 做子树挂载/更新
```

## 相关文档

- [renderer.md](./renderer.md)：`updateComponent` 调用 `shouldUpdateComponent` 决定是否走更新，`setupRenderEffect` 调用 `renderComponentRoot` 执行组件渲染
- [componentProps.md](./componentProps.md)：`updateProps` 负责真正把新 props 写入实例
- [component.md](./component.md)：组件实例结构与 `setCurrentRenderingInstance` / `getCurrentRenderingInstance`
- [vnode.md](./vnode.md)：`ref` 字段与 `normalizeRef` 的说明
- [renderTemplateRef.md](./renderTemplateRef.md)：`setRef` 根据 `{ r, i }` 与 VNode 写入/清理模板 ref
