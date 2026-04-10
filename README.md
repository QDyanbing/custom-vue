# custom-vue

自研的 Vue 3 风格响应式、运行时与模板编译（学习/练手用）。包含 `@vue/reactivity`、`runtime-core`、`runtime-dom`、`compiler-core` 与对外聚合包 `vue`。

## 目录结构

- `packages/reactivity` — 响应式系统（ref、reactive、effect、computed、watch 等）
- `packages/runtime-core` — 平台无关的 VNode、h、createRenderer
- `packages/runtime-dom` — 浏览器 DOM 的 nodeOps、patchProp，并组装 render
- `packages/vue` — 对外统一入口，打包并导出
- `packages/compiler-core` — 编译时（模板解析为 AST、transform，并生成 `render` 函数字符串；当前实现含文本、插值 `{{ }}`、元素、双引号属性与闭合标签等）
- `packages/shared` — 跨包工具函数、`ShapeFlags`、`PatchFlags` 等位标志

## 开发

```bash
pnpm install
pnpm dev
```

`pnpm dev` 当前脚本以 **IIFE** 格式输出（见根目录 `package.json` 的 `dev` 脚本），便于示例页用 `<script src="...vue.iife.js">` 直接引用全局 `Vue`。

构建产物在各自包的 `dist` 下；示例页面在 `packages/vue/example/*.html`。

## 文档

- 根目录：[问题记录.md](./问题记录.md)（预览命令、备注等）
- 各包说明在对应 `src` 下的 `*.md`：
  - `packages/reactivity/src/*.md`
  - `packages/runtime-core/src/*.md`
  - `packages/runtime-dom/src/*.md`
  - `packages/compiler-core/src/*.md`（另有包级说明 `packages/compiler-core/README.md`）
  - `packages/shared/src/*.md`（另有包级说明 `packages/shared/README.md`）

## 与参考实现对照

同目录下的 `vue3-main` 为教学向精简快照（非本仓库子模块）。实现差异与阅读入口见 [问题记录.md](./问题记录.md) 中的「与 vue3-main 对照」一节。

## License

ISC
