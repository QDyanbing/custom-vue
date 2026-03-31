# 05-demo.html — 换行与空白文本处理演示

## 作用

该示例对比自定义 `parse` 与 Vue 官方 `parse` 在以下输入下的输出：

- 元素内容跨行（`<div>\n{{ msg }}\n</div>`）
- 插值前后存在换行与缩进空白

用于观察两点行为是否符合预期：

1. `tokenize.getPos` 计算出的 `line` / `column` 是否随换行变化。
2. `parser` 在闭合元素时对纯空白文本的处理：首尾纯空白会移除，中间纯空白收敛为单个空格。

## 使用前提

先在仓库根目录完成 `compiler-core` 构建，确保存在 `packages/compiler-core/dist/compiler-core.esm.js`。

## 打开方式

通过本地静态服务器打开 `examples` 目录，在浏览器控制台查看两次 `console.log` 的 AST 输出并对比。
