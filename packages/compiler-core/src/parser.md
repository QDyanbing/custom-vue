# parser.ts — 解析入口

## 作用

`parse(input)` 是编译器核心对外的解析函数：把模板字符串交给 `Tokenizer`，在回调里用 `NodeTypes` 组装 AST，并返回根节点。

## 数据流（当前实现）

1. 调用 `reset()` 清空模块级 `currentInput`、`currentRoot`、`currentOpenTag`、`currentProp`，避免连续多次 `parse` 时残留上一次状态。
2. 用 `createRoot` 创建 `ROOT`，将 `currentInput`、`currentRoot` 指向本次解析的输入与根。
3. 调用 `tokenize.parse(input)`。
4. **`onText`**：用 `getSlice` / `getLoc` 生成 `TEXT` 节点，`addNode` 挂到当前父节点（栈顶或根）。
5. **`onOpenTagName`**：构造 `NodeTypes.ELEMENT`（含 `tag`、`loc`、`children`），暂存在 `currentOpenTag`。
6. **`onOpenTagEnd`**：将元素节点 `addNode` 入树，再 `stack.push` 作为新的父节点上下文。
7. **`onCloseTag`**：弹出栈顶，校验标签名一致后用 `setLocEnd` 修正元素 `loc` 的 `end` 与 `source`，并对该元素子节点做空白收敛：首尾纯空白文本删除，中间纯空白折叠为单空格。
8. **`onAttrName` / `onAttrValue`**：在 `currentProp` 上记录名、值与 `loc`，挂到尚未闭合的 `currentOpenTag.props`（若存在）。
9. **`onInterpolation`**：用 `getLoc` 生成 `INTERPOLATION` 节点；在去掉外层 `{{` / `}}` 后，对剩余子串首尾用 `isWhiteSpace` 跳过空白，得到 `innerStart` / `innerEnd`，子节点为 `SIMPLE_EXPRESSION`（`content` 与 `loc` 均基于裁切后的区间）。
10. 对 `root.children` 调用 `condenseWhitespace`（规则与元素子节点一致，用于收敛根节点两侧换行、缩进产生的纯空白文本）。
11. 返回根节点。

模块级变量 `stack`、`currentOpenTag`、`currentProp` 与 `currentInput` 配合；`reset()` 保证连续多次 `parse` 互不污染。

## 相关文件

- [ast.md](./ast.md) — `NodeTypes` 含义
- [tokenize.md](./tokenize.md) — 各回调对应的词法状态
- [index.md](./index.md) — 包入口如何导出 `parse`
