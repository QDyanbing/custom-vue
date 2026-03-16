import { isRef } from '@vue/reactivity';
import { isString, ShapeFlags } from '@vue/shared';
import { getComponentPublicInstance } from './component';

/**
 * 根据 VNode 与 ref 描述写入/清理模板引用。
 *
 * 该函数只在渲染器内部使用，配合 `vnode.ts` 中的 `normalizeRef` 一起工作：
 *
 * - `normalizeRef(props.ref)` 会把模板上的 `ref`（无论是字符串还是 `Ref` 对象）包装成
 *   `{ r: rawRef, i: instance }` 的形式，其中 `rawRef` 是用户写在模板上的值，`instance` 是当前组件实例。
 * - 渲染器在挂载/更新/卸载时调用 `setRef(ref, vnode)`：
 *   - 挂载/更新：`vnode` 为当前的 VNode，根据 `shapeFlag` 决定写入 DOM 元素还是组件实例
 *   - 卸载：`vnode` 为空，执行清理逻辑，把上一次写入的引用恢复为 `null`
 *
 * 支持的 `rawRef` 形态：
 * - `Ref` 对象：通过 `.value` 读写
 * - 字符串：通过 `instance.refs[rawRef]` 读写
 *
 * @param ref 由 `normalizeRef` 生成的描述对象 `{ r, i }`
 * @param vnode 当前对应的 VNode；卸载阶段传入 `null`
 */
export function setRef(ref, vnode) {
  const { shapeFlag } = vnode || {};

  const { r: rawRef, i: instance } = ref;

  if (!vnode) {
    // 卸载：清理之前绑定的引用
    if (isRef(rawRef)) {
      rawRef.value = null;
    } else if (isString(rawRef)) {
      instance.refs[rawRef] = null;
    }
    return;
  }

  if (isRef(rawRef)) {
    if (shapeFlag & ShapeFlags.COMPONENT) {
      // 组件类型：写入组件对外暴露的 public 实例（expose 或 proxy）
      rawRef.value = getComponentPublicInstance(vnode.component);
    } else {
      // 元素类型：直接写入对应 DOM 元素
      rawRef.value = vnode.el;
    }
  } else if (isString(rawRef)) {
    if (shapeFlag & ShapeFlags.COMPONENT) {
      // 字符串 ref + 组件：instance.refs[rawRef] 指向组件 public 实例
      instance.refs[rawRef] = getComponentPublicInstance(vnode.component);
    } else {
      // 字符串 ref + 元素：instance.refs[rawRef] 指向 DOM 元素
      instance.refs[rawRef] = vnode.el;
    }
  }
}
