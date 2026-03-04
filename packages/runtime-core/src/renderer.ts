/**
 * 创建一个渲染器。
 *
 * @param options 平台相关的宿主操作集合（如 DOM 创建、插入、删除）
 * @returns 包含 render 方法的渲染器对象
 */
export function createRenderer(options) {
  const unmount = vnode => {
    console.log(vnode);
  };

  /**
   * 更新和挂载的入口
   * @param n1 老节点，如果有则需要和n2做diff；如果没有则直接挂载n2
   * @param n2 新节点
   * @param container 要挂载的容器
   */
  const patch = (n1, n2, container) => {
    // 如果老节点和新节点是同一个节点，则直接返回
    if (n1 === n2) return;
  };

  /**
   * 把 VNode 渲染到容器中。
   *
   * @param vNode 虚拟节点
   * @param container 挂载容器
   */
  const render = (vNode: any, container: any) => {
    // 分3步：挂载、更新、卸载

    if (vNode === null) {
      if (container._vnode) {
        // 卸载老节点
        unmount(container._vnode);
      }
      return;
    } else {
      // 挂载新节点
      patch(container._vnode || null, vNode, container);
    }

    container._vnode = vNode;
  };

  return {
    render,
  };
}
