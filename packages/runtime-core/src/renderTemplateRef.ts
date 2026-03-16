import { isRef } from '@vue/reactivity';
import { isString, ShapeFlags } from '@vue/shared';
import { getComponentPublicInstance } from './component';

export function setRef(ref, vnode) {
  const { shapeFlag } = vnode;

  const { r: rawRef, i: instance } = ref;

  if (!vnode) {
    // 卸载了，要清除
    if (isRef(rawRef)) {
      // 如果是 ref，就给它设置成 null
      rawRef.value = null;
    } else if (isString(rawRef)) {
      // 如果是字符串，修改refs[ref] = null
      instance.refs[rawRef] = null;
    }
    return;
  }

  if (isRef(rawRef)) {
    if (shapeFlag & ShapeFlags.COMPONENT) {
      // vnode 是一个组件类型
      rawRef.value = getComponentPublicInstance(vnode.component);
    } else {
      // vnode 是一个 DOM 元素类型
      rawRef.value = vnode.el;
    }
  } else if (isString(rawRef)) {
    if (shapeFlag & ShapeFlags.COMPONENT) {
      // vnode 是一个组件类型
      instance.refs[rawRef] = getComponentPublicInstance(vnode.component);
    } else {
      // vnode 是一个 DOM 元素类型
      instance.refs[rawRef] = vnode.el;
    }
  }
}
