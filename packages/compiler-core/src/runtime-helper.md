# runtime-helper.ts — 运行时 helper 符号

## 作用

编译阶段在 AST 上登记「生成代码时需要引入的运行时函数」时，使用 **Symbol** 作为内部标识，再通过 `helperMap` 映射到对外导出名（例如 `toDisplayString`），避免字符串魔法值散落。

## 当前导出

- `TO_DISPLAY_STRING`：`Symbol('toDisplayString')`，在变换遇到插值表达式时由 `ctx.helper` 登记。
- `CREATE_TEXT`：`Symbol('createText')`，在 `transformText` 把文本节点包装成 `TEXT_CALL` 时由 `ctx.helper` 登记。
- `CREATE_VNODE`：`Symbol('createElementVNode')`，在 `transformElement` 为元素生成 `VNODE_CALL` 时由 `ctx.helper` 登记。
- `helperMap`：从 Symbol 到字符串名的映射，供后续代码生成阶段拼接 import 或运行时解析。

## 相关文件

- [compile.md](./compile.md) — 在 `transform` 中如何调用 `helper`
- [transforms/transformElement.md](./transforms/transformElement.md) — `CREATE_VNODE`
- [transforms/transformText.md](./transforms/transformText.md) — `CREATE_TEXT`
