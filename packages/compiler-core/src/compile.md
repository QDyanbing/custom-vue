# compile.ts — 编译入口（解析 + 变换）

## 作用

`compile(template)` 在 `parse` 得到 AST 之后，进入 `transform`：用 `traverseNode` 深度优先遍历树，对 `ROOT`、`ELEMENT` 继续下钻子节点；对 `INTERPOLATION` 在变换阶段登记运行时 helper，并将简单表达式改写为带 `_ctx.` 前缀的形式（当前尚未输出可执行的渲染函数代码）。

## 数据流（当前实现）

1. **`createTransformContext(root)`**：持有 `root`、`currentNode`、`nodeTransforms` 数组、`helpers` 集合，以及 `helper(name)` 用于登记 Symbol。
2. **`traverseNode`**：依次执行各 `nodeTransforms`，收集 exit 回调并在子树处理完后逆序执行；`ROOT` / `ELEMENT` 会 `traverseChildren`；`INTERPOLATION` 会调用 `ctx.helper(TO_DISPLAY_STRING)`。
3. **`transformElement` / `transformText` / `transformExpression`**：按节点类型打日志占位；`transformExpression` 在 `INTERPOLATION` 上将 `content.content` 设为 `` `_ctx.${...}` ``。

## 相关文件

- [parser.md](./parser.md) — `parse` 产出 AST
- [runtime-helper.md](./runtime-helper.md) — `TO_DISPLAY_STRING` 与 `helperMap`
- [ast.md](./ast.md) — `NodeTypes`
