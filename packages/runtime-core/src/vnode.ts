import { ShapeFlags, isArray, isString } from '@vue/shared';

/**
 * 运行时使用的虚拟节点结构（VNode）。
 */
export interface VNode {
  __v_isVNode: true; // 标识这是一个虚拟节点
  type: string;
  props?: any;
  children?: any;
  key?: string | number;
  el?: Element | null;
  shapeFlag: number;
}

export function isSameVNode(v1: VNode, v2: VNode): boolean {
  return v1.type === v2.type && v1.key === v2.key;
}

/**
 * 判断一个值是否为 VNode。
 *
 * @param value 任意值
 * @returns 是否为 VNode
 */
export function isVNode(value: any): boolean {
  return value?.__v_isVNode;
}

/**
 * 创建一个虚拟节点（VNode）。
 *
 * @param type 类型
 * @param props 属性
 * @param children 子节点
 * @returns 虚拟节点
 */
export function createVNode(type: string, props?: any, children?: any): VNode {
  let shapeFlag = 0;

  if (isString(type)) {
    shapeFlag = ShapeFlags.ELEMENT;
  }

  if (isString(children)) {
    shapeFlag |= ShapeFlags.TEXT_CHILDREN;
  } else if (isArray(children)) {
    shapeFlag |= ShapeFlags.ARRAY_CHILDREN;
  }

  return {
    __v_isVNode: true,
    type,
    props,
    children,
    key: props?.key, // 虚拟节点的 key 属性,作用是用于优化 diff 算法
    el: null, // 虚拟节点对应的 DOM 元素
    shapeFlag,
  };
}
