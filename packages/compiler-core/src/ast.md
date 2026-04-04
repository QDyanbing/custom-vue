# ast.ts — 节点类型

## 作用

定义模板 AST 使用的 `NodeTypes` 枚举，与 Vue 3 `@vue/compiler-core` 中的节点分类一致，便于后续在解析器、转换器、代码生成阶段共用同一套类型名。

## 当前代码实际用到的类型

- `ROOT`：整段模板的根
- `TEXT`：纯文本片段（由 `Tokenizer` 在 `Text` 状态结束时通过 `onText` 产出）
- `ELEMENT`：元素节点（`onOpenTagName` / `onOpenTagEnd` 创建；子节点由栈嵌套；双引号属性写入 `props`）
- `INTERPOLATION`：插值节点（`onInterpolation` 创建；子表达式为 `SIMPLE_EXPRESSION`）
- `SIMPLE_EXPRESSION`：插值内部的简单表达式字符串（首尾空白在 parser 中已裁切）
- `COMPOUND_EXPRESSION`：多个相邻文本 / 插值被合并后的复合表达式，内部 `children` 会保留 `'+'` 分隔符。
- `TEXT_CALL`：文本节点包装结果，表示这里后面会生成一次 `createText(...)` 调用。
- `VNODE_CALL`：元素节点在变换 exit 阶段挂到 `codegenNode` 上，表示后续生成 `createElementVNode(...)` 一类调用。
- `JS_CALL_EXPRESSION`：通用函数调用表达式节点，由 `createCallExpression` 创建，用于 `TEXT_CALL.codegenNode` 等。
- `JS_OBJECT_EXPRESSION` / `JS_PROPERTY`：`buildProps` 将元素属性收敛为对象字面量 AST，供 `VNODE_CALL.props` 使用。

其余枚举成员为预留，与官方编译器节点种类对齐，待指令等解析补齐后使用。

## 工厂函数

- `createCallExpression(callee, args)`：返回 `JS_CALL_EXPRESSION`，供 `transformText` 等挂到 `codegenNode`。
- `createSimpleExpression(content, isStatic?)`：返回 `SIMPLE_EXPRESSION`。
- `createObjectProperty(key, value)`：返回 `JS_PROPERTY`。
- `createObjectExpression(properties)`：返回 `JS_OBJECT_EXPRESSION`。
- `createVNodeCall(callee, tag, props, children)`：返回 `VNODE_CALL`，由 `transformElement` 写入元素的 `codegenNode`。

## 相关文件

- [parser.md](./parser.md) — 如何创建带 `NodeTypes` 的节点
- [tokenize.md](./tokenize.md) — 词法阶段如何驱动文本节点
- [compile.md](./compile.md) — 变换总览与 `TEXT_CALL` / helper 登记
- [transforms/transformElement.md](./transforms/transformElement.md) — `VNODE_CALL` 的生成
- [transforms/transformText.md](./transforms/transformText.md) — `TEXT_CALL` 的生成
