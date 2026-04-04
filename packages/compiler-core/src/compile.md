# compile.ts — 编译入口（解析 + 变换）

## 作用

`compile(template)` 在 `parse` 得到 AST 之后，进入 `transform`：用 `traverseNode` 深度优先遍历树，对 `ROOT`、`ELEMENT` 继续下钻子节点；对 `INTERPOLATION` 在变换阶段登记运行时 helper，并将简单表达式改写为带 `_ctx.` 前缀的形式。当前返回的是变换后的 AST，方便直接在 demo 里调试结构变化。

## 数据流（当前实现）

1. **`createTransformContext(root)`**：持有 `root`、`currentNode`、`nodeTransforms` 数组、`helpers` 集合，以及 `helper(name)` 用于登记 Symbol。
2. **`traverseNode`**：依次执行各 `nodeTransforms`，收集 exit 回调并在子树处理完后逆序执行；`ROOT` / `ELEMENT` 会 `traverseChildren`；`INTERPOLATION` 会调用 `ctx.helper(TO_DISPLAY_STRING)`。
3. **`nodeTransforms` 顺序**：`transformElement` → `transformText` → `transformExpression`。元素与文本相关逻辑主要在 **exit** 阶段生效（子树先处理完），插值改写发生在进入子树之后、`INTERPOLATION` 节点上。
4. **`transformElement`**：对 `ELEMENT` 在 exit 阶段写入 `codegenNode` 为 `VNODE_CALL`（`createVNodeCall`），`props` 为 `JS_OBJECT_EXPRESSION`，并 `ctx.helper(CREATE_VNODE)`。
5. **`transformExpression`**：处理 `INTERPOLATION` 时，把其中 `SIMPLE_EXPRESSION.content` 改写为 `` `_ctx.${...}` ``，为后续运行时取值做准备。
6. **`transformText`**：只在 `ELEMENT` 节点上工作，并放在 exit 阶段扫描 `node.children`。当遇到连续的 `TEXT` / `INTERPOLATION` 时，会把它们折叠成一个 `COMPOUND_EXPRESSION`，其 `children` 形如 `[textNode, '+', interpolationNode, '+', textNode]`。如果前一个节点已经是 `COMPOUND_EXPRESSION`，则继续向其 `children` 追加。
7. **文本包装成 `TEXT_CALL`**：如果元素子节点里出现了可合并文本，并且当前 `children` 不止一个节点，`transformText` 会把 `TEXT` 或 `COMPOUND_EXPRESSION` 包装成 `TEXT_CALL`，其 `codegenNode` 为 `createCallExpression(ctx.helper(CREATE_TEXT), args)`，用于表达「这里后面要生成 `createText(...)` 调用」。
8. **动态文本标记**：当被包装的节点不是纯 `TEXT`，而是插值或复合表达式时，会额外给 `createText` 参数补上 `PatchFlags.TEXT`，告诉后续运行时这是一个需要更新的动态文本节点。
9. **回写时机**：`node.children = _children` 放在整轮扫描和包装结束之后，避免遍历过程中一边读旧节点、一边写新节点。
10. **`compile` 返回值**：`transform(ast)` 执行完后直接 `return ast`，便于在浏览器 demo 中观察文本合并、插值改写、`TEXT_CALL` / `VNODE_CALL` 包装和 helper 收集后的树结构。

## 相关文件

- [parser.md](./parser.md) — `parse` 产出 AST
- [runtime-helper.md](./runtime-helper.md) — `TO_DISPLAY_STRING`、`CREATE_VNODE`、`CREATE_TEXT` 与 `helperMap`
- [ast.md](./ast.md) — `NodeTypes` 与工厂函数
- [transforms/transformElement.md](./transforms/transformElement.md) — 元素 `codegenNode`
- [transforms/transformText.md](./transforms/transformText.md) — 文本合并与 `TEXT_CALL`
- [transforms/transformExpression.md](./transforms/transformExpression.md) — 插值 `_ctx.` 前缀
- [../../shared/src/patchFlags.md](../../shared/src/patchFlags.md) — `PatchFlags.TEXT`
