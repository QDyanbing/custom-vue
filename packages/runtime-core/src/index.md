# Index 功能说明

## 概述

`index.ts` 是 `runtime-core` 包的入口文件，负责把对外使用的 API 统一导出。

## 导出内容

### 1. reactivity 相关

- `@vue/reactivity`：从 `runtime-core` 直接透出响应式相关的 API（便于示例里一处引入）

### 2. VNode / h 相关

- `h`：创建 VNode，并把参数整理成统一的形态
- `createVNode`：创建 VNode 的工厂方法
- `VNode`：VNode 的类型定义

### 3. renderer 相关

- `createRenderer`：创建渲染器（平台无关层）

## 使用示例

```typescript
import { h, createRenderer } from '@vue/runtime-core';
```

如果你在浏览器里渲染 DOM，一般会通过 `@vue/runtime-dom` 来提供宿主操作（`nodeOps`、`patchProp`），再调用 `createRenderer`。

## 模块结构

```
runtime-core/src/
├── index.ts      # 入口文件，统一导出
├── h.ts          # VNode、createVNode、h
└── renderer.ts   # createRenderer
```

