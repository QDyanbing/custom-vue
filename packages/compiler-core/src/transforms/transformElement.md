# transformElement.ts — 元素节点变换

## 作用

在 `ELEMENT` 节点的 **exit** 阶段（子树已处理完）执行：根据 `tag`、`props`、`children` 构造 `codegenNode`，类型为 `VNODE_CALL`。`callee` 通过 `ctx.helper(CREATE_VNODE)` 登记运行时 helper；`props` 经 `buildProps` 转为 `JS_OBJECT_EXPRESSION`（由 `JS_PROPERTY` 组成），无属性时 `buildProps` 返回 `undefined`。

## `buildProps`

- 属性名会去掉前导 `:`（`v-bind` 简写）。
- 静态属性：`name` 不以 `:` 开头时，`value` 对应 `isStatic: true` 的简单表达式；动态绑定（`:` 开头）为 `isStatic: false`。

## 相关文件

- [ast.md](../ast.md) — `VNODE_CALL`、`createVNodeCall`、`JS_OBJECT_EXPRESSION`
- [runtime-helper.md](../runtime-helper.md) — `CREATE_VNODE`
- [compile.md](../compile.md) — `nodeTransforms` 顺序
