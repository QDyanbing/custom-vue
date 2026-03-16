import { setCurrentRenderingInstance, unsetCurrentRenderingInstance } from './component';

/**
 * 浅比较两组 props 是否发生了变化。
 *
 * 比较规则：
 * 1. 键数量不同 → 有变化
 * 2. 逐个键做严格相等比较（===），任何一个不同 → 有变化
 *
 * @param prevProps 旧的 props 对象
 * @param nextProps 新的 props 对象
 * @returns `true` 表示有变化，需要更新
 */
function hasPropsChanged(prevProps, nextProps) {
  const nextKeys = Object.keys(nextProps);
  // 如果长度不一致，则需要更新
  if (nextKeys.length !== Object.keys(prevProps).length) {
    return true;
  }

  // 遍历新的 props
  for (const key of nextKeys) {
    if (prevProps[key] !== nextProps[key]) {
      return true;
    }
  }

  // 遍历完了，全部一致
  return false;
}

/**
 * 判断组件是否需要触发更新。
 *
 * 判断依据（按优先级）：
 * 1. 新旧 VNode 任意一方有 children（插槽） → 需要更新
 * 2. 旧 VNode 无 props → 看新 VNode 是否有 props
 * 3. 新 VNode 无 props（旧有） → 需要更新
 * 4. 双方都有 props → 调用 `hasPropsChanged` 做浅比较
 *
 * 该函数在 `renderer.ts` 的 `updateComponent` 中使用，用于决定是否真的需要
 * 调用 `instance.update()` 触发子树重新渲染。
 *
 * @param n1 旧组件 VNode
 * @param n2 新组件 VNode
 * @returns `true` 表示需要更新
 */
export function shouldUpdateComponent(n1, n2): boolean {
  const { props: prevProps, children: prevChildren } = n1;
  const { props: nextProps, children: nextChildren } = n2;

  if (prevChildren || nextChildren) {
    // 任意一个有插槽就需要更新
    return true;
  }

  if (!prevProps) {
    // 老的没有 props，新的有 props，则需要更新
    // 老的没有 props，新的没有 props，则不需要更新
    return !!nextProps;
  }

  if (!nextProps) {
    // 老的有 props，新的没有 props，则需要更新
    return true;
  }

  //  老的有新的也有
  return hasPropsChanged(prevProps, nextProps);
}

export function renderComponentRoot(instance) {
  setCurrentRenderingInstance(instance);
  const subTree = instance.render.call(instance.proxy);
  unsetCurrentRenderingInstance();
  return subTree;
}
