import { nodeOps } from './nodeOps';
import { patchProp } from './patchProp';
import { createRenderer } from '@vue/runtime-core';
import { isString } from '@vue/shared';

/**
 * `runtime-dom` 渲染器配置项。
 *
 * @remarks
 * 该对象会传给 `@vue/runtime-core` 的 `createRenderer`，
 * 用来把平台无关的渲染流程落到浏览器 DOM：
 *
 * - **nodeOps**：节点创建/插入/删除等 DOM 操作
 * - **patchProp**：更新元素属性、样式、事件、特性
 */
const renderOptions = { patchProp, ...nodeOps };

const renderer = createRenderer(renderOptions);

export function render(vNode: any, container: Element) {
  renderer.render(vNode, container);
}

export function createApp(rootComponent: any, rootProps: any) {
  const app = renderer.createApp(rootComponent, rootProps);
  const _mount = app.mount.bind(app);

  function mount(selector: string | Element) {
    let el: Element;
    if (isString(selector)) {
      el = document.querySelector(selector as string);
    } else {
      el = selector as Element;
    }
    _mount(el);
  }

  app.mount = mount;

  return app;
}

export * from '@vue/runtime-core';

export { renderOptions };
