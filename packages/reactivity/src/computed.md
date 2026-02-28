# Computed 说明

## 概述

`computed` 用于创建基于响应式数据的派生值。计算属性带缓存，依赖变化时才会重新计算。

## 主要功能

### 1. 创建计算属性实例

`computed()` 函数用于创建计算属性。

**两种使用方式：**

**方式一：只读计算属性**

```typescript
const count = ref(0);
const doubleCount = computed(() => count.value * 2);
```

**方式二：可写计算属性**

```typescript
const count = ref(0);
const doubleCount = computed({
  get: () => count.value * 2,
  set: value => {
    count.value = value / 2;
  },
});
```

### 2. 缓存行为

计算属性具有缓存机制，只有依赖的数据变化时才会重新计算。

```typescript
const count = ref(0);
const doubleCount = computed(() => count.value * 2);

console.log(doubleCount.value); // 0，执行计算
console.log(doubleCount.value); // 0，使用缓存，不执行计算

count.value = 1;
console.log(doubleCount.value); // 2，依赖变化，重新计算
```

**缓存逻辑：**

- 使用 `dirty` 标志控制是否需要重新计算
- `dirty: true` 表示需要重新计算
- `dirty: false` 表示可以使用缓存值

### 3. 双重角色

计算属性既是依赖项（Dependency），也是订阅者（Sub）。

**设计原因：**

- 计算属性需要依赖其他响应式数据（作为 Sub）
- 计算属性也可能被其他 effect 依赖（作为 Dependency）
- 这种双重身份设计，使得计算属性可以形成依赖链

**作为依赖项（Dependency）：**

- 当 effect 访问计算属性时，计算属性作为依赖项
- 维护订阅者链表（`subs`），当值变化时通知订阅者
- 实现 `Dependency` 接口，支持依赖收集和触发更新

**作为订阅者（Sub）：**

- 当计算属性执行 getter 函数时，作为订阅者
- 收集 getter 函数中访问的响应式数据作为依赖（`deps`）
- 实现 `Sub` 接口，支持依赖追踪和清理

**依赖链示例：**

```
ref(count) → computed(doubleCount) → effect(console.log)
   ↑              ↑                        ↑
  dep           dep/sub                   sub
```

- `count` 是 `doubleCount` 的依赖（`doubleCount` 作为 Sub）
- `doubleCount` 是 `effect` 的依赖（`doubleCount` 作为 Dependency）
- 当 `count` 变化时，会触发 `doubleCount` 重新计算，然后触发 `effect` 更新

### 4. 值变化检测

计算属性会检测值是否真的发生变化，只有变化时才通知订阅者。

```typescript
const count = ref(0);
const doubleCount = computed(() => count.value * 2);

count.value = 0; // 值没变化，不会通知订阅者
count.value = 1; // 值变化，通知订阅者
```

## 核心实现

### `ComputedRefImpl` 类

`ComputedRefImpl` 是计算属性的实现类，同时实现了 `Dependency` 和 `Sub` 接口。

**主要属性：**

- `_value`: 保存计算属性的值
- `[ReactiveFlags.IS_REF]`: 标记为 Ref 对象（可通过 `isRef` 判断）
- `subs`: 订阅者链表的头节点（依赖该计算属性的 effect）
- `deps`: 依赖项链表的头节点（计算属性依赖的响应式数据）
- `dirty`: 是否脏（需要重新计算）
- `tracking`: 是否正在追踪依赖

**主要方法：**

- `get value()`: 读取计算属性的值
- `set value()`: 设置计算属性的值（仅可写计算属性）
- `update()`: 更新计算属性的值

### `get value()`

读取计算属性的值。

**处理流程：**

1. **检查脏标志**：如果 `dirty` 为 `true`，调用 `update()` 重新计算
2. **收集依赖**：如果有活跃的 effect，建立计算属性与 effect 的依赖关系
3. **返回值**：返回 `_value`

### `update()`

更新计算属性的值。

**处理流程：**

1. **保存当前 effect**：保存 `activeSub`，用于处理嵌套逻辑
2. **设置活跃 effect**：将计算属性设置为 `activeSub`
3. **开始追踪**：调用 `startTrack` 开始追踪依赖
4. **执行 getter**：执行 getter 函数，收集依赖并获取新值
5. **值变化检测**：使用 `hasChanged` 检测值是否变化
6. **结束追踪**：调用 `endTrack` 结束追踪
7. **恢复 effect**：恢复之前的 `activeSub`
8. **返回结果**：返回是否值发生变化

### `set value()`

设置计算属性的值（仅可写计算属性）。

**处理流程：**

1. **检查 setter**：如果存在 `setter`，调用 `setter`
2. **警告**：如果不存在 `setter`，输出警告（只读计算属性）

## 使用示例

### 只读计算属性

```typescript
import { ref, computed } from './reactivity';

const count = ref(0);
const doubleCount = computed(() => count.value * 2);

console.log(doubleCount.value); // 0
count.value = 1;
console.log(doubleCount.value); // 2
```

### 可写计算属性

```typescript
const count = ref(0);
const doubleCount = computed({
  get: () => count.value * 2,
  set: value => {
    count.value = value / 2;
  },
});

console.log(doubleCount.value); // 0
doubleCount.value = 4;
console.log(count.value); // 2
```

### 依赖多个响应式数据

```typescript
const firstName = ref('John');
const lastName = ref('Doe');
const fullName = computed(() => `${firstName.value} ${lastName.value}`);

console.log(fullName.value); // "John Doe"
firstName.value = 'Jane';
console.log(fullName.value); // "Jane Doe"
```

### 在 effect 中使用

```typescript
const count = ref(0);
const doubleCount = computed(() => count.value * 2);

effect(() => {
  console.log(doubleCount.value); // 访问计算属性，建立依赖关系
});

count.value = 1; // 触发 effect 更新
```

### 计算属性依赖计算属性

```typescript
const count = ref(0);
const doubleCount = computed(() => count.value * 2);
const quadrupleCount = computed(() => doubleCount.value * 2);

console.log(quadrupleCount.value); // 0
count.value = 1;
console.log(quadrupleCount.value); // 4
```

## 与 ref 的区别

| 特性     | computed             | ref        |
| -------- | -------------------- | ---------- |
| 用途     | 派生值，基于其他数据 | 直接存储值 |
| 缓存     | 有缓存机制           | 无缓存     |
| 计算时机 | 依赖变化时重新计算   | 立即计算   |
| 双重身份 | 既是 dep 也是 sub    | 只是 dep   |
| 可写性   | 可配置为只读或可写   | 总是可写   |

## 注意事项

1. **缓存机制**：计算属性有缓存机制，使用 `dirty` 标志控制，只有依赖变化时才重新计算
2. **双重身份**：计算属性既是依赖项（Dependency）也是订阅者（Sub），可以形成依赖链
3. **值变化检测**：只有值真正变化时才通知订阅者，使用 `hasChanged` 进行严格相等比较
4. **只读计算属性**：如果只传入 getter 函数，计算属性是只读的，设置值会输出警告
5. **可写计算属性**：需要传入包含 `get` 和 `set` 的对象，支持双向绑定
6. **isRef 判断**：计算属性可以通过 `isRef` 判断为 `true`，因为它实现了 Ref 接口
7. **依赖链**：计算属性可以依赖其他计算属性，形成依赖链，自动处理更新传播
