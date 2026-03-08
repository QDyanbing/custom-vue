import { h } from './h';

export function createAppApi(render: any) {
  return function createApp(rootComponent: any, rootProps: any) {
    const app = {
      _container: null,
      mount(container: HTMLElement) {
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
