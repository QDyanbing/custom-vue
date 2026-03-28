# ast.ts — 节点类型

## 作用

定义模板 AST 使用的 `NodeTypes` 枚举，与 Vue 3 `@vue/compiler-core` 中的节点分类一致，便于后续在解析器、转换器、代码生成阶段共用同一套类型名。

## 当前代码实际用到的类型

- `ROOT`：整段模板的根
- `TEXT`：纯文本片段（当前由 `Tokenizer` 在 `Text` 状态结束时通过 `onText` 产出）

其余枚举成员为预留，与官方编译器节点种类对齐，待标签、插值、指令等解析补齐后使用。

## 相关文件

- [parser.md](./parser.md) — 如何创建带 `NodeTypes` 的节点
- [tokenize.md](./tokenize.md) — 词法阶段如何驱动文本节点
