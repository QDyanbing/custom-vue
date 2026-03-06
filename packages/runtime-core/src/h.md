# h 与 VNode 说明

### 概览

`h.ts` 负责创建 VNode，并把多形态参数整理成统一输入：

### 目录

- [VNode 结构（简要回顾）](#vnode-结构简要回顾)
- [createVNode 简述](#createvnode-简述)
- [h 的 8 种常见调用方式](#h-的-8-种常见调用方式)

- `VNode`：虚拟节点的数据结构定义在 `vnode.ts` 中
- `createVNode`：底层工厂函数
- `h`：对外创建入口，负责参数标准化（把不同调用方式整理成统一形态）

在用户代码里，推荐只使用 `h`；在运行时内部，`renderer` 主要只依赖 VNode 结构本身（`type` / `props` / `children` / `shapeFlag` 等）。

### VNode 结构（简要回顾）

`VNode` 里包含渲染所需的关键信息：

- `type`：元素或组件类型（例如 `'div'`）
- `props`：属性（例如 `class`、`style`、事件等）
- `children`：子节点（文本、数组、或单个 VNode）
- `key`：用于列表场景下识别节点
- `el`：挂载后的真实元素引用（初始为 `null`）

更完整的说明见 `vnode.md`，这里只放常用字段，方便在阅读 `h.ts` 实现时快速对上号。

### createVNode 简述

`createVNode(type, props, children)` 会返回一个 VNode 对象，并把 `key` 从 `props?.key` 上取出来：

```ts
const vnode = createVNode('div', { class: 'box', key: 1 }, 'hello');
```

创建时还会为 VNode 计算 `shapeFlag`，用来记录“节点类型 + 子节点类型”的组合信息，后续在 renderer 里只需要按位与就能判断当前 VNode 属于哪种形态。

### h 的 8 种常见调用方式

`h` 的目标是“参数标准化”，下面列出常见写法：

#### 1) 第二个参数是文本子节点

```ts
h('div', 'hello world');
```

#### 2) 第二个参数是数组子节点

```ts
h('div', [h('span', 'hello'), h('span', ' world')]);
```

#### 3) 第二个参数是单个 VNode 子节点

```ts
h('div', h('span', 'hello'));
```

#### 4) 第二个参数是 props

```ts
h('div', { class: 'container' });
```

---

#### 5) props + 文本子节点

```ts
h('div', { class: 'container' }, 'hello world');
```

#### 6) props + 单个 VNode 子节点

```ts
h('div', { class: 'container' }, h('span', 'hello world'));
```

#### 7) props + 多个 VNode 子节点

```ts
h('div', { class: 'container' }, h('span', 'hello'), h('span', 'world'));
```

#### 8) props + 数组子节点（和 7 等价）

```ts
h('div', { class: 'container' }, [h('span', 'hello'), h('span', 'world')]);
```

