/**
 * `@vue/compiler-core` 包入口。
 *
 * - `parse(template)`：词法 + 语法，得到 AST。
 * - `compile(template)`：在 `parse` 之后串联 `transform` 与 `generate`，返回 `render` 函数字符串。
 *
 * 分阶段说明见同目录 `parse`/`compile`/`transform`/`codegen` 对应 `*.md`。
 */
export * from './parser';
export * from './compile';
