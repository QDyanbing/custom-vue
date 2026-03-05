# Renderer 说明

### 概览

`renderer.ts` 提供 `createRenderer`，用于创建“平台无关”的渲染入口。

在 DOM 场景里，`@vue/runtime-dom` 会准备宿主操作（创建元素、插入、设置属性等），再把这些能力通过 `options` 传给 `createRenderer`。

`createRenderer` 接收宿主能力之后，内部会组装出一整套：

- 初次挂载：`mountElement`、`mountChildren`
- 更新：`patchElement`、`patchProps`、`patchChildren`
- 卸载：`unmount`、`unmountChildren`

最后通过 `render(vnode, container)` 暴露一个统一入口。

### createRenderer(options)

`createRenderer` 接收一个 `options` 对象（宿主操作集合），并返回一个包含 `render` 方法的对象：

```ts
const renderer = createRenderer(options);
renderer.render(vnode, container);
```

内部会把对象里的宿主方法重命名为 `hostCreateElement`、`hostInsert`、`hostRemove` 等，后续挂载/更新/卸载流程都只依赖这些“宿主钩子”，从而做到与具体平台解耦。

目前已经在 `renderer.ts` 源码里通过 JSDoc 把每个宿主钩子、每个内部 helper 的职责都标注清楚，这里的文档主要帮助理解整体调用关系。

### render(vNode, container)

`render` 的职责是把 VNode 渲染到 `container`，并维护一次渲染的“前后状态”：

- 首次渲染：`container._vnode` 为空，走“挂载整棵树”逻辑。
- 更新渲染：`container._vnode` 不为空，会把老的 vnode 和新的 vnode 一起交给 `patch` 进行对比。
- 传入 `null`：如果之前有渲染过，会调用 `unmount(container._vnode)` 卸载整棵树。

简化后的流程可以概括为：

```ts
if (vnode === null) {
  // 卸载
} else {
  // 挂载或更新
}

container._vnode = vnode;
```

### patch(n1, n2, container, anchor?)

`patch` 是“挂载 + 更新”的统一入口：

- 如果 `n1 === n2`：完全同一个引用，直接返回。
- 如果 `n1` 存在但和 `n2` 不是同一个 VNode（`isSameVNode` 为假）：
  - 说明结构发生了根本变化，先卸载老节点，再当成新节点重新挂载。
- 如果 `n1` 为空：
  - 说明是初次挂载，走 `mountElement`。
- 其他情况：
  - 认为是同一个节点，只需要在原地更新，走 `patchElement`。

这里的 `anchor` 由外层传入，用来控制元素插入的准确位置，当前 demo 里主要在 keyed diff 时使用。

### patchElement 与 children 处理

- `patchElement` 负责：
  - 复用旧的 DOM：`n2.el = n1.el`
  - 调用 `patchProps(el, oldProps, newProps)` 更新属性
  - 调用 `patchChildren(n1, n2)` 更新子节点

- `patchChildren` 通过 `shapeFlag` 区分几种情况：
  - 文本 → 文本：必要时直接改写 `textContent`。
  - 数组 → 文本：先卸载所有旧 children，再设置文本。
  - 文本 → 数组：清空原有文本，再逐个挂载新 children。
  - 数组 / null 之间互相转换：根据场景挂载或卸载整组子节点。

借助 `shapeFlag`，在 children 形态切换时不需要做复杂的类型判断，只要用按位与就能跳到正确分支。

### keyed children 与双端 diff

`renderer.ts` 里实现的是一个“全量 diff”的双端版本，入口是 `patchKeyedChildren(c1, c2, container)`：

- 先从头部开始同步比对前缀：
  - 依次比较 `c1[i]` / `c2[i]`，只要是“同一个 VNode”就递归调用 `patch`
  - 一旦遇到不同的节点就停下
- 再从尾部开始同步比对后缀：
  - 依次比较 `c1[e1]` / `c2[e2]`，同样只要相同就继续向内收缩
- 最后根据指针关系得出两类情况：
  - `i > e1`：老的先走到头，说明“只多了新节点”，需要把剩余的新节点挂载上去
  - `i > e2`：新的先走到头，说明“只多了老节点”，需要把剩余的老节点卸载掉

这一版实现重点在于演示“头尾指针收缩 + 锚点插入 + 按 key 识别”的思路，后面可以在此基础上继续丰满中间乱序部分的 diff 逻辑。
