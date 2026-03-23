# asyncComponent.js 说明

## 这个文件是做什么的

`asyncComponent.js` 是 `22-demo.html` 里最早用来测试异步组件加载的目标文件。它本身不是运行时实现，只是一个被 `import()` 动态加载的普通组件模块。

## 导出形态

文件使用的是默认导出：

```js
export default {
  render() {
    return h('div', 'hello world');
  },
};
```

这正好对应浏览器 ESM 动态导入的常见结果：

```js
const mod = await import('./js/asyncComponent.js');
```

此时拿到的不是组件对象本身，而是形如：

```js
{
  default: { /* 真正组件 */ }
}
```

所以 `defineAsyncComponent` 在处理这类结果时，需要把 `mod.default` 取出来。

## 为什么还要保留它

虽然 `22-demo.html` 现在默认改成了直接 `resolve({ ...组件定义... })` 的方式来演示 loading、timeout 和 props 透传，但这个文件仍然有价值：

- 它能验证 `import()` 返回模块对象时的兼容逻辑
- 它把“异步包装逻辑”和“真正被加载的组件”拆开了，便于单独观察

## 对应示例

- `packages/vue/example/22-demo.html`
