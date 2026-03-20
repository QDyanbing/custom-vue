# 19-demo.html 说明

## 演示目标

演示 `Teleport` 组件支持 `props.to` 的动态更新：运行一段时间后，把 Teleport 的子内容从初始目标容器迁移到新的目标容器。

> 本例只演示 `to` 的切换；`Teleport` 也同样支持 `props.disabled`（禁用后不再解析 `to`，直接挂到当前容器）。

## 示例代码

```js
const to = ref('body');

setTimeout(() => {
  to.value = '#app';
}, 1000);

return () =>
  h('div', [
    h('p', { id: 'box' }, '父组件'),
    h(
      Teleport,
      { to: to.value },
      h('div', ['我是Teleport的子内容', count.value]),
    ),
  ]);
```

## 对应运行时路径

- `packages/runtime-core/src/components/Teleport.ts`：根据 `to/disabled` 解析 `target`；更新时若 `to/disabled` 发生变化，把 `children` 的真实 DOM 节点插入到新 `target`。
- `packages/runtime-core/src/renderer.ts`：`patch` 分发通过 `ShapeFlags.TELEPORT` 调用 Teleport 的 `process`；`unmount` 分支卸载 Teleport 的 `children` 子树。
- `packages/runtime-core/src/vnode.ts`：`createVNode` 通过 `type.__isTeleport` 设置 `shapeFlag = ShapeFlags.TELEPORT`。

## 运行结果

页面初始时：

- `#app` 里只会看到 `p#box`（“父组件”）。
- `Teleport` 的子内容会出现在 `body` 下。

约 1s 后：

- `to` 从 `body` 改为 `#app`，Teleport 的子内容将迁移到 `#app` 内。

