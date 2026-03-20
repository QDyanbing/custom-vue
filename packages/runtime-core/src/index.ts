/**
 * `runtime-core` 对外导出入口。
 *
 * - 透出 `@vue/reactivity`，以便直接使用响应式能力
 * - 导出运行时的 `h`、`createRenderer`、组件实例 API（如 getCurrentInstance）、生命周期 API（如 onMounted）
 * - 导出内置 `Teleport` 组件（支持跨容器挂载，且可通过 to / disabled 动态切换目标）
 */
export * from '@vue/reactivity';
export * from './h';
export * from './renderer';
export * from './vnode';
export * from './scheduler';
export * from './component';
export * from './apiLifecycle';
export * from './useTemplateRef';
export * from './apiInject';
export * from './components/Teleport';
