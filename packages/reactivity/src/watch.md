# Watch 功能说明

## 概述

`watch` 是 Vue 3 响应式系统提供的监听 API，用于监听响应式数据的变化并执行回调函数。它基于 `effect` 的 `scheduler` 机制实现。

## 主要功能

### 1. 监听响应式数据

`watch()` 函数可以监听多种类型的响应式数据源。

**支持的数据源类型：**

- **Ref**：`watch(ref(0), callback)`
- **Reactive 对象**：`watch(reactive({ count: 0 }), callback)`
- **Getter 函数**：`watch(() => state.count, callback)`

### 2. 立即执行（immediate）

`immediate` 选项控制是否在创建时立即执行一次回调。

```typescript
watch(source, callback, { immediate: true });
```

**行为：**

- `immediate: true`：创建时立即执行一次回调
- `immediate: false`（默认）：只在数据变化时执行回调

### 3. 只执行一次（once）

`once` 选项控制回调是否只执行一次。

```typescript
watch(source, callback, { once: true });
```

**行为：**

- `once: true`：回调执行一次后自动停止监听
- `once: false`（默认）：每次变化都会执行回调

### 4. 深度监听（deep）

`deep` 选项控制是否深度监听对象的变化。

```typescript
watch(source, callback, { deep: true });
```

**行为：**

- `deep: true`：深度监听对象的所有属性
- `deep: 数字`：指定监听深度（如 `deep: 2` 表示监听两层）
- `deep: false`（默认）：只监听第一层属性

**特殊规则：**

- 当数据源是 `reactive` 对象时，`deep` 默认为 `true`
- 当数据源是 `ref` 或函数时，`deep` 默认为 `false`

### 5. 清理副作用（onCleanup）

回调函数可以接收 `onCleanup` 参数，用于注册清理函数。

```typescript
watch(source, (newValue, oldValue, onCleanup) => {
  const timer = setTimeout(() => {
    console.log('delayed');
  }, 1000);

  onCleanup(() => {
    clearTimeout(timer);
  });
});
```

**行为：**

- 每次回调执行前，会先执行上一次注册的清理函数
- 用于清理定时器、取消请求等副作用

## 核心实现

### watch 函数

**处理流程：**

1. **处理 once 选项**：如果 `once` 为 `true`，包装回调函数，执行后自动停止
2. **创建 getter**：根据数据源类型创建对应的 getter 函数
3. **处理 deep 选项**：如果 `deep` 为 `true`，使用 `traverse` 函数深度遍历
4. **创建 effect**：使用 `ReactiveEffect` 创建副作用，设置 `scheduler` 为 `job`
5. **执行初始化**：根据 `immediate` 选项决定是否立即执行

### job 函数

`job` 是 watch 的调度函数，在数据变化时执行。

**处理流程：**

1. **清理副作用**：执行上一次注册的清理函数
2. **获取新值**：通过 `effect.run()` 获取新值（同时收集依赖）
3. **执行回调**：调用用户传入的回调函数，传入新值和旧值
4. **更新旧值**：将新值保存为下次的旧值

### traverse 函数

`traverse()` 函数用于深度遍历对象，触发所有属性的访问，从而收集依赖。

**功能：**

- 递归遍历对象的所有属性
- 使用 `Set` 避免循环引用
- 支持指定深度限制

**实现逻辑：**

1. 检查是否为对象且深度大于 0
2. 检查是否已遍历过（避免循环引用）
3. 添加到 `seen` Set 中
4. 遍历所有属性，递归调用 `traverse`

## 使用示例

### 监听 Ref

```typescript
import { ref, watch } from './reactivity';

const count = ref(0);

watch(count, (newValue, oldValue) => {
  console.log(`count changed: ${oldValue} -> ${newValue}`);
});

count.value = 1; // 输出: count changed: 0 -> 1
```

### 监听 Reactive 对象

```typescript
import { reactive, watch } from './reactivity';

const state = reactive({ count: 0, name: 'Vue' });

watch(state, (newValue, oldValue) => {
  console.log('state changed', newValue);
});

state.count = 1; // 触发更新
state.name = 'Vue 3'; // 触发更新
```

### 监听 Getter 函数

```typescript
const state = reactive({ count: 0, name: 'Vue' });

watch(
  () => state.count,
  (newValue, oldValue) => {
    console.log(`count: ${oldValue} -> ${newValue}`);
  },
);

state.count = 1; // 触发更新
state.name = 'Vue 3'; // 不触发更新（只监听 count）
```

### 立即执行

```typescript
watch(count, callback, { immediate: true });
// 创建时立即执行一次 callback
```

### 只执行一次

```typescript
watch(count, callback, { once: true });
// 第一次变化后自动停止监听
```

### 深度监听

```typescript
const state = reactive({
  user: {
    name: 'Alice',
    age: 20,
  },
});

watch(state, callback, { deep: true });
// 监听 user.name 和 user.age 的变化
```

### 清理副作用

```typescript
watch(count, (newValue, oldValue, onCleanup) => {
  const timer = setTimeout(() => {
    console.log('delayed', newValue);
  }, 1000);

  onCleanup(() => {
    clearTimeout(timer);
  });
});

count.value = 1; // 1秒后输出: delayed 1
count.value = 2; // 清理上一次的定时器，1秒后输出: delayed 2
```

### 停止监听

```typescript
const stop = watch(count, callback);

stop(); // 停止监听
```

## 与 effect 的区别

| 特性     | watch                   | effect            |
| -------- | ----------------------- | ----------------- |
| 用途     | 监听数据变化执行回调    | 执行副作用函数    |
| 回调参数 | 接收新值和旧值          | 不接收参数        |
| 执行时机 | 通过 scheduler 控制     | 立即执行          |
| 清理机制 | 支持 onCleanup          | 不支持            |
| 选项支持 | 支持 immediate、once 等 | 支持 scheduler 等 |

## 注意事项

1. **数据源类型**：支持 ref、reactive 对象和 getter 函数
2. **深度监听**：reactive 对象默认深度监听，ref 和函数默认不深度监听
3. **清理副作用**：每次回调执行前会清理上一次的副作用
4. **停止监听**：返回的 `stop` 函数可以手动停止监听
5. **旧值获取**：第一次执行时，`oldValue` 为 `undefined`（除非 `immediate: true`）
