# Transition 说明

### 概览

`Transition.ts` 提供最小可用的 `<Transition>`：把进入/离开阶段的钩子与 CSS 类名约定解析成 `beforeEnter`、`enter`、`leave` 三个函数，并挂到**唯一子 VNode** 的 `vnode.transition` 上；渲染器在挂载元素、卸载元素时读取该对象，先跑过渡再插入或再移除 DOM。

### 与 renderer 的约定

- **`vnode.transition`**：由 `BaseTransition` 的 setup 在渲染子节点时写入（`slots.default()` 返回的 VNode 上）。类型为运行时约定的 `{ beforeEnter, enter, leave }`。
- **`mountElement`**：创建元素并 `patchProp` / 子节点后，若存在 `transition`，先 `beforeEnter(el)`，再 `hostInsert`，最后 `enter(el)`。`enter` 内用 `requestAnimationFrame` 切换 class，并在未提供带 `done` 参数的 `onEnter` 时监听 `transitionend` 做收尾。
- **`unmount`**：若存在 `transition`，调用 `transition.leave(vnode.el, remove)`，由 `leave` 在动画结束后执行传入的 `remove()`（内部为 `hostRemove`）；无 `transition` 时直接移除 DOM。

### props 与 class 命名

- 默认 `name` 为 `'v'`，未显式传入时类名与 Vue 习惯一致：`v-enter-from` / `v-enter-active` / `v-enter-to`，以及 `v-leave-from` / `v-leave-active` / `v-leave-to`。
- 可通过 `enterFromClass`、`enterActiveClass` 等 props 覆盖每一项。
- 可选钩子：`onBeforeEnter`、`onEnter(el, done?)`、`onLeave(el, done?)`；若 `onEnter` / `onLeave` 形参个数小于 2，认为不需要手动调用 `done`，由 `transitionend` 触发结束逻辑。

### 相关文件

- `packages/runtime-core/src/renderer.ts`：`mountElement`、`unmount` 中与 `transition` 协作的分支
- `packages/vue/example/21-demo.html`：按钮切换子节点显隐，配合 CSS `transition` 与控制台钩子日志
