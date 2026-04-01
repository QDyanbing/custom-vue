# compiler-core/index 导出说明

## 作用

`index.ts` 是 `@vue/compiler-core` 包的对外入口，将 `parser` 与 `compile` 中的 API 原样 re-export（例如 `parse`、`compile`）。

## 使用方式

```ts
import { parse, compile } from '@vue/compiler-core';
```

构建后对应 `dist/compiler-core.esm.js` 等产物，供浏览器或 bundler 引用。

## 相关文件

- [parser.md](./parser.md) — `parse` 行为说明
- [compile.md](./compile.md) — `compile` 行为说明
