/**
 * `compile`：在 `parse` 得到 AST 后执行 `transform`。
 * 深度优先遍历；遇 `INTERPOLATION` 时登记 `TO_DISPLAY_STRING`，并把简单表达式改为 `_ctx.` 前缀（见 `runtime-helper.ts`）。
 * 文本合并后会把相邻文本 / 插值包装成 `TEXT_CALL`，供后续代码生成阶段消费。
 * 当前不生成最终渲染代码，只串联解析与变换。
 */
import { NodeTypes } from './ast';
import { parse } from './parser';
import { CREATE_TEXT, TO_DISPLAY_STRING } from './runtime-helper';
import { creareCallExpression } from './ast';
import { PatchFlags } from '@vue/shared';

function traverseChildren(node, ctx) {
  node.children.forEach(child => {
    // 记录父节点，方便后续变换阶段拿到父子关系。
    child.parentNode = node;
    traverseNode(child, ctx);
  });
}

function traverseNode(node, ctx) {
  const nodeTransforms = ctx.nodeTransforms;
  ctx.currentNode = node;
  const exits = [];
  nodeTransforms.forEach(cb => {
    const exit = cb(node, ctx);
    exit && exits.push(exit);
  });

  switch (node.type) {
    case NodeTypes.ROOT:
    case NodeTypes.ELEMENT: {
      traverseChildren(node, ctx);
      break;
    }
    case NodeTypes.INTERPOLATION: {
      ctx.helper(TO_DISPLAY_STRING);
      break;
    }
  }

  ctx.currentNode = node;
  while (exits.length) {
    exits.pop()();
  }
}

function transformElement(node, ctx) {
  if (node.type === NodeTypes.ELEMENT) {
    // 是个元素

    return () => {
      // 元素处理完了
    };
  }
}

function isText(node: any) {
  return node.type === NodeTypes.TEXT || node.type === NodeTypes.INTERPOLATION;
}

function transformText(node, ctx) {
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
              codegenNode: creareCallExpression(ctx.helper(CREATE_TEXT), args),
            };
          }
        }
      }

      // 等 children 全部转换完成后再整体回写，避免扫描过程中混用旧节点和新节点。
      node.children = _children;
    };
  }
}

function transformExpression(node, ctx) {
  if (node.type === NodeTypes.INTERPOLATION) {
    // 是个插值
    node.content.content = `_ctx.${node.content.content}`;
  }
}

const createTransformContext = root => {
  const ctx = {
    root,
    currentNode: root,
    parentNode: null,
    // 变换顺序会影响 exit 阶段的执行结果，这里先处理元素，再处理文本与插值。
    nodeTransforms: [transformElement, transformText, transformExpression],
    helpers: new Set(),
    helper(name: string) {
      ctx.helpers.add(name);

      return name;
    },
  };

  return ctx;
};

function transform(root) {
  const ctx = createTransformContext(root);

  traverseNode(root, ctx);
}

export function compile(template: string) {
  const ast = parse(template);

  transform(ast);

  return ast;
}
