# 07-demo.html — 文本合并示例

## 作用

这个示例用来观察 `compile(template)` 在文本合并场景下返回的 AST。

模板是 `` `<div>aa {{ msg }} <p></p> bb {{ c }}</div>` ``，可以同时看到两种情况：

1. `aa {{ msg }}` 会在同一个元素子节点序列里被合并成 `COMPOUND_EXPRESSION`
2. `<p></p>` 会打断合并，因此 `bb {{ c }}` 会在它后面重新开始一组新的合并

## 预期现象

打开浏览器控制台后，`compile(template)` 的返回值里：

- 外层 `div.children` 不再只是普通的 `TEXT` / `INTERPOLATION` 顺序平铺
- 连续文本段会被改写成 `COMPOUND_EXPRESSION`
- 插值内部的表达式会带上 `_ctx.` 前缀

## 使用前提

先在仓库根目录完成 `compiler-core` 构建，确保存在 `packages/compiler-core/dist/compiler-core.esm.js`。
