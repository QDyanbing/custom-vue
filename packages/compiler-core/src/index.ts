/**
 * `@vue/compiler-core` 包入口。
 *
 * - `parse(template)`：词法（`tokenize`）+ 语法（`parser`），得到 AST。
 * - `compile(template)`：`parse` → `transform` → `generate`，返回 `render` 函数字符串。
 *
 * 分阶段说明见同目录 `parser.md`、`compile.md`、`transform.md`、`codegen.md`。
 */
export * from './parser';
export * from './compile';
