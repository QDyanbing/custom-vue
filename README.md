# custom-vue

自研的 Vue 3 风格响应式、运行时与模板编译（学习/练手用）。仓库为 pnpm workspace，子包包括 `@vue/reactivity`、`runtime-core`、`runtime-dom`、`compiler-core` 与对外聚合包 `vue`。

## 目录结构

- `packages/reactivity`：响应式（`ref`、`reactive`、`effect`、`computed`、`watch` 等）
- `packages/runtime-core`：与平台无关的 VNode、`h`、`createRenderer`
- `packages/runtime-dom`：浏览器 DOM 的 `nodeOps`、`patchProp`，并组装 `render`
- `packages/vue`：对外统一入口，打包并再导出
- `packages/compiler-core`：编译期（模板 → AST → `transform` → `render` 函数字符串；当前支持文本、插值 `{{ }}`、元素、双引号属性与闭合标签等）
- `packages/shared`：跨包工具、`ShapeFlags`、`PatchFlags` 等位标志

## 开发

```bash
pnpm install
pnpm dev
```

根目录 `pnpm dev` 使用 **IIFE** 产物（见 `package.json` 的 `dev` 脚本），便于示例页通过 `<script src="...vue.iife.js">` 使用全局 `Vue`。

各包构建输出在对应 `packages/*/dist`；示例 HTML 位于 `packages/vue/example/`。

## 文档

- 仓库根：[问题记录.md](./问题记录.md)（本地预览方式、与参考目录对照等）
- 模块笔记：各包 `src` 下同名 `*.md`（与 `packages/compiler-core/README.md`、`packages/shared/README.md` 等包级说明配合阅读）

## 与参考实现对照

并列目录 `vue3-main` 为教学向精简快照（非 git 子模块）。差异说明见 [问题记录.md](./问题记录.md) 中「与 vue3-main 对照」。

## License

ISC
