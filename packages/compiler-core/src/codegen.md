# codegen.ts — 生成 `render` 函数字符串

## 作用

`generate(ast)` 在 `transform` 之后执行：根据根节点收集的 `helpers`（`ast.helpers` 为迭代器）与根上 `codegenNode`，输出一段字符串，形如从 `Vue` 解构 helper、`return function render(_ctx, _cache, $props, $setup, $data, $options) { return ... }`。

当前只处理 `TEXT` 与 `VNODE_CALL`；`VNODE_CALL` 会按 `callee`、`tag`、`props`、`children` 生成调用，若 `isBlock` 为真则外层包一层 `(openBlock(), createElementVNode(...))` 形式的表达式。

## 数据流（当前实现）

1. **`createCodegenContext(ast)`**：维护 `code` 缓冲、`indentLevel`，以及 `helper(name)`（通过 `helperMap` 得到 `_openBlock` 这类前缀）、`push` / `newline` / `indent` / `deindent`。
2. **`genFunction`**：把 `ast.helpers` 展开为 `const { createElementVNode: _createElementVNode, ... } = Vue;`，再写入 `render` 函数头。
3. **`genFunctionBody`**：在函数体内 `return` 后接 `genNode(ast.codegenNode)`。
4. **`genNode`**：`TEXT` 走 `genText`（`JSON.stringify` 内容）；`VNODE_CALL` 走 `genVNodeCall`。
5. **`genVNodeCall`**：可选 `openBlock()`；再按 `callee` 与参数列表 `genNodeList` 拼接；子节点可为嵌套数组（由 `children` 传入）。
6. **返回值**：`generate` 返回拼好的字符串（实现里仍会 `console.log` 便于调试）。

## 相关文件

- [compile.md](./compile.md) — `compile` 调用 `generate` 的顺序
- [transform.md](./transform.md) — 根 `codegenNode` 与 `helpers` 的来源
- [runtime-helper.md](./runtime-helper.md) — `helperMap` 与 Symbol 名
- [ast.md](./ast.md) — `VNODE_CALL`、`NodeTypes`
