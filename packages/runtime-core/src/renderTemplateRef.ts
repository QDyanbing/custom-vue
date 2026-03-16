import { isRef } from '@vue/reactivity';
import { ShapeFlags } from '@vue/shared';
import { getComponentPublicInstance } from './component';

export function setRef(ref, vnode) {
  const { shapeFlag } = vnode;

  if (isRef(ref)) {
    if (shapeFlag & ShapeFlags.COMPONENT) {
      // vnode 是一个组件类型
      ref.value = getComponentPublicInstance(vnode.component);
    } else {
      // vnode 是一个 DOM 元素类型
      ref.value = vnode.el;
    }
  }
}
