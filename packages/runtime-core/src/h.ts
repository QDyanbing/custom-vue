import { isArray, isObject } from '@vue/shared';

function isVNode(value: any): boolean {
  return value?.__v_isVNode;
}

/**
 * h 函数的使用方法：
 * 1. h('div', 'hello world') 第二个参数为 子节点
 * 2. h('div', [h('span', 'hello'), h('span', ' world')]) 第二个参数为 子节点
 * 3. h('div', h('span', 'hello')) 第二个参数为 子节点
 * 4. h('div', { class: 'container' }) 第二个参数是 props
 * ------
 * 5. h('div', { class: 'container' }, 'hello world')
 * 6. h('div', { class: 'container' }, h('span', 'hello world'))
 * 7. h('div', { class: 'container' }, h('span', 'hello'), h('span', 'world'))
 * 8. h('div', { class: 'container' },[h('span', 'hello'), h('span', 'world')]) 和 7 一个意思
 */
export function h(type: string, propsOrChildren?: any, children?: any) {
  /**
   * h 函数主要做的是参数标准化
   */
  const l = arguments.length;

  if (l === 2) {
    if (isArray(propsOrChildren)) {
      // 对应的代码是：使用情况 2. h('div', [h('span', 'hello'), h('span', ' world')])
      return createVNode(type, null, propsOrChildren);
    }

    if (isObject(propsOrChildren)) {
      if (isVNode(propsOrChildren)) {
        // 对应的代码是：使用情况 3. h('div', h('span', 'hello')) 中的 h('span', 'hello') 是 VNode 类型
        return createVNode(type, null, [propsOrChildren]);
      }

      // 对应的代码是：使用情况 4. h('div', { class: 'container' })
      return createVNode(type, propsOrChildren, children);
    }

    // 对应的代码是：使用情况 1. h('div', 'hello world')
    return createVNode(type, null, propsOrChildren);
  } else {
    if (l > 3) {
      // 对应的代码是：使用情况 8. h('div', { class: 'container' },[h('span', 'hello'), h('span', 'world')])
      children = [...arguments].slice(2);
    } else if (isVNode(children)) {
      // 对应的代码是：使用情况 7. h('div', { class: 'container' }, h('span', 'hello'), h('span', 'world'))
      children = [children];
    }

    return createVNode(type, propsOrChildren, children);
  }
}

export interface VNode {
  __v_isVNode: true; // 标识这是一个虚拟节点
  type: string;
  props?: any;
  children?: any;
  key?: string | number;
  el?: Element | null;
  shapeFlag: number;
}

/**
 * createVNode 函数主要做的是创建虚拟节点
 *
 * @param type 类型
 * @param props 属性
 * @param children 子节点
 * @returns 虚拟节点
 */

export function createVNode(type: string, props?: any, children?: any): VNode {
  return {
    __v_isVNode: true,
    type,
    props,
    children,
    key: props?.key, // 虚拟节点的 key 属性,作用是用于优化 diff 算法
    el: null, // 虚拟节点对应的 DOM 元素
    shapeFlag: 9,
  };
}
