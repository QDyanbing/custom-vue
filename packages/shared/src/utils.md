# shared/utils.ts 工具函数说明

## 概述

`shared/utils.ts` 汇总了一组在多个包间复用的**基础类型判断与工具函数**，目标是：

- 统一“是不是对象 / 数组 / 字符串 / 数字”等判断逻辑
- 封装常用的“值是否变化”“是否事件名”“是否自有属性”等判定
- 避免在各个子包里重复写同样的 `typeof` / `Array.isArray` / 正则判断

这些工具在 `reactivity`、`runtime-core`、`runtime-dom` 等模块中都会被使用。

## 函数一览

### isObject(val)

```ts
isObject(val: unknown): boolean;
```

判断一个值是否为**非 `null` 的对象**，等价于：

```ts
val !== null && typeof val === 'object';
```

常用于区分“引用类型 vs 基本类型”，例如在响应式系统里决定是否需要递归代理。

### hasChanged(value, oldValue)

```ts
hasChanged(value: any, oldValue: any): boolean;
```

基于 `Object.is` 判断“新旧值是否发生变化”，语义与 Vue 源码一致：

- 能正确识别 `NaN`：`Object.is(NaN, NaN) === true`
- 能区分 `+0` 与 `-0`

在 `ref` / `reactive` 里用来决定是否需要触发依赖。

### isFunction(val)

```ts
isFunction(val: unknown): val is Function;
```

判断值是否为函数类型，常用于判断用户是否传入了回调、`setup` 是否存在等。

例如在 `component.ts` 里会先通过 `isFunction(type.setup)` 判断后再调用。

### isOn(key)

```ts
isOn(key: string): boolean;
```

判断一个 prop key 是否是**事件监听**，约定格式为 `onXxx`，例如：

- `onClick`
- `onChange`

具体实现通过 `/^on[A-Z]/` 正则完成，在 DOM 运行时里用它来区分“普通属性 vs 事件监听”。

### isArray(val)

```ts
isArray(val: unknown): boolean;
```

对 `Array.isArray` 的简单封装，方便在 `shared` 层统一导出，常见使用场景：

- 解析 VNode children 是否为数组
- 标准化组件 `props` 选项（见 `componentProps.ts`）

### isString(val)

```ts
isString(val: unknown): boolean;
```

判断值是否为字符串，常用于：

- children 是否为文本
- `class` 是否传入了字符串而不是数组 / 对象

### isNumber(val)

```ts
isNumber(val: unknown): boolean;
```

判断值是否为数字类型，配合 `isString` 等一起使用，简化类型分支。

### hasOwn(obj, key)

```ts
hasOwn(obj: any, key: string): boolean;
```

基于 `Object.hasOwn(obj, key)` 的封装，用于判断对象是否拥有某个自有属性。典型用途包括：

- 在 `componentProps.ts` 里判断某个 key 是否是组件声明的 prop
- 在各种配置解析逻辑里区分“用户是否真的传了这个字段”

通过统一封装，调用方不需要关心底层使用的是 `Object.hasOwnProperty` 还是 `Object.hasOwn`。

