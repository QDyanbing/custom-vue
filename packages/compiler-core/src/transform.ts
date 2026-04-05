import { coverToBlock, createVNodeCall, NodeTypes } from './ast';
import { CREATE_VNODE, FRAGMENT, TO_DISPLAY_STRING } from './runtime-helper';
import { transformElement } from './transforms/transformElement';
import { transformExpression } from './transforms/transformExpression';
import { transformText } from './transforms/transformText';

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

const createTransformContext = root => {
  const ctx = {
    root,
    currentNode: root,
    parentNode: null,
    // 变换顺序会影响 exit 阶段的执行结果，这里先处理元素，再处理文本与插值。
    nodeTransforms: [transformElement, transformText, transformExpression],
    helpers: new Map(),
    helper(name: string) {
      const count = ctx.helpers.get(name) || 0;

      ctx.helpers.set(name, count + 1);

      return name;
    },
    removeHelper(name: string) {
      let count = ctx.helpers.get(name) || 0;

      if (count > 0) {
        count--;
        if (count === 0) {
          ctx.helpers.delete(name);
        } else {
          ctx.helpers.set(name, count);
        }
      }
    },
  };

  return ctx;
};

export function transform(root) {
  const ctx = createTransformContext(root);

  traverseNode(root, ctx);
  createRootCodegenNode(root, ctx);
  root.helpers = ctx.helpers.keys();
}

function isElementNode(node) {
  return node.type === NodeTypes.ELEMENT;
}

export function createRootCodegenNode(root, ctx) {
  const { children } = root;
  const { helper } = ctx;

  if (children.length === 1) {
    // 单根节点
    const child = children[0];

    if (isElementNode(child)) {
      const codegenNode = child.codegenNode;

      coverToBlock(codegenNode, ctx);

      root.codegenNode = codegenNode;
    } else {
      root.codegenNode = child;
    }
  } else if (children.length > 1) {
    // 多根节点
    const codegenNode = createVNodeCall(
      ctx.helper(CREATE_VNODE),
      ctx.helper(FRAGMENT),
      null,
      children,
    );

    coverToBlock(codegenNode, ctx);

    root.codegenNode = codegenNode;
  }
}
