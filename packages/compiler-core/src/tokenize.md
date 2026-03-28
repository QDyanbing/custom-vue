# tokenize.ts — 词法分析（Tokenizer）

## 作用

`State` 描述 HTML/模板扫描过程中的状态机状态（命名与 Vue compiler-core tokenizer 对齐）。`Tokenizer` 按字符推进 `index`，在状态切换或结束时通过回调（如 `onText`）把区间 `[sectionStart, index)` 交给上层。

## 当前实现范围

- `parse` 主循环里仅对 `State.Text` 占位；未遇标签或插值时，整段输入仍以文本形式存在。
- `cleanup`：若末尾仍有未提交的区间且状态为 `Text`，调用 `cbs.onText(sectionStart, index)`，从而把纯文本模板变成一段 `TEXT` token 区间。
- `getPos`：为 AST `loc` 提供行列与 `offset`（列号目前简化为 1，多行文本未细化）。

## 后续扩展

在 `switch (this.state)` 中补全 `Interpolation*`、`BeforeTagName` 等分支后，可逐步产出元素、插值等 token，与官方 tokenizer 行为对齐。

## 相关文件

- [parser.md](./parser.md) — 谁消费 `onText` 并生成 AST
