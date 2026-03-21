/**
 * `runtime-core` 对外导出入口。
 *
 * - 透出 `@vue/reactivity`，以便直接使用响应式能力
 * - 导出运行时的 `h`、`createRenderer`、组件实例 API（如 getCurrentInstance）、生命周期 API（如 onMounted）
 * - 导出内置 `Teleport` 组件（支持跨容器挂载，且可通过 to / disabled 动态切换目标）
 * - 导出内置 `KeepAlive` 组件（缓存动态子组件，配合 renderer 的 deactivate / activate）
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
export * from './components/KeepAlive';
