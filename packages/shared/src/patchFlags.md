# shared/patchFlags.ts 补丁标志说明

## 概述

`patchFlags.ts` 导出枚举 `PatchFlags`，表示**编译器或手写渲染函数**在 VNode 上打的更新提示。与 `shapeFlag` 区分：`shapeFlag` 描述节点与子节点形态；`patchFlag` 描述**元素更新时哪些维度可能变化**，供 `renderer` 的 `patchElement` 在 `patchFlag > 0` 时走定向更新，避免每次全量 `patchProps`。

位运算约定：多个标志用 `|` 组合，用 `&` 判断是否包含某标志。特殊值 `CACHED`、`BAIL` 为负数，不参与按位“包含”判断，需用 `===` 比较。

## 与本仓库 renderer 的对应关系

当前 `packages/runtime-core/src/renderer.ts` 的 `patchElement` 已使用：

- **`TEXT`**：子节点为动态文本时，若 `n1.children !== n2.children`，调用 `hostSetElementText` 并提前 return，不再走 `patchChildren`。
- **`CLASS`**：`oldProps.class !== newProps.class` 时调用 `hostPatchProp(el, 'class', ...)`。
- **`STYLE`**：`oldProps.style !== newProps.style` 时调用 `hostPatchProp(el, 'style', ...)`。

当 `patchFlag` 为 0 或未进入上述分支时，仍走全量 `patchProps` + `patchChildren`。

## 枚举项一览（与文件内 JSDoc 一致）

| 值 | 名称 | 含义摘要 |
|----|------|----------|
| `1` | `TEXT` | 动态文本子节点（子节点快速路径） |
| `1 << 1` | `CLASS` | 动态 `class` |
| `1 << 2` | `STYLE` | 动态 `style` |
| `1 << 3` | `PROPS` | 其他动态属性；可配合 `dynamicProps` |
| `1 << 4` | `FULL_PROPS` | 动态 key 的属性，需完整 diff |
| `1 << 5` | `NEED_HYDRATION` | 需要属性水合 |
| `1 << 6` | `STABLE_FRAGMENT` | 子顺序稳定的片段 |
| `1 << 7` | `KEYED_FRAGMENT` | 带 key 的片段 |
| `1 << 8` | `UNKEYED_FRAGMENT` | 无 key 子节点的片段 |
| `1 << 9` | `NEED_PATCH` | 非属性类补丁（如 ref、指令钩子） |
| `1 << 10` | `DYNAMIC_SLOTS` | 动态插槽组件 |
| `1 << 11` | `DEV_ROOT_FRAGMENT` | 开发环境根注释片段（仅 dev） |
| `-1` | `CACHED` | 静态缓存节点 / 水合跳过子树 |
| `-2` | `BAIL` | 退出优化模式，完整 diff |

## 与 `createVNode` 的关系

`createVNode` 第四个参数会把 `patchFlag` 写入 VNode（见 [vnode.md](../../runtime-core/src/vnode.md)）。示例页 `24-demo.html` 用手写 `createVNode(..., PatchFlags.TEXT)` 演示动态文本与 `patchFlag` 的配合。

## 延伸阅读

- 渲染器整体流程：[renderer.md](../../runtime-core/src/renderer.md) 中「patchElement 与 patchFlag、children 处理」小节。
- VNode 字段说明：[vnode.md](../../runtime-core/src/vnode.md)。
