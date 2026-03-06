# nodeOps 说明

## 概述

`nodeOps.ts` 封装了 DOM 平台下一组最小的“宿主节点操作”，供渲染器在挂载、更新、卸载过程中调用。

## 目录

- [提供的方法](#提供的方法)
- [小结](#小结)

特点：

- 只负责**怎么操作 DOM**，不关心 VNode 结构和 diff 逻辑
- 接口尽量简单，保持轻量封装，内部直接调用原生 DOM API

## 提供的方法

### 1. insert

```ts
insert(el: Node, parent: Node, anchor: Node | null = null) {
  parent.insertBefore(el, anchor);
}
```

- 把 `el` 插入到 `parent` 下
- `anchor` 为要插在其前面的兄弟节点；为 `null` 时等价于 append 到末尾

### 2. createElement

```ts
createElement(type: string) {
  return document.createElement(type);
}
```

- 创建指定标签名的元素节点
- 渲染器在创建普通元素 VNode 对应的真实元素时会调用

### 3. remove

```ts
remove(el: ChildNode) {
  const parent = el.parentNode;
  if (parent) {
    parent.removeChild(el);
  }
}
```

- 从父节点中安全地移除 `el`
- 先判断是否存在 `parentNode`，避免不必要的错误

### 4. setElementText

```ts
setElementText(el: Element, text: string) {
  el.textContent = text;
}
```

- 直接设置元素的文本内容
- 用于挂载 / 更新文本子节点时的处理

### 5. createText

```ts
createText(text: string) {
  return document.createTextNode(text);
}
```

- 创建一个文本节点
- 一般用于 VNode 类型为“文本”的场景

### 6. setText

```ts
setText(node: Text, text: string) {
  node.nodeValue = text;
}
```

- 更新文本节点的内容
- 和 `setElementText` 区分开：一个作用于元素，一个作用于文本节点本身

### 7. parentNode

```ts
parentNode(node: Node) {
  return node.parentNode;
}
```

- 返回当前节点的父节点
- diff 算法在移动 / 删除节点时会依赖这个能力

### 8. nextSibling

```ts
nextSibling(node: Node) {
  return node.nextSibling;
}
```

- 返回当前节点的下一个兄弟节点
- 主要用于按顺序遍历子节点，或在插入时找到合适的锚点

### 9. querySelector

```ts
querySelector(selector: string) {
  return document.querySelector(selector);
}
```

- 在当前文档上执行选择器查询
- 常见场景：用户传入 `container` 参数时，可以先通过选择器找到根容器元素，例如 `#app`

## 小结

`nodeOps` 提供了一组与平台绑定的基础 DOM 操作，`runtime-core` 的渲染逻辑只依赖这些抽象方法，从而实现“核心与平台解耦”。在需要移植到其他平台（如 SSR、原生渲染）时，只需要提供一套对应平台的 `nodeOps` 即可。

