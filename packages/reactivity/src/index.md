# Index 功能说明

## 概述

`index.ts` 是 `reactivity` 包的入口文件，负责导出所有公共 API。

## 导出内容

### 1. ref 相关

- `ref`: 创建响应式引用
- `isRef`: 判断是否是 Ref 对象
- `Ref`: Ref 类型定义

### 2. effect 相关

- `effect`: 创建副作用函数
- `ReactiveEffect`: Effect 实现类
- `ReactiveEffectOptions`: Effect 选项类型
- `EffectScheduler`: 调度器类型
- `DebuggerOptions`: 调试选项类型

### 3. reactive 相关

- `reactive`: 创建响应式对象
- `isReactive`: 判断是否是响应式对象

### 4. computed 相关

- `computed`: 创建计算属性
- `ComputedRef`: 计算属性类型定义
- `ComputedGetter`: 计算属性 getter 类型
- `ComputedSetter`: 计算属性 setter 类型
- `WritableComputedOptions`: 可写计算属性选项类型

### 5. watch 相关

- `watch`: 监听响应式数据变化
- `WatchSource`: 监听源类型
- `WatchCallback`: 监听回调类型
- `WatchEffect`: 监听副作用类型
- `WatchStopHandle`: 停止监听函数类型
- `WatchHandle`: 监听句柄类型
- `OnCleanup`: 清理函数类型

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
