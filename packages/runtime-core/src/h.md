# h / VNode 功能说明

## 概述

`h.ts` 负责提供创建 VNode 的能力：

- `VNode`：虚拟节点的数据结构
- `createVNode`：创建 VNode
- `h`：对外使用的创建入口，负责参数整理（把不同调用方式整理成统一形态）

## VNode 结构

`VNode` 里包含渲染所需的信息：

- `type`：元素类型（例如 `'div'`）
- `props`：属性（例如 `class`、`style`、事件等）
- `children`：子节点（文本、数组、或单个 VNode）
- `key`：用于列表场景下识别节点
- `el`：挂载后的真实元素引用（初始为 `null`）

## createVNode

`createVNode(type, props, children)` 会返回一个 VNode 对象，并把 `key` 从 `props?.key` 上取出来。

```typescript
const vnode = createVNode('div', { class: 'box', key: 1 }, 'hello');
```

## h 的 8 种调用方式

`h` 的目标是“参数标准化”。你在示例里能看到 8 种常见写法：

### 1) 第二个参数是文本子节点

```typescript
h('div', 'hello world');
```

### 2) 第二个参数是数组子节点

```typescript
h('div', [h('span', 'hello'), h('span', ' world')]);
```

### 3) 第二个参数是单个 VNode 子节点

```typescript
h('div', h('span', 'hello'));
```

### 4) 第二个参数是 props

```typescript
h('div', { class: 'container' });
```

---

### 5) props + 文本子节点

```typescript
h('div', { class: 'container' }, 'hello world');
```

### 6) props + 单个 VNode 子节点

```typescript
h('div', { class: 'container' }, h('span', 'hello world'));
```

### 7) props + 多个 VNode 子节点

```typescript
h('div', { class: 'container' }, h('span', 'hello'), h('span', 'world'));
```

### 8) props + 数组子节点（与 7 表达相同）

```typescript
h('div', { class: 'container' }, [h('span', 'hello'), h('span', 'world')]);
```

