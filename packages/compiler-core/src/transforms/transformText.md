# transformText.ts — 文本合并与 TEXT_CALL

## 作用

仅在 `ELEMENT` 的 exit 阶段处理 `node.children`：将相邻的 `TEXT` / `INTERPOLATION` 合并为 `COMPOUND_EXPRESSION`（子节点间插入 `'+'` 占位）；当存在可合并文本且子节点多于一个时，把需生成 `createText` 的项包装为 `TEXT_CALL`，`codegenNode` 为 `createCallExpression(ctx.helper(CREATE_TEXT), args)`，非纯 `TEXT` 时在参数中附加 `PatchFlags.TEXT`。

## 相关文件

- [ast.md](../ast.md) — `TEXT_CALL`、`COMPOUND_EXPRESSION`、`JS_CALL_EXPRESSION`
- [compile.md](../compile.md) — 整体变换顺序
- [runtime-helper.md](../runtime-helper.md) — `CREATE_TEXT`
- [../../shared/src/patchFlags.md](../../shared/src/patchFlags.md) — `PatchFlags.TEXT`
