import { h } from './h';

/**
 * 根据平台提供的 render 函数，生成 createApp 入口。
 * 渲染器（createRenderer 的返回值）在内部调用 createAppApi(render) 得到 createApp 并挂到返回对象上。
 * @param render 平台渲染函数，签名为 (vnode, container) => void，传 null 表示卸载
 * @returns createApp(rootComponent, rootProps)，返回带 mount / unmount 的应用实例
 */
export function createAppApi(render: any) {
  /**
   * 创建应用实例；不会立即挂载，需显式调用 app.mount(container)。
   * @param rootComponent 根组件（组件对象或函数）
   * @param rootProps 根组件的 props，可选
   * @returns 应用实例 { mount, unmount }
   */
  return function createApp(rootComponent: any, rootProps: any) {
    const app = {
      _container: null,
      mount(container: Element) {
        // 创建组件的虚拟节点
        const vnode = h(rootComponent, rootProps);

        // 渲染组件
        render(vnode, container);

        // 保存容器
        app._container = container;
      },
      unmount() {
        // 卸载组件
        render(null, app._container);
        app._container = null;
      },
    };

    return app;
  };
}
