# apiAsyncComponent.ts 说明

## 概览

`defineAsyncComponent` 用来把“稍后才能拿到的组件”包装成一个普通组件。当前实现支持：

- 直接传加载函数：`defineAsyncComponent(() => import('./Comp'))`
- 传配置对象：`defineAsyncComponent({ loader, loadingComponent, errorComponent, timeout })`

它的目标比较直接：先渲染一个占位或 loading 组件，等异步结果回来后再切换为真正的组件；如果失败或超时，就切换到错误组件。

## 参数形式

### 1. 函数形式

```ts
const AsyncComp = defineAsyncComponent(() => import('./Comp'));
```

当传入值是函数时，内部会把它包装成：

```ts
{
  loader: () => import('./Comp');
}
```

这样后续逻辑只需要处理统一的对象结构。

### 2. 对象形式

```ts
const AsyncComp = defineAsyncComponent({
  loader: () => import('./Comp'),
  loadingComponent,
  errorComponent,
  timeout: 2000,
});
```

当前支持的字段：

- `loader`：真正的异步加载函数，返回 `Promise`
- `loadingComponent`：加载中展示的组件；未提供时用一个空的 `span` 占位
- `errorComponent`：失败时展示的组件；未提供时同样用空的 `span`
- `timeout`：超时时间，单位毫秒；为 `0` 时表示不启用超时

## 执行流程

### 1. 初始化占位组件

`setup` 里先创建：

```ts
const component = ref(loadingComponent);
```

所以异步结果还没回来之前，渲染函数会先输出 `loadingComponent`。

### 2. 启动加载

内部的 `loadComponent()` 做了两件事：

1. 调用 `loader()`，把成功和失败透传给外层 Promise
2. 如果传了 `timeout`，就启动一个定时器，到时后走 `reject(new Error('timeout'))`

这意味着当前实现采用的是“谁先结束用谁”的处理方式。

### 3. 兼容 `import()` 返回值

如果 `loader` 返回的是：

```ts
import('./Comp')
```

那么 Promise resolve 的结果通常是一个 ESM 模块对象，而不是组件本身。代码里会检查：

```ts
comp && comp[Symbol.toStringTag] === 'Module'
```

命中后取 `comp.default`，这样才能拿到默认导出的组件定义。

### 4. 成功或失败后的切换

- 成功：`component.value = comp`
- 失败或超时：`component.value = errorComponent`

因为 `component` 是 `ref`，所以赋值后会触发重新渲染。

## 渲染阶段的透传

最终返回的渲染函数是：

```ts
return h(component.value, { ...attrs, ...props }, slots);
```

这一步有两个作用：

- 把调用异步组件时传入的 `props` 和 `attrs` 继续传给真正加载出的组件
- 把外层插槽继续传进去，避免异步包装层把输入截断

所以像下面这样写是可用的：

```ts
return h(AsyncComp, { msg: 'hello world' });
```

等真实组件加载完成后，内部组件仍然可以正常收到 `props.msg`。

## 和示例的对应关系

- `packages/vue/example/22-demo.html`：演示 `loadingComponent`、`errorComponent`、`timeout` 和 `props` 透传
- `packages/vue/example/js/asyncComponent.js`：演示 `import()` 返回默认导出组件时的加载形态

## 当前边界

这份实现刻意保持简单，暂时没有处理这些能力：

- `delay`
- `onError / retry`
- 组件卸载后的竞态清理
- 更细的加载状态区分
