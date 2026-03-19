# 18-demo.html 说明

## 演示目标

`18-demo.html` 用最小代码验证函数组件在当前运行时中的基本调用方式：

- 根组件可以直接写成函数：`function App(props, ctx) {}`
- `createApp(App, { msg: 'App' })` 传入的根属性会进入函数组件的 `props`
- 函数组件返回 `h(...)` 生成的 VNode，交给渲染器挂载

## 示例代码

```html
function App(props, ctx) {
  return h('div', 'Hello World ' + props.msg);
}

const app = createApp(App, { msg: 'App' });
app.mount(document.getElementById('app'));
```

## 对应运行时路径

- `vnode.ts`：`createVNode` 根据 `type` 为函数设置 `ShapeFlags.FUNCTIONAL_COMPONENT`
- `componentProps.ts`：函数组件且未声明 props 时，传入属性按 props 处理
- `componentRenderUtils.ts`：`renderComponentRoot` 走函数组件分支，调用 `vnode.type(vnode.props, ctx)`

## 运行结果

页面会渲染出：

`Hello World App`
