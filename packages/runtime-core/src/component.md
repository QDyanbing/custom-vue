# component.ts 说明

## 概述

`component.ts` 提供组件实例的创建与初始化，供 `renderer.ts` 在挂载组件类型 VNode 时使用。当前支持：创建实例、执行 `setup`、拿到 `render` 与 `setupState`；渲染器用它们生成子树并挂载，并在 `setupState` 变化时通过 effect 驱动子树更新（见 [renderer](./renderer.md) 的 mountComponent）。

## 目录

- [createComponentInstance(vnode)](#createcomponentinstancevnode)
- [setupComponent(instance)](#setupcomponentinstance)
- [实例结构 (instance)](#实例结构-instance)
- [依赖](#依赖)

## createComponentInstance(vnode)

根据组件类型的 VNode 创建组件实例对象：

- 从 `vnode.type` 取得组件定义（含 `setup`、`render`）
- 返回的 instance 包含：`type`、`vnode`、`props`、`attrs`、`subTree`、`isMounted`、`render`、`setupState`，其中 `render` / `setupState` 在 `setupComponent` 中填充

渲染器在 `mountComponent` 中先调用 `createComponentInstance`，再调用 `setupComponent`。

## setupComponent(instance)

初始化组件状态，为后续渲染做准备：

1. 调用 `instance.type.setup?.()` 得到 `setupResult`
2. 使用 `proxyRefs(setupResult)` 得到代理对象，赋给 `instance.setupState`（模板或 render 中访问 ref 时无需 `.value`）
3. 将 `instance.type.render` 赋给 `instance.render`，供渲染器在挂载时调用

依赖 `@vue/reactivity` 的 `proxyRefs`，用于在暴露给 render 的上下文中自动解包 ref。

## 实例结构 (instance)

| 字段 | 说明 |
|------|------|
| `type` | 组件定义（即 vnode.type） |
| `vnode` | 当前组件对应的 VNode |
| `props` / `attrs` | 预留，用于区分 props 与普通 attribute |
| `subTree` | 当前 render 的返回值（子树 VNode）；渲染器挂载时写入，更新时作为 prevSubTree 与新一轮 render 结果做 patch |
| `isMounted` | 是否已完成首次挂载；渲染器在 componentUpdateFn 中用于区分首渲（patch(null, subTree)）与更新（patch(prevSubTree, subTree)） |
| `render` | 组件的 render 函数，由 setupComponent 从 type 上赋值 |
| `setupState` | setup 返回值的 proxyRefs 代理，作为 render 的 this 上下文 |

## 依赖

- `./vnode`：使用 `VNode` 类型
- `@vue/reactivity`：`proxyRefs`，用于解包 ref 供 render 使用

## 相关文档

- [renderer.md](./renderer.md)：`mountComponent` 会调用 `createComponentInstance` 与 `setupComponent`，再用 `ReactiveEffect` 包装的 `componentUpdateFn` 做首渲与后续更新（render → patch 子树）。
- [vnode.md](./vnode.md)：组件类型 VNode 的 `type` 为对象，`shapeFlag` 含 `STATEFUL_COMPONENT`。
