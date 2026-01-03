# Dep 功能说明

## 概述

`dep` 模块负责管理 `reactive` 对象的依赖收集和触发更新。它使用 `WeakMap` 和 `Map` 建立对象属性与依赖项之间的映射关系。

## 核心数据结构

### Dep 类

`Dep` 类表示一个依赖项，用于管理某个对象属性的所有订阅者。

```typescript
class Dep {
  subs: Link | undefined; // 订阅者链表的头节点
  subsTail: Link | undefined; // 订阅者链表的尾节点
}
```

**特点：**

- 维护一个订阅者链表，记录所有依赖该属性的 effect
- 当属性值变化时，可以通知所有订阅者更新

### targetMap

`targetMap` 是核心的数据结构，用于建立对象属性与依赖项的映射关系。

```typescript
const targetMap = new WeakMap<object, Map<string | symbol, Dep>>();
```

**结构说明：**

```
targetMap = {
  [target对象]: {
    '属性名1': Dep实例,
    '属性名2': Dep实例,
    ...
  }
}
```

**示例：**

```typescript
const state = { a: 1, b: 2 };
// targetMap 结构：
// {
//   [state]: {
//     'a': Dep实例,
//     'b': Dep实例,
//   }
// }
```

## 主要功能

### 1. 收集依赖（track）

`track()` 函数用于收集依赖，建立对象属性与 effect 之间的依赖关系。

**功能：**

- 获取或创建 `Dep` 实例
- 建立属性与依赖项的映射关系
- 调用 `link()` 建立双向链表关系

**处理流程：**

1. **检查活跃 effect**：如果没有活跃的 effect，直接返回
2. **获取 depsMap**：从 `targetMap` 中获取 target 对应的 `depsMap`
3. **创建 depsMap**：如果不存在，创建新的 `Map` 并存入 `targetMap`
4. **获取 Dep**：从 `depsMap` 中获取 key 对应的 `Dep` 实例
5. **创建 Dep**：如果不存在，创建新的 `Dep` 实例并存入 `depsMap`
6. **建立关系**：调用 `link(dep, activeSub)` 建立双向链表关系

### 2. 触发更新（trigger）

`trigger()` 函数用于触发更新，通知所有依赖该属性的 effect 重新执行。

**功能：**

- 从 `targetMap` 中查找对应的 `Dep` 实例
- 调用 `propagate()` 通知所有订阅者更新

**处理流程：**

1. **获取 depsMap**：从 `targetMap` 中获取 target 对应的 `depsMap`
2. **检查 depsMap**：如果不存在，说明没有收集过依赖，直接返回
3. **获取 Dep**：从 `depsMap` 中获取 key 对应的 `Dep` 实例
4. **检查 Dep**：如果不存在，说明没有收集过依赖，直接返回
5. **触发更新**：调用 `propagate(dep.subs)` 通知所有订阅者更新

## 使用示例

### 基本使用

```typescript
import { reactive, effect } from './reactivity';

const state = reactive({ count: 0, name: 'Vue' });

effect(() => {
  console.log(state.count); // 访问时调用 track(state, 'count')
});

state.count = 1; // 设置时调用 trigger(state, 'count')
```

### 多个属性

```typescript
const state = reactive({ a: 1, b: 2, c: 3 });

effect(() => {
  console.log(state.a, state.b); // 收集 a 和 b 的依赖
});

state.a = 10; // 触发 a 的更新
state.b = 20; // 触发 b 的更新
state.c = 30; // 不触发更新（没有收集 c 的依赖）
```

### 多个对象

```typescript
const state1 = reactive({ count: 0 });
const state2 = reactive({ count: 0 });

effect(() => {
  console.log(state1.count); // 只收集 state1.count 的依赖
});

state1.count = 1; // 触发更新
state2.count = 1; // 不触发更新（不同的对象）
```

## 与 ref 的依赖收集对比

| 特性     | dep (reactive)       | ref               |
| -------- | -------------------- | ----------------- |
| 数据结构 | WeakMap + Map + Dep  | RefImpl 直接维护  |
| 依赖存储 | 按对象和属性存储     | 直接在 RefImpl 中 |
| 收集方式 | track(target, key)   | trackRef(ref)     |
| 触发方式 | trigger(target, key) | triggerRef(ref)   |
| 适用场景 | reactive 对象的属性  | ref 的 value 属性 |

## 关键特性

### 1. WeakMap 的使用

使用 `WeakMap` 存储 `targetMap`，具有以下优势：

**为什么使用 WeakMap？**

- **自动垃圾回收**：当对象被回收时，对应的映射关系也会自动回收
- **内存安全**：不会阻止对象被垃圾回收，避免内存泄漏
- **性能优化**：减少内存占用，提高性能

**WeakMap vs Map：**

```typescript
// 使用 WeakMap（推荐）
const targetMap = new WeakMap<object, Map<string, Dep>>();

// 如果使用 Map（不推荐）
const targetMap = new Map<object, Map<string, Dep>>();
// 问题：Map 会阻止对象被垃圾回收，导致内存泄漏
```

**数据结构设计：**

```
targetMap (WeakMap)
  └─ [target对象] → depsMap (Map)
       └─ 'count' → Dep实例
       └─ 'name' → Dep实例
```

- 外层使用 `WeakMap`，key 是原始对象
- 内层使用 `Map`，key 是属性名（string 或 symbol）
- 每个属性对应一个 `Dep` 实例，管理该属性的所有订阅者

### 2. 按属性存储依赖

每个对象的每个属性都有独立的 `Dep` 实例：

- **精确更新**：只有变化的属性会触发更新
- **性能优化**：避免不必要的更新
- **依赖隔离**：不同属性的依赖互不影响

### 3. 懒加载创建

`Dep` 实例和 `depsMap` 都是懒加载创建的：

- **按需创建**：只有在收集依赖时才创建
- **节省内存**：未使用的属性不会创建 `Dep` 实例
- **提高性能**：减少不必要的内存分配

## 注意事项

1. **WeakMap 限制**：`targetMap` 使用 `WeakMap`，key 必须是对象
2. **属性隔离**：每个属性的依赖是独立的，互不影响
3. **懒加载**：`Dep` 实例和 `depsMap` 都是按需创建的
4. **依赖检查**：`trigger` 时会检查是否存在依赖，避免不必要的操作
5. **与 ref 的区别**：`dep` 用于 `reactive` 对象，`ref` 有自己的依赖管理机制
