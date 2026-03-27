# VNode 与 createVNode 说明

## 概述

`vnode.ts` 定义了运行时内部使用的虚拟节点结构 `VNode`，并提供相关的工具函数。

## 目录

- [VNode 结构](#vnode-结构)
- [Text 与文本节点](#text-与文本节点)
- [Fragment 与片段根](#fragment-与片段根)
- [normalizeVNode(vnode)](#normalizevnodevnode)
- [normalizeChildren(vnode, children)](#normalizechildrenvnode-children)
- [createVNode(type, props?, children?, patchFlag?, isBlock?)](#createvnodetype-props-children-patchflag-isblock)
- [renderList(list, cb)](#renderlistlist-cb)
- [toDisplayString(value)](#todisplaystringvalue)
- [patchFlag 与 PatchFlags](#patchflag-与-patchflags)
- [Block Tree 与 dynamicChildren](#block-tree-与-dynamicchildren)
- [isVNode(value)](#isvnodevalue)
- [isSameVNode(v1, v2)](#issamevnodev1-v2)

- `VNode`：虚拟节点的数据结构
- `Text`：文本类型 VNode 的 type 标记（Symbol），供 renderer 走 `processText`
- `Fragment`：片段类型 VNode 的 type 标记（Symbol），供 renderer 走 `processFragment`；不生成包裹 DOM
- `normalizeVNode`：将 string/number 转为 Text 类型 VNode，供 renderer 在 children 处理时统一成 VNode
- `normalizeChildren`：在创建 VNode 时对 children 做标准化并设置对应的 shapeFlag（处理文本、数组、插槽等），供 `createVNode` 内部使用
- `createVNode`：创建 VNode 的工厂函数；`type` 可为字符串（元素）、`Text`（文本）、`Fragment`（片段）、组件对象（有状态组件）或函数（函数组件）；可选第四参 `patchFlag` 写入 `PatchFlags` 位组合供 `patchElement` 定向更新；第五参 `isBlock` 标记是否为 Block 根节点
- `openBlock`：开启 Block 收集上下文，后续创建的动态节点会被收集到 `currentBlock`
- `closeBlock`：关闭当前 Block，恢复外层 Block 上下文
- `createElementBlock`：创建 Block 根元素 VNode，调用 `createVNode` 后将 `currentBlock` 写入 `dynamicChildren`
- `isVNode`：判断一个值是否已经是 VNode
- `isSameVNode`：判断两个 VNode 在 diff 阶段是否视为"同一个节点"

这些内容会被 `h.ts` 和 `renderer.ts` 共同使用：  
`h` 负责把用户多种调用方式标准化为 VNode，`renderer` 根据 VNode 的结构和标记信息决定如何挂载、更新和卸载真实 DOM；子节点中的原始值由 renderer 侧通过 `normalizeVNode` 转为 Text VNode。

## VNode 结构

`VNode` 里包含渲染所需的关键信息：

- `type`：节点类型——字符串表示元素（如 `'div'`）；`Text` 表示文本节点；`Fragment` 表示片段（多根/无包裹层）；对象表示有状态组件（含 `setup`、`render` 等）或 `Teleport` 定义对象；函数表示函数组件（直接通过函数返回子树）
- `props`：传入的属性/事件（`class`、`style`、`onClick` 等）
- `children`：子节点，可以是：
  - 文本（string）
  - VNode 数组
  - 插槽对象 `{ slotName: renderFn }`（当父节点为组件时）
- `key`：用于列表 diff 场景识别节点身份
- `el`：挂载后的真实 DOM 元素引用（初始为 `null`，由 renderer 在运行时填充）
- `shapeFlag`：使用位运算记录"节点类型 + 子节点类型"的组合信息
- `component`：当 VNode 类型为组件时，渲染器在 `mountComponent` 中会把创建好的组件实例挂到这里；后续 `updateComponent` 通过 `n2.component = n1.component` 复用实例，避免重复创建
- `ref`：模板 ref 的内部表示，结构为 `{ r: rawRef, i: instance }`，其中 `r` 是原始 ref（字符串或 `Ref` 对象），`i` 是当前正在渲染的组件实例；渲染器会把这个对象交给 `setRef`（见 [renderTemplateRef.md](./renderTemplateRef.md)）做实际赋值/清理
- `appContext`：应用上下文，createApp 在 mount 时挂到根 vnode 上（`vnode.appContext = context`），供 `createComponentInstance` 在创建根组件实例时使用；子组件的 appContext 从 parent 继承，不依赖 vnode
- `transition`（运行时附加，非 `createVNode` 必填）：由 `<Transition>` 在渲染子节点时写入，值为 `{ beforeEnter, enter, leave }`；`renderer` 的 `mountElement` / `unmount` 读取后做进入、离开动画，详见 [components/Transition.md](./components/Transition.md)
- `patchFlag`：可选的更新提示位掩码，枚举定义在 `@vue/shared` 的 `PatchFlags`。`patchFlag > 0` 时，`renderer` 的 `patchElement` 可按位只更新 `class` / `style` / 动态文本等；为 0 时走全量 `patchProps`。详见 [patchFlag 与 PatchFlags](#patchflag-与-patchflags)。
- `dynamicChildren`：由 Block Tree 机制收集的动态子节点数组。当 `dynamicChildren` 存在时，`patchElement` 只对这些动态节点调用 `patchBlockChildren`，跳过静态子节点的 diff，从而将更新复杂度从 O(模板节点总数) 降到 O(动态节点数)。详见 [Block Tree 与 dynamicChildren](#block-tree-与-dynamicchildren)。

借助 `shapeFlag`，后续在 `renderer` 里可以只通过按位与来判断当前 VNode 属于哪种形态，而不需要到处写 `typeof` / `Array.isArray` 之类的判断。

## Text 与文本节点

`Text` 是一个 `Symbol('v-txt')`，用作"文本类型"VNode 的 `type`。当子节点在写法上是 string 或 number 时，不会直接作为元素 VNode 的 `children` 字符串存，而是先被 `normalizeVNode` 转成 `type === Text`、`children` 为字符串的 VNode，再参与挂载和 diff。这样在 renderer 里可以统一用 `patch` 处理元素和文本，并在 `patch` 内通过 `type === Text` 走 `processText`。

## Fragment 与片段根

`Fragment` 是一个 `Symbol('Fragment')`，用作“片段”VNode 的 `type`。片段**不对应**单独的真实 DOM 节点，只承载一组子 VNode：`renderer` 在 `patch` 里通过 `type === Fragment` 走 `processFragment`——初次挂载时对 `children` 调用 `mountChildren`（子节点直接插入外层 `container`），更新时走 `patchChildren` 做子列表 diff。卸载时 `unmount` 在 Fragment 分支里只 `unmountChildren(children)`，不会对片段本身调用 `hostRemove`。

在 demo 里常见写法是 `h(Fragment, null, [h('div', ...), h('div', ...)])`，使多个兄弟节点挂到同一父容器下而不多套一层 `div`。

## normalizeVNode(vnode)

把"可能是原始值"的子节点统一成 VNode，供 renderer 在挂载和 diff 时使用：

- 若 `vnode` 是 `string` 或 `number`，返回 `createVNode(Text, null, String(vnode))`，即一个文本类型的 VNode。
- 否则认为已经是 VNode，直接返回。

在 `mountChildren`、`patchKeyedChildren` 等逻辑里，会对 children 数组中的每一项调用 `normalizeVNode`，保证传给 `patch` 的始终是 VNode。

## patchFlag 与 PatchFlags

`patchFlag` 与 `shapeFlag` 职责不同：`shapeFlag` 描述**节点类型与子节点形态**（元素 / 组件 / 文本子节点 / 数组子节点等）；`patchFlag` 描述**同一元素节点在更新时哪些 prop 或子文本可能变化**，供 `patchElement` 做“定向补丁”。

- 枚举与各标志含义见 [@vue/shared 的 patchFlags.md](../../shared/src/patchFlags.md)。
- 本仓库 `renderer.ts` 中已实现：`PatchFlags.TEXT`、`CLASS`、`STYLE` 在 `patchFlag > 0` 时的分支行为；其余标志位可在后续扩展中与官方 Vue 对齐。

手写 `createVNode` 时传入第四参即可带上标志，例如示例 `24-demo.html` 使用 `PatchFlags.TEXT` 标记动态文本子节点。

## Block Tree 与 dynamicChildren

Block Tree 是 Vue3 编译器与运行时配合的一套性能方案。编译器在模板编译时会用 `openBlock()` + `createElementBlock()` 包裹模板根节点，在 Block 作用域内创建的所有带 `patchFlag > 0` 的 VNode 都会被自动收集到 `currentBlock` 数组中；当 `createElementBlock` 调用 `setupBlock` 时，这个数组会写入 Block 根 VNode 的 `dynamicChildren` 字段。

更新时，`patchElement` 检测到新旧 VNode 都携带 `dynamicChildren`，就只遍历 `dynamicChildren` 调用 `patchBlockChildren`（逐个 `patch` 对应位置的动态节点），完全跳过静态子节点的比对。

### 运行时 API

| API | 作用 |
|-----|------|
| `openBlock()` | 创建新的 `currentBlock = []` 并压入 `blockStack`；嵌套 Block 时旧的 Block 被保留在栈里 |
| `closeBlock()` | 弹出 `blockStack` 栈顶，恢复外层 Block 为 `currentBlock` |
| `setupBlock(vnode)` | 将 `currentBlock` 赋给 `vnode.dynamicChildren`，调用 `closeBlock()`；若外层还有 Block，将当前 Block 根 VNode 收集到外层 Block |
| `createElementBlock(type, props?, children?, patchFlag?)` | 以 `isBlock = true` 调用 `createVNode`（阻止自身被收集），再调 `setupBlock` 完成 Block 的关闭与赋值 |

### 扁平收集与嵌套 Block

**扁平收集**：无论动态节点在模板中嵌套多深（如 `<div>` → `<p>` → 动态 `<span>`），只要它们带 `patchFlag > 0`，都会被收集到同一个 `currentBlock` 中。`dynamicChildren` 是一个扁平数组，不反映 DOM 层级结构。

**嵌套 Block**：当模板中有结构性指令（如 `v-if` / `v-for`）时，编译器会在这些位置额外生成 `openBlock()` / `createElementBlock()`，形成子 Block。`blockStack` 保证内层 Block 收集自己的动态子节点，关闭后内层 Block 根 VNode 作为一个整体被收集到外层 Block 的 `dynamicChildren` 中。

### 避免自收集

`createVNode` 的第五参 `isBlock` 在 `createElementBlock` 中传入 `true`。收集条件为 `patchFlag > 0 && currentBlock && !isBlock`，这防止 Block 根节点把自己收集进自己的 `currentBlock`，否则会产生循环引用。

### 与 renderer 的协作

`renderer.ts` 中 `patchElement` 的逻辑为：

```ts
if (dynamicChildren && n1.dynamicChildren) {
  patchBlockChildren(n1.dynamicChildren, n2.dynamicChildren, el, parentComponent);
} else {
  patchChildren(n1, n2, el, parentComponent);
}
```

有 `dynamicChildren` 时走 `patchBlockChildren`（只对比动态节点列表），否则走传统的 `patchChildren`（全量 diff）。

### 手写示例

见 `25-demo.html`：手动调用 `openBlock()` / `createElementBlock()` 模拟编译器输出，观察 `vnode.dynamicChildren` 仅包含带 `patchFlag` 的动态节点，静态节点不在其中。该示例中动态 `<p>` 嵌套在静态 `<p>` 内部，但仍被扁平收集到根 Block 的 `dynamicChildren` 里。

## normalizeChildren(vnode, children)

在 `createVNode` 内部使用，负责对 children 做标准化并根据 children 的类型设置 vnode 的 `shapeFlag`。函数会直接修改传入的 `vnode` 对象（写回 `shapeFlag` 和 `children`）。

处理逻辑按 children 类型分支：

| children 类型 | 处理方式 | shapeFlag 追加 |
|--------------|---------|---------------|
| 数组 | 原样保留 | `ARRAY_CHILDREN` |
| 对象（且 vnode 为组件） | 视为具名插槽 `{ header: () => h(...) }` | `SLOTS_CHILDREN` |
| 函数（且 vnode 为组件） | 视为默认插槽，包装成 `{ default: children }` | `SLOTS_CHILDREN` |
| string / number | 统一转为 string | `TEXT_CHILDREN` |

插槽的识别依赖于 vnode 本身的 `shapeFlag` 是否包含 `COMPONENT`——只有组件类型的 VNode 才会把对象/函数形式的 children 当作插槽处理。

与 `initSlots`（见 [componentSlots.md](./componentSlots.md)）配合：`normalizeChildren` 把 children 标记为插槽并存到 vnode 上，`initSlots` 再把它们赋值到 `instance.slots`。

## normalizeRef(ref)

`normalizeRef` 用于在创建 VNode 时，把模板上的 `ref` 标准化成统一的内部结构，便于渲染器在挂载/卸载阶段统一处理：

- 当 `ref` 为空时返回 `undefined`
- 否则返回 `{ r: ref, i: getCurrentRenderingInstance() }`

其中：

- `r`（rawRef）：原始的 ref 值，可以是：
  - 组合式 API 下的 `Ref` 对象（例如 `const elRef = ref(null)`）
  - 字符串（例如 `'elRef'`，会映射到 `instance.refs.elRef`）
- `i`（instance）：当前正在渲染的组件实例，由 `getCurrentRenderingInstance()` 提供

在渲染阶段，renderer 会把这个对象传给 `setRef(ref, vnode)`（见 [renderTemplateRef.md](./renderTemplateRef.md)），根据 `shapeFlag` 决定将 DOM 元素还是组件实例写入 ref。

## createVNode(type, props?, children?, patchFlag?, isBlock?)

`createVNode` 的职责是构造一个符合 `VNode` 约定的数据结构，并在创建阶段把"节点类型 / 子节点类型"编码进 `shapeFlag`。第四参 `patchFlag` 默认 `0`，非 0 时写入 vnode，供 `patchElement` 使用（见上一节）。第五参 `isBlock` 默认 `false`，为 `true` 时阻止该节点被收集进 `currentBlock`（供 `createElementBlock` 调用）。

流程分两步：

1. **确定节点自身类型**（type 的 shapeFlag）：
   - 当 `type` 是字符串时：记为元素节点，`shapeFlag = ShapeFlags.ELEMENT`
   - 当 `type` 是对象时（组件定义）：记为有状态组件，`shapeFlag = ShapeFlags.STATEFUL_COMPONENT`
   - 当 `type` 是 Teleport 定义对象（含 `__isTeleport` 标记）时：记为 Teleport 节点，`shapeFlag = ShapeFlags.TELEPORT`
   - 当 `type` 是函数时：记为函数组件，`shapeFlag = ShapeFlags.FUNCTIONAL_COMPONENT`

2. **标准化 children 并追加子节点类型标记**：
   - 先创建 vnode 对象（`children` 暂为 `null`，`patchFlag` / `dynamicChildren` 由参数直接写入 vnode）
   - 若 `patchFlag > 0 && currentBlock && !isBlock`，将 vnode 收集到 `currentBlock` 中（Block Tree 动态节点收集）
   - 调用 `normalizeChildren(vnode, children)`，由该函数根据 children 类型设置 `shapeFlag` 并写回 `children`
   - 这样 children 的 shapeFlag 设置（文本/数组/插槽）与 children 的标准化（函数转对象、number 转 string）统一在 `normalizeChildren` 中完成

伪代码可以理解为：

```ts
if (isString(type)) {
  shapeFlag = ShapeFlags.ELEMENT;
} else if (isTeleport(type)) {
  shapeFlag = ShapeFlags.TELEPORT;
} else if (isObject(type)) {
  shapeFlag = ShapeFlags.STATEFUL_COMPONENT;
} else if (isFunction(type)) {
  shapeFlag = ShapeFlags.FUNCTIONAL_COMPONENT;
}

const vnode = { type, props, children: null, shapeFlag, patchFlag, dynamicChildren: null, ... };

// Block Tree 动态节点收集（isBlock 为 true 时跳过，防止 Block 根收集自身）
if (patchFlag > 0 && currentBlock && !isBlock) {
  currentBlock.push(vnode);
}

normalizeChildren(vnode, children);

return vnode;
```

最终返回的 VNode 会同时携带：

- 结构信息：`type` / `props` / `children` / `key`
- 运行时引用：`el`（由 renderer 填充）
- 形态标记：`shapeFlag`（节点类型 + 子节点类型的位组合）
- 补丁提示：`patchFlag`（可选，来自第四参）
- 动态子节点：`dynamicChildren`（由 Block Tree 机制收集，初始为 `null`，`setupBlock` 时写入）
- 模板引用：`ref`（若 `props.ref` 存在，则由 `normalizeRef` 生成），供 `setRef` 在渲染阶段写入 DOM / 组件实例

## renderList(list, cb)

`renderList` 是列表渲染辅助函数，行为等价于 `Array.prototype.map`：

- 入参 `list` 为源数组
- 入参 `cb(item, index)` 为映射回调
- 返回值是回调结果组成的新数组（通常是一组 VNode）

在示例 `26-demo.html` 中，它用于把 `list.value` 转成 `createVNode('div', { key: item }, ...)` 的节点数组，供 `Fragment` 直接渲染。

## toDisplayString(value)

`toDisplayString` 用于把渲染值统一转换成可展示字符串，规则如下：

- `null / undefined` -> `''`
- `string` -> 原值
- `Ref` -> `ref.value`
- `object` -> `JSON.stringify(value)`
- 其他类型 -> `String(value)`

这个函数主要服务于模板插值语义，保证文本节点写入时拿到稳定的字符串结果。

## isVNode(value)

`isVNode` 用于判断一个值是否已经是 VNode：

- 通过内部的 `__v_isVNode` 标记识别
- 主要服务于 `h` 这类 API，在处理参数时区分"普通对象"与"已经是 VNode"

例如在 `h` 里，当第二个参数是对象时，需要分情况判断：

- 如果是 VNode：把它当作 children 处理
- 如果是普通对象：把它当作 props 处理

## isSameVNode(v1, v2)

`isSameVNode` 用于在 diff 阶段判断两个 VNode 是否可以复用同一个真实 DOM 节点：

- 判断依据只有两点：
  - `type` 相同
  - `key` 相同
- 一旦任意一项不同，就视为"完全不同的节点"，不再尝试复用，renderer 会选择卸载老节点、重新挂载新节点。

这条规则和 Vue3 源码的核心思想一致：  
只要 type + key 一致，就认为可复用，具体 props / children 的差异交给后续更细粒度的 patch 流程处理。
