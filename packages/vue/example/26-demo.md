# 26-demo.html 说明

## 演示目标

验证今天新增的三条运行时能力在同一个示例里的联动：

1. `renderList` 将响应式数组映射为 VNode 列表
2. `toDisplayString` 负责把列表项值转成可渲染文本
3. `Fragment` 在 `patchFlag = STABLE_FRAGMENT` 时，更新阶段走动态子节点快路径

## 示例结构

- 初始数据：`list = ['a', 'b', 'c']`
- 1 秒后更新为：`list = ['b', 'a']`
- 渲染逻辑：
  - 外层 `createElementBlock('div', ...)`
  - 内层 `createElementBlock(Fragment, null, renderList(...), 128)`
  - 列表项为 `createVNode('div', { key: item }, toDisplayString(item), 1)`

其中：

- `128` 对应 `PatchFlags.STABLE_FRAGMENT`
- `1` 对应 `PatchFlags.TEXT`

## 运行时路径

更新时可重点观察 `renderer.ts` 的两段逻辑：

1. `processFragment` 中，当新旧片段都带 `dynamicChildren` 且命中 `STABLE_FRAGMENT`，会直接调用 `patchBlockChildren`
2. `patchBlockChildren` 只遍历 `dynamicChildren`，不做全量子树 diff

这使得该示例在列表更新时可以减少不必要的静态节点比较。

## 控制台观察

示例保留了 `console.log(vnode)`，可以看到：

- 根节点的 `children` 中包含一个 `Fragment`
- `Fragment.dynamicChildren` 只保存本轮需要更新的动态项
- 1 秒后数据变化，列表按 `key` 进行复用和调整

## 延伸阅读

- `renderList` / `toDisplayString`：`../../runtime-core/src/vnode.md`
- 稳定片段更新：`../../runtime-core/src/renderer.md`
