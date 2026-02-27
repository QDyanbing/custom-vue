/**
 * `runtime-core` 对外导出入口。
 *
 * - re-export `@vue/reactivity`
 * - 导出运行时的 `h` 与 `createRenderer`
 */
export * from '@vue/reactivity';
export * from './h';
export * from './renderer';
