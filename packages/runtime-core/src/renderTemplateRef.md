# renderTemplateRef.ts 说明

## 概述

`renderTemplateRef.ts` 负责在渲染阶段“落地”模板 ref：根据 VNode 与 ref 描述，在挂载/更新时把 DOM 或组件实例写入 ref，在卸载时清理。它与：

- `vnode.ts` 中的 `normalizeRef` / `ref` 字段
- `component.ts` 中的 `getComponentPublicInstance`

共同组成了模板 ref 的实现。

## ref 的内部表示

在 VNode 层，模板上的 `ref` 会被 `normalizeRef` 转成统一的内部结构：

```ts
export function normalizeRef(ref) {
  if (!ref) return;
  return {
    r: ref,                           // rawRef：原始的 ref 值（Ref 或 字符串）
    i: getCurrentRenderingInstance(), // 当前正在渲染的组件实例
  };
}
```

- 当 `props.ref` 存在时，`createVNode` 会调用 `normalizeRef(props.ref)`，结果挂到 VNode 的 `ref` 字段上。
- 渲染器在挂载/更新/卸载时从 VNode 上取出 `ref`，并调用 `setRef(ref, vnode)` 进行具体赋值/清理。

## setRef(ref, vnode)

`setRef` 的签名为：

```ts
export function setRef(ref, vnode) {
  const { r: rawRef, i: instance } = ref;
  // ...
}
```

其中：

- `rawRef`：
  - 若为 `Ref` 对象：通过 `.value` 读写
  - 若为字符串：通过 `instance.refs[rawRef]` 读写
- `instance`：当前组件实例，由 `normalizeRef` 通过 `getCurrentRenderingInstance()` 填充

### 卸载分支

当传入的 `vnode` 为假值（卸载阶段）时，`setRef` 只做清理：

- 若 `rawRef` 是 `Ref`：`rawRef.value = null`
- 若 `rawRef` 是字符串：`instance.refs[rawRef] = null`

这样无论之前写入的是 DOM 还是组件实例，卸载后都会统一被置空。

### 挂载 / 更新分支

当 `vnode` 存在时，会根据 `vnode.shapeFlag` 决定写入 DOM 还是组件实例：

```ts
if (isRef(rawRef)) {
  if (shapeFlag & ShapeFlags.COMPONENT) {
    rawRef.value = getComponentPublicInstance(vnode.component);
  } else {
    rawRef.value = vnode.el;
  }
} else if (isString(rawRef)) {
  if (shapeFlag & ShapeFlags.COMPONENT) {
    instance.refs[rawRef] = getComponentPublicInstance(vnode.component);
  } else {
    instance.refs[rawRef] = vnode.el;
  }
}
```

- 组件类型：通过 `getComponentPublicInstance` 拿到“对外可见”的组件实例：
  - 若组件使用了 `expose`：返回基于 `exposed` 创建的代理（优先暴露 `exposed` 字段，其次回退到 `publicPropertiesMap`）
  - 否则返回组件的 `instance.proxy`
- 元素类型：直接写入 `vnode.el`。

## 与 useTemplateRef 的配合

`useTemplateRef` 利用字符串 `ref` 与 `instance.refs` 之间的映射，在 `refs` 上挂访问器属性，把字符串 ref 与一个组合式 `ref` 连接起来：

```ts
const elRef = useTemplateRef('elRef');
// 内部定义：
Object.defineProperty(instance.refs, 'elRef', {
  get() { return elRef.value; },
  set(v) { elRef.value = v; },
});
```

当渲染器在挂载时调用：

```ts
setRef({ r: 'elRef', i: instance }, vnode);
// → instance.refs['elRef'] = vnode.el;
// → elRef.value = vnode.el;
```

卸载时：

```ts
setRef({ r: 'elRef', i: instance }, null);
// → instance.refs['elRef'] = null;
// → elRef.value = null;
```

这样既保持了内部实现对字符串 ref 的兼容，又为组合式 API 提供了符合直觉的 `useTemplateRef` 使用体验。
