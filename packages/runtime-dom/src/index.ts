import { nodeOps } from './nodeOps';
import { patchProp } from './patchProp';
import { createRenderer } from '@vue/runtime-core';

/**
 * `runtime-dom` 的渲染器配置项。
 *
 * @remarks
 * 该对象会传给 `@vue/runtime-core` 的渲染器创建逻辑（例如 `createRenderer`），
 * 用来把“平台无关的渲染流程”落到浏览器 DOM 上：
 *
 * - **nodeOps**：节点创建/插入/删除等 DOM 操作
 * - **patchProp**：更新元素属性、样式、事件、特性
 */
const renderOptions = { patchProp, ...nodeOps };

const renderer = createRenderer(renderOptions);

export function render(vNode: any, container: Element) {
  renderer.render(vNode, container);
}

export * from '@vue/runtime-core';

export { renderOptions };
