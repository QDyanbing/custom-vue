# transform.ts — AST 变换与根 `codegenNode`

## 作用

`transform(root)` 对解析得到的 AST 做深度优先遍历：依次执行 `nodeTransforms` 中的 `transformElement`、`transformText`、`transformExpression`，在子树处理完后执行各插件返回的 exit 回调；遍历结束后调用 `createRootCodegenNode`，把根节点的 `codegenNode` 定下来，并把 `ctx.helpers` 的键赋给 `root.helpers`，供 `codegen` 使用。

## 数据流（当前实现）

1. **`createTransformContext`**：持有 `root`、`currentNode`、`nodeTransforms`、`helpers` Map，以及 `helper` / `removeHelper`。
2. **`traverseNode`**：对每个 transform 执行入口，收集 exit；对 `ROOT` / `ELEMENT` 继续 `traverseChildren`；对 `INTERPOLATION` 登记 `TO_DISPLAY_STRING`；子树处理完后逆序执行 exit。
3. **`traverseChildren`**：为子节点设置 `parentNode` 再递归。
4. **`createRootCodegenNode`**：
   - **单个子节点且为元素**：取该元素的 `codegenNode`，经 `coverToBlock` 标成 block 根，赋给 `root.codegenNode`。
   - **单个子节点非元素**：`root.codegenNode` 直接指向该子节点（例如纯文本）。
   - **多个子节点**：构造 `createVNodeCall(FRAGMENT, ...)` 形式的 `VNODE_CALL`，再 `coverToBlock`，赋给 `root.codegenNode`。

## 相关文件

- [compile.md](./compile.md) — 与 `parse`、`generate` 的衔接
- [transforms/transformElement.md](./transforms/transformElement.md)
- [transforms/transformText.md](./transforms/transformText.md)
- [transforms/transformExpression.md](./transforms/transformExpression.md)
- [ast.md](./ast.md) — `coverToBlock`、`createVNodeCall`
