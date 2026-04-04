import { NodeTypes } from '../ast';

export function transformExpression(node, ctx) {
  if (node.type === NodeTypes.INTERPOLATION) {
    // 是个插值
    node.content.content = `_ctx.${node.content.content}`;
  }
}
