# 25-demo.html 说明

## 演示目标

验证 Block Tree 机制：`openBlock()` + `createElementBlock()` 配合 `createVNode` 的 `patchFlag`，实现只更新动态子节点（`dynamicChildren`），跳过静态子节点的 diff。

同时演示嵌套 Block 场景：内层静态 `<p>` 包含一个带 `patchFlag` 的动态子节点，验证 `blockStack` 在嵌套时的正确收集与恢复。

## 示例结构

根组件在 `setup` 里创建 `ref(0)`，`setTimeout` 1 秒后 `count++` 触发更新。渲染函数中：

1. `openBlock()` 开启 Block 收集
2. `createElementBlock('div', ...)` 作为 Block 根节点，其内部包含：
   - 一个静态 `<p>`（不带 `patchFlag`），其子节点是另一个带 `patchFlag = 1`（`PatchFlags.TEXT`）的动态 `<p>`，文本为 `count.value`
   - 两个纯静态 `<p>`（文本为 222、333）
3. `createElementBlock` 调用 `setupBlock` 后，Block 根 VNode 的 `dynamicChildren` 仅包含带 `patchFlag` 的那个动态 `<p>`

更新时 `patchElement` 检测到 `dynamicChildren` 存在，只 patch 动态节点，静态的 222、333 不参与对比。

## 与 24-demo 的区别

`24-demo.html` 聚焦单个元素节点 + `PatchFlags.TEXT` 的定向文本更新，没有涉及 Block Tree。本页在此基础上引入了 `openBlock` / `createElementBlock` 的 Block 收集机制，验证 `dynamicChildren` 的收集与 `patchBlockChildren` 的按需更新。

## 延伸阅读

- Block Tree 收集机制：[vnode.md](../../runtime-core/src/vnode.md) 中「Block Tree 与 dynamicChildren」
- `patchBlockChildren` 行为：[renderer.md](../../runtime-core/src/renderer.md) 中「Block Tree 与 patchBlockChildren」
- `PatchFlags` 说明：[@vue/shared patchFlags.md](../../shared/src/patchFlags.md)
