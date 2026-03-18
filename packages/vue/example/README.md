# vue/example 示例说明

## 概览

`packages/vue/example` 目录下放的是一组手写运行时的**最小示例页面**，每个 html 文件都会通过：

- `<script type="module">` 直接从 `../dist/vue.esm.js` 导入运行时能力
- 使用 `createApp` + 选项式组件演示当前实现的特性

目前与组件 props/attrs、ref、生命周期等相关的示例有：

- `08-demo.html`：`setup + render` 计数器，演示 `ref` 与 `this` 上的自动解包。
- `09-demo.html`：演示根组件 props 与 attrs 的拆分：组件只声明 `props: ['msg']`，创建应用时额外传入 `count`，可以在 `setup(props, { attrs })` 中分别看到 `props.msg` 和 `attrs.count`。
- `10-demo.html`：演示组件的异步更新与 `nextTick/$nextTick`：连续多次修改响应式值会被调度到同一轮微任务中执行渲染；并在更新后通过 nextTick 读取到最新的 DOM 内容。
- `11-demo.html`：演示父子组件的更新流程：父组件持有 `ref(age)` 并通过 props 传给子组件 `Child`；点击按钮触发 `age++`，父组件重新 render → `updateComponent` → `shouldUpdateComponent` → `updateProps` 把新的 `age` 同步给子组件，子组件 render effect 重新执行。
- `12-demo.html`：演示组件事件（emit）：子组件通过 `setup(props, { emit })` 拿到 `emit` 方法，调用 `emit('foo', 1, 2, 3)` 触发事件；父组件通过 `h(Child, { onFoo: handler })` 监听。点击按钮后控制台打印 `click parent 1 2 3`。
- `13-demo.html`：演示组件插槽（slots）：父组件通过 `h(Child, null, () => h('div', '默认插槽'))` 传递默认插槽（函数形式会被 `normalizeChildren` 包装为 `{ default: fn }`）；子组件通过 `slots.default()` 调用插槽函数获取渲染内容。注释中还保留了具名插槽的对象写法示例。
- `14-demo.html`：演示 `getCurrentInstance()`：在 `setup` 中调用可获取当前组件实例（proxy、vnode、props 等），便于在组合式 API 中访问实例或与生命周期配合使用。
- `15-demo.html`：演示组件生命周期钩子：`onBeforeMount` / `onMounted` / `onBeforeUpdate` / `onUpdated` / `onBeforeUnmount` / `onUnmounted`。父组件 1s 时 `count++` 触发更新、2s 时 `app.unmount()` 触发卸载，控制台按顺序打印各阶段日志。
- `16-demo.html`：演示 `expose`、模板 ref、`parent` 与 `appContext`：子组件通过 `expose` 暴露状态和方法，父组件通过 `ref` 拿到子组件 public 实例，同时用 `useTemplateRef('elRef')` 绑定 DOM 元素，在 `onMounted` 中打印两类 ref；子组件 setup 中通过 `getCurrentInstance()` 可拿到 `vm.parent`（父组件实例）和 `vm.appContext`（应用上下文）。
- `17-demo.html`：演示 `provide/inject` 与 `app.provide`：父组件 `provide('count', ref(0))`，子组件 `inject('count')` 读取；`app.provide('a', ref('aaa'))` 写入 `appContext.provides`，组件内 `inject('a')` 可读到。

后续如果新增 demo，建议在这里简单列一下文件名和它覆盖的能力，方便快速索引。
