# tokenize.ts — 词法分析（Tokenizer）

## 作用

`State` 描述 HTML/模板扫描过程中的状态机状态（命名与 Vue compiler-core tokenizer 对齐）。`Tokenizer` 按字符推进 `index`，在状态切换或结束时通过回调把区间交给上层（如 `onText`、`onOpenTagName`）。

## 当前实现范围

主循环 `switch` 已接入的分支：

- **文本与标签入口**：`Text` 遇到 `<` 时先按区间调用 `onText`，再进入 `BeforeTagName`；`BeforeTagName` 区分开始标签字母、`/` 结束标签、其它回落到 `Text`。
- **插值 `{{ … }}`**：`Text` 遇到 `{` 且下一字符为 `{` 时，若前面还有未提交区间则先 `onText`，再以 `sectionStart` 指向 `{{` 处进入 `Interpolation`；`Interpolation` 中遇到 `}}` 时调用 `onInterpolation(sectionStart, index+1)`（区间为整段含双花括号），随后进入 `InterpolationClose` 并更新 `sectionStart`。插值与标签的衔接顺序与 Vue tokenizer 一致为先提交前置文本再切状态。
- **开始标签**：`InTagName` 在 `>` 或空白处结束标签名，调用 `onOpenTagName`，转入 `BeforeAttrName` 并复用当前字符继续处理。
- **属性（当前仅双引号值）**：`BeforeAttrName` 遇 `>` 调用 `onOpenTagEnd` 后回到 `Text`；非空白进入 `InAttrName`；`InAttrName` 遇 `=` 调用 `onAttrName` 后进入 `AfterAttrName`；`AfterAttrName` 遇 `"` 进入 `InAttrValueDq`；`InAttrValueDq` 遇结束 `"` 调用 `onAttrValue` 再回到 `BeforeAttrName`。
- **结束标签**：`InClosingTagName` 遇 `>` 调用 `onCloseTag` 后回到 `Text`。
- **`cleanup`**：解析结束后若仍有未提交区间且状态为 `Text`，调用 `onText`。
- **`getPos`**：为 AST `loc` 提供行列与 `offset`（列号目前简化为 1，多行文本未细化）。

未接入的状态枚举仍保留，便于后续与官方 tokenizer 对齐补全。

## 相关文件

- [parser.md](./parser.md) — 谁消费上述回调并生成 AST
