/**
 * `runtime-core` 对外导出入口。
 *
 * - 透出 `@vue/reactivity`，以便直接使用响应式能力
 * - 导出运行时的 `h` 与 `createRenderer`
 */
export * from '@vue/reactivity';
export * from './h';
export * from './renderer';
export * from './vnode';
