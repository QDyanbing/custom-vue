# custom-vue

自研的 Vue 3 风格运行时与响应式实现（学习/练手用）。包含响应式包、运行时核心与 DOM 渲染入口。

## 目录结构

- `packages/reactivity` — 响应式系统（ref、reactive、effect、computed、watch 等）
- `packages/runtime-core` — 平台无关的 VNode、h、createRenderer
- `packages/runtime-dom` — 浏览器 DOM 的 nodeOps、patchProp，并组装 render
- `packages/vue` — 对外统一入口，打包并导出
- `packages/compiler-core` — 编译时（模板解析为 AST，当前实现含文本、插值 `{{ }}`、元素、双引号属性与闭合标签等）

## 开发

```bash
pnpm install
pnpm dev
```

构建产物在各自包的 `dist` 下；示例页面在 `packages/vue/example/*.html`。

## 文档

- 根目录：[问题记录.md](./问题记录.md)（预览命令、备注等）
- 各包说明在对应 `src` 下的 `*.md`：
  - `packages/reactivity/src/*.md`
  - `packages/runtime-core/src/*.md`
  - `packages/compiler-core/src/*.md`（另有包级说明 `packages/compiler-core/README.md`）

## License

ISC
