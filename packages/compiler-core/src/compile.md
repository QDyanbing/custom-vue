# compile.ts — 编译入口（解析 + 变换）

## 作用

`compile(template)` 在 `parse` 得到 AST 之后，进入 `transform`：用 `traverseNode` 深度优先遍历树，对 `ROOT`、`ELEMENT` 继续下钻子节点；对 `INTERPOLATION` 在变换阶段登记运行时 helper，并将简单表达式改写为带 `_ctx.` 前缀的形式。当前返回的是变换后的 AST，方便直接在 demo 里调试结构变化。

## 数据流（当前实现）

1. **`createTransformContext(root)`**：持有 `root`、`currentNode`、`nodeTransforms` 数组、`helpers` 集合，以及 `helper(name)` 用于登记 Symbol。
2. **`traverseNode`**：依次执行各 `nodeTransforms`，收集 exit 回调并在子树处理完后逆序执行；`ROOT` / `ELEMENT` 会 `traverseChildren`；`INTERPOLATION` 会调用 `ctx.helper(TO_DISPLAY_STRING)`。
3. **`transformExpression`**：处理 `INTERPOLATION` 时，把其中 `SIMPLE_EXPRESSION.content` 改写为 `` `_ctx.${...}` ``，为后续运行时取值做准备。
4. **`transformText`**：只在 `ELEMENT` 节点上工作，并放在 exit 阶段扫描 `node.children`。当遇到连续的 `TEXT` / `INTERPOLATION` 时，会把它们折叠成一个 `COMPOUND_EXPRESSION`，其 `children` 形如 `[textNode, '+', interpolationNode, '+', textNode]`。如果前一个节点已经是 `COMPOUND_EXPRESSION`，则继续向其 `children` 追加。
5. **`compile` 返回值**：`transform(ast)` 执行完后直接 `return ast`，便于在浏览器 demo 中观察文本合并、插值改写和 helper 收集后的树结构。

## 相关文件

- [parser.md](./parser.md) — `parse` 产出 AST
- [runtime-helper.md](./runtime-helper.md) — `TO_DISPLAY_STRING` 与 `helperMap`
- [ast.md](./ast.md) — `NodeTypes`
