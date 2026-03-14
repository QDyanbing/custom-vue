import { ShapeFlags } from '@vue/shared';

/**
 * 初始化组件实例的插槽。
 *
 * 在 `setupComponent` 阶段调用，将 VNode 上的 children（已在 `normalizeChildren` 中
 * 被识别为插槽对象）逐一赋值到 `instance.slots` 上，供 `setup(props, { slots })` 使用。
 *
 * 仅当 `vnode.shapeFlag` 包含 `SLOTS_CHILDREN` 时才执行，
 * 说明 children 是一个 `{ slotName: renderFn }` 形式的对象。
 *
 * @param instance 组件实例，需要已经包含 `slots`（空对象）和 `vnode`
 */
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

/**
 * 更新组件实例的插槽。
 *
 * 在 `updateComponentPreRender` 阶段调用（即父组件触发子组件更新时），
 * 用新 VNode 的 children 覆盖 `instance.slots` 上的同名插槽，
 * 并删除新 VNode 中已不存在的旧插槽。
 *
 * @param instance 组件实例
 * @param vnode 新的组件 VNode（由父组件传入的更新后 VNode）
 */
export function updateSlots(instance, vnode) {
  const { slots } = instance;

  if (vnode.shapeFlag & ShapeFlags.SLOTS_CHILDREN) {
    const children = vnode.children;

    // 遍历插槽对象，将插槽函数赋值给 slots 对象
    for (const key in children) {
      slots[key] = children[key];
    }

    // 把之前有但是新的没有的插槽删除
    for (const key in slots) {
      if (!children[key]) {
        delete slots[key];
      }
    }
  }
}
