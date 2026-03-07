import { ShapeFlags } from '@vue/shared';
import { isSameVNode } from './vnode';

/**
 * 创建一个渲染器。
 *
 * @param options 平台相关的宿主操作集合（如 DOM 创建、插入、删除）
 * @returns 包含 render 方法的渲染器对象
 */
export function createRenderer(options) {
  const {
    createElement: hostCreateElement,
    insert: hostInsert,
    setElementText: hostSetElementText,
    setAttribute: hostSetAttribute,
    patchProp: hostPatchProp,
    remove: hostRemove,
  } = options;

  /**
   * 按顺序挂载一组子 VNode 到指定元素下。
   * 这里假定 children 已经是标准化后的 VNode 数组。
   *
   * @param children 子 VNode 列表
   * @param el 挂载到的父容器
   */
  const mountChildren = (children, el) => {
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      // 递归挂载子节点
      patch(null, child, el);
    }
  };

  /**
   * 卸载一组子 VNode，对应从父容器中移除一整套子树。
   *
   * @param children 要卸载的子 VNode 列表
   */
  const unmountChildren = children => {
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      unmount(child);
    }
  };

  /**
   * 卸载单个 VNode。
   *
   * 1. 若有子节点，先递归卸载子树
   * 2. 再调用宿主的 remove 把自身对应的 DOM 节点移除
   *
   * @param vnode 要卸载的虚拟节点
   */
  const unmount = vnode => {
    const { type, shapeFlag, children } = vnode;

    if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      unmountChildren(children);
    }

    hostRemove(vnode.el);
  };

  /**
   * 初次挂载元素类型的 VNode。
   *
   * 1. 创建一个 DOM 元素
   * 2. 设置它的 props
   * 3. 挂载它的子节点
   *
   * @param vNode 要挂载的元素 VNode
   * @param container 挂载到的父容器
   * @param anchor 锚点，用于控制插入位置
   */
  const mountElement = (vNode, container, anchor = null) => {
    /*
     * 1. 创建一个 dom 节点
     * 2. 设置它的 props
     * 3. 挂载它的子节点
     */
    const { type, props, children, shapeFlag } = vNode;

    const el = hostCreateElement(type);
    // 在 VNode 上记录对应的 DOM 元素，后续更新 / 卸载时会用到
    vNode.el = el;

    if (props) {
      for (const key in props) {
        hostPatchProp(el, key, null, props[key]);
      }
    }

    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      // 子节点是文本
      hostSetElementText(el, children);
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      // 子节点是数组
      mountChildren(children, el);
    }

    hostInsert(el, container, anchor);
  };

  /**
   * 最简单的 props diff 策略：先把旧的全部移除，再把新的全部设置上去。
   * 真实 Vue 会在这里做更细粒度的比较，这里先用“全量替换”便于理解整体流程。
   *
   * @param el 关联的宿主元素
   * @param oldProps 旧的属性对象
   * @param newProps 新的属性对象
   */
  const patchProps = (el, oldProps, newProps) => {
    // 先移除旧 props
    if (oldProps) {
      for (const key in oldProps) {
        hostPatchProp(el, key, oldProps[key], null);
      }
    }

    // 再设置新 props
    if (newProps) {
      for (const key in newProps) {
        hostPatchProp(el, key, oldProps?.[key], newProps[key]);
      }
    }
  };

  /**
   * children 更新逻辑。
   * 通过 shapeFlag 判断“文本 vs 数组”的四种组合情况，并在不同分支中完成：
   *
   * - 文本 → 文本：必要时直接更新文本
   * - 数组 → 文本：卸载旧数组，再设置新文本
   * - 文本 → 数组：清空文本，再挂载新数组
   * - 数组 / null 之间互相转换：卸载或挂载整组子节点
   *
   * @param n1 旧 VNode
   * @param n2 新 VNode
   */
  const patchChildren = (n1, n2) => {
    const el = n2.el;
    /**
     * 1. 新节点他的子节点是 文本
     *  1.1 老的是数组
     *  1.2 老的也是文本
     * 2. 新节点他的子节点是 数组 或者 null
     *  2.1 老的是文本
     *  2.2 老的也是数组
     *  2.3 老的也是 null
     */

    const prevShapeFlag = n1.shapeFlag;
    const shapeFlag = n2.shapeFlag;

    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        unmountChildren(n1.children);
      }

      if (n1.children !== n2.children) {
        // 设置文本,如果n1和n2的children不一样
        hostSetElementText(el, n2.children);
      }
    } else {
      // 老的可能是数组 或 null 或文本
      // 新的可能是数组 或 null
      if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
        // 老的是文本，把老的文本清空
        hostSetElementText(el, '');

        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          // 挂载新的子节点
          mountChildren(n2.children, el);
        }
      } else {
        // 老的数组或null
        if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          // 老的是数组
          if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            // 新的是数组
            // TODO: 全量 diff
            patchKeyedChildren(n1.children, n2.children, el);
          } else {
            // 新的不是数组，把老的数组卸载
            unmountChildren(n1.children);
          }
        } else {
          // 老的是 null
          if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            // 新的是数组，挂载新的子节点
            mountChildren(n2.children, el);
          }
        }
      }
    }
  };

  /**
   * 带 key 的 children diff，当前实现的是“全量 diff” 的双端比较版本。
   *
   * - 先从头部开始同步对比（前缀对齐）
   * - 再从尾部开始同步对比（后缀对齐）
   * - 最后根据 i、e1、e2 的关系判断是“只多了新节点”还是“只多了旧节点”
   *
   * @param c1 旧 children 列表
   * @param c2 新 children 列表
   * @param container 容器元素
   */
  const patchKeyedChildren = (c1, c2, container) => {
    /**
     * 全量 diff
     * 1. 双端 diff
     *  1.1 头部对比
     *   c1 => [a,b]; c2 => [a,b,c]
     *   开始时：i = 0; e1 = 1; e2 = 2
     *  1.2 尾部对比
     *   c1 => [a,b]; c2 => [c,a,b]
     *   开始时：i = 0; e1 = 1; e2 = 2
     *   结束时：i = 0; e1 = -1; e2 = 0
     * 2. 乱序对比
     *   c1 => [a,b,c,d,e]; c2 => [a,c,d,b,e]
     *   开始时：i = 0; e1 = 4; e2 = 4
     *   双端对比完成后：i = 1; e1 = 3; e2 = 3
     */

    // 开始对比的索引
    let i = 0;
    // 老的结束索引
    let e1 = c1.length - 1;
    // 新的结束索引
    let e2 = c2.length - 1;

    /**
     * 1.1 头部对比
     * case: c1 => [a,b]; c2 => [a,b,c]
     * 开始时：i = 0; e1 = 1; e2 = 2
     * 结束时：i = 2; e1 = 1; e2 = 2
     */
    while (i <= e1 && i <= e2) {
      const n1 = c1[i];
      const n2 = c2[i];
      if (isSameVNode(n1, n2)) {
        // 如果n1和n2是同一个节点，则进行patch，patch完成后对比下一个节点
        patch(n1, n2, container);
      } else {
        // 如果n1和n2不是同一个节点，则直接break
        break;
      }
      i++;
    }

    /**
     * 1.2 尾部对比
     * case: c1 => [a,b]; c2 => [c,a,b]
     * 开始时：i = 0; e1 = 1; e2 = 2
     * 结束时：i = 0; e1 = -1; e2 = 0
     */
    while (i <= e1 && i <= e2) {
      const n1 = c1[e1];
      const n2 = c2[e2];
      if (isSameVNode(n1, n2)) {
        // 如果n1和n2是同一个节点，则进行patch，patch完成后对比上一个节点
        patch(n1, n2, container);
      } else {
        // 如果n1和n2不是同一个节点，则直接break
        break;
      }
      e1--;
      e2--;
    }

    // 2. 处理“只多了新节点”的情况：老的已经遍历完，但新的还有剩余
    if (i > e1) {
      const nextPos = e2 + 1;
      const anchor = nextPos < c2.length ? c2[nextPos].el : null;

      // 如果i大于e1，则说明新的节点比老的节点多，需要挂载新的节点
      while (i <= e2) {
        const n2 = c2[i];
        patch(null, n2, container, anchor);
        i++;
      }
    } else if (i > e2) {
      // 如果i大于e2，则说明老的节点比新的节点多，需要卸载老的节点
      while (i <= e1) {
        const n1 = c1[i];
        unmount(n1);
        i++;
      }
    } else {
      /**
       * 2. 乱序对比
       * case: c1 => [a,b,c,d,e]; c2 => [a,c,d,b,e]
       * 开始时：i = 0; e1 = 4; e2 = 4
       * 双端对比完成后：i = 1; e1 = 3; e2 = 3
       * 思路：在剩余段里按 key 找到可复用的节点做 patch，再按新列表顺序做 insert
       */

      // 老的开始索引
      const s1 = i;
      // 新的开始索引
      const s2 = i;
      /**
       * 新列表剩余段的 key -> index 映射（学习用示例）
       * 如 c2[s2..e2] = [c,d,b] => { 'c': 1, 'd': 2, 'b': 3 }
       */
      const keyToNewIndexMap = new Map();
      const newIndexToOldIndexMap = new Array(e2 - s2 + 1);
      //  -1 代表不需要计算的节点
      newIndexToOldIndexMap.fill(-1);

      for (let j = s2; j <= e2; j++) {
        const n2 = c2[j];
        keyToNewIndexMap.set(n2.key, j);
      }

      for (let j = s1; j <= e1; j++) {
        const n1 = c1[j];
        const newIndex = keyToNewIndexMap.get(n1.key);
        if (newIndex !== undefined) {
          newIndexToOldIndexMap[newIndex] = j;

          // 找到 key 相同的则 patch
          patch(n1, c2[newIndex], container);
        } else {
          // 没找到则卸载旧节点
          unmount(n1);
        }
      }

      const newIndexSequence = getSequence(newIndexToOldIndexMap);
      const sequenceSet = new Set(newIndexSequence);

      /**
       * 按新列表顺序做 insert。没有 insertAfter，所以倒序插入，每次的 anchor 是下一个节点
       */
      for (let j = e2; j >= s2; j--) {
        const n2 = c2[j];
        const anchor = c2[j + 1]?.el || null;

        if (n2.el) {
          // 如果 j 的下标不在最长递增子序列中，则移动到新位置
          if (!sequenceSet.has(j)) {
            // 有 el 则移动到新位置
            hostInsert(n2.el, container, anchor);
          }
        } else {
          // 没有 el 则挂载新节点（新列表里多出来的）
          patch(null, n2, container, anchor);
        }
      }
    }
  };

  /**
   * 同类型元素的更新逻辑：
   * 1. 复用 DOM
   * 2. 对比并更新 props
   * 3. 对比并更新 children
   */
  const patchElement = (n1, n2) => {
    // 复用 dom 元素
    const el = (n2.el = n1.el);

    const oldProps = n1.props;
    const newProps = n2.props;

    patchProps(el, oldProps, newProps);

    // 更新 children
    patchChildren(n1, n2);
  };

  /**
   * 更新和挂载的统一入口。
   *
   * - 当 n1 === n2 时，表示完全复用，直接返回
   * - 当 n1 存在且与 n2 不是同一个 VNode 时，先卸载再按新节点重新挂载
   * - 当 n1 为空但 n2 存在时，执行初次挂载
   * - 当 n1、n2 均存在且为同一类型时，走元素更新逻辑
   *
   * @param n1 老节点，如果有则需要和 n2 做 diff；如果没有则直接挂载 n2
   * @param n2 新节点
   * @param container 要挂载的容器
   * @param anchor 锚点，用于控制插入位置
   */
  const patch = (n1, n2, container, anchor = null) => {
    // 如果老节点和新节点引用相同，说明完全没变，直接返回
    if (n1 === n2) return;

    if (n1 && !isSameVNode(n1, n2)) {
      // 如果老节点和新节点不是同一个节点，则直接卸载老节点，挂载新节点
      unmount(n1);
      n1 = null;
      mountElement(n2, container);
    }

    if (n1 === null) {
      // 挂载新节点
      mountElement(n2, container, anchor);
    } else {
      // 更新老节点
      patchElement(n1, n2);
    }
  };

  /**
   * 把 VNode 渲染到容器中。
   *
   * @param vNode 虚拟节点，传入 `null` 表示卸载
   * @param container 挂载容器
   */
  const render = (vNode: any, container: any) => {
    // 分3步：挂载、更新、卸载

    if (vNode === null) {
      if (container._vnode) {
        // 卸载老节点
        unmount(container._vnode);
      }
      return;
    } else {
      // 挂载新节点
      patch(container._vnode || null, vNode, container);
    }

    container._vnode = vNode;
  };

  return {
    render,
  };
}

/**
 * 求数组的一个最长递增子序列（LIS）对应的下标序列。
 * 使用“耐心排序 + 二分”思路：维护“当前长度下的最小末尾”的索引数组，
 * 并用 Map 记录每个位置的前驱，最后反向追溯得到下标序列。
 *
 * 为什么能求出 LIS：
 * 1. result[j] 表示「长度为 j+1 的递增子序列中，末尾元素在 arr 里的下标」。
 *    我们始终让同一长度的序列保留「末尾最小」的那条，这样后面才有更多数能接上，不会漏掉更长的 LIS。
 * 2. 当 arr[i] 比 result 末尾小时，用二分找到「第一个末尾 ≥ arr[i]」的位置并替换。
 *    替换后该长度的末尾变小，LIS 长度不变，但为后续元素留出空间，最终 result.length 就是 LIS 长度。
 * 3. 因为 result 里的下标会被多次替换，不能直接当一条链用；所以用 map 记录每个位置的前驱，
 *    最后从 result[result.length-1] 往前追溯，得到的就是一条真实的下标序列，且对应值递增。
 *
 * @param {number[]} arr - 输入数组
 * @returns {number[]} 某个最长递增子序列在 arr 中的下标数组（顺序为在原序列中的出现顺序）
 *
 * 复杂度：
 * - 时间：O(n log n)。遍历 n 个元素，每次可能做一次长度为 O(result.length) 的二分，result 长度不超过 n。
 * - 空间：O(n)。Map 和前驱追溯最多 O(n)，result 最多 n 个下标。
 */
function getSequence(arr: number[]): number[] {
  const result = [];

  // 记录前驱节点
  const map = new Map();

  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];

    // 如果节点不需要计算，则直接跳过
    if (item === -1) continue;

    if (result.length === 0) {
      // 如果 result 为空，则将当前索引添加到 result 中
      result.push(i);
      continue;
    }

    const lastIndex = result[result.length - 1];
    const lastItem = arr[lastIndex];

    if (item > lastItem) {
      // 如果当前的大于上一个，就把索引push到result中，并记录前驱节点
      result.push(i);
      map.set(i, lastIndex);
      continue;
    }

    // item 小于 lastItem

    let left = 0;
    let right = result.length - 1;
    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      // 获取中间索引的值
      const midItem = arr[result[mid]];

      if (midItem < item) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }

    if (arr[result[left]] > item) {
      if (left > 0) {
        // 记录前驱节点
        map.set(i, result[left - 1]);
      }

      // 找到最合适的位置，把索引替换进去
      result[left] = i;
    }
  }

  // 反向追溯
  let l = result.length;
  let last = result[l - 1];

  while (l > 0) {
    l--;
    // 纠正顺序
    result[l] = last;
    // 获取前驱节点
    last = map.get(last);
  }

  return result;
}
