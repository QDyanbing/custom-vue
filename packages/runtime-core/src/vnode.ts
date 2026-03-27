import { isRef, Ref } from '@vue/reactivity';
import { ShapeFlags, isArray, isString, isNumber, isObject, isFunction } from '@vue/shared';
import { getCurrentRenderingInstance } from './component';
import { isTeleport } from './components/Teleport';

/**
 * 文本节点标记
 */
export const Text = Symbol('v-txt');

/**
 * 片段节点标记。
 * 不对应真实 DOM：`createRenderer` 里 `patch` 走 `processFragment`（子节点直接挂到外层 container），`unmount` 只卸载 `children` 子树。
 */
export const Fragment = Symbol('Fragment');

/**
 * 运行时使用的虚拟节点结构（VNode）。
 * 这里的结构是 runtime 自己使用的内部格式，会由 `h` / 渲染器统一创建。
 */
export interface VNode {
  __v_isVNode: true; // 标识这是一个虚拟节点
  type: string | typeof Text | object; // 元素类型（如 'div'）、Text 或组件定义对象
  props?: any; // 传给元素 / 组件的属性
  children?: any; // 子节点，可以是文本或 VNode 数组
  key?: string | number; // 用于高效 diff 的标识
  el?: Element | null; // 关联的真实 DOM 元素
  shapeFlag: number; // 使用位运算标记当前 VNode 的“形状”（元素 / 文本子节点 / 数组子节点）
  component?: any; // 组件实例
  ref?: { r: string | number | Ref | null; i: any } | null; // 用于引用 DOM 元素或组件实例
  appContext?: any; // 应用上下文
  /** `PatchFlags` 位组合；与编译器约定一致时，`renderer` 的 `patchElement` 可跳过全量 `patchProps` */
  patchFlag?: number; // 更新标记
  /** Block Tree 收集到的动态子节点；存在时 `patchElement` 走 `patchBlockChildren` 跳过静态子节点 diff */
  dynamicChildren?: VNode[] | null;
}

/**
 * 判断两个 VNode 是否可以复用同一个 DOM 元素。
 *
 * @param v1 旧的 VNode
 * @param v2 新的 VNode
 * @returns 是否为“同一个” VNode
 */
export function isSameVNode(v1: VNode, v2: VNode): boolean {
  return v1.type === v2.type && v1.key === v2.key;
}

/**
 * 标准化 VNode。
 *
 * @param vnode 虚拟节点
 * @returns 标准化后的虚拟节点
 */
export function normalizeVNode(vnode: any): VNode {
  if (isString(vnode) || isNumber(vnode)) {
    // 如果是string或number，则创建一个文本节点
    return createVNode(Text, null, String(vnode));
  }

  return vnode;
}

/**
 * 在 createVNode 内部使用：对 children 做标准化，并根据 children 的类型设置 vnode 的 shapeFlag。
 *
 * 处理的情况：
 * - 数组：标记 `ARRAY_CHILDREN`
 * - 对象（且父节点是组件）：视为具名插槽，标记 `SLOTS_CHILDREN`
 * - 函数（且父节点是组件）：视为默认插槽，包装成 `{ default: children }`，标记 `SLOTS_CHILDREN`
 * - string / number：转为 string，标记 `TEXT_CHILDREN`
 *
 * 处理完成后会将 shapeFlag 和 children 直接写回 vnode。
 *
 * @param vnode 当前正在创建的 VNode，函数会修改其 shapeFlag 和 children
 * @param children 子节点（可能为 string / number / 数组 / 对象 / 函数等）
 * @returns 标准化后的 children
 */
export function normalizeChildren(vnode: VNode, children: any): any {
  let { shapeFlag } = vnode;

  if (isArray(children)) {
    // 子节点是多个 VNode 组成的数组
    shapeFlag |= ShapeFlags.ARRAY_CHILDREN;
  } else if (isObject(children)) {
    /**
     * 如果子节点是对象，则认为是插槽
     * children = {
     *  header: () => h('div', 'header'),
     * }
     */
    if (shapeFlag & ShapeFlags.COMPONENT) {
      // 如果是组件，则认为是插槽
      shapeFlag |= ShapeFlags.SLOTS_CHILDREN;
    }
  } else if (isFunction(children)) {
    // 如果是函数，则认为是插槽
    if (shapeFlag & ShapeFlags.COMPONENT) {
      // 如果是组件，则认为是插槽
      shapeFlag |= ShapeFlags.SLOTS_CHILDREN;
    }
    children = { default: children };
  } else if (isNumber(children) || isString(children)) {
    // 如果是number，则转换为string
    children = String(children);
    shapeFlag |= ShapeFlags.TEXT_CHILDREN;
  }

  // 处理完成后重新赋值给vnode
  vnode.shapeFlag = shapeFlag;
  vnode.children = children;

  return children;
}

export function normalizeRef(ref) {
  if (!ref) return;
  return {
    r: ref,
    i: getCurrentRenderingInstance(),
  };
}

/**
 * 判断一个值是否为 VNode。
 *
 * @param value 任意值
 * @returns `true` 表示是 VNode，`false` 表示不是
 */
export function isVNode(value: any): boolean {
  return value?.__v_isVNode;
}

/**
 * 创建一个虚拟节点（VNode）。
 *
 * @param type 节点类型：字符串（如 'div'）、Text，或组件对象（含 setup/render）
 * @param props 传入的属性对象
 * @param children 子节点，可以是文本 / 数组 / 单个 VNode
 * @param patchFlag `PatchFlags` 位组合（见 `@vue/shared` 的 `patchFlags.ts`）；渲染器 `patchElement` 在 `patchFlag > 0` 时按标志做定向更新，否则全量对比 props
 * @param isBlock 是否为 Block 根节点（由 `createElementBlock` 传入 `true`）；Block 根节点自身不会被收集进 `currentBlock`，避免自己收集自己
 * @returns 创建好的虚拟节点
 */
export function createVNode(
  type: string | typeof Text,
  props?: any,
  children: any = null,
  patchFlag: number = 0, // 更新标记
  isBlock: boolean = false,
): VNode {
  // shapeFlag 通过位运算记录“节点类型 + 子节点类型”的组合信息
  let shapeFlag = 0;

  // 处理 type 的 shapeFlag
  if (isString(type)) {
    // 当前只处理原生元素，后续可扩展到组件等类型
    shapeFlag = ShapeFlags.ELEMENT;
  } else if (isTeleport(type)) {
    // Teleport 组件：type 为 Teleport 定义对象（含 __isTeleport 标记）
    shapeFlag = ShapeFlags.TELEPORT;
  } else if (isObject(type)) {
    // 有状态组件
    shapeFlag = ShapeFlags.STATEFUL_COMPONENT;
  } else if (isFunction(type)) {
    // 函数组件（形如 function App(props, ctx) {}）
    shapeFlag = ShapeFlags.FUNCTIONAL_COMPONENT;
  }

  const vnode: VNode = {
    __v_isVNode: true,
    type,
    props,
    children: null,
    key: props?.key, // 虚拟节点的 key 属性,作用是用于优化 diff 算法
    el: null, // 虚拟节点对应的 DOM 元素
    shapeFlag,
    ref: normalizeRef(props?.ref),
    appContext: null, // 应用上下文
    patchFlag,
    dynamicChildren: null,
  };

  // 不是block的情况下，才收集到当前的block中
  if (patchFlag > 0 && currentBlock && !isBlock) {
    // 如果 currentBlock 存在，节点是动态的，需要收集到当前的block中
    currentBlock.push(vnode);
  }

  // children 的标准化 和 children 的 shapeFlag 的设置
  normalizeChildren(vnode, children);

  return vnode;
}

/**
 * Block 栈：支持嵌套 Block。
 * 每次 `openBlock()` 会 push 一个新数组，`closeBlock()` 会 pop 并恢复外层 Block。
 */
const blockStack: VNode[][] = [];

/** 当前正在收集动态子节点的 Block 数组；`openBlock()` 创建，`closeBlock()` 弹出 */
let currentBlock: VNode[] | null = null;

/**
 * 开启一个新的 Block 收集上下文。
 * 后续通过 `createVNode` 创建的带 `patchFlag > 0` 的节点会被自动收集到 `currentBlock` 中。
 * 嵌套场景下旧的 `currentBlock` 被推入 `blockStack`。
 */
export function openBlock() {
  currentBlock = [];
  blockStack.push(currentBlock);
}

/**
 * 关闭当前 Block，恢复外层的 `currentBlock`。
 */
export function closeBlock() {
  blockStack.pop();
  // 拿最后一个block
  currentBlock = blockStack.at(-1);
}

/**
 * 将当前收集到的动态子节点挂到 Block 根 VNode 上，然后关闭当前 Block。
 * 若关闭后仍有外层 Block（嵌套场景），则将当前 Block 根作为动态节点收集到外层 Block 中。
 */
function setupBlock(vnode: VNode) {
  vnode.dynamicChildren = currentBlock;
  closeBlock();

  if (currentBlock) {
    currentBlock.push(vnode);
  }
}

/**
 * 创建一个 Block 根元素 VNode。
 * 与 `createVNode` 的区别：传入 `isBlock = true` 使自身不被收集进 `currentBlock`，
 * 并在创建后调用 `setupBlock` 将收集到的动态子节点写入 `dynamicChildren`。
 *
 * @param type 元素类型
 * @param props 属性
 * @param children 子节点
 * @param patchFlag 更新标记
 * @returns Block 根 VNode（携带 `dynamicChildren`）
 */
export function createElementBlock(type: any, props?: any, children?: any, patchFlag?: number) {
  const vnode = createVNode(type, props, children, patchFlag, true);

  setupBlock(vnode);

  return vnode;
}

export function renderList(list: any[], cb: (item: any, index: number) => any) {
  return list.map(cb);
}

export function toDisplayString(value: any) {
  if (value === null || value === undefined) {
    return '';
  }

  if (isString(value)) {
    return value;
  }

  if (isRef(value)) {
    return value.value;
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}
