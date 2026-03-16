# useTemplateRef 说明

## 概述

`useTemplateRef` 是一个在组合式 API 中使用模板引用（template ref）的帮助函数，配合字符串 `ref` 使用：

```ts
const elRef = useTemplateRef('elRef');

return () => h('p', { ref: 'elRef' }, 'hello');
```

渲染完成后，`elRef.value` 会指向真实 DOM 节点（或子组件暴露的实例），并在卸载时被置为 `null`。

## 使用方式

```ts
import { h, ref, useTemplateRef } from '../dist/vue.esm.js';

const Comp = {
  setup() {
    const elRef = useTemplateRef('elRef');

    onMounted(() => {
      console.log(elRef.value); // <p id="box">...</p>
    });

    return () => h('p', { id: 'box', ref: 'elRef' }, '文本');
  },
};
```

- 在 `setup` 中调用 `useTemplateRef('elRef')` 得到一个 `ref(null)`。
- 在 VNode 或模板上写 `ref: 'elRef'`，渲染器在挂载/更新时会通过 `setRef` 写入 `instance.refs.elRef`。
- 因为 `useTemplateRef` 在内部把 `instance.refs.elRef` 定义成「读写都会同步到内部 `ref`」的访问器属性，所以：
  - 挂载时：`instance.refs.elRef = dom` → `elRef.value = dom`
  - 卸载时：`instance.refs.elRef = null` → `elRef.value = null`

## 实现细节

源码位于 `useTemplateRef.ts`，核心步骤：

1. 通过 `getCurrentInstance()` 获取当前组件实例 `vm`，拿到 `vm.refs`。
2. 创建一个内部的 `elRef = ref(null)`，作为对外暴露的响应式引用。
3. 在 `vm.refs` 上使用 `Object.defineProperty` 定义同名属性 `key`：
   - `get()` 返回 `elRef.value`
   - `set(value)` 把值写入 `elRef.value`

这样渲染器侧不需要感知 `useTemplateRef` 的存在，仍然只依赖 `instance.refs`；而用户得到的是一个标准的 `ref` 对象，方便在组合式逻辑中使用。

## 与 renderTemplateRef.ts 的关系

- `vnode.ts` 的 `createVNode` 会把 `props.ref` 通过 `normalizeRef` 包装为 `{ r: rawRef, i: instance }`，其中 `rawRef` 可能是：
  - 一个 `ref` 对象（`Ref<T>`）
  - 一个字符串（如 `'elRef'`）
- 渲染器在挂载/更新/卸载时会调用 `setRef(ref, vnode)`（见 `renderTemplateRef.ts`）：
  - 挂载时：根据 `shapeFlag` 决定把 DOM 或组件实例写入 `rawRef.value` 或 `instance.refs[rawRef]`
  - 卸载时：把上一次写入的引用清空（设为 `null`）
- `useTemplateRef` 正是利用了「字符串 ref 映射到 `instance.refs[key]`」这一点，在 `refs` 上挂访问器属性，把字符串 ref 与一个组合式 `ref` 连接起来。

更多关于 ref 绑定与组件实例暴露的细节，见：

- [`renderTemplateRef.md`](./renderTemplateRef.md)
- [`vnode.md`](./vnode.md) 中关于 `ref` 与 `normalizeRef` 的章节
