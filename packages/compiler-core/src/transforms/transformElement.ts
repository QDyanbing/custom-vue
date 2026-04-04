import {
  NodeTypes,
  createSimpleExpression,
  createObjectProperty,
  createObjectExpression,
  createVNodeCall,
} from '../ast';
import { CREATE_VNODE } from '../runtime-helper';

export function transformElement(node, ctx) {
  if (node.type === NodeTypes.ELEMENT) {
    // 是个元素
    return () => {
      // 元素处理完了
      const { tag, props, children } = node;

      const _props = buildProps(props);

      node.codegenNode = createVNodeCall(ctx.helper(CREATE_VNODE), tag, _props, children);
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
