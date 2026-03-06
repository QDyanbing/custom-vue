# runtime-dom 入口说明

## 概述

`index.ts` 是 DOM 运行时的入口文件，负责把平台无关的渲染逻辑（`@vue/runtime-core`）和浏览器 DOM 平台绑定在一起。

## 目录

- [renderOptions](#renderoptions)
- [renderer 与 render](#renderer-与-render)
- [运行时导出](#运行时导出)

核心思路：

- 使用 `nodeOps` 提供一组宿主 DOM 操作（创建元素、插入、删除等）
- 使用 `patchProp` 统一处理元素的属性更新（class / style / 事件 / attribute）
- 通过 `createRenderer(renderOptions)` 创建平台相关的渲染器

## renderOptions

```ts
const renderOptions = { patchProp, ...nodeOps };
```

- **`nodeOps`**：封装了一套最小 DOM 操作集合，例如：`createElement`、`insert`、`remove` 等
- **`patchProp`**：负责更新单个属性，根据 key 分派到 `patchClass`、`patchStyle`、`patchEvent`、`patchAttr`

`renderOptions` 会传给 `createRenderer`，由运行时在内部调用这些方法完成挂载和更新。

## renderer 与 render

```ts
const renderer = createRenderer(renderOptions);

export function render(vNode: any, container: Element) {
  renderer.render(vNode, container);
}
```

- `renderer` 是一个绑定了 DOM 平台实现的通用渲染器
- 对外只暴露一个简单的 `render(vnode, container)`，用于把 VNode 渲染到某个容器元素中

在其他模块中调用时，只需要关心虚拟节点和容器本身，不需要关心内部如何操作 DOM。

## 运行时导出

```ts
export * from '@vue/runtime-core';
export { renderOptions };
```

- 透传 `runtime-core` 的导出：例如 `createApp`、`h` 等
- 额外导出 `renderOptions`，方便调试或在某些场景下自定义 / 复用配置

总结来说：`index.ts` 把“平台无关的核心逻辑”和“DOM 平台细节”粘合在一起，对外暴露一个可以直接把 VNode 渲染到浏览器 DOM 上的入口。

