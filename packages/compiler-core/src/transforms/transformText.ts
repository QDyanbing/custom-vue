/**
 * 文本变换：在父 `ELEMENT` 的 exit 阶段合并相邻文本 / 插值，必要时包装为 `TEXT_CALL` 并挂上 `createText` 的 `codegenNode`。
 */
import { PatchFlags } from '@vue/shared';
import { NodeTypes, createCallExpression } from '../ast';
import { CREATE_TEXT } from '../runtime-helper';

export function isText(node: any) {
  return node.type === NodeTypes.TEXT || node.type === NodeTypes.INTERPOLATION;
}

export function transformText(node, ctx) {
  if (node.type === NodeTypes.ELEMENT) {
    // 文本合并发生在父元素退出阶段：这样能拿到已经变换完成的整段 children。
    return () => {
      const children = node.children;
      const _children = [];
      let hasText = false;

      for (const child of children) {
        const last = _children.at(-1);
        if (
          last &&
          isText(child) &&
          (isText(last) || last.type === NodeTypes.COMPOUND_EXPRESSION)
        ) {
          hasText = true;
          // 首次命中时，把上一个文本节点包装成 COMPOUND_EXPRESSION，
          // 之后继续把相邻文本 / 插值以 "+" 的形式追加进去。
          if (last.type !== NodeTypes.COMPOUND_EXPRESSION) {
            _children[_children.length - 1] = {
              type: NodeTypes.COMPOUND_EXPRESSION,
              children: [last],
            };
          }

          _children[_children.length - 1].children.push('+', child);
        } else {
          _children.push(child);
        }
      }

      const l = _children.length;

      // 存在文本节点，并且有多个节点，才需要处理
      if (hasText && l > 1) {
        for (let i = 0; i < l; i++) {
          const child = _children[i];

          if (isText(child) || child.type === NodeTypes.COMPOUND_EXPRESSION) {
            const args = [child];

            // 只要不是纯文本节点，就是动态节点
            if (child.type !== NodeTypes.TEXT) {
              args.push(PatchFlags.TEXT);
            }

            _children[i] = {
              type: NodeTypes.TEXT_CALL,
              content: child,
              codegenNode: createCallExpression(ctx.helper(CREATE_TEXT), args),
            };
          }
        }
      }

      // 等 children 全部转换完成后再整体回写，避免扫描过程中混用旧节点和新节点。
      node.children = _children;
    };
  }
}
