import { ShapeFlags } from '@vue/shared';

export function initSlots(instance) {
  const { slots, vnode } = instance;

  if (vnode.shapeFlag & ShapeFlags.SLOTS_CHILDREN) {
    const children = vnode.children;

    // 遍历插槽对象，将插槽函数赋值给 slots 对象
    for (const key in children) {
      slots[key] = children[key];
    }
  }
}
