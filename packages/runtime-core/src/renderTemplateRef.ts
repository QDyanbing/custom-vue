import { isRef } from '@vue/reactivity';

export function setRef(ref, vnode) {
  if (isRef(ref)) {
    ref.value = vnode.el;
  }
}
