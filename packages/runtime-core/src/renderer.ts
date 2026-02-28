/**
 * 创建一个渲染器。
 *
 * @param options 平台相关的宿主操作集合（如 DOM 创建、插入、删除）
 * @returns 包含 render 方法的渲染器对象
 */
export function createRenderer(options) {
  console.log(options);

  /**
   * 把 VNode 渲染到容器中。
   *
   * @param vNode 虚拟节点
   * @param container 挂载容器
   */
  const render = (vNode: any, container: Element) => {
    console.log(vNode, container);
  };

  return {
    render,
  };
}
