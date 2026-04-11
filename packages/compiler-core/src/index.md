# compiler-core/index 导出说明

## 作用

`index.ts` 对外导出 `parse`（`parser.ts`）与 `compile`（`compile.ts`）。`compile` 在内部依次执行 `transform` 与 `generate`，产出 `render` 函数字符串；流水线说明见 [compile.md](./compile.md)。

## 使用方式

```ts
import { parse, compile } from '@vue/compiler-core';
```

构建后对应 `dist/compiler-core.esm.js` 等产物，供浏览器或 bundler 引用。

## 相关文件

- [parser.md](./parser.md) — `parse` 行为说明
- [compile.md](./compile.md) — `compile` 行为说明（含 `generate`）
- [transform.md](./transform.md) — 变换与根 `codegenNode`
- [codegen.md](./codegen.md) — `generate` 与 `render` 字符串
