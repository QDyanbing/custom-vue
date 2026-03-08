# apiCreateApp.ts

应用创建入口：传入平台相关的 `render`，得到可挂载/卸载的 `createApp`。与 [renderer.ts](./renderer.md) 配合使用——渲染器内部通过 `createAppApi(render)` 得到 `createApp` 并挂到返回对象上。

## 作用

- **createAppApi(render)**：高阶函数，接收渲染器提供的 `render`，返回 `createApp`。
- **createApp(rootComponent, rootProps)**：创建应用实例，返回带 `mount`、`unmount` 的 app 对象。

runtime-core 只定义「如何创建 app、如何挂载根组件」；「如何把 vnode 画到 DOM」由各平台（如 runtime-dom）的 `render` 实现，从而与平台解耦。

## 使用方式

在渲染器（如 `renderer.ts`）中挂到返回对象上：

```ts
createApp: createAppApi(render)
```

将当前平台的 `render(vnode, container)` 注入后，即得到该平台可用的 `createApp`。

## 应用实例 (app)

| 属性/方法 | 说明 |
|-----------|------|
| `mount(container)` | 用 `h(rootComponent, rootProps)` 创建根 vnode，调用 `render` 渲染到 `container`，并记录 `_container` |
| `unmount()` | 调用 `render(null, app._container)` 卸载，并清空 `_container` |
| `_container` | 内部保存的挂载目标，`unmount` 时使用 |

## 流程简述

1. 用户调用 `createApp(RootComponent).mount(container)`（或带 rootProps：`createApp(Comp, { msg }).mount(container)`）。
2. `createApp` 由 `createAppApi(render)` 生成，app 已绑定当前平台的 `render`。
3. `mount` 时用 `h` 创建根 vnode，再 `render(vnode, container)` 完成首屏渲染。
4. 销毁时调用 `app.unmount()`，内部执行 `render(null, container)` 做清理。

## 依赖

- `./h`：创建根组件的虚拟节点（vnode）。无其它模块依赖。

## 与 Vue 3 的对应关系

与 Vue 3 的 `createAppAPI` 思路一致：本文件只关心「应用生命周期 + 根组件挂载」，具体渲染由各端 `render` 实现（如 DOM 在 runtime-dom 中）。

## 相关文档

- [renderer.md](./renderer.md)：`createRenderer` 返回的 `createApp` 即来自 `createAppApi(render)`。
