# BaseHandlers 功能说明

## 概述

`baseHandlers` 模块定义了 `Proxy` 的处理器对象，用于拦截 `reactive` 对象的属性访问和设置操作。它是 `reactive` 实现响应式的核心。

## 主要功能

### 1. 属性访问拦截（get）

`get` 处理器拦截对象属性的读取操作。

**功能：**

- 收集依赖：当访问属性时，建立属性与 effect 之间的依赖关系
- 自动解包 ref：如果属性值是 ref，自动返回 `.value`
- 自动响应式：如果属性值是对象，自动转换为响应式对象

**处理流程：**

1. **收集依赖**：调用 `track(target, key)` 收集依赖
2. **获取值**：使用 `Reflect.get` 获取属性值
3. **处理 ref**：如果值是 ref，返回 `res.value`（自动解包）
4. **处理对象**：如果值是对象，调用 `reactive(res)` 转换为响应式对象
5. **返回结果**：返回处理后的值

### 2. 属性设置拦截（set）

`set` 处理器拦截对象属性的设置操作。

**功能：**

- 触发更新：当设置属性时，通知所有依赖该属性的 effect 更新
- 处理 ref 赋值：如果旧值是 ref，新值不是 ref，则对 ref 的 `.value` 赋值
- 值变化检测：只有值真正变化时才触发更新

**处理流程：**

1. **获取旧值**：保存当前属性值
2. **设置新值**：使用 `Reflect.set` 设置属性值
3. **处理 ref**：如果旧值是 ref 且新值不是 ref，对 ref 的 `.value` 赋值并返回
4. **值变化检测**：使用 `hasChanged` 检测值是否变化
5. **触发更新**：如果值变化，调用 `trigger(target, key)` 触发更新
6. **返回结果**：返回设置结果

## 核心实现

### mutableHandlers

`mutableHandlers` 是 `Proxy` 的处理器对象，包含 `get` 和 `set` 两个拦截器。

```typescript
export const mutableHandlers: ProxyHandler<object> = {
  get(target, key, receiver) {
    /* ... */
  },
  set(target, key, newValue, receiver) {
    /* ... */
  },
};
```

## 使用示例

### 基本使用

```typescript
import { reactive } from './reactive';
import { effect } from './effect';

const state = reactive({ count: 0, name: 'Vue' });

effect(() => {
  console.log(state.count); // 访问时收集依赖
});

state.count = 1; // 设置时触发更新
```

### 自动解包 ref

```typescript
import { ref, reactive } from './reactivity';

const count = ref(0);
const state = reactive({ count });

console.log(state.count); // 0，自动解包，不需要 .value
state.count = 1; // 直接赋值，自动设置 ref.value
```

**说明：**

- 当对象属性是 ref 时，访问属性会自动返回 `ref.value`
- 设置属性时，如果旧值是 ref 且新值不是 ref，会自动设置 `ref.value`

### 自动响应式转换

```typescript
const state = reactive({
  user: {
    name: 'Alice',
    age: 20,
  },
});

effect(() => {
  console.log(state.user.name); // user 自动转换为响应式对象
});

state.user.name = 'Bob'; // 触发更新
```

**说明：**

- 当访问对象属性时，如果属性值是对象，会自动调用 `reactive` 转换
- 嵌套对象也会自动转换为响应式对象

### 值变化检测

```typescript
const state = reactive({ count: 0 });

effect(() => {
  console.log(state.count);
});

state.count = 0; // 不会触发更新，值没有变化
state.count = 1; // 触发更新，值发生变化
```

## 关键特性

### 1. receiver 参数

`receiver` 参数用于保证访问器中的 `this` 指向代理对象。

**为什么需要 receiver？**

```typescript
const res = Reflect.get(target, key, receiver);
```

- `receiver` 是 Proxy 的 `get` 拦截器的第三个参数
- 表示属性访问的接收者（通常是代理对象本身）
- 传递给 `Reflect.get`，确保访问器属性中的 `this` 指向代理对象

**示例说明：**

```typescript
const obj = {
  _value: 0,
  get value() {
    return this._value;  // this 应该指向代理对象
  }
};

const proxy = reactive(obj);
console.log(proxy.value);  // 如果不用 receiver，this 指向原始对象
```

- 如果不用 `receiver`，访问器中的 `this` 会指向原始对象
- 使用 `receiver`，`this` 指向代理对象，保证响应式行为一致
- 这是 Proxy 和 Reflect 配合使用的标准做法

### 2. 自动解包 ref

当对象属性是 ref 时，访问和设置都会自动处理。

**访问时：**

```typescript
if (isRef(res)) {
  return res.value; // 自动解包
}
```

**设置时：**

```typescript
if (isRef(oldVal) && !isRef(newValue)) {
  oldVal.value = newValue; // 自动设置 ref.value
  return res; // 避免重复触发
}
```

### 3. 嵌套响应式

访问嵌套对象时，自动转换为响应式对象。

```typescript
if (isObject(res)) {
  return reactive(res); // 自动转换
}
```

## 注意事项

1. **依赖收集**：访问属性时会自动收集依赖，无需手动处理
2. **自动解包**：对象中的 ref 会自动解包，访问时不需要 `.value`
3. **嵌套响应式**：嵌套对象会自动转换为响应式对象
4. **值变化检测**：只有值真正变化时才会触发更新
5. **ref 赋值**：如果旧值是 ref，新值不是 ref，会自动设置 `ref.value`，避免重复触发
