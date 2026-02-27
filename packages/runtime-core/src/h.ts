import { isArray } from '@vue/shared';

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
  }
}

/**
 * createVNode 函数主要做的是创建虚拟节点
 *
 * @param type 类型
 * @param props 属性
 * @param children 子节点
 * @returns 虚拟节点
 */

export function createVNode(type: string, props?: any, children?: any) {
  return {
    type,
    props,
    children,
  };
}
