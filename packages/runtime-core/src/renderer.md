# Renderer 说明

### 概览

`renderer.ts` 提供 `createRenderer`，用于创建平台无关的渲染入口。返回对象包含 `render`（直接渲染 VNode 到容器）和 `createApp`（由 [apiCreateApp](./apiCreateApp.md) 提供，用于根组件挂载/卸载）。

### 目录

- [createRenderer(options)](#createrendereroptions)
- [render(vNode, container)](#rendervnode-container)
- [patch(n1, n2, container, anchor?)](#patchn1-n2-container-anchor)
- [patch 对类型的分发（Element / Text / Fragment / Component）](#patch-对类型的分发element--text--fragment--component)
- [Teleport 组件](#teleport-组件)
- [KeepAlive 组件](#keepalive-组件)
- [Transition 组件](#transition-组件)
- [组件 processComponent、mountComponent 与 updateComponent](#组件-processcomponentmountcomponent-与-updatecomponent)
- [patchElement、patchFlag 与 children 处理](#patchelementpatchflag-与-children-处理)
- [keyed children 与双端 diff](#keyed-children-与双端-diff)
- [乱序 diff 与最长递增子序列（LIS）](#乱序-diff-与最长递增子序列lis)
- [文本节点 processText](#文本节点-processtext)

在 DOM 场景里，`@vue/runtime-dom` 会准备宿主操作（创建元素、插入、设置属性等），再把这些能力通过 `options` 传给 `createRenderer`。

`createRenderer` 接收宿主能力之后，内部会组装出一整套：

- 初次挂载：`mountElement`、`mountChildren`；`type === Fragment` 走 `processFragment`（子节点直接挂到当前 `container`）；组件类型走 `mountComponent`（依赖 [component](./component.md) 的 `createComponentInstance`、`setupComponent`）
- 更新：`patchElement`、`patchProps`、`patchChildren`；组件更新由 `setupRenderEffect` 内注册的 `ReactiveEffect` 驱动：当 `setupState` 中响应式数据变化时，重新执行 render 得到新子树，再 `patch(prevSubTree, subTree)` 做子树 diff；父组件传入新 props/slots 时则走 `updateComponent` → `shouldUpdateComponent` → `updateComponentPreRender` → `updateProps` + `updateSlots` 的链路
- 卸载：`unmount`、`unmountChildren`、`unmountComponent`；`Fragment` 无自身 DOM，只卸载其 `children`；组件卸载前/后通过 [apiLifecycle](./apiLifecycle.md) 的 `triggerHook` 触发 `beforeUnmount` / `unmounted`
- 生命周期：在 `setupRenderEffect` 的 componentUpdateFn 中，首渲前后触发 `beforeMount` / `mounted`，更新前后触发 `beforeUpdate` / `updated`（见 [apiLifecycle.md](./apiLifecycle.md)）

最后通过 `render(vnode, container)` 与 `createApp` 对外暴露。

### createRenderer(options)

接收宿主能力集合 `options`，返回带 `render` 和 `createApp` 的对象：

```ts
const renderer = createRenderer(options);
renderer.render(vnode, container);                    // 直接渲染
const app = renderer.createApp(RootComponent, rootProps);
app.mount(container);                                // 根组件挂载
```

- **render**：将 VNode 渲染到指定容器；传 `null` 表示卸载。
- **createApp**：由 `createAppApi(render)` 生成，用于创建应用实例并挂载根组件，详见 [apiCreateApp.md](./apiCreateApp.md)。

内部将 options 中的宿主方法重命名为 `hostCreateElement`、`hostInsert`、`hostNextSibling`、`hostRemove` 等，挂载/更新/卸载流程仅依赖这些宿主钩子，与具体平台解耦。其中 `hostNextSibling` 用于在 patch 时，当 n1 与 n2 不是同一节点（需卸载旧节点并挂载新节点）时，获取旧节点的下一个兄弟作为锚点，保证新节点插入到原位置。

目前已经在 `renderer.ts` 源码里通过 JSDoc 把每个宿主钩子、每个内部 helper 的职责都标注清楚，这里的文档主要帮助理解整体调用关系。

### render(vNode, container)

`render` 的职责是把 VNode 渲染到 `container`，并维护一次渲染的"前后状态"：

- 首次渲染：`container._vnode` 为空，走"挂载整棵树"逻辑。
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

### patch(n1, n2, container, anchor?, parentComponent?)

`patch` 是"挂载 + 更新"的统一入口：

- 如果 `n1 === n2`：完全同一个引用，直接返回。
- 如果 `n1` 存在但和 `n2` 不是同一个 VNode（`isSameVNode` 为假）：
  - 说明结构发生了根本变化，先通过 `hostNextSibling(n1.el)` 拿到老节点的下一个兄弟作为 anchor，再卸载老节点，最后将新节点挂载到该 anchor 前（保证插入位置正确）。
- 如果 `n1` 为空：
  - 说明是初次挂载，走 `mountElement`。
- 其他情况：
  - 认为是同一个节点，只需要在原地更新，走 `patchElement`。

`anchor` 由外层传入，用来控制元素插入的准确位置，当前 demo 里主要在 keyed diff 时使用。`parentComponent` 为父组件实例，会沿 patch 调用链向下传递，供子组件在 `createComponentInstance` 时建立 `instance.parent` 关系。

### patch 对类型的分发（Element / Text / Fragment / Component）

`patch` 在确定"同一节点需要更新"后，先根据 `n2.type` 判断是否为 `Text` 或 `Fragment`，再根据 `n2.shapeFlag` 分发到元素或组件：

- `n2.type === Text`：走 `processText`，处理文本节点的挂载与更新。
- `n2.type === Fragment`：走 `processFragment`。`n1 == null` 时对 `n2.children` 做 `mountChildren`；否则对两棵片段的子列表走 `patchChildren`（片段本身不占 DOM，不创建/复用 `el`）。
- `n2.shapeFlag & ELEMENT`：走 `processElement`（即 `mountElement` / `patchElement`）。
- `n2.shapeFlag & COMPONENT`：走 `processComponent`（挂载时调 `mountComponent`；已挂载的组件走 `updateComponent` 判断是否需要更新 props 并触发子树 diff）。
- `n2.shapeFlag & TELEPORT`：走 Teleport 组件的 `process`（根据 `props.to / props.disabled` 把 children 挂到目标容器；`to / disabled` 变化时迁移）。

这样元素、文本、片段、组件在挂载与更新时走各自分支；Teleport 见下文 `Teleport 组件`小节，KeepAlive 见 `KeepAlive 组件`小节，Transition 见 `Transition 组件`小节，组件分支详见下一节。

### Teleport 组件

- Teleport 本身不创建独立的 DOM 节点，它只负责把 `children` 挂到由 `to`（`querySelector`）或 `disabled` 决定的目标容器。
- 初次挂载：计算出 `target` 后，若 `target` 存在则把 `children` 挂载到目标容器。
- 更新：先在旧 `target` 上 patch children；当 `to` 或 `disabled` 变化时，再把 children 的真实 DOM 插到新 `target`。
- 卸载：在渲染器的 `unmount` 分支里直接卸载 Teleport 的 children 子树。

### KeepAlive 组件

实现见 [KeepAlive.md](./components/KeepAlive.md)。与渲染器协作的要点：

- **挂载 KeepAlive 自身**：`mountComponent` 若发现 `isKeepAlive(vnode.type)`，把宿主 `options` 挂到 `instance.ctx.renderer`，供 KeepAlive 的 setup 使用 `createElement` / `insert` 创建离线容器。
- **挂载 KeepAlive 的子组件**：若子 VNode 带 `COMPONENT_KEPT_ALIVE`，`processComponent` 在 `n1 == null` 时走 `parentComponent.ctx.activate`，不再 `mountComponent`。
- **卸载 KeepAlive 的子组件**：若子 VNode 带 `COMPONENT_SHOULD_KEEP_ALIVE`，`unmount` 走 `parentComponent.ctx.deactivate`，不调用 `unmountComponent`。

### Transition 组件

实现见 [Transition.md](./components/Transition.md)。与渲染器协作的要点：

- **写入位置**：`<Transition>` 的 render 只包一层默认插槽；`BaseTransition` 在子 VNode 上设置 `vnode.transition = { beforeEnter, enter, leave }`（具体由 `resolveTransitionProps` 根据 `name` 与各 `*Class`、钩子解析而来）。
- **挂载**：`mountElement` 在 `hostInsert` 前调用 `beforeEnter`，插入后调用 `enter`；内部用 `classList` 切换 `enter-from` → `enter-to` 等类名，并可配合 CSS `transition` 属性。
- **卸载**：`unmount` 在需要移除宿主节点时，若存在 `transition`，改为调用 `leave(el, remove)`，由过渡逻辑在结束时再执行 `remove()`（即真正的 `hostRemove`）。

当前实现针对**单个子节点**（插槽返回一个元素 VNode）；与 KeepAlive、Teleport 正交，可单独阅读 `Transition.ts` 与 `renderer.ts` 中的分支。

### 组件 processComponent、mountComponent 与 updateComponent

- **processComponent(n1, n2, container, anchor, parentComponent)**：组件入口。`n1 == null` 时，若 `n2` 带 `COMPONENT_KEPT_ALIVE` 则走 KeepAlive 的 `activate`；否则执行 `mountComponent(n2, container, anchor, parentComponent)`。`n1 != null` 时走 `updateComponent(n1, n2)` 做组件更新。

- **mountComponent(vnode, container, anchor, parentComponent)**：挂载组件类型 VNode，并建立响应式更新链路。步骤为：
  1. 调用 `createComponentInstance(vnode, parentComponent)` 创建实例（根组件时 `parentComponent` 为 null，子组件会得到父实例并赋给 `instance.parent`）。若 `vnode.type` 为 KeepAlive，把宿主 `options` 写入 `instance.ctx.renderer`。再调用 `setupComponent(instance)` 得到 `setupState`、`render`。同时把实例挂到 `vnode.component` 上，方便后续更新时复用。
  2. 调用 `setupRenderEffect(instance, container, anchor)` 建立响应式 effect（见下方）。

- **setupRenderEffect(instance, container, anchor)**：定义 `componentUpdateFn` 并用 `ReactiveEffect` 包裹：
  - **首渲**（`!instance.isMounted`）：先 `triggerHook(instance, BEFORE_MOUNT)`，再 `render` 得 subTree 并 `patch(null, subTree, ...)`，然后 `vnode.el = subTree.el`、记 `instance.subTree`、`instance.isMounted = true`，最后 `triggerHook(instance, MOUNTED)`。
  - **更新**：若有 `instance.next` 先调 `updateComponentPreRender` 同步 props/slots；再 `triggerHook(instance, BEFORE_UPDATE)`，然后 render 并 `patch(prevSubTree, subTree)`，更新 `vnode.el` 与 `instance.subTree`，最后 `triggerHook(instance, UPDATED)`。
  - 将 `effect.run` 绑定为 `instance.update`，设置 `effect.scheduler = () => queueJob(update)`，使更新走微任务调度。

- **updateComponent(n1, n2)**：组件更新入口。复用旧 VNode 上的 `component`（组件实例）挂到新 VNode 上，再调用 `shouldUpdateComponent(n1, n2)`（见 [componentRenderUtils.md](./componentRenderUtils.md)）判断是否需要触发子树更新：
  - 需要更新：把新 VNode 暂存到 `instance.next`，调用 `instance.update()` 触发 `componentUpdateFn` 重新执行
  - 不需要更新：只复用 `el` 和更新 `instance.vnode` 引用，跳过子树 diff

- **updateComponentPreRender(instance, nextVNode)**：在组件重新 render 之前，把新 VNode 上的数据同步到实例——更新 `instance.vnode`、清空 `instance.next`、调用 `updateProps` 把最新的 props/attrs 写入实例、调用 `updateSlots`（见 [componentSlots.md](./componentSlots.md)）把最新的插槽同步到 `instance.slots`。

组件实例与 setup 的细节见 [component.md](./component.md)。生命周期钩子的注册与触发见 [apiLifecycle.md](./apiLifecycle.md)。

- **unmountComponent(instance)**：卸载组件时调用。先 `triggerHook(instance, BEFORE_UNMOUNT)`，再 `unmount(instance.subTree)` 卸载子树，最后 `triggerHook(instance, UNMOUNTED)`。
- **unmount(vnode)**：卸载单个 VNode。若带 `COMPONENT_SHOULD_KEEP_ALIVE`，交给 KeepAlive 的 `deactivate`。若为 `Fragment`（`type === Fragment`），只 `unmountChildren(children)`，不执行 `hostRemove`。否则若为组件则调 `unmountComponent`；若为 Teleport 则只卸载其 `children`；若为元素等则先 `unmountChildren` 再移除自身 DOM。移除 DOM 时使用 `vnode.el && hostRemove(vnode.el)`，避免对已移除或无 el 的节点传 null。

### patchElement、patchFlag 与 children 处理

- `patchElement` 负责：
  - 复用旧的 DOM：`n2.el = n1.el`
  - **属性更新**：若 `n2.patchFlag > 0`，按 `PatchFlags`（见 [@vue/shared patchFlags.md](../../shared/src/patchFlags.md)）做定向更新——`CLASS` / `STYLE` 在对应 prop 引用变化时调 `hostPatchProp`；`TEXT` 表示子节点为动态纯文本，若 `n1.children !== n2.children` 则 `hostSetElementText` 并**直接 return**，不再调用 `patchChildren`。若 `patchFlag` 为 0 或未走上述分支，则调用 `patchProps(el, oldProps, newProps)` 全量对比属性。
  - 在未因 `TEXT` 提前 return 的前提下，调用 `patchChildren(n1, n2, el, parentComponent)` 更新子节点（`parentComponent` 沿 patch 链传递，供子组件建立 parent 关系）

- `patchChildren` 通过 `shapeFlag` 区分几种情况：
  - 文本 → 文本：必要时直接改写 `textContent`。
  - 数组 → 文本：先卸载所有旧 children，再设置文本。
  - 文本 → 数组：清空原有文本，再逐个挂载新 children。
  - 数组 / null 之间互相转换：根据场景挂载或卸载整组子节点。

借助 `shapeFlag`，在 children 形态切换时不需要做复杂的类型判断，只要用按位与就能跳到正确分支。

### keyed children 与双端 diff

`renderer.ts` 里实现的是带乱序处理的 keyed 双端 diff，入口是 `patchKeyedChildren(c1, c2, container)`：

- **1. 头部同步**：从 `i = 0` 开始，依次比较 `c1[i]` / `c2[i]`，只要是"同一个 VNode"就递归 `patch`，直到遇到不同节点停下。
- **2. 尾部同步**：从尾部 `e1` / `e2` 向内比较，同样相同就 `patch` 并收缩，遇到不同停下。
- **3. 仅多新节点**：若 `i > e1`，说明老列表先走完，剩余 `c2[i..e2]` 全部挂载到合适锚点前。
- **4. 仅多老节点**：若 `i > e2`，说明新列表先走完，剩余 `c1[i..e1]` 全部卸载。
- **5. 乱序**：若两头收缩后仍有剩余（`i <= e1 && i <= e2`），进入乱序 diff，见下一节。

### 乱序 diff 与最长递增子序列（LIS）

当头尾同步后中间段顺序不一致时（例如 `c1 = [a,b,c,d,e]`，`c2 = [a,c,d,b,e]`），会做：

- **建立映射**：
  - `keyToNewIndexMap`：新列表剩余段中 `key -> 新下标`，用于在老节点里查"这个 key 在新里排第几"。
  - `newIndexToOldIndexMap`：新列表剩余段长度，`newIndexToOldIndexMap[新下标 - s2] = 老下标`；未匹配填 `-1`（不参与 LIS）。
- **遍历老列表剩余段**：按 key 在新里找位置，能找到则 `patch` 并写入 `newIndexToOldIndexMap`；找不到则卸载。同时根据"新下标是否单调递增"判断是否需要移动（`moved`）。
- **最长递增子序列**：若 `moved === true`，对 `newIndexToOldIndexMap` 求 LIS（`getSequence`），得到"在新列表中下标递增的一段"，这些节点相对顺序没变，不需要移动。
- **按新列表顺序插入**：从新列表剩余段尾部往头遍历，以"下一个节点"为 anchor；若当前节点在新列表中的下标不在 LIS 中，则 `hostInsert` 移动到 anchor 前；若无 `el` 说明是新加的，则 `patch(null, n2, ...)` 挂载。

这样只需移动"不在 LIS 里"的节点，最小化 DOM 移动次数。`getSequence` 使用"耐心排序 + 二分"求 LIS 下标序列，时间 O(n log n)，详见源码内 JSDoc。

### 文本节点 processText

- **挂载**：`n1 == null` 时，用 `hostCreateText(n2.children)` 创建文本节点，挂到 `container` 的 `anchor` 前，并记 `n2.el`。
- **更新**：复用 `n2.el = n1.el`，若 `n2.children !== n1.children` 则 `hostSetText(el, n2.children)`。

文本 VNode 的 `type` 为 `Text`（来自 `vnode.ts`），children 为字符串；在子节点里若出现 string/number，会先被 `normalizeVNode` 转成 Text 类型 VNode，再参与 diff。
