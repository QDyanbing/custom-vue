# 06-demo.html — `compile` 调用演示

## 作用

在浏览器中直接 `import` 构建后的 `compiler-core.esm.js`，对模板字符串调用 `compile(template)`，在控制台观察编译流程（`parse` + `transform` + `generate`，输出 `render` 函数字符串）。

示例模板为 `` `<div>{{ msg }}</div>` ``，用于验证插值与 helper 登记路径。

## 使用前提

先在仓库根目录完成 `compiler-core` 构建，确保存在 `packages/compiler-core/dist/compiler-core.esm.js`。

## 打开方式

通过本地静态服务器打开 `examples` 目录，在浏览器控制台查看 `compile` 的输出。
