# vue/example 示例说明

## 概览

`packages/vue/example` 目录下放的是一组手写运行时的**最小示例页面**，每个 html 文件都会通过：

- `<script type="module">` 直接从 `../dist/vue.esm.js` 导入运行时能力
- 使用 `createApp` + 选项式组件演示当前实现的特性

目前与组件 props/attrs 相关的示例有：

- `08-demo.html`：`setup + render` 计数器，演示 `ref` 与 `this` 上的自动解包。
- `09-demo.html`：演示根组件 props 与 attrs 的拆分：组件只声明 `props: ['msg']`，创建应用时额外传入 `count`，可以在 `setup(props, { attrs })` 中分别看到 `props.msg` 和 `attrs.count`。

后续如果新增 demo，建议在这里简单列一下文件名和它覆盖的能力，方便快速索引。

