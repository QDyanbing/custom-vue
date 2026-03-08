import { h } from './h';

/**
 * 根据平台提供的 render 函数，生成 createApp 入口。
 * 渲染器（如 createRenderer 返回值）会调用 createAppApi(render) 得到 createApp，再对外暴露。
 */
export function createAppApi(render: any) {
  /**
   * 创建应用实例；不立即挂载，需显式调用 app.mount(container)。
   * @param rootComponent 根组件（一般为组件对象或函数）
   * @param rootProps 根组件的 props，可选
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
