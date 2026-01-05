# Index 功能说明

## 概述

`index.ts` 是 `reactivity` 包的入口文件，负责统一导出所有公共 API。所有模块的功能都通过此文件对外暴露。

## 导出内容

### 1. ref 相关

- `ref`: 创建响应式引用，可以包装任何类型的值
- `isRef`: 判断一个值是否是 Ref 对象
- `toRef`: 为响应式对象的某个属性创建一个 ref
- `toRefs`: 将响应式对象转换为包含 ref 的对象
- `unref`: 如果参数是 ref，返回其内部值，否则返回原值
- `proxyRefs`: 返回一个代理对象，自动解包属性中的 ref
- `Ref`: Ref 类型定义
- `MaybeRef`: 可能是 ref 或普通值的类型
- `ToRef`: 将类型转换为 Ref 类型
- `ToRefs`: 将对象类型的所有属性转换为对应的 Ref 类型

### 2. effect 相关

- `effect`: 创建副作用函数，自动收集依赖并在依赖变化时重新执行
- `ReactiveEffect`: Effect 实现类
- `ReactiveEffectOptions`: Effect 选项类型
- `EffectScheduler`: 调度器类型
- `DebuggerOptions`: 调试选项类型

### 3. reactive 相关

- `reactive`: 创建响应式对象，使用 Proxy 代理对象属性
- `isReactive`: 判断一个对象是否是响应式对象

### 4. computed 相关

- `computed`: 创建计算属性，具有缓存机制
- `ComputedRef`: 计算属性类型定义
- `ComputedGetter`: 计算属性 getter 类型
- `ComputedSetter`: 计算属性 setter 类型
- `WritableComputedOptions`: 可写计算属性选项类型

### 5. watch 相关

- `watch`: 监听响应式数据变化并执行回调函数
- `WatchSource`: 监听源类型，可以是 ref、computed ref 或函数
- `WatchCallback`: 监听回调类型，接收新值、旧值和清理函数注册器
- `WatchEffect`: 监听副作用类型
- `WatchStopHandle`: 停止监听函数类型
- `WatchHandle`: 监听句柄类型，提供暂停、恢复和停止功能
- `OnCleanup`: 清理函数类型，用于注册清理逻辑

## 使用示例

### 导入所有 API

```typescript
import { ref, reactive, computed, watch, effect } from '@vue/reactivity';
```

### 按需导入

```typescript
import { ref } from '@vue/reactivity';
import { reactive } from '@vue/reactivity';
import { computed } from '@vue/reactivity';
```

## 模块结构

```
reactivity/
├── index.ts          # 入口文件，导出所有公共 API
├── ref.ts            # ref 实现
├── reactive.ts       # reactive 实现
├── effect.ts         # effect 实现
├── computed.ts       # computed 实现
├── watch.ts          # watch 实现
├── dep.ts            # 依赖收集（reactive）
├── baseHandlers.ts   # Proxy 处理器
└── system.ts         # 核心系统（双向链表）
```

## 注意事项

1. **统一导出**：所有公共 API 都通过 `index.ts` 导出
2. **类型导出**：相关的类型定义也会一并导出
3. **内部实现**：`system.ts`、`dep.ts` 等内部模块不直接导出，通过其他模块间接使用
