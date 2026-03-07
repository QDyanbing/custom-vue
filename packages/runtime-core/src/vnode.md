# VNode 与 createVNode 说明

## 概述

`vnode.ts` 定义了运行时内部使用的虚拟节点结构 `VNode`，并提供相关的工具函数。

## 目录

- [VNode 结构](#vnode-结构)
- [Text 与文本节点](#text-与文本节点)
- [normalizeVNode(vnode)](#normalizevnodevnode)
- [createVNode(type, props?, children?)](#createvnodetype-props-children)
- [isVNode(value)](#isvnodevalue)
- [isSameVNode(v1, v2)](#issamevnodev1-v2)

- `VNode`：虚拟节点的数据结构
- `Text`：文本类型 VNode 的 type 标记（Symbol），供 renderer 走 `processText`
- `normalizeVNode`：将 string/number 转为 Text 类型 VNode，供 renderer 在 children 处理时统一成 VNode
- `createVNode`：创建 VNode 的工厂函数
- `isVNode`：判断一个值是否已经是 VNode
- `isSameVNode`：判断两个 VNode 在 diff 阶段是否视为“同一个节点”

这些内容会被 `h.ts` 和 `renderer.ts` 共同使用：  
`h` 负责把用户多种调用方式标准化为 VNode，`renderer` 根据 VNode 的结构和标记信息决定如何挂载、更新和卸载真实 DOM；子节点中的原始值由 renderer 侧通过 `normalizeVNode` 转为 Text VNode。

## VNode 结构

`VNode` 里包含渲染所需的关键信息：

- `type`：节点类型，例如 `'div'`
- `props`：传入的属性/事件（`class`、`style`、`onClick` 等）
- `children`：子节点，可以是：
  - 文本（string）
  - VNode 数组
- `key`：用于列表 diff 场景识别节点身份
- `el`：挂载后的真实 DOM 元素引用（初始为 `null`，由 renderer 在运行时填充）
- `shapeFlag`：使用位运算记录“节点类型 + 子节点类型”的组合信息

借助 `shapeFlag`，后续在 `renderer` 里可以只通过按位与来判断当前 VNode 属于哪种形态，而不需要到处写 `typeof` / `Array.isArray` 之类的判断。

## Text 与文本节点

`Text` 是一个 `Symbol('v-txt')`，用作“文本类型”VNode 的 `type`。当子节点在写法上是 string 或 number 时，不会直接作为元素 VNode 的 `children` 字符串存，而是先被 `normalizeVNode` 转成 `type === Text`、`children` 为字符串的 VNode，再参与挂载和 diff。这样在 renderer 里可以统一用 `patch` 处理元素和文本，并在 `patch` 内通过 `type === Text` 走 `processText`。

## normalizeVNode(vnode)

把“可能是原始值”的子节点统一成 VNode，供 renderer 在挂载和 diff 时使用：

- 若 `vnode` 是 `string` 或 `number`，返回 `createVNode(Text, null, String(vnode))`，即一个文本类型的 VNode。
- 否则认为已经是 VNode，直接返回。

在 `mountChildren`、`patchKeyedChildren` 等逻辑里，会对 children 数组中的每一项调用 `normalizeVNode`，保证传给 `patch` 的始终是 VNode。

## createVNode(type, props?, children?)

`createVNode` 的职责是构造一个符合 `VNode` 约定的数据结构，并在创建阶段就把“节点类型 / 子节点类型”编码进 `shapeFlag`：

- 当 `type` 是字符串时：
  - 记为普通的元素节点：`ShapeFlags.ELEMENT`
- 根据 `children` 的类型追加子节点标记：
  - 文本：`ShapeFlags.TEXT_CHILDREN`
  - 数组：`ShapeFlags.ARRAY_CHILDREN`

伪代码可以理解为：

```ts
let shapeFlag = 0;

if (isString(type)) {
  shapeFlag = ShapeFlags.ELEMENT;
}

if (isString(children)) {
  shapeFlag |= ShapeFlags.TEXT_CHILDREN;
} else if (isArray(children)) {
  shapeFlag |= ShapeFlags.ARRAY_CHILDREN;
}
```

最终返回的 VNode 会同时携带：

- 结构信息：`type` / `props` / `children` / `key`
- 运行时引用：`el`（由 renderer 填充）
- 形态标记：`shapeFlag`

## isVNode(value)

`isVNode` 用于判断一个值是否已经是 VNode：

- 通过内部的 `__v_isVNode` 标记识别
- 主要服务于 `h` 这类 API，在处理参数时区分“普通对象”与“已经是 VNode”

例如在 `h` 里，当第二个参数是对象时，需要分情况判断：

- 如果是 VNode：把它当作 children 处理
- 如果是普通对象：把它当作 props 处理

## isSameVNode(v1, v2)

`isSameVNode` 用于在 diff 阶段判断两个 VNode 是否可以复用同一个真实 DOM 节点：

- 判断依据只有两点：
  - `type` 相同
  - `key` 相同
- 一旦任意一项不同，就视为“完全不同的节点”，不再尝试复用，renderer 会选择卸载老节点、重新挂载新节点。

这条规则和 Vue3 源码的核心思想一致：  
只要 type + key 一致，就认为可复用，具体 props / children 的差异交给后续更细粒度的 patch 流程处理。

