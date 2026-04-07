# 27-demo.html 说明

## 演示目标

验证 **`template` 选项字符串**经编译器生成 `render` 后，与 **`createApp` + 响应式 `ref`** 的联调：

- 根组件使用 `template: \`<div class="container" style="color: red">{{ count }}</div>\``
- `setup` 返回 `count`（`ref(0)`），约 1 秒后自增，观察文本与 **class / style** 是否保持

## 运行方式

示例通过 `<script src="../dist/vue.iife.js">` 引入全局 `Vue`（与根目录 `pnpm dev` 的 **IIFE** 构建一致）。若本地尚未构建，先在仓库根目录执行 `pnpm dev` 生成 `packages/vue/dist/vue.iife.js`。

## 涉及模块

- **编译**：模板中的 `class` / `style` / 插值会进入 `compiler-core` 的 codegen（如元素 `props` 的 `JS_OBJECT_EXPRESSION`、插值节点等）
- **DOM**：`runtime-dom` 的 `patchClass`、`patchStyle`、`patchEvent`（见 `modules/events.ts`）负责把 VNode 上的属性反映到真实 DOM

## 延伸阅读

- 编译管线：`packages/compiler-core/src/compile.md`
- 渲染入口：`packages/runtime-core/src/renderer.md`
