# System 功能说明

## 概述

`system` 模块是 Vue 3 响应式系统的核心，负责管理依赖项（Dependency）和订阅者（Sub）之间的双向链表关系。它实现了依赖收集、更新传播、依赖追踪和清理等核心功能。

## 核心数据结构

### Dependency 接口

依赖项接口，表示可以被订阅的响应式数据（如 ref、reactive 对象的属性等）。

```typescript
interface Dependency {
  subs: Link | undefined;      // 订阅者链表的头节点
  subsTail: Link | undefined;  // 订阅者链表的尾节点
}
```

**设计思路：**

- 使用双向链表存储订阅者，支持快速插入和删除
- 头尾指针设计，支持 O(1) 时间复杂度的追加操作
- 实现该接口的类：`RefImpl`、`Dep`、`ComputedRefImpl`

**特点：**

- 维护一个订阅者链表，记录所有依赖它的 effect
- 当值变化时，可以通知所有订阅者更新
- 支持多个订阅者订阅同一个依赖项

### Sub 接口

订阅者接口，表示订阅依赖项的副作用（如 effect、computed 等）。

```typescript
interface Sub {
  deps: Link | undefined;      // 依赖项链表的头节点
  depsTail: Link | undefined;  // 依赖项链表的尾节点
  tracking: boolean;           // 是否正在追踪依赖
  dirty: boolean;              // 是否脏（需要重新计算）
}
```

**特点：**

- 维护一个依赖项链表，记录所有它依赖的响应式数据
- 当依赖的数据变化时，会被通知重新执行

### Link 接口

链表节点接口，用于建立双向链表关系。

```typescript
interface Link {
  sub: Sub;                    // 订阅者
  nextSub: Link | undefined;   // 下一个订阅者节点
  prevSub: Link | undefined;   // 上一个订阅者节点
  dep: Dependency;             // 依赖项
  nextDep: Link | undefined;   // 下一个依赖项节点
}
```

**双向链表结构：**

- **依赖项 → 订阅者**：`dep.subs` → `effect1` → `effect2` → `effect3`
- **订阅者 → 依赖项**：`effect.deps` → `ref1` → `ref2` → `ref3`

## 主要功能

### 1. 建立依赖关系（link）

`link()` 函数用于建立依赖项和订阅者之间的双向链表关系。

**设计思路：**

- 双向链表设计，支持从依赖项找到订阅者，也能从订阅者找到依赖项
- 节点复用机制，避免频繁创建和销毁节点，提高性能
- 空间换时间策略，建立双向引用，方便后续清理

**功能：**

- 在依赖项的订阅者链表中添加订阅者（`dep.subs` → `effect1` → `effect2`）
- 在订阅者的依赖项链表中添加依赖项（`effect.deps` → `ref1` → `ref2`）
- 支持节点复用，避免重复创建

**节点复用机制：**

**第一步：检查是否已存在依赖关系**

```typescript
const currentDep = sub.depsTail;
const nextDep = currentDep === undefined ? sub.deps : currentDep.nextDep;
if (nextDep && nextDep.dep === dep) {
  sub.depsTail = nextDep; // 复用现有节点
  return;
}
```

- 检查订阅者的依赖项链表中是否已经存在该依赖项
- 如果存在，复用现有节点，避免重复创建
- 这是性能优化的关键，避免 effect 多次执行时重复创建节点

**第二步：从 linkPool 复用或创建新节点**

```typescript
if (linkPool) {
  newLink = linkPool;
  linkPool = linkPool.nextDep; // 从池中取出
  // 重置节点属性
} else {
  newLink = { /* 创建新节点 */ };
}
```

**linkPool 机制：**

- 保存已被清理的链表节点（对象池模式）
- 需要时从池中取出复用，减少内存分配
- 提高性能，避免频繁创建和销毁节点
- 节点清理时放入池中，而不是直接丢弃

**为什么需要节点复用？**

- effect 可能会多次执行，每次都创建新节点会造成内存浪费
- 节点复用可以减少 GC 压力，提高性能
- 这是 Vue 3 响应式系统性能优化的关键点之一

### 2. 传播更新（propagate）

`propagate()` 函数用于通知所有订阅者更新。

**功能：**

- 遍历依赖项的订阅者链表
- 标记订阅者为脏状态
- 区分 effect 和 computed，分别处理
- 避免重复执行（通过 `tracking` 和 `dirty` 标志）

**处理流程：**

1. 遍历订阅者链表
2. 检查订阅者是否正在追踪或已脏，避免重复执行
3. 标记订阅者为脏状态
4. 如果是 computed，调用 `processComputedUpdate`
5. 如果是 effect，加入队列后统一执行

### 3. 开始追踪（startTrack）

`startTrack()` 函数用于开始追踪依赖。

**设计思路：**

- 每次开始追踪时，重置尾节点为 `undefined`
- 通过尾节点的变化，判断哪些依赖是新收集的，哪些是旧的
- 这是依赖清理机制的基础

**功能：**

- 设置 `tracking` 标志为 `true`（表示正在追踪依赖）
- 将依赖项链表的尾节点设置为 `undefined`
- 用于判断是否是第一次执行，以及后续清理不再使用的依赖

**实现逻辑：**

```typescript
sub.tracking = true;
sub.depsTail = undefined;
```

- **第一次执行**：头尾节点都为 `undefined`，所有收集的依赖都是新的
- **非第一次执行**：将尾节点指向 `undefined`，后续收集的依赖会从 `undefined` 开始
- **依赖清理**：`endTrack` 时，尾节点之后的所有节点都是不再使用的依赖，需要清理

**为什么需要重置尾节点？**

- effect 每次执行时，依赖可能会变化（条件分支、循环等）
- 通过重置尾节点，可以区分新旧依赖
- 旧的依赖（尾节点之后）需要清理，避免内存泄漏

### 4. 结束追踪（endTrack）

`endTrack()` 函数用于结束追踪依赖，并清理不再使用的依赖关系。

**设计思路：**

- 依赖清理是响应式系统的关键，避免内存泄漏
- 通过尾节点机制，精确识别哪些依赖不再使用
- 清理的节点放入 `linkPool` 复用，提高性能

**功能：**

- 设置 `tracking` 标志为 `false`（表示不再追踪依赖）
- 设置 `dirty` 标志为 `false`（表示已执行完成，不再脏）
- 清理不再使用的依赖关系

**清理逻辑：**

```typescript
const depsTail = sub.depsTail;
sub.dirty = false;

if (depsTail) {
  if (depsTail.nextDep) {
    // 尾节点之后还有节点，说明这些依赖不再使用
    clearTracking(depsTail.nextDep);
    depsTail.nextDep = undefined;
  }
} else if (sub.deps) {
  // 尾节点不存在但头节点存在，说明所有依赖都不再使用
  clearTracking(sub.deps);
  sub.deps = undefined;
}
```

**清理场景：**

1. **部分依赖不再使用**：尾节点存在且还有下一个节点，清理后续节点
2. **所有依赖不再使用**：尾节点不存在但头节点存在，清理所有节点
3. **调用 `clearTracking`**：从双向链表中删除节点，并放入 `linkPool` 复用

**为什么需要清理依赖？**

- effect 的条件分支可能导致某些依赖不再被访问
- 如果不清理，会导致内存泄漏和无效的更新通知
- 清理机制保证依赖关系的准确性

### 5. 清理依赖（clearTracking）

`clearTracking()` 函数用于清理双向链表中的节点。

**功能：**

- 从依赖项的订阅者链表中移除节点
- 从订阅者的依赖项链表中移除节点
- 将清理的节点放入 `linkPool` 复用

**双向链表删除：**

1. 更新上一个节点的 `nextSub` 指向
2. 更新下一个节点的 `prevSub` 指向
3. 更新依赖项的头尾节点
4. 清空节点的引用
5. 将节点放入 `linkPool` 复用

## 使用示例

### 依赖收集流程

```typescript
const count = ref(0);

effect(() => {
  console.log(count.value); // 读取时调用 link(count, effect)
});
```

**流程：**

1. `effect` 执行，调用 `startTrack`
2. 读取 `count.value`，触发 `trackRef`
3. `trackRef` 调用 `link(count, activeSub)`
4. `link` 建立双向链表关系
5. `effect` 执行完成，调用 `endTrack`

### 更新传播流程

```typescript
count.value = 1; // 修改时调用 triggerRef
```

**流程：**

1. 设置 `count.value = 1`，触发 `triggerRef`
2. `triggerRef` 调用 `propagate(count.subs)`
3. `propagate` 遍历订阅者链表
4. 标记订阅者为脏状态
5. 调用订阅者的 `notify` 方法重新执行

### 依赖清理流程

```typescript
const stop = effect(() => {
  console.log(count.value);
});

stop(); // 停止 effect
```

**流程：**

1. 调用 `stop()`，执行 `startTrack` 和 `endTrack`
2. `endTrack` 检测到依赖变化，调用 `clearTracking`
3. `clearTracking` 清理双向链表关系
4. 清理的节点放入 `linkPool` 复用

## 性能优化

### 1. 节点复用

- 使用 `linkPool` 复用已清理的节点
- 减少内存分配和垃圾回收
- 提高性能

### 2. 避免重复执行

- 通过 `tracking` 标志避免在追踪过程中重复执行
- 通过 `dirty` 标志避免重复标记
- 减少不必要的计算

### 3. 双向链表

- 支持快速插入和删除
- 支持双向遍历
- 提高依赖管理的效率

## 注意事项

1. **双向链表**：依赖项和订阅者之间是双向链表关系，删除时需要同时更新两端
2. **节点复用**：清理的节点会放入 `linkPool`，下次需要时复用
3. **追踪标志**：`tracking` 和 `dirty` 标志用于避免重复执行和循环依赖
4. **尾节点重置**：`startTrack` 时将尾节点重置为 `undefined`，用于判断依赖变化

