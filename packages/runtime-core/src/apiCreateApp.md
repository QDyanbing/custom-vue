# apiCreateApp.ts

该文件提供应用创建入口：通过传入平台相关的 `render` 函数，得到可挂载/卸载的 `createApp` API。

## 作用

- **createAppApi(render)**：高阶函数，接收渲染器提供的 `render`，返回 `createApp`。
- **createApp(rootComponent, rootProps)**：创建应用实例，返回带 `mount`、`unmount` 的 app 对象。

这样 runtime-core 只定义「怎么创建 app、怎么挂载根组件」，具体「怎么把 vnode 画到 DOM」由各平台（如 runtime-dom）的 `render` 实现，实现核心与平台解耦。

## 使用方式

在渲染器（如 `renderer.ts`）中：

```ts
createApp: createAppApi(render)
```

即把当前平台的 `render(vnode, container)` 注入进去，得到该平台可用的 `createApp`。

## 应用实例 (app)

| 属性/方法 | 说明 |
|-----------|------|
| `mount(container)` | 用 `h(rootComponent, rootProps)` 创建根 vnode，调用 `render` 渲染到 `container`，并记录 `_container` |
| `unmount()` | 调用 `render(null, app._container)` 卸载，并清空 `_container` |
| `_container` | 内部保存的挂载目标 DOM，卸载时使用 |

## 流程简述

1. 用户调用 `createApp(RootComponent).mount('#app')`。
2. `createApp` 来自 `createAppApi(render)`，所以拿到的 app 已经绑定了当前平台的 `render`。
3. `mount` 时用 `h` 创建根组件 vnode，再 `render(vnode, container)` 完成首屏渲染。
4. 需要销毁时调用 `app.unmount()`，通过 `render(null, container)` 做清理。

## 依赖

- `./h`：用于创建根组件的虚拟节点（vnode）。

## 与 Vue 3 的对应关系

思路与 Vue 3 的 `createAppAPI` 一致：在 `packages/runtime-core/src/apiCreateApp.ts` 中只关心「应用生命周期 + 根组件挂载」，具体渲染逻辑由各端的 render 实现（如 DOM 的 `render` 在 runtime-dom 中）。
