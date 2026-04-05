# 08-demo.html — `compile` 输出 `render` 字符串（嵌套元素）

## 作用

在浏览器中 `import` 构建后的 `compiler-core.esm.js`，对模板 `` `<div><p>123</p></div>` `` 调用 `compile(template)`，在控制台查看生成的 `render` 函数字符串（含从 `Vue` 解构的 helper 与 `return` 表达式）。

## 使用前提

先在仓库根目录完成 `compiler-core` 构建，确保存在 `packages/compiler-core/dist/compiler-core.esm.js`。

## 打开方式

通过本地静态服务器打开 `examples` 目录，在浏览器控制台查看输出。
