# 23-demo.html 说明

## 演示目标

验证 `Fragment` 作为组件根时的三条链路是否一致：

- **挂载**：`h(Fragment, null, [...])` 不产生包裹元素，多个子 VNode 直接插入 `#app`。
- **更新**：`ref` 变化触发重新渲染，子列表走 `patchChildren`，第二段文案随 `count` 变化。
- **卸载**：`app.unmount()` 时，片段类型在 `unmount` 中只卸载 `children`，不对片段本身调用 `hostRemove`。

## 示例结构

根组件 `App` 在 `setup` 里持有 `count`，`setTimeout` 在 1s 时执行 `count++`。渲染函数返回：

```ts
h(Fragment, null, [
  h('div', { style: { color: 'red' } }, 'hello '),
  h('div', { style: { color: 'blue' } }, `world ${count.value}`),
]);
```

页面加载约 2s 后执行 `app.unmount()`。

## 运行时会发生什么

### 1. 初次渲染

`patch` 命中 `type === Fragment`，走 `processFragment`：`mountChildren` 把两个 `div` 依次挂到 `document.getElementById('app')` 下，DOM 结构为两个并列的 `div`，中间没有额外的包裹节点。

### 2. 约 1s 后更新

`count` 自增后组件 effect 重新执行，`patch` 再次进入 `processFragment`，对旧、新片段的 `children` 调用 `patchChildren`，第二个 `div` 的文本从 `world 0` 变为 `world 1`（具体 diff 行为与当前 `patchChildren` 实现一致）。

### 3. 约 2s 后卸载

`render(null, container)` 或 `app.unmount()` 最终会对根 VNode 调用 `unmount`。根为 `Fragment` 时只遍历卸载子 VNode，两个 `div` 从文档中移除；不会因“片段节点”去 `hostRemove` 一个不存在的片段 DOM。

## 与 22-demo 的区别

`22-demo.html` 聚焦 `defineAsyncComponent`；本页仅使用同步组件 + `Fragment`，用于单独观察片段在挂载、更新、卸载三阶段与渲染器的配合。
