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

> 说明：当前实现是最小版本，函数体只做了 `console.log`，目的是先跑通调用链；后续可在这里补 `patch`、挂载、更新、卸载流程。

