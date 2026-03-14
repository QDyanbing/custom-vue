# componentSlots.ts 说明

## 概述

`componentSlots.ts` 负责组件插槽的初始化与更新。插槽在 Vue 中是父组件向子组件传递"渲染片段"的机制，父组件通过 `h(Child, null, { header: () => h(...) })` 或 `h(Child, null, () => h(...))` 的形式传入，子组件在 `setup(props, { slots })` 中通过 `slots.header()` 调用来渲染。

## 目录

- [initSlots(instance)](#initslotsinstance)
- [updateSlots(instance, vnode)](#updateslotsinstance-vnode)
- [与其他模块的关系](#与其他模块的关系)

## 插槽的数据流

1. 父组件调用 `h(Child, props, children)` 时，`children` 可能是对象（具名插槽）或函数（默认插槽）
2. `createVNode` 内部的 `normalizeChildren` 识别这两种情况，为 VNode 标记 `SLOTS_CHILDREN`；若 children 是函数，会被包装为 `{ default: children }`
3. 组件挂载时 `setupComponent` → `initSlots`：将 VNode 的 children 赋值到 `instance.slots`
4. 组件更新时 `updateComponentPreRender` → `updateSlots`：用新 VNode 的 children 覆盖旧插槽，并清理已移除的插槽

## initSlots(instance)

在 `setupComponent`（见 [component.md](./component.md)）中调用，将 VNode 上的 children（插槽对象）逐一赋值到 `instance.slots` 上：

- 仅当 `vnode.shapeFlag & SLOTS_CHILDREN` 为真时执行
- 遍历 `vnode.children`，将每个 `key: renderFn` 写入 `instance.slots`

初始化完成后，`setup(props, { slots })` 中的 `slots` 就是 `instance.slots`，子组件可以通过 `slots.default()` 或 `slots.header()` 来调用插槽函数获取 VNode。

## updateSlots(instance, vnode)

在 `updateComponentPreRender`（见 [renderer.md](./renderer.md)）中调用，当父组件重新渲染导致子组件更新时，同步最新的插槽：

1. 用新 VNode 的 children 覆盖 `instance.slots` 上的同名插槽
2. 遍历旧的 `slots`，删除新 VNode 中已不存在的插槽 key

因为 `instance.slots` 对象引用不变（只做原地更新），所以 `setup` 中拿到的 `slots` 始终指向最新数据。

## 与其他模块的关系

- [vnode.ts](./vnode.md)：`normalizeChildren` 负责识别 children 是否为插槽（对象/函数），并标记 `SLOTS_CHILDREN` shapeFlag
- [component.ts](./component.md)：`setupComponent` 调用 `initSlots`；`createSetupContext` 把 `instance.slots` 暴露给 `setup`
- [renderer.ts](./renderer.md)：`updateComponentPreRender` 调用 `updateSlots`，在组件重新 render 前同步插槽
- [componentProps.ts](./componentProps.md)：与 `componentSlots.ts` 结构类似——`initProps` / `updateProps` 处理属性，`initSlots` / `updateSlots` 处理插槽
