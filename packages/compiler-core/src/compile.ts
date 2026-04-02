/**
 * `compile`：在 `parse` 得到 AST 后执行 `transform`。
 * 深度优先遍历；遇 `INTERPOLATION` 时登记 `TO_DISPLAY_STRING`，并把简单表达式改为 `_ctx.` 前缀（见 `runtime-helper.ts`）。
 * 当前不生成最终渲染代码，只串联解析与变换。
 */
import { NodeTypes } from './ast';
import { parse } from './parser';
import { TO_DISPLAY_STRING } from './runtime-helper';

function traverseChildren(node, ctx) {
  node.children.forEach(child => {
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
    console.log('开始处理元素', node);

    return () => {
      // 元素处理完了
      console.log('结束处理元素', node);
    };
  }
}

function isText(node: any) {
  return node.type === NodeTypes.TEXT || node.type === NodeTypes.INTERPOLATION;
}

function transformText(node, ctx) {
  if (node.type === NodeTypes.TEXT) {
    // 是个文本
    console.log('开始处理文本', node);
    return () => {
      const children = node.children;
      const _children = [];

      for (const child of children) {
        const last = _children.at(-1);
        if (
          last &&
          isText(child) &&
          (isText(last) || last.type === NodeTypes.COMPOUND_EXPRESSION)
        ) {
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

      node.children = _children;
    };
  }
}

function transformExpression(node, ctx) {
  if (node.type === NodeTypes.INTERPOLATION) {
    // 是个插值
    node.content.content = `_ctx.${node.content.content}`;

    console.log('处理插值', node);
  }
}

const createTransformContext = root => {
  const ctx = {
    root,
    currentNode: root,
    parentNode: null,
    nodeTransforms: [transformElement, transformText, transformExpression],
    helpers: new Set(),
    helper(name: string) {
      ctx.helpers.add(name);
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
