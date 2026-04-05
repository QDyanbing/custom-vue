/**
 * `compile`：在 `parse` 得到 AST 后执行 `transform`，再经 `generate` 得到 `render` 函数字符串。
 * 深度优先遍历；遇 `INTERPOLATION` 时登记 `TO_DISPLAY_STRING`，并把简单表达式改为 `_ctx.` 前缀（见 `runtime-helper.ts`）。
 * `ELEMENT` 在对应 transform 的 exit 阶段会挂上 `VNODE_CALL` 形式的 `codegenNode`（见 `transforms/transformElement.ts`）。
 * 文本合并后会把相邻文本 / 插值包装成 `TEXT_CALL`，供 `codegen` 消费。
 */
import { generate } from './codegen';
import { parse } from './parser';
import { transform } from './transform';

export function compile(template: string) {
  const ast = parse(template);

  transform(ast);

  return generate(ast);
}
