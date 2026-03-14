# component.ts 说明

## 概述

`component.ts` 提供组件实例的创建与初始化，供 `renderer.ts` 在挂载组件类型 VNode 时使用。当前支持：创建实例、解析 props / attrs、执行 `setup`、拿到 `render` 与 `setupState`；渲染器用它们生成子树并挂载，并在 `setupState` 变化时通过 effect 驱动子树更新（见 [renderer](./renderer.md) 的 `mountComponent`）。

## 目录

- [createComponentInstance(vnode)](#createcomponentinstancevnode)
- [setupComponent(instance)](#setupcomponentinstance)
- [createSetupContext(instance)](#createsetupcontextinstance)
- [emit(instance, event, ...args)](#emitinstance-event-args)
- [publicPropertiesMap](#publicpropertiesmap)
- [实例结构 (instance)](#实例结构-instance)
- [依赖](#依赖)

## createComponentInstance(vnode)

根据组件类型的 VNode 创建组件实例对象：

- 从 `vnode.type` 取得组件定义（含 `props`、`setup`、`render`）
- 使用 `normalizePropsOptions(type.props)` 标准化组件的 props 选项（数组/对象统一成对象），结果挂到 `instance.propsOptions`
- 在实例上绑定 `emit` 方法（`instance.emit = (event, ...args) => emit(instance, event, ...args)`），供 `$emit` 和 `setupContext.emit` 使用
- 返回的 instance 包含：`type`、`vnode`、`props`、`attrs`、`slots`、`emit`、`subTree`、`isMounted`、`render`、`setupState`，其中 `props` / `attrs` / `render` / `setupState` 在 `setupComponent` + `initProps` 中填充，`slots` 在 `initSlots` 中填充

渲染器在 `mountComponent` 中先调用 `createComponentInstance`，再调用 `setupComponent`。

## setupComponent(instance)

初始化组件状态，为后续渲染做准备：

1. 先调用 `initProps(instance)`：
   - 解析 `instance.vnode.props`，根据 `instance.propsOptions` 把属性分到 `instance.props` 与 `instance.attrs`
   - 对 `props` 使用 `reactive` 包装，供 `setup(props)` 与后续渲染使用
2. 调用 `initSlots(instance)`（见 [componentSlots.md](./componentSlots.md)）：
   - 将 VNode 上的插槽 children 赋值到 `instance.slots`
3. 创建 `setupContext`，暴露 `attrs`、`emit`、`slots`：
   - `attrs` 是一个 getter，每次读取都会返回当前的 `instance.attrs`
   - `emit` 委托给模块级的 `emit` 函数，用于触发组件事件
   - `slots` 直接引用 `instance.slots`
4. 创建组件代理 `instance.proxy`（`Proxy(instance.ctx, handlers)`），渲染时会作为 `render` 的 this：
   - 读取属性时先查 `setupState`，再查 `props`，最后支持 `$el/$attrs/$slots/$refs` 等公共属性
   - 命名冲突时：`setupState` 的同名字段会覆盖 `props` 的同名字段（因为访问顺序是 setupState → props）
   - `$el/$attrs/$slots/$refs/$nextTick/$forceUpdate` 的取值来自 `publicPropertiesMap`（本文件内的映射表）
5. 若组件定义了 `setup` 且为函数，则调用：
   - `const setupResult = type.setup(instance.props, setupContext)`
   - 当 `setupResult` 为对象：`instance.setupState = proxyRefs(setupResult)`，render 中访问 ref 时无需 `.value`
   - 当 `setupResult` 为函数：认为它就是渲染函数，直接赋给 `instance.render`
6. 若 `setup` 没有提供渲染函数，则兜底使用组件定义上的 `type.render`

依赖 `@vue/reactivity` 的 `proxyRefs`，用于在暴露给 render 的上下文中自动解包 ref。

## publicPropertiesMap

组件代理 `instance.proxy` 在 get 中查找的公共属性映射表，目前包含：

| 属性 | 取值方式 | 说明 |
|------|----------|------|
| `$el` | `instance.vnode.el` | 组件根元素对应的真实 DOM 节点；渲染器在 `componentUpdateFn` 中把子树根节点的 el 赋给组件 VNode |
| `$attrs` | `instance.attrs` | 未在 props 选项中声明的透传属性 |
| `$emit` | `instance.emit` | 触发组件事件，将事件名转为 `onXxx` 形式后从 `vnode.props` 中查找处理函数 |
| `$slots` | `instance.slots` | 插槽对象，由 `initSlots` / `updateSlots` 维护 |
| `$refs` | `instance.refs` | 模板引用（当前未实现具体逻辑） |
| `$nextTick` | `nextTick.bind(instance)` | 在下一个微任务中执行回调，this 绑定为组件实例 |
| `$forceUpdate` | `() => instance.update()` | 强制触发组件更新（调用渲染器在 mount 时挂到实例上的 update 函数） |

## createSetupContext(instance)

为 `setup` 的第二个参数创建上下文对象，包含三个成员：

- `attrs`：getter，每次读取返回最新的 `instance.attrs`
- `emit(event, ...args)`：触发组件事件，委托给模块级的 `emit` 函数
- `slots`：直接引用 `instance.slots`

使用示例：

```ts
setup(props, { attrs, emit, slots }) {
  emit('foo', 1, 2);           // 触发父组件的 onFoo 处理函数
  const header = slots.header(); // 调用具名插槽
}
```

## emit(instance, event, ...args)

模块级的事件触发函数。将事件名做首字母大写并加 `on` 前缀（如 `foo` → `onFoo`），然后从 `instance.vnode.props` 中查找对应的处理函数，找到则执行。

事件名转换规则：`event[0].toUpperCase() + event.slice(1)`，再拼上 `on` 前缀。

## 实例结构 (instance)

| 字段 | 说明 |
|------|------|
| `type` | 组件定义（即 vnode.type） |
| `vnode` | 当前组件对应的 VNode |
| `props` / `attrs` | 组件接收的属性：`props` 为按 `props` 选项声明的响应式对象，`attrs` 为未声明但传入的"额外属性"（通常透传到根元素） |
| `slots` | 插槽对象，由 `initSlots` 在挂载时填充，`updateSlots` 在更新时同步；`setup(props, { slots })` 和 `this.$slots` 读取的都是同一个引用 |
| `emit` | 事件触发方法，绑定了当前实例；`setup(props, { emit })` 和 `this.$emit` 使用的都是它 |
| `subTree` | 当前 render 的返回值（子树 VNode）；渲染器挂载时写入，更新时作为 prevSubTree 与新一轮 render 结果做 patch |
| `isMounted` | 是否已完成首次挂载；渲染器在 componentUpdateFn 中用于区分首渲（patch(null, subTree)）与更新（patch(prevSubTree, subTree)） |
| `render` | 组件的 render 函数，由 setupComponent 从 type 上赋值 |
| `setupState` | setup 返回值为对象时的 proxyRefs 代理；渲染时会优先从这里取同名属性 |
| `proxy` | 公共实例代理：render 的 this（`instance.proxy`），负责把 `setupState/props/$el/$attrs...` 暴露到同一访问入口 |
| `update` | 渲染器在 `setupRenderEffect` 中挂载的更新函数（`effect.run.bind(effect)`），`$forceUpdate` 和 `updateComponent` 都通过它触发子树更新 |
| `next` | 父组件触发更新时，渲染器在 `updateComponent` 中暂存的新 VNode；`componentUpdateFn` 执行时检测到 `next` 存在，会先调 `updateComponentPreRender` 同步 props |

补充说明：

- 通过 `instance.proxy` 写入属性时，目前只处理写入 `setupState` 的同名字段（仅最小实现）。

## 依赖

- `./vnode`：使用 `VNode` 类型
- `./componentProps`：`normalizePropsOptions`、`initProps`，用于解析组件 props / attrs
- `./componentSlots`：`initSlots`，用于初始化组件插槽
- `./scheduler`：`nextTick`，供 `$nextTick` 使用
- `@vue/reactivity`：`proxyRefs`，用于解包 ref 供 render 使用

## 相关文档

- [renderer.md](./renderer.md)：`mountComponent` 会调用 `createComponentInstance` 与 `setupComponent`，再用 `ReactiveEffect` 包装的 `componentUpdateFn` 做首渲与后续更新（render → patch 子树）。
- [componentRenderUtils.md](./componentRenderUtils.md)：`shouldUpdateComponent` 判断是否需要触发组件更新。
- [componentSlots.md](./componentSlots.md)：`initSlots` / `updateSlots` 负责插槽的初始化与更新。
- [vnode.md](./vnode.md)：组件类型 VNode 的 `type` 为对象，`shapeFlag` 含 `STATEFUL_COMPONENT`；`normalizeChildren` 负责识别插槽 children 并标记 `SLOTS_CHILDREN`。
