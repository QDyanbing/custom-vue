import { ShapeFlags } from '@vue/shared';
import { isSameVNode } from './vnode';

/**
 * 创建一个渲染器。
 *
 * @param options 平台相关的宿主操作集合（如 DOM 创建、插入、删除）
 * @returns 包含 render 方法的渲染器对象
 */
export function createRenderer(options) {
  const {
    createElement: hostCreateElement,
    insert: hostInsert,
    setElementText: hostSetElementText,
    setAttribute: hostSetAttribute,
    patchProp: hostPatchProp,
    remove: hostRemove,
  } = options;

  const mountChildren = (children, el) => {
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      // 递归挂载子节点
      patch(null, child, el);
    }
  };

  // 卸载子节点
  const unmountChildren = children => {
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      unmount(child);
    }
  };

  // 卸载节点
  const unmount = vnode => {
    const { type, shapeFlag, children } = vnode;

    if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      unmountChildren(children);
    }

    hostRemove(vnode.el);
  };

  const mountElement = (vNode, container) => {
    console.log(vNode, container);
    /*
     * 1. 创建一个 dom 节点
     * 2. 设置它的 props
     * 3. 挂载它的子节点
     */
    const { type, props, children, shapeFlag } = vNode;

    const el = hostCreateElement(type);
    vNode.el = el;

    if (props) {
      for (const key in props) {
        hostPatchProp(el, key, null, props[key]);
      }
    }

    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      // 子节点是文本
      hostSetElementText(el, children);
    } else {
      // 子节点是数组
      mountChildren(children, el);
    }

    hostInsert(el, container);
  };

  const patchProps = (el, oldProps, newProps) => {
    // 把老的全部移除，新的全部添加
    if (oldProps) {
      for (const key in oldProps) {
        hostPatchProp(el, key, oldProps[key], null);
      }
    }

    // 把新的全部添加
    if (newProps) {
      for (const key in newProps) {
        hostPatchProp(el, key, oldProps?.[key], newProps[key]);
      }
    }
  };

  const patchElement = (n1, n2) => {
    /*
     * 1. 复用dom元素
     * 2. 更新props
     * 3. 更新 children
     */

    // 复用dom元素
    const el = (n2.el = n1.el);

    const oldProps = n1.props;
    const newProps = n2.props;

    patchProps(el, oldProps, newProps);
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

    if (n1 && !isSameVNode(n1, n2)) {
      // 如果老节点和新节点不是同一个节点，则直接卸载老节点，挂载新节点
      unmount(n1);
      n1 = null;
      mountElement(n2, container);
    }

    if (n1 === null) {
      // 挂载新节点
      mountElement(n2, container);
    } else {
      // 更新老节点
      patchElement(n1, n2);
    }
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
