# KeepAlive 说明

### 概览

`KeepAlive.ts` 提供最小可用的 `<KeepAlive>`：用 `Map` 按 `vnode.key`（缺省为 `vnode.type`）缓存子组件 VNode，在切换动态组件时不走常规 `unmountComponent`，而是把子树根 DOM 移到内部离线容器，再次显示时再插回页面。

### 与 renderer 的约定

- **`COMPONENT_SHOULD_KEEP_ALIVE`**：由 KeepAlive 的 render 给**当前要渲染出去**的子 VNode 打上。`unmount` 见到该标记时不再卸载子组件，而是调用父组件（KeepAlive 实例）上的 `ctx.deactivate(vnode)`，把 `vnode.el` 插入离线容器。
- **`COMPONENT_KEPT_ALIVE`**：当子节点在缓存中命中时，KeepAlive 把旧 VNode 上的 `component`、`el` 拷到新 VNode，并打上此标记。`processComponent` 在 `n1 == null`（父级认为要挂载新子树）时若见到该标记，则调用 `ctx.activate(n2, container, anchor)` 直接插入 DOM，**跳过** `mountComponent`。
- **`instance.ctx.renderer`**：挂载 KeepAlive 组件时，`mountComponent` 里检测到 `isKeepAlive(vnode.type)`，会把宿主 `options` 挂到 `instance.ctx.renderer`，供 setup 里取 `createElement`、`insert` 创建离线容器并移动节点。

### 行为摘要

| 阶段 | 行为 |
|------|------|
| setup | 创建 `cache`、`storageContainer`；定义 `activate` / `deactivate` |
| render | 查缓存、合并 `component`/`el`、设置上述 shapeFlag、`cache.set` |

### 相关文件

- `packages/runtime-core/src/renderer.ts`：`unmount`、`processComponent`、`mountComponent` 中与 KeepAlive 协作的分支
- `packages/shared/src/shapeFlags.ts`：`COMPONENT_SHOULD_KEEP_ALIVE`、`COMPONENT_KEPT_ALIVE`
- `packages/vue/example/20-demo.html`：双动态子组件切换示例
