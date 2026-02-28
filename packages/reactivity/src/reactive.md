# Reactive 说明

## 概述

`reactive` 用于将普通对象转换为响应式对象，底层依赖 ES6 `Proxy`。

## 主要功能

### 1. 创建响应式对象

`reactive()` 函数用于将一个普通对象转换为响应式对象。

```typescript
const state = reactive({ count: 0, name: 'Vue' });
```

**特点：**

- 只接受对象类型作为参数
- 返回一个 Proxy 代理对象
- 对象的属性访问和修改都会被拦截

### 2. 响应式对象缓存机制

为了避免重复创建代理对象，`reactive` 实现了两层缓存机制。

**设计原因：**

- 同一个对象多次调用 `reactive` 应该返回同一个代理对象
- 避免重复代理导致的性能问题和内存浪费
- 保证响应式对象的一致性

**第一层：`reactiveSet`**

```typescript
const reactiveSet = new WeakSet<object>();
```

- 使用 `WeakSet` 存储所有已创建的响应式对象（代理对象）
- 如果传入的对象已经是响应式对象，直接返回
- `WeakSet` 的优势：不阻止对象被垃圾回收，避免内存泄漏

**第二层：`reactiveMap`**

```typescript
const reactiveMap = new WeakMap<object, object>();
```

- 使用 `WeakMap` 存储原始对象和代理对象的映射关系
- 同一个原始对象只会创建一个代理对象
- `WeakMap` 的优势：key 被回收时，value 也会自动回收

**缓存逻辑：**

1. **类型检查**：如果不是对象，直接返回
2. **响应式检查**：检查传入对象是否已经在 `reactiveSet` 中（说明已经是响应式对象）
3. **缓存检查**：检查 `reactiveMap` 中是否已有该对象的代理
4. **创建代理**：如果都没有，创建新的 Proxy 对象
5. **缓存存储**：
   - 将代理对象存入 `reactiveSet`（标记为响应式对象）
   - 将原始对象和代理对象的映射存入 `reactiveMap`（避免重复创建）

**为什么使用 WeakSet 和 WeakMap？**

- **自动垃圾回收**：当对象不再被引用时，WeakSet/WeakMap 中的条目会自动清除
- **避免内存泄漏**：不会阻止对象被垃圾回收
- **性能优化**：减少内存占用，提高性能

### 3. 响应式判断

`isReactive()` 函数用于判断一个对象是否是响应式对象。

```typescript
const state = reactive({ count: 0 });
isReactive(state); // true
isReactive({ count: 0 }); // false
```

**实现方式：**

- 检查对象是否在 `reactiveSet` 中
- 在 `reactiveSet` 中的对象就是响应式对象

## 核心实现

### `createReactiveObject` 函数

这是创建响应式对象的内部函数。

**处理流程：**

1. **类型检查**：如果不是对象，直接返回
2. **响应式检查**：如果已经是响应式对象，直接返回
3. **缓存检查**：如果已经创建过代理，返回缓存的代理对象
4. **创建代理**：使用 `Proxy` 和 `mutableHandlers` 创建代理对象
5. **缓存存储**：将代理对象存入 `reactiveSet` 和 `reactiveMap`
6. **返回代理**：返回新创建的代理对象

## 与 ref 的区别

| 特性     | reactive     | ref                 |
| -------- | ------------ | ------------------- |
| 适用类型 | 仅对象类型   | 所有类型            |
| 访问方式 | 直接访问属性 | `.value`            |
| 基本类型 | 不支持       | 支持                |
| 对象转换 | 直接代理对象 | 自动转换为 reactive |

## 使用示例

### 基本使用

```typescript
import { reactive } from './reactive';
import { effect } from './effect';

const state = reactive({ count: 0, name: 'Vue' });

effect(() => {
  console.log(`count: ${state.count}, name: ${state.name}`);
});

state.count = 1; // 触发更新
state.name = 'Vue 3'; // 触发更新
```

### 嵌套对象

```typescript
const state = reactive({
  user: {
    name: 'Alice',
    age: 20,
  },
});

effect(() => {
  console.log(state.user.name);
});

state.user.name = 'Bob'; // 触发更新
```

### 判断响应式

```typescript
const state = reactive({ count: 0 });
const obj = { count: 0 };

console.log(isReactive(state)); // true
console.log(isReactive(obj)); // false
```

## 注意事项

1. **只接受对象**：`reactive` 只能处理对象类型，基本类型需要使用 `ref`
2. **自动深度响应式**：嵌套对象会自动转换为响应式对象，无需手动处理
3. **缓存机制**：同一个对象多次调用 `reactive` 会返回同一个代理对象，保证一致性
4. **Proxy 限制**：无法代理基本类型，这是 JavaScript Proxy 的限制，基本类型应使用 `ref`
5. **WeakSet/WeakMap 优势**：使用 WeakSet 和 WeakMap 存储，不会阻止对象被垃圾回收，避免内存泄漏
