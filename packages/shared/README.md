## @vue/shared

`@vue/shared` 包中存放的是在运行时多个子包都会用到的「共享工具」，主要包括：

### 目录

- [工具函数概览（`src/utils.ts`）](#工具函数概览srcutilsts)
- [形状标记概览（`src/shapeFlags.ts`）](#形状标记概览srcshapeflagsts)

- **工具函数（`src/utils.ts`）**：对常见类型判断、变更判断等逻辑做了抽象，避免在各个包里重复实现。
- **形状标记 `ShapeFlags`（`src/shapeFlags.ts`）**：为 vnode 的类型和子节点形态打标，在渲染与 diff 过程中做快速分支判断。

### 工具函数概览（`src/utils.ts`）

- **`isObject(val)`**：判断值是否为「非 null 的对象」，在区分对象与基本类型时常用。
- **`hasChanged(value, oldValue)`**：使用 `Object.is` 语义判断值是否发生变化，包含对 `NaN` 的处理，常用于响应式系统中判断是否需要触发更新。
- **`isFunction(val)`**：判断值是否为函数类型。
- **`isOn(key)`**：判断传入的 prop key 是否是一个事件监听（形如 `onClick` / `onChange`），在 props 解析阶段用于拆分类事件。
- **`isArray(val)`**：判断值是否为数组。
- **`isString(val)`**：判断值是否为字符串。

### 形状标记概览（`src/shapeFlags.ts`）

`ShapeFlags` 使用二进制位标记 vnode 的类型与子节点形态，可以在一个数字中同时存放多个标记：

- **`ELEMENT`**：普通 DOM 元素节点。
- **`FUNCTIONAL_COMPONENT`**：无状态函数组件。
- **`STATEFUL_COMPONENT`**：有状态组件（带状态、生命周期等）。
- **`TEXT_CHILDREN`**：子节点是纯文本。
- **`ARRAY_CHILDREN`**：子节点是数组形式（多个子节点）。
- **`SLOTS_CHILDREN`**：子节点通过插槽传入。
- **`TELEPORT`**：Teleport 组件。
- **`SUSPENSE`**：Suspense 组件。
- **`COMPONENT_SHOULD_KEEP_ALIVE`**：组件应该被 keep-alive（缓存）。
- **`COMPONENT_KEPT_ALIVE`**：组件已经被 keep-alive（已缓存）。
- **`COMPONENT`**：组件类型的组合标记，等价于 `STATEFUL_COMPONENT | FUNCTIONAL_COMPONENT`。

在渲染和 diff 逻辑中，可以通过按位与判断某一位是否存在，从而快速判断 vnode 的形态，例如：

```ts
if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
  // 处理多子节点的情况
}
```
