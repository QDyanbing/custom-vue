# Ref 功能说明

## 概述

`ref` 是 Vue 3 响应式系统的核心 API 之一，用于创建一个响应式的引用。它可以包装任何类型的值（基本类型、对象、数组等），使其变成响应式的。

## 主要功能

### 1. 创建响应式引用

`ref()` 函数用于创建一个响应式引用对象。

```typescript
const count = ref(0);
const message = ref('Hello');
const user = ref({ name: 'Vue', age: 3 });
```

**特点：**

- 接受任何类型的值作为参数
- 返回一个 `RefImpl` 实例
- 通过 `.value` 属性访问和修改值

### 2. 自动响应式转换

当传入的值是对象类型时，`ref` 会自动将其转换为响应式对象（使用 `reactive`）。

```typescript
const obj = ref({ count: 0 });
// obj._value 实际上是 reactive({ count: 0 })
```

**设计原因：**

- 对象类型需要深度响应式，直接使用 `reactive` 更高效
- 统一响应式处理，避免对象属性变化无法被追踪
- 保持 API 一致性，用户无需关心内部实现

**实现逻辑：**

- 在构造函数中，如果 `value` 是对象，则调用 `reactive(value)` 进行转换
- 在 `set value` 时，如果新值是对象，也会自动转换为响应式对象
- 使用 `isObject()` 判断是否为对象类型

**为什么对象需要转换？**

- 基本类型值可以直接存储，无需代理
- 对象需要 Proxy 代理才能拦截属性访问
- 转换后可以统一使用 `reactive` 的依赖收集机制

### 3. 值变化检测

`ref` 在设置新值时会检测值是否真的发生了变化，只有值发生变化时才会触发更新。

```typescript
const count = ref(0);
count.value = 0; // 不会触发更新，因为值没有变化
count.value = 1; // 会触发更新
```

**实现方式：**

- 使用 `hasChanged()` 函数比较新旧值
- 只有值发生变化时才更新 `_value` 并触发依赖更新

### 4. 依赖收集（Track）

当读取 `ref.value` 时，会自动收集当前活跃的 effect 作为依赖。

```typescript
const count = ref(0);

effect(() => {
  console.log(count.value); // 读取时会收集依赖
});
```

**实现机制：**

- `get value()` 中调用 `trackRef(this)`
- `trackRef()` 会检查是否有活跃的 `activeSub`（当前正在执行的 effect）
- 如果有，则通过 `link()` 函数建立 ref 和 effect 之间的双向链表关系

### 5. 触发更新（Trigger）

当修改 `ref.value` 时，会自动触发所有依赖该 ref 的 effect 重新执行。

```typescript
const count = ref(0);

effect(() => {
  console.log(count.value);
});

count.value = 1; // 触发 effect 重新执行
```

**实现机制：**

- `set value()` 中在值变化后调用 `triggerRef(this)`
- `triggerRef()` 会遍历 `subs` 链表（所有订阅该 ref 的 effect）
- 通过 `propagate()` 函数通知所有订阅者更新

### 6. 类型判断

`isRef()` 函数用于判断一个值是否是 Ref 对象。

```typescript
const count = ref(0);
isRef(count); // true
isRef(0); // false
```

**实现方式：**

- 检查值是否存在且具有 `__v_isRef` 标志属性
- `RefImpl` 实例在创建时会被标记 `[ReactiveFlags.IS_REF]: true`

## 核心数据结构

### RefImpl 类

`RefImpl` 是 `ref` 的实现类，实现了 `Dependency` 接口。

**设计思路：**

- 使用 `_value` 私有属性保存实际值，避免与 `value` 访问器冲突
- 通过 `get value()` 和 `set value()` 访问器实现响应式拦截
- 实现 `Dependency` 接口，维护订阅者链表，支持依赖收集和触发更新

**主要属性：**

- `_value`: 保存实际的值（使用下划线前缀表示私有属性）
- `[ReactiveFlags.IS_REF]`: 标记为 Ref 对象，用于 `isRef()` 判断
- `subs`: 订阅者链表的头节点（所有依赖该 ref 的 effect）
- `subsTail`: 订阅者链表的尾节点（用于快速追加新订阅者）

**主要方法：**

- `get value()`: 读取值时收集依赖
- `set value()`: 设置值时触发更新

**为什么使用 `_value`？**

- 避免与 `value` 访问器形成循环引用
- 明确区分内部存储值和外部访问接口
- 符合 JavaScript 私有属性的命名约定

## 使用示例

### 基本使用

```typescript
import { ref } from './ref';
import { effect } from './effect';

// 创建响应式引用
const count = ref(0);
const name = ref('Vue');

// 创建 effect 监听变化
effect(() => {
  console.log(`count: ${count.value}, name: ${name.value}`);
});

// 修改值，触发更新
count.value = 1; // 输出: count: 1, name: Vue
name.value = 'Vue 3'; // 输出: count: 1, name: Vue 3
```

### 对象类型

```typescript
const user = ref({ name: 'Alice', age: 20 });

effect(() => {
  console.log(user.value.name);
});

user.value.name = 'Bob'; // 触发更新
```

### 判断 Ref

```typescript
const count = ref(0);
const num = 0;

console.log(isRef(count)); // true
console.log(isRef(num)); // false
```

## 与 reactive 的区别

| 特性     | ref                 | reactive     |
| -------- | ------------------- | ------------ |
| 适用类型 | 所有类型            | 仅对象类型   |
| 访问方式 | `.value`            | 直接访问属性 |
| 基本类型 | 支持                | 不支持       |
| 对象转换 | 自动转换为 reactive | 直接代理对象 |

## 内部实现细节

### 依赖收集流程

**完整流程：**

1. 读取 `ref.value` 时，调用 `get value()`
2. `get value()` 调用 `trackRef(this)`，传入当前 RefImpl 实例
3. `trackRef()` 检查全局变量 `activeSub` 是否存在（当前正在执行的 effect）
4. 如果存在，调用 `link(dep, activeSub)` 建立双向链表关系
5. `link()` 函数会：
   - 在 `ref.subs` 链表中添加 effect
   - 在 `effect.deps` 链表中添加 ref
   - 建立双向引用，方便后续清理

**关键点：**

- `activeSub` 是全局变量，由 `effect` 在执行时设置
- 只有在 effect 执行期间访问 `ref.value` 才会收集依赖
- 双向链表设计支持快速查找和清理

### 触发更新流程

**完整流程：**

1. 设置 `ref.value = newValue` 时，调用 `set value()`
2. 使用 `hasChanged(newValue, this._value)` 检测值是否变化
3. 如果变化：
   - 更新 `_value`（如果是对象，先转换为 reactive）
   - 调用 `triggerRef(this)` 触发更新
4. `triggerRef()` 检查 `dep.subs` 是否存在
5. 如果存在，调用 `propagate(dep.subs)` 通知所有订阅者
6. `propagate()` 遍历订阅者链表：
   - 标记订阅者为脏状态（`dirty = true`）
   - 区分 effect 和 computed，分别处理
   - 调用 effect 的 `notify()` 方法重新执行

**关键点：**

- `hasChanged()` 使用 `Object.is()` 进行严格相等比较
- 只有值真正变化时才触发更新，避免不必要的重新渲染
- `propagate()` 使用队列机制，避免重复执行

## 注意事项

1. **访问方式**：必须通过 `.value` 访问和修改 ref 的值
2. **对象自动转换**：传入对象会自动转换为 `reactive`，但访问时仍需使用 `.value`
3. **值变化检测**：只有值真正变化时才会触发更新，避免不必要的重新渲染
4. **依赖清理**：当 effect 停止或不再使用时，会自动清理依赖关系
