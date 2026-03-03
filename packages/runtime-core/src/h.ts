import { isArray, isObject } from '@vue/shared';
import { createVNode, isVNode } from './vnode';

/**
 * `h` 函数的常见使用方式：
 * 1. h('div', 'hello world') 第二个参数为 子节点
 * 2. h('div', [h('span', 'hello'), h('span', ' world')]) 第二个参数为 子节点
 * 3. h('div', h('span', 'hello')) 第二个参数为 子节点
 * 4. h('div', { class: 'container' }) 第二个参数是 props
 * ------
 * 5. h('div', { class: 'container' }, 'hello world')
 * 6. h('div', { class: 'container' }, h('span', 'hello world'))
 * 7. h('div', { class: 'container' }, h('span', 'hello'), h('span', 'world'))
 * 8. h('div', { class: 'container' },[h('span', 'hello'), h('span', 'world')]) 和 7 等价
 *
 * @param type 元素类型（例如 'div'）
 * @param propsOrChildren 第二个参数：可能是 props，也可能是 children
 * @param children 第三个参数：children（当第二个参数是 props 时才使用）
 * @returns 创建出的 VNode
 *
 * @example
 * h('div', 'hello world')
 *
 * @example
 * h('div', { class: 'container' }, [h('span', 'hello'), h('span', 'world')])
 */
export function h(type: string, propsOrChildren?: any, children?: any) {
  // `h` 的核心职责是把不同调用签名归一化。
  const l = arguments.length;

  if (l === 2) {
    if (isArray(propsOrChildren)) {
      // 对应使用方式 2：h('div', [h('span', 'hello'), h('span', ' world')])
      return createVNode(type, null, propsOrChildren);
    }

    if (isObject(propsOrChildren)) {
      if (isVNode(propsOrChildren)) {
        // 对应使用方式 3：h('div', h('span', 'hello'))，第二参本身是 VNode。
        return createVNode(type, null, [propsOrChildren]);
      }

      // 对应使用方式 4：h('div', { class: 'container' })
      return createVNode(type, propsOrChildren, children);
    }

    // 对应使用方式 1：h('div', 'hello world')
    return createVNode(type, null, propsOrChildren);
  } else {
    if (l > 3) {
      // 对应使用方式 8：h('div', { class: 'container' }, [h(...) , h(...)])
      children = [...arguments].slice(2);
    } else if (isVNode(children)) {
      // 对应使用方式 7：h('div', { class: 'container' }, h(...), h(...))
      children = [children];
    }

    return createVNode(type, propsOrChildren, children);
  }
}
