/**
 * `compile`：在 `parse` 得到 AST 后执行 `transform`。
 * 深度优先遍历；遇 `INTERPOLATION` 时登记 `TO_DISPLAY_STRING`，并把简单表达式改为 `_ctx.` 前缀（见 `runtime-helper.ts`）。
 * 文本合并后会把相邻文本 / 插值包装成 `TEXT_CALL`，供后续代码生成阶段消费。
 * 当前不生成最终渲染代码，只串联解析与变换。
 */
import {
  createObjectExpression,
  createObjectProperty,
  createSimpleExpression,
  NodeTypes,
} from './ast';
import { parse } from './parser';
import { TO_DISPLAY_STRING } from './runtime-helper';
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

function transformElement(node, ctx) {
  if (node.type === NodeTypes.ELEMENT) {
    // 是个元素

    return () => {
      // 元素处理完了
      const { tag, props, children } = node;

      const _props = buildProps(props);

      node.codegenNode = {
        type: NodeTypes.ELEMENT,
        tag,
        props: _props,
        children,
      };
    };
  }
}

function buildProps(props) {
  if (!props) return;

  const properties = props.reduce((acc, current) => {
    const key = createSimpleExpression(current.name.replace(/^:/, ''));
    const value = createSimpleExpression(current.value, !current.name.startsWith(':'));
    acc.push(createObjectProperty(key, value));
    return acc;
  }, {});

  return createObjectExpression(properties);
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
