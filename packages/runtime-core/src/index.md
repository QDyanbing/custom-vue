# runtime-core/index 导出说明

### 概览

`index.ts` 是 `runtime-core` 的统一入口，负责把运行时对外可见的能力都整理在一个导出面上，方便上层包按需使用。

### 目录

- [导出内容一览](#导出内容一览)
- [使用示例](#使用示例)
- [模块结构](#模块结构)

当前入口主要透出三块内容：

- **响应式能力**：直接 re-export `@vue/reactivity`
- **VNode / 渲染入口**：`h` / `createVNode` / `VNode`
- **渲染器工厂**：`createRenderer`

### 导出内容一览

#### 1. reactivity 相关

`runtime-core` 对 `@vue/reactivity` 做了“整包透出”，这样在 demo 里可以只从一个入口导入：

```ts
import { ref, reactive, effect } from '@vue/runtime-core';
```

常用 API（与官方保持一致）：

- `ref` / `reactive`
- `computed`
- `effect` / `stop`
- `watch`

#### 2. VNode 与 h 相关

- `VNode`：虚拟节点的 TypeScript 类型
- `Text`：文本类型 VNode 的 type 标记（Symbol），renderer 据此走 `processText`
- `createVNode`：底层工厂函数，`h` 会调用它来真正创建 VNode
- `normalizeVNode`：将 string/number 转为 Text 类型 VNode，renderer 在 children 处理时使用
- `isVNode` / `isSameVNode`：判断是否为 VNode、两 VNode 是否可复用
- `h`：推荐的对外创建入口，负责把“多种调用方式”标准化成统一的 VNode 结构

建议在业务 / demo 代码里只使用 `h`，`createVNode`、`Text`、`normalizeVNode` 等更多是给内部实现和类型提示用的。

#### 3. renderer 相关

- `createRenderer`：创建平台无关的渲染器实例，返回对象包含 `render` 和 `createApp`。`createApp` 由 `createAppApi(render)` 生成，用于根组件的挂载与卸载，详见 [apiCreateApp.md](./src/apiCreateApp.md)。

它不关心“怎么操作 DOM”，只依赖上层传入的宿主能力（`createElement`、`insert`、`patchProp` 等）。浏览器环境由 `@vue/runtime-dom` 提供；自定义渲染（如 Canvas / 小程序）可自行实现该接口。

### 使用示例

```ts
import { ref, reactive, h, createRenderer } from '@vue/runtime-core';
```

DOM 场景下通常由 `@vue/runtime-dom` 组装 renderer 并导出 `createApp`；下面仅展示最简的“手写接线”方式（仅用 `render` 时）：

```ts
import { createRenderer, h } from '@vue/runtime-core';
import { nodeOps, patchProp } from '@vue/runtime-dom';

const { render } = createRenderer({
  ...nodeOps,
  patchProp,
});

const vnode = h('div', { id: 'app' }, 'hello');
render(vnode, document.getElementById('app')!);
// 若使用 createApp 挂载根组件，可直接从 @vue/runtime-dom 导入 createApp，见 runtime-dom 入口说明。
```

### 模块结构

```text
runtime-core/src/
├── index.ts        # 入口文件，统一导出
├── apiCreateApp.ts # createAppApi(render)，供 createRenderer 生成 createApp
├── component.ts    # 组件实例 createComponentInstance、setupComponent（供 renderer 挂载组件）
├── vnode.ts        # VNode、Text、normalizeVNode、normalizeChildren、createVNode、isVNode、isSameVNode
├── h.ts            # h（参数标准化，内部调用 createVNode）
└── renderer.ts     # createRenderer；元素/文本/组件挂载与更新、keyed diff（含 LIS）
```

