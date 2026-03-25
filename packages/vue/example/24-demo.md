# 24-demo.html 说明

## 演示目标

验证 `createVNode` 第四参 `patchFlag` 与 `patchElement` 中 `PatchFlags.TEXT` 的配合：

- 使用 `createVNode('div', { class: 'container', style: { color: 'red' } }, count.value, 1)` 创建元素 VNode（第四参 `1` 即 `PatchFlags.TEXT`）。
- 子节点为数字/字符串等标量时，经 `normalizeChildren` 会带上 `TEXT_CHILDREN`；`TEXT` 补丁标志告诉渲染器：更新时只需比较元素子文本，不必走完整 `patchChildren`。
- 约 1s 后 `count` 自增，组件重新渲染，`patchElement` 在 `patchFlag & TEXT` 且 `n1.children !== n2.children` 时调用 `hostSetElementText`，然后 return。

## 示例结构

根组件在 `setup` 里 `ref(0)`，`setTimeout` 1s 后 `count++`。渲染函数返回上述 `createVNode`，并在控制台打印 vnode 便于观察 `patchFlag`、`shapeFlag` 等字段。

## 与 23-demo 的区别

`23-demo.html` 聚焦 `Fragment` 根与子列表 diff；本页聚焦**元素节点 + `PatchFlags.TEXT` 的定向文本更新**，并保留静态 `class` / `style` 以观察 vnode 结构。

## 延伸阅读

- `PatchFlags` 说明：[@vue/shared patchFlags.md](../../shared/src/patchFlags.md)
- `patchElement` 行为：[renderer.md](../../runtime-core/src/renderer.md) 中「patchElement、patchFlag 与 children 处理」
