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

  /**
   * 按顺序挂载一组子 VNode 到指定元素下。
   * 这里假定 children 已经是标准化后的 VNode 数组。
   */
  const mountChildren = (children, el) => {
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      // 递归挂载子节点
      patch(null, child, el);
    }
  };

  /**
   * 卸载一组子 VNode，对应从父容器中移除一整套子树。
   */
  const unmountChildren = children => {
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      unmount(child);
    }
  };

  /**
   * 卸载单个 VNode。
   * 1. 若有子节点，先递归卸载子树
   * 2. 再调用宿主的 remove 把自身对应的 DOM 节点移除
   */
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
    // 在 VNode 上记录对应的 DOM 元素，后续更新 / 卸载时会用到
    vNode.el = el;

    if (props) {
      for (const key in props) {
        hostPatchProp(el, key, null, props[key]);
      }
    }

    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      // 子节点是文本
      hostSetElementText(el, children);
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      // 子节点是数组
      mountChildren(children, el);
    }

    hostInsert(el, container);
  };

  /**
   * 最简单的 props diff 策略：先把旧的全部移除，再把新的全部设置上去。
   * 真实 Vue 会在这里做更细粒度的比较，这里先用“全量替换”便于理解整体流程。
   */
  const patchProps = (el, oldProps, newProps) => {
    // 先移除旧 props
    if (oldProps) {
      for (const key in oldProps) {
        hostPatchProp(el, key, oldProps[key], null);
      }
    }

    // 再设置新 props
    if (newProps) {
      for (const key in newProps) {
        hostPatchProp(el, key, oldProps?.[key], newProps[key]);
      }
    }
  };

  /**
   * children 更新逻辑。
   * 通过 shapeFlag 判断“文本 vs 数组”的 4 种组合情况。
   */
  const patchChildren = (n1, n2) => {
    const el = n2.el;
    /**
     * 1. 新节点他的子节点是 文本
     *  1.1 老的是数组
     *  1.2 老的也是文本
     * 2. 新节点他的子节点是 数组 或者 null
     *  2.1 老的是文本
     *  2.2 老的也是数组
     *  2.3 老的也是 null
     */

    const prevShapeFlag = n1.shapeFlag;
    const shapeFlag = n2.shapeFlag;

    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        unmountChildren(n1.children);
      }

      if (n1.children !== n2.children) {
        // 设置文本,如果n1和n2的children不一样
        hostSetElementText(el, n2.children);
      }
    } else {
      // 老的可能是数组 或 null 或文本
      // 新的可能是数组 或 null
      if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
        // 老的是文本，把老的文本清空
        hostSetElementText(el, '');

        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          // 挂载新的子节点
          mountChildren(n2.children, el);
        }
      } else {
        // 老的数组或null
        if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          // 老的是数组
          if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            // 新的是数组
            // TODO: 全量 diff
          } else {
            // 新的不是数组，把老的数组卸载
            unmountChildren(n1.children);
          }
        } else {
          // 老的是 null
          if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            // 新的是数组，挂载新的子节点
            mountChildren(n2.children, el);
          }
        }
      }
    }
  };

  /**
   * 同类型元素的更新逻辑：
   * 1. 复用 DOM
   * 2. 对比并更新 props
   * 3. 对比并更新 children
   */
  const patchElement = (n1, n2) => {
    // 复用 dom 元素
    const el = (n2.el = n1.el);

    const oldProps = n1.props;
    const newProps = n2.props;

    patchProps(el, oldProps, newProps);

    // 更新 children
    patchChildren(n1, n2);
  };

  /**
   * 更新和挂载的入口
   * @param n1 老节点，如果有则需要和n2做diff；如果没有则直接挂载n2
   * @param n2 新节点
   * @param container 要挂载的容器
   */
  const patch = (n1, n2, container) => {
    // 如果老节点和新节点引用相同，说明完全没变，直接返回
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
