import { ShapeFlags, isArray, isString } from '@vue/shared';

/**
 * 运行时使用的虚拟节点结构（VNode）。
 * 这里的结构是 runtime 自己使用的内部格式，会由 h / 渲染器统一创建。
 */
export interface VNode {
  __v_isVNode: true; // 标识这是一个虚拟节点
  type: string; // 元素类型，例如 'div'
  props?: any; // 传给元素 / 组件的属性
  children?: any; // 子节点，可以是文本或 VNode 数组
  key?: string | number; // 用于高效 diff 的标识
  el?: Element | null; // 关联的真实 DOM 元素
  shapeFlag: number; // 使用位运算标记当前 VNode 的“形状”（元素 / 文本子节点 / 数组子节点）
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
  // shapeFlag 通过位运算记录“节点类型 + 子节点类型”的组合信息
  let shapeFlag = 0;

  if (isString(type)) {
    // 当前只处理原生元素，后续可扩展到组件等类型
    shapeFlag = ShapeFlags.ELEMENT;
  }

  if (isString(children)) {
    // 子节点是一个文本节点
    shapeFlag |= ShapeFlags.TEXT_CHILDREN;
  } else if (isArray(children)) {
    // 子节点是多个 VNode 组成的数组
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
