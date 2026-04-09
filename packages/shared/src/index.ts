/**
 * `@vue/shared` 统一导出入口：工具函数（`utils`）、VNode 形状位（`shapeFlags`）、补丁提示位（`patchFlags`）。
 * 业务与包代码应只从 `@vue/shared` 引用，避免深路径依赖。
 */
export * from './utils';
export * from './shapeFlags';
export * from './patchFlags';
