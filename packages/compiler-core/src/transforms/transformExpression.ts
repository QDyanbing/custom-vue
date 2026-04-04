/**
 * 插值变换：对 `INTERPOLATION` 内层 `SIMPLE_EXPRESSION` 加上 `_ctx.` 前缀，便于运行时从实例上下文取值。
 */
import { NodeTypes } from '../ast';

export function transformExpression(node, ctx) {
  if (node.type === NodeTypes.INTERPOLATION) {
    // 是个插值
    node.content.content = `_ctx.${node.content.content}`;
  }
}
