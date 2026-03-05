# runtime-core/index 导出说明

### 概览

`index.ts` 是 `runtime-core` 的统一入口，负责把运行时对外可见的能力都整理在一个导出面上，方便上层包按需使用。

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
- `createVNode`：底层工厂函数，`h` 会调用它来真正创建 VNode
- `h`：推荐的对外创建入口，负责把“多种调用方式”标准化成统一的 VNode 结构

建议在业务 / demo 代码里只使用 `h`，`createVNode` 和 `VNode` 更多是给内部实现和类型提示用的。

#### 3. renderer 相关

- `createRenderer`：创建平台无关的渲染器实例

它本身不关心“怎么操作 DOM”，只依赖一组由上层传入的宿主能力（`createElement`、`insert`、`patchProp` 等）。  
在浏览器环境下，这些能力由 `@vue/runtime-dom` 提供；在自定义渲染场景（例如 Canvas / 小程序）下，可以自己实现这套接口。

### 使用示例

```ts
import { ref, reactive, h, createRenderer } from '@vue/runtime-core';
```

在 DOM 场景里，一般会由 `@vue/runtime-dom` 组装好 renderer 并导出 `createApp`，这里只展示最简版本的接线方式：

```ts
import { createRenderer, h } from '@vue/runtime-core';
import { nodeOps, patchProp } from '@vue/runtime-dom';

const { render } = createRenderer({
  ...nodeOps,
  patchProp,
});

const vnode = h('div', { id: 'app' }, 'hello');
render(vnode, document.getElementById('app')!);
```

### 模块结构

```text
runtime-core/src/
├── index.ts      # 入口文件，统一导出
├── h.ts          # VNode / createVNode / h
└── renderer.ts   # createRenderer 及内部挂载 / 更新 / 卸载逻辑
```

