# Renderer 说明

## 概述

`renderer.ts` 提供 `createRenderer`，用于创建“平台无关”的渲染入口。

在 DOM 场景里，`@vue/runtime-dom` 会准备宿主操作（创建元素、插入、设置属性等），再把这些能力通过 `options` 传给 `createRenderer`。

## createRenderer(options)

`createRenderer` 接收一个 `options` 对象（宿主操作集合），并返回一个包含 `render` 方法的对象：

```typescript
const renderer = createRenderer(options);
renderer.render(vnode, container);
```

## render(vNode, container)

`render` 的职责是把 VNode 渲染到 `container`。

> **当前实现**：`createRenderer` 返回的 `render` 在 runtime-core 内仅为占位（内部仅 `console.log`），用于先跑通调用链。实际 DOM 的创建、挂载、更新、卸载由 `@vue/runtime-dom` 传入的 `options`（如 `nodeOps`、`patchProp`）在后续 patch 流程中实现。

