# transformExpression.ts — 插值表达式变换

## 作用

当节点为 `INTERPOLATION` 时，将其内层 `SIMPLE_EXPRESSION` 的 `content` 前缀为 `_ctx.`，与 `compile` 遍历中登记的 `TO_DISPLAY_STRING` 一起，为运行时从组件实例上下文取值做准备。

## 相关文件

- [compile.md](../compile.md) — `traverseNode` 与 `INTERPOLATION` 分支
- [runtime-helper.md](../runtime-helper.md) — `TO_DISPLAY_STRING`
