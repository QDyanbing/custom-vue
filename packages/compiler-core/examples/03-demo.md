# 03-demo.html — 带双引号属性的元素演示

## 作用

在本地用 ES module 加载 `../dist/compiler-core.esm.js`，在控制台打印 `parse('<div id="app"></div>')` 的结果，用于验证元素上双引号属性（名、值与 `loc`）是否写入 `props`。

## 使用前提

先在仓库根目录对 `compiler-core` 执行构建，使 `packages/compiler-core/dist/compiler-core.esm.js` 存在。

## 打开方式

用本地静态服务器打开本目录（避免 `file://` 下部分浏览器限制 module），在开发者工具中查看 `console.log` 输出。
