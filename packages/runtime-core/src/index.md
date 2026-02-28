# runtime-core/index 导出说明

## 概述

`index.ts` 是 `runtime-core` 的统一出口，负责把公开 API 暴露给上层包。

## 导出内容

### 1. reactivity 相关

- `@vue/reactivity`：从 `runtime-core` 直接透出响应式 API，示例代码可以只从一个入口导入

### 2. VNode 与 h 相关

- `h`：创建 VNode，并把多种调用参数整理成统一结构
- `createVNode`：创建 VNode 的工厂方法
- `VNode`：VNode 的类型定义

### 3. renderer 相关

- `createRenderer`：创建渲染器（平台无关层，具体平台能力由 runtime-dom 提供）

## 使用示例

```typescript
import { h, createRenderer } from '@vue/runtime-core';
```

在浏览器里渲染 DOM 时，通常会由 `@vue/runtime-dom` 提供宿主操作（`nodeOps`、`patchProp`），再交给 `createRenderer` 组装渲染流程。

## 模块结构

```
runtime-core/src/
├── index.ts      # 入口文件，统一导出
├── h.ts          # VNode、createVNode、h
└── renderer.ts   # createRenderer
```

