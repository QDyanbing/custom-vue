# apiInject.ts

组件级的 `provide / inject` 实现。

本实现与应用级的 `app.provide`（见 `apiCreateApp.ts`）配合后，满足两类注入来源：

- **根组件 / 全局注入**：`app.provide(key, value)` 写入 `appContext.provides`
- **组件树内注入**：组件 `setup` 中调用 `provide(key, value)` 写入当前组件实例的 `provides`

## provide(key, value)

把值写入当前组件实例的 `instance.provides`。

### 为什么要 `Object.create(parentProvides)`

组件实例的 `provides` 设计成“原型链继承”：

- 初始时 `instance.provides` 指向父级 `provides`（根组件则以 `appContext.provides` 为原型）
- 首次调用 `provide` 时，若发现当前 `provides` 仍与父级同一个对象，则会创建：

```ts
instance.provides = Object.create(parentProvides)
```

这样当前组件写入新键时只会写到自己这一层，通过原型链仍能读取到祖先提供的键，同时避免把新键直接污染到父级对象上。

## inject(key, defaultValue)

查找顺序（当前最小实现）：

1. 优先从**父组件**的 `provides` 里找（`instance.parent?.provides`）
2. 若当前组件是根组件（没有 parent），则从 `instance.appContext.provides` 里找
3. 若都没有找到，则返回 `defaultValue`

> 注意：这里使用 `key in parentProvides`，因此会沿着原型链命中祖先提供的值；这与 `provides` 的“原型链继承”设计配套。

## 相关代码

- `component.ts`：组件实例上保存 `provides`，并维护 `getCurrentInstance()`
- `apiCreateApp.ts`：创建 `appContext.provides`，供根组件与 `app.provide` 使用

