# 20-demo.html 说明

## 演示目标

演示 `KeepAlive` 包裹动态组件时的缓存行为：在 `Child1` 与 `Child2` 之间切换时，被隐藏的组件不会触发常规卸载路径下的 `onUnmounted`，再次显示时复用同一实例与 DOM，`onMounted` 仅在首次进入时执行。

## 示例代码（结构说明）

- 根组件 `Comp`：`h(KeepAlive, null, () => h(components[index.value]))`，用 `ref` 切换 `index` 在 0/1 之间变化。
- `Child1` / `Child2`：各自在 `onMounted` / `onUnmounted` 中打日志，便于观察 KeepAlive 与真实卸载的差异。

## 对应运行时路径

- `packages/runtime-core/src/components/KeepAlive.ts`：缓存、`activate` / `deactivate`、为子 VNode 设置 `COMPONENT_SHOULD_KEEP_ALIVE` / `COMPONENT_KEPT_ALIVE`。
- `packages/runtime-core/src/renderer.ts`：`unmount` 对 `COMPONENT_SHOULD_KEEP_ALIVE` 走 `deactivate`；`processComponent` 对 `COMPONENT_KEPT_ALIVE` 走 `activate`；`mountComponent` 为 KeepAlive 实例注入 `ctx.renderer.options`。

## 运行结果（控制台）

- 首次渲染：打印 `Child1 mounted`。
- 切换到 Child2：打印 `Child2 mounted`，**不会**打印 `Child1 unmounted`。
- 再切回 Child1：**不会**再次打印 `Child1 mounted`（实例与 DOM 复用）。
