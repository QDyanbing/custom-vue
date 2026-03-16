import { isRef } from '@vue/reactivity';
import { ShapeFlags } from '@vue/shared';

export function setRef(ref, vnode) {
  const { shapeFlag } = vnode;

  if (isRef(ref)) {
    if (shapeFlag & ShapeFlags.COMPONENT) {
      // vnode 是一个组件类型
      ref.value = vnode.component.exposed;
    } else {
      // vnode 是一个 DOM 元素类型
      ref.value = vnode.el;
    }
  }
}
