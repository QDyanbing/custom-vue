/**
 * shared 包工具函数与标志位的统一导出入口。
 * 在其他包中只需要从 `@vue/shared` 引用，而不需要关心具体文件路径。
 */
export * from './utils';
export * from './shapeFlags';
export * from './patchFlags';
