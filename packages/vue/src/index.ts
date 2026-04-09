/**
 * 对外 npm 风格包入口：整体再导出 `@vue/runtime-dom`（含响应式、运行时与 `createApp`）。
 * 与并列参考目录 `vue3-main` 中 `packages/vue` 的职责一致，便于示例与打包脚本统一 `import { ... } from 'vue'`。
 */
export * from '@vue/runtime-dom';
