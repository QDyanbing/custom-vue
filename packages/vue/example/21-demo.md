# 21-demo.html 说明

## 演示目标

演示 `<Transition>` 包裹**单个**子元素节点时的进入与离开：通过 `ref` 切换插槽内容在「渲染 `p`」与「不渲染」之间变化，观察 CSS 过渡与 `onBeforeEnter` / `onEnter` / `onLeave` 控制台输出。

## 示例代码（结构说明）

- 根组件 `App`：`h(Transition, { onBeforeEnter, onEnter, onLeave }, () => show.value ? h('p', 'hello world') : undefined)`，点击按钮翻转 `show`。
- 页面 `<style>`：为默认 `name: 'v'` 下的 `.v-enter-active`、`.v-leave-active` 与 `.v-enter-from`、`.v-leave-to` 写 `transition` / `transform`，便于肉眼看到位移动画。

## 对应运行时路径

- `packages/runtime-core/src/components/Transition.ts`：`resolveTransitionProps`、`BaseTransition` 把钩子挂到子 VNode 的 `transition` 上。
- `packages/runtime-core/src/renderer.ts`：`mountElement` 在插入前后调用 `beforeEnter` / `enter`；`unmount` 在移除前调用 `leave(el, remove)`。

## 运行结果（控制台）

- 每次子节点从隐藏到显示：打印 `before enter`，再打印进入阶段相关日志（`onEnter` 里当前为 `console.log(el)`）。
- 每次从显示到隐藏：`onLeave` 打印 `leave`。
