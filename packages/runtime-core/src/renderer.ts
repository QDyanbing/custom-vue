import { ShapeFlags } from '@vue/shared';
import { isSameVNode, Text, normalizeVNode, type VNode } from './vnode';
import { createComponentInstance, setupComponent } from './component';
import { createAppApi } from './apiCreateApp';
import { ReactiveEffect } from '@vue/reactivity';
import { queueJob } from './scheduler';
import { shouldUpdateComponent } from './componentRenderUtils';
import { updateProps } from './componentProps';

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
    setText: hostSetText,
    createText: hostCreateText,
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
      const child = (children[i] = normalizeVNode(children[i]));
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
      const n2 = (c2[i] = normalizeVNode(c2[i]));
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
      const n2 = (c2[e2] = normalizeVNode(c2[e2]));
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
        const n2 = (c2[i] = normalizeVNode(c2[i]));
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
        const n2 = (c2[j] = normalizeVNode(c2[j]));
        keyToNewIndexMap.set(n2.key, j);
      }

      let pos = -1;
      // 是否需要移动
      let moved = false;

      // 遍历老的节点，找到 key 相同的节点，并记录下标
      for (let j = s1; j <= e1; j++) {
        const n1 = c1[j];
        const newIndex = keyToNewIndexMap.get(n1.key);
        if (newIndex !== undefined) {
          if (newIndex > pos) {
            // 如果每一次都比上一次大，表示本来就是连续递增的，不需要计算最长递增子序列
            pos = newIndex;
          } else {
            // 如果突然出现了一个比 pos 小的值，则需要计算最长递增子序列
            moved = true;
          }

          newIndexToOldIndexMap[newIndex] = j;

          // 找到 key 相同的则 patch
          patch(n1, c2[newIndex], container);
        } else {
          // 没找到则卸载旧节点
          unmount(n1);
        }
      }

      // 最长递增子序列
      // 如果moved为true，则需要计算最长递增子序列
      const newIndexSequence = moved ? getSequence(newIndexToOldIndexMap) : [];
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
   * 处理元素 div，p，span，等
   *
   * @param n1 老节点，如果有则需要和 n2 做 diff；如果没有则直接挂载 n2
   * @param n2 新节点
   * @param container 要挂载的容器
   * @param anchor 锚点，用于控制插入位置
   */
  const processElement = (n1, n2, container, anchor = null) => {
    if (n1 == null) {
      // 挂载新节点
      mountElement(n2, container, anchor);
    } else {
      // 更新老节点
      patchElement(n1, n2);
    }
  };

  /**
   * 处理文本节点的挂载和更新。
   *
   * 文本节点在 VNode 层使用统一的 `Text` 标记（见 `vnode.ts`），
   * 这里对应的宿主操作是 `hostCreateText` 与 `hostSetText`。
   */
  const processText = (n1, n2, container, anchor = null) => {
    if (n1 == null) {
      // 挂载
      const el = hostCreateText(n2.children);
      n2.el = el;
      hostInsert(el, container, anchor);
    } else {
      // 更新
      const el = (n2.el = n1.el);
      if (n2.children !== n1.children) {
        hostSetText(el, n2.children);
      }
    }
  };

  /**
   * 在组件重新执行 render 之前，把新 VNode 上的 props/slots 同步到实例上。
   *
   * 调用时机：`componentUpdateFn` 检测到 `instance.next` 存在（即父组件触发的更新），
   * 在执行 render 之前先调用本函数，让 instance 上的数据与最新的 VNode 对齐。
   *
   * @param instance 组件实例
   * @param nextVNode 新的组件 VNode（由父组件传入的更新后 VNode）
   */
  const updateComponentPreRender = (instance, nextVNode) => {
    /**
     * 复用组件实例
     * 更新 props
     * 更新 slots
     */
    instance.vnode = nextVNode;
    instance.next = null;

    updateProps(instance, nextVNode);
  };

  /**
   * 为组件实例建立响应式渲染 effect。
   *
   * 内部定义 `componentUpdateFn`，作为 `ReactiveEffect` 的回调：
   * - 首次执行（`!instance.isMounted`）：调用 render 得到子树并 patch 挂载，
   *   同时把 `vnode.el` 指向子树的根 DOM（供 `$el` 读取）
   * - 后续执行（更新）：
   *   - 若 `instance.next` 存在，说明是父组件传入新 props 触发的更新，
   *     先调 `updateComponentPreRender` 同步 props/slots，再重新 render
   *   - 否则是自身响应式数据变化触发的更新，直接 render 并 patch 子树
   *
   * effect 的 scheduler 被设置为 `queueJob(update)`，把更新推入微任务。
   *
   * @param instance 组件实例
   * @param container 挂载容器
   * @param anchor 锚点
   */
  const setupRenderEffect = (instance, container, anchor = null) => {
    const componentUpdateFn = () => {
      /**
       * 区分挂载和更新
       */

      if (!instance.isMounted) {
        const { vnode, render } = instance;
        // 挂载
        // 调用 render 函数拿到 subTree，并绑定 this 为 instance.proxy
        const subTree = render.call(instance.proxy);
        // 将 subTree 挂载到页面上
        patch(null, subTree, container, anchor);
        // 组件的el 指向 subTree 的el，他们是相同的
        vnode.el = subTree.el;
        // 保存子树
        instance.subTree = subTree;
        // 已经挂载过了
        instance.isMounted = true;
      } else {
        let { vnode, render, next } = instance;

        if (next) {
          // 父组件传的属性触发的更新
          updateComponentPreRender(instance, next);
        } else {
          //  如果没有就用之前的
          next = vnode;
        }

        // 更新
        const prevSubTree = instance.subTree;
        // 调用 render 函数 拿到 subTree，并绑定 this 为 instance.proxy
        const subTree = render.call(instance.proxy);
        // 将 subTree 挂载到页面上
        patch(prevSubTree, subTree, container, anchor);
        // 组件的el 指向 subTree 的el，他们是相同的
        vnode.el = subTree.el;
        // 保存子树
        instance.subTree = subTree;
      }
    };

    // 创建一个响应式effect，当响应式数据变化时，会执行componentUpdateFn
    const effect = new ReactiveEffect(componentUpdateFn);

    const update = effect.run.bind(effect);

    instance.update = update;

    effect.scheduler = () => {
      queueJob(update);
    };

    update();
  };

  /**
   * 挂载组件类型 VNode：创建实例 → 执行 setup → 用实例代理作为 this 调 render 得到子树 → patch 子树。
   *
   * - 组件实例的创建与 props/attrs 解析由 `createComponentInstance` + `setupComponent` 完成
   * - `componentUpdateFn` 被包装进 `ReactiveEffect`，从而在响应式数据变化时重新执行 render 并 diff 子树
   * - 当前是最小实现：通过 `effect.scheduler` 把更新函数交给 `queueJob`，在微任务中批量执行（未做去重/合并）
   *
   * @param vnode 组件类型的 VNode（vnode.type 为组件定义对象）
   * @param container 挂载到的父容器
   * @param anchor 锚点，插入位置
   */
  const mountComponent = (vnode: VNode, container: Element, anchor = null) => {
    /**
     * 1. 创建组件实例
     * 2. 初始化组件状态
     * 3. 挂载组件到页面
     */
    // 创建组件实例
    const instance = createComponentInstance(vnode);
    // 将组件实例挂载到 vnode 上,方便后续更新时使用
    vnode.component = instance;
    // 初始化组件状态
    setupComponent(instance);

    setupRenderEffect(instance, container, anchor);
  };

  /**
   * 组件类型 VNode 的更新入口。
   *
   * 当父组件重新渲染时，子组件会走到这里：
   * 1. 复用旧 VNode 上的 `component`（组件实例），挂到新 VNode 上
   * 2. 调用 `shouldUpdateComponent` 判断 props/slots 是否有变化
   *    - 有变化：把新 VNode 暂存到 `instance.next`，再调 `instance.update()` 触发子树更新
   *    - 无变化：只做 `el` 复用和 `vnode` 引用更新，跳过子树 diff
   *
   * @param n1 旧组件 VNode
   * @param n2 新组件 VNode
   */
  const updateComponent = (n1, n2) => {
    const instance = (n2.component = n1.component);
    /**
     * 该更新：props 和 slots 变化
     * 不该更新：啥都没变
     */
    if (shouldUpdateComponent(n1, n2)) {
      // 绑定新的 vnode 到实例上，方便后续更新时使用
      instance.next = n2;

      // 更新
      instance.update();
    } else {
      // 没有任何属性变化，则不需要更新；但是需要复用 el 和 更新 vnode
      // 即使不需要更新，el 也是需要复用的
      n2.el = n1.el;
      // 更新 vnode
      instance.vnode = n2;
    }
  };

  /**
   * 处理组件的挂载和更新。n1 为空时挂载（mountComponent）；n1 存在时走 updateComponent 做组件更新。
   * @param n1 旧组件 VNode，null 表示挂载
   * @param n2 新组件 VNode
   * @param container 容器
   * @param anchor 锚点
   */
  const processComponent = (n1, n2, container, anchor = null) => {
    if (n1 == null) {
      // 挂载
      mountComponent(n2, container, anchor);
    } else {
      // 更新
      updateComponent(n1, n2);
    }
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
      // 这里是学习用的简化处理：直接按“卸载旧 → 重新挂载新”走，不做更细的分支判断
      unmount(n1);
      n1 = null;
      mountElement(n2, container);
    }

    const { shapeFlag, type } = n2;

    switch (type) {
      case Text:
        processText(n1, n2, container, anchor);
        break;
      default:
        if (shapeFlag & ShapeFlags.ELEMENT) {
          // 处理 dom 元素；div，p，span，等
          processElement(n1, n2, container, anchor);
        } else if (shapeFlag & ShapeFlags.COMPONENT) {
          // 处理组件类型
          processComponent(n1, n2, container, anchor);
        }
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
    createApp: createAppApi(render),
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
  // result[j] = 当前「长度为 j+1 的递增链里，尾巴最小」的那个元素在 arr 中的下标。
  // 例：arr=[1,2,9,12] 扫完后 result=[0,1,2,3]，表示长度 1 尾巴在 0(1)，长度 2 尾巴在 1(2)，长度 3 尾巴在 2(9)，长度 4 尾巴在 3(12)。
  const result = [];

  // 前驱表：map.get(下标 i) = 在「某条递增链」里排在 i 前面的那个下标。
  // 因为 result 会被反复覆盖，光看 result 不知道谁真的接在谁后面，所以用 map 记下「谁接在谁后面」。
  // 例：上面 arr=[1,2,9,12]，map 里 1→0, 2→1, 3→2，最后从 3 往前推得到 [0,1,2,3] 这条链。
  const map = new Map();

  // 正向构建：从左到右扫 arr，每个数要么接在已有链后面（链变长），要么替换某条更短链的尾巴（该长度尾巴变小）
  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];

    // diff 场景里 -1 表示该位置不可复用（对应节点被删或不可复用），不参与 LIS，跳过即可
    if (item === -1 || item === undefined) continue;

    // 第一个有效元素：还没有任何链，它自己就是「长度为 1 的链」的尾巴。例：arr[0]=1 → result=[0]。
    if (result.length === 0) {
      result.push(i);
      continue;
    }

    const lastIndex = result[result.length - 1];
    const lastItem = arr[lastIndex];

    // 当前值比「当前最长链」的尾巴还大 → 直接接在链尾，链长 +1，并记前驱。
    // 例：已有 1,2,9（result 长度 3），来了 12，12>9，result.push(i)，map.set(12 的下标, 9 的下标)。
    if (item > lastItem) {
      result.push(i);
      map.set(i, lastIndex);
      continue;
    }

    // 当前值不比链尾大，不能接在最长链后面。但要维护「每长度尾巴尽量小」，所以用 item 去替换「某条更短链」的尾巴。
    // 例：已有 1,2,9,12（长度 4）。来一个 8：8 接 12 后面不对（8<12），所以不会动长度 4。
    // 二分找的是「第一个尾巴 >= item」的位置：只有尾巴比 item 大，用 item 替换掉才能让该长度尾巴变小；若尾巴已经 <= item，替换没意义。
    // 对 8 来说，result 里尾巴分别是 1,2,9,12，第一个 >=8 的是 9（长度 3 的尾巴），所以 left 会指向长度 3 那一格。
    let left = 0;
    let right = result.length - 1;
    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      const midItem = arr[result[mid]];

      if (midItem < item) {
        left = mid + 1; // 中间尾巴更小，说明「第一个 >= item」在右边
      } else {
        right = mid; // 中间尾巴已经 >= item，可能是替换点，但左边可能还有更前的，往左收
      }
    }

    // 只有「该位置当前尾巴比 item 大」才替换：替换后该长度尾巴变小。若相等则不替换（保持原下标顺序）。
    if (arr[result[left]] > item) {
      // left=0 时表示 item 替换「长度为 1 的链」的尾巴，这条链只有它自己，没有前驱，不记。
      // left>0 时 item 是接在「长度为 left 的链的尾巴」后面，形成长度为 left+1 的新链，所以要记 i 的前驱是 result[left-1]。
      if (left > 0) {
        map.set(i, result[left - 1]);
      }
      result[left] = i; // 用 i 替换「长度为 left+1 的链」的尾巴（替换的是更短链，最长链不动）
    }
  }

  // 反向追溯：result 里存的是「每长度尾巴最小的下标」，这些下标可能来自不同时刻的替换，不是同一条链。
  // 所以从 result 最后一个（最长链的尾巴）开始，用 map 往前推「前一个是谁」，把整条链填回 result[0..l-1]，得到真正的 LIS 下标序列。
  // 例：result 可能是 [2,1,4,5]，长度 4，从 last=5 开始，map.get(5)=4, map.get(4)=1, map.get(1)=2，填回后 result=[2,1,4,5] 即顺序正确。
  let l = result.length;
  let last = result[l - 1];

  while (l > 0) {
    l--;
    result[l] = last; // 当前长度 l+1 的链尾就是 last
    last = map.get(last); // 这条链里 last 的前一个节点，继续往前
  }

  return result;
}
