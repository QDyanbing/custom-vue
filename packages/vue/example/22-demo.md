# 22-demo.html 说明

## 演示目标

这个示例用来验证 `defineAsyncComponent` 的几项基础行为是否串起来了：

- `loader` 返回 Promise 时，页面先显示 loading 组件
- Promise 成功 resolve 后，切换为真正的异步组件
- 传给异步组件包装层的 `props`，会继续传到真正加载出的组件里
- `timeout` 大于加载耗时的时候，不会落到错误态

## 示例结构

页面里定义了一个根组件 `App`，在 `setup` 中创建：

```ts
const component = defineAsyncComponent({
  loader: () => new Promise(resolve => { /* 1s 后返回组件 */ }),
  timeout: 2000,
  loadingComponent: { render() { return h('div', 'loading...'); } },
  errorComponent: { render() { return h('div', 'error...'); } },
});
```

然后在渲染函数里输出：

```ts
return h(component, { msg: 'hello world' });
```

## 运行时会发生什么

### 1. 初次渲染

`defineAsyncComponent` 内部先把当前组件设为 `loadingComponent`，所以页面初次会看到：

```html
<div>loading...</div>
```

### 2. 1 秒后加载成功

`loader` 的 Promise 会在 1 秒后 resolve 一个组件对象，这个组件声明了：

```ts
props: ['msg']
```

并在 `setup(props)` 里渲染：

```ts
h('div', `${props.msg} 123`)
```

所以最终页面会从 `loading...` 切换成：

```html
<div>hello world 123</div>
```

### 3. props 透传

外层写的是：

```ts
h(component, { msg: 'hello world' })
```

异步包装组件本身不会消费这个 `msg`，它只是把 `props / attrs / slots` 原样继续传给真正加载出的组件。这个示例就是用最终的 `hello world 123` 来验证透传链路已经打通。

## timeout 的作用

当前示例里：

- `loader`：1 秒完成
- `timeout`：2 秒触发

所以结果一定先走成功分支。如果把 `timeout` 改成比 1 秒更小，比如 `500`，则会先进入错误分支，页面显示 `error...`。

## 可切换的另一种写法

示例里保留了这行注释：

```ts
// return import('./js/asyncComponent.js');
```

取消注释后，可以验证另一条分支：`loader` 返回的是 ESM 模块对象，运行时会自动取它的 `default` 导出作为真正组件。

## 对应源码

- `packages/runtime-core/src/apiAsyncComponent.ts`
- `packages/vue/example/js/asyncComponent.js`
