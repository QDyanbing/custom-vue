# componentProps.ts 说明

## 概述

`componentProps.ts` 负责**解析组件的原始 props**，并把它们拆分成两类：

- `instance.props`：组件在 `props` 选项里**显式声明**的属性
- `instance.attrs`：调用方传入、但**未在 props 里声明**的属性（透传到子组件或根元素）

同时，它还支持 Vue 常见的"`props` 写成数组"的写法，并在创建组件实例时被 `component.ts` 调用。

## normalizePropsOptions(props)

将组件定义上的 `props` 选项标准化为对象形式：

- 当 `props` 已经是对象时，原样返回
- 当 `props` 是数组时，例如：

```ts
props: ['msg', 'title'];
```

会被转换为：

```ts
{
  msg: {},
  title: {},
}
```

这样后续只需要用普通对象去做 `hasOwn(propsOptions, key)` 检查即可，无需区分"数组写法 vs 对象写法"。

标准化后的结果会在创建组件实例时挂到 `instance.propsOptions` 上（见 `component.ts` 的 `createComponentInstance`）。

## initProps(instance)

`initProps` 在组件挂载前运行，用来根据调用方传入的 `vnode.props` 填充实例上的 `props` 与 `attrs`：

1. 从 `instance.vnode.props` 读取原始属性（可能为 `null` / `undefined`）
2. 创建本次渲染要用的 `props` / `attrs` 空对象
3. 调用内部的 `setFullProps(instance, rawProps, props, attrs)` 做实际分发
4. 使用 `reactive(props)` 把 `instance.props` 包一层响应式，供 `setup(props)` 与渲染过程使用
5. 直接把 `attrs` 赋给 `instance.attrs`，按照 Vue 行为，不为 attrs 做响应式

最终：

- 组件 `setup(props, { attrs })` 里拿到的 `props` 就是 `instance.props`
- 从 `setup` 第二个参数里访问到的 `attrs` 会走 `instance.attrs`（经由 `createSetupContext` 的 getter）

## updateProps(instance, nextVNode)

`updateProps` 在组件更新阶段运行（由 `renderer.ts` 的 `updateComponentPreRender` 调用），当父组件重新渲染产生新的子组件 VNode 时，用新 VNode 的 props 同步实例：

1. 从 `nextVNode.props` 读取最新的原始属性
2. 调用 `setFullProps(instance, rawProps, props, attrs)` 把新值写入已有的 `instance.props` 和 `instance.attrs`
3. 遍历旧的 `props` / `attrs`，删掉新 VNode 中不再存在的 key

因为 `instance.props` 是 `reactive` 对象，写入/删除会自动触发依赖收集，从而让子组件的 render effect 在下一次 flush 时重新执行。

与 `initProps` 的区别：`initProps` 创建全新的 props/attrs 对象并用 `reactive` 包装；`updateProps` 则在已有的 reactive 对象上做原地更新（写入新值 + 删除多余 key），不会重新创建对象。

## setFullProps(instance, rawProps, props, attrs)

这是 `initProps` 和 `updateProps` 内部共用的帮助函数，负责按"声明与否"把属性放到对应容器中：

1. 从 `instance.propsOptions` 里拿到标准化后的 props 配置
2. 遍历 `rawProps`（即调用 `createVNode` 时传入的 props）
3. 对于每一个 `key`：
   - 若 `key` 在 `propsOptions` 里存在，放入 `props[key]`
   - 否则放入 `attrs[key]`

这样在 Vue 的常见用法中：

```ts
const Comp = {
  props: ['msg'],
  // ...
};

createApp(Comp, { msg: 'Hi', count: 0 });
```

- `msg` 会进入组件的响应式 `props`
- `count` 会进入 `attrs`，可由组件选择性地透传到根元素

## 与 component.ts / renderer.ts 的关系

- `createComponentInstance` 会先把 `normalizePropsOptions(type.props)` 的结果挂到 `instance.propsOptions`
- `setupComponent` 在执行 `type.setup` 之前调用 `initProps(instance)`，确保：
  - `setup(props, { attrs })` 第一个参数已经是响应式的 `props`
  - 第二个参数里的 `attrs` getter 能够访问到"非声明属性"
- `renderer.ts` 的 `updateComponentPreRender` 在父组件触发子组件更新时调用 `updateProps(instance, nextVNode)`，让子组件实例上的 props/attrs 与最新 VNode 对齐

配合 `renderer.ts` 中的 `mountComponent` 与 `updateComponent`，这一组逻辑完成了"组件定义 → VNode → 实例 props/attrs → setup/渲染 → 父组件更新 → props 同步"的属性流转。
