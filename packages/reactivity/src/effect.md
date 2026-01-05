# Effect 功能说明

## 概述

`effect` 是 Vue 3 响应式系统的核心 API，用于创建副作用函数。当副作用函数中访问的响应式数据发生变化时，副作用函数会自动重新执行。

## 主要功能

### 1. 创建副作用

`effect()` 函数用于创建副作用函数。

```typescript
const count = ref(0);

effect(() => {
  console.log(count.value);
});
```

**特点：**

- 立即执行一次副作用函数
- 自动收集副作用函数中访问的响应式数据作为依赖
- 当依赖变化时，自动重新执行副作用函数

### 2. 依赖自动收集

副作用函数执行时，会自动收集函数中访问的所有响应式数据作为依赖。

```typescript
const count = ref(0);
const name = ref('Vue');

effect(() => {
  console.log(count.value, name.value); // 自动收集 count 和 name 的依赖
});

count.value = 1; // 触发 effect 重新执行
name.value = 'Vue 3'; // 触发 effect 重新执行
```

### 3. 嵌套支持

`effect` 支持嵌套调用，通过保存和恢复 `activeSub` 来处理嵌套逻辑。

```typescript
effect(() => {
  console.log('effect1');
  effect(() => {
    console.log('effect2');
  });
});
```

**处理机制：**

- 执行 effect 前，保存当前的 `activeSub`
- 将当前 effect 设置为 `activeSub`
- 执行完成后，恢复之前的 `activeSub`

### 4. 自定义调度器（scheduler）

可以通过 `scheduler` 选项自定义副作用函数的执行时机。

```typescript
effect(
  () => {
    console.log(count.value);
  },
  {
    scheduler: () => {
      // 自定义执行逻辑
      console.log('custom scheduler');
    },
  },
);
```

**默认行为：**

- 如果没有提供 `scheduler`，默认调用 `run()` 方法
- 如果提供了 `scheduler`，依赖变化时调用 `scheduler` 而不是 `run()`

### 5. 停止副作用

可以通过返回的 `runner` 函数停止副作用。

```typescript
const stop = effect(() => {
  console.log(count.value);
});

stop(); // 停止副作用，不再响应依赖变化
```

**停止机制：**

- 调用 `stop()` 会清理所有依赖关系
- 停止后，副作用函数不再响应依赖变化
- 停止后再次调用 `runner`，副作用函数会执行但不会收集依赖

## 核心实现

### ReactiveEffect 类

`ReactiveEffect` 是 effect 的实现类，实现了 `Sub` 接口。

**主要属性：**

- `active`: 是否激活（是否已停止）
- `deps`: 依赖项链表的头节点（effect 依赖的响应式数据）
- `depsTail`: 依赖项链表的尾节点
- `tracking`: 是否正在追踪依赖
- `dirty`: 是否脏（需要重新执行）
- `fn`: 副作用函数
- `scheduler`: 自定义调度器

**主要方法：**

- `run()`: 执行副作用函数
- `notify()`: 通知更新（调用 `scheduler`）
- `stop()`: 停止副作用

### run() 方法

执行副作用函数的核心方法。

**处理流程：**

1. **检查激活状态**：如果已停止，直接执行函数并返回（不收集依赖）
2. **保存当前 effect**：保存 `activeSub`，用于处理嵌套逻辑
3. **设置活跃 effect**：将当前 effect 设置为 `activeSub`
4. **开始追踪**：调用 `startTrack` 开始追踪依赖
5. **执行函数**：执行副作用函数，收集依赖
6. **结束追踪**：调用 `endTrack` 结束追踪
7. **恢复 effect**：恢复之前的 `activeSub`
8. **返回结果**：返回函数执行结果

### notify() 方法

通知 effect 更新。

**处理流程：**

1. 调用 `scheduler()` 方法
2. 如果没有自定义 `scheduler`，默认调用 `run()`

### stop() 方法

停止 effect。

**处理流程：**

1. **检查激活状态**：如果已停止，直接返回
2. **清理依赖**：调用 `startTrack` 和 `endTrack` 清理依赖关系
3. **设置状态**：设置 `active` 为 `false`

### activeSub

`activeSub` 是全局变量，用于保存当前正在执行的 effect。

**设计原因：**

- 依赖收集需要在运行时动态进行，无法静态分析
- 通过全局变量，让 `track` 和 `trackRef` 能够访问当前正在执行的 effect
- 支持嵌套 effect 的正确处理

**作用：**

- 在依赖收集时，`track` 和 `trackRef` 会使用 `activeSub` 建立依赖关系
- 支持嵌套 effect 的正确处理（通过保存和恢复机制）
- 确保依赖收集的准确性（只有正在执行的 effect 才会被收集）

**嵌套处理机制：**

```typescript
const prevSub = activeSub;  // 保存外层 effect
setActiveSub(this);         // 设置当前 effect
try {
  return this.fn();          // 执行函数，可能触发嵌套 effect
} finally {
  setActiveSub(prevSub);     // 恢复外层 effect
}
```

**为什么需要保存和恢复？**

- effect 可以嵌套调用，内层 effect 执行时，外层 effect 应该被"隐藏"
- 内层 effect 执行完成后，需要恢复外层 effect，保证依赖收集正确
- 这是栈式调用模型的体现

## 使用示例

### 基本使用

```typescript
import { ref, effect } from './reactivity';

const count = ref(0);

effect(() => {
  console.log(count.value);
});

count.value = 1; // 触发 effect 重新执行
```

### 多个依赖

```typescript
const count = ref(0);
const name = ref('Vue');

effect(() => {
  console.log(count.value, name.value);
});

count.value = 1; // 触发更新
name.value = 'Vue 3'; // 触发更新
```

### 嵌套 effect

```typescript
effect(() => {
  console.log('effect1');
  effect(() => {
    console.log('effect2');
  });
});
```

### 自定义调度器

```typescript
effect(
  () => {
    console.log(count.value);
  },
  {
    scheduler: () => {
      console.log('scheduler called');
    },
  },
);
```

### 停止 effect

```typescript
const stop = effect(() => {
  console.log(count.value);
});

stop(); // 停止 effect
count.value = 1; // 不会触发更新
```

### 手动执行

```typescript
const runner = effect(() => {
  console.log(count.value);
});

runner(); // 手动执行，但不会收集依赖（如果已停止）
```

## 与 watch 的区别

| 特性     | effect         | watch                |
| -------- | -------------- | -------------------- |
| 用途     | 执行副作用函数 | 监听数据变化执行回调 |
| 参数     | 副作用函数     | 数据源和回调函数     |
| 执行时机 | 立即执行       | 通过 scheduler 控制  |
| 返回值   | runner 函数    | stop 函数            |
| 回调参数 | 无参数         | 接收新值和旧值       |
| 清理机制 | 不支持         | 支持 onCleanup       |

## 注意事项

1. **立即执行**：effect 创建后会立即执行一次，用于收集初始依赖
2. **自动收集依赖**：副作用函数中访问的响应式数据会自动收集为依赖，无需手动处理
3. **嵌套支持**：支持嵌套调用，通过保存和恢复 `activeSub` 处理，确保依赖收集的准确性
4. **停止机制**：停止后不会响应依赖变化，但可以手动执行 runner 函数
5. **调度器**：可以通过 `scheduler` 自定义执行时机，用于实现 watch 等功能
6. **依赖清理**：停止时会自动清理所有依赖关系，避免内存泄漏
7. **activeSub 机制**：使用全局变量 `activeSub` 追踪当前正在执行的 effect，支持依赖收集
