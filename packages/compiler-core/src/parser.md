# parser.ts — 解析入口

## 作用

`parse(input)` 是编译器核心对外的解析函数：把模板字符串交给 `Tokenizer`，在回调里用 `NodeTypes` 组装 AST，并返回根节点。

## 数据流（当前实现）

1. 用 `createRoot` 创建 `ROOT`，`children` 初始为空。
2. 将 `currentInput`、`currentRoot` 指向本次解析的输入与根（供回调闭包使用）。
3. 调用 `tokenize.parse(input)`；词法器在适当时机调用 `onText(start, end)`。
4. `onText` 内用 `getSlice` / `getLoc` 生成 `TEXT` 节点并 `push` 到 `currentRoot.children`。
5. 返回根节点。

## 相关文件

- [ast.md](./ast.md) — `NodeTypes` 含义
- [tokenize.md](./tokenize.md) — `Tokenizer` 与 `onText` 何时触发
- [index.md](./index.md) — 包入口如何导出 `parse`
