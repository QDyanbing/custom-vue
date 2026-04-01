import { NodeTypes } from './ast';
import { parse } from './parser';

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

function transformText(node, ctx) {
  if (node.type === NodeTypes.TEXT) {
    // 是个文本
    console.log('开始处理文本', node);
    return () => {
      // 文本处理完了
      console.log('结束处理文本', node);
    };
  }
}

function transformExpression(node, ctx) {
  if (node.type === NodeTypes.INTERPOLATION) {
    // 是个插值
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
}
