/**
 * 代码生成：读取变换后的 AST（根上 `helpers`、`codegenNode`），拼出 `render` 函数字符串，
 * 从 `Vue` 解构所需 helper，并生成 `TEXT` 与 `VNODE_CALL`（含 block 根时的 `openBlock` 包裹）。
 */
import { isArray, isString } from '@vue/shared';
import { NodeTypes } from './ast';
import { helperMap, OPEN_BLOCK } from './runtime-helper';

function createCodegenContext(ast) {
  const context = {
    ast,
    code: '',
    indentLevel: 0,
    helper(name: string) {
      return '_' + helperMap[name];
    },
    push(code: string) {
      context.code += code;
    },
    indent(n: number) {
      newline(++context.indentLevel);
    },
    deindent(n: number) {
      newline(--context.indentLevel);
    },
    newline() {
      newline(context.indentLevel);
    },
  };

  function newline(n: number) {
    context.push('\n' + '  '.repeat(n));
  }

  return context;
}

function genFunction(ast, ctx) {
  const helpers = [...ast.helpers].map(name => `${helperMap[name]}: ${ctx.helper(name)}`);

  ctx.push(`const { ${helpers} } = Vue;`);
  ctx.newline();
  ctx.newline();
  ctx.push('return function render(_ctx, _cache, $props, $setup, $data, $options) {');
}

function genText(node, ctx) {
  ctx.push(JSON.stringify(node.content));
}

function genNodeListAsArray(nodes, ctx) {
  ctx.push('[');
  genNodeList(nodes, ctx);
  ctx.push(']');
}

function genNodeList(nodes, ctx) {
  nodes.forEach((node, index) => {
    if (node === null || node === undefined) {
      ctx.push('null');
    } else if (isString(node)) {
      ctx.push(node);
    } else if (isArray(node)) {
      genNodeListAsArray(node, ctx);
    } else {
      genNode(node, ctx);
    }

    if (index < nodes.length - 1) {
      ctx.push(',');
    }
  });
}

function genVNodeCall(node, ctx) {
  const { isBlock, tag, props, children, callee } = node;

  if (isBlock) {
    ctx.push(`(${ctx.helper(OPEN_BLOCK)}(),`);
  }

  const helper = ctx.helper(callee);
  ctx.push(`${helper}(`);
  const args = [JSON.stringify(tag), props];

  if (children.length > 0) {
    args.push(children);
  } else {
    if (!props) {
      args.pop();
    }
  }

  genNodeList(args, ctx);

  ctx.push(`)`);

  if (isBlock) {
    ctx.push(`)`);
  }
}

function genNode(node, ctx) {
  switch (node.type) {
    case NodeTypes.TEXT:
      genText(node, ctx);
      break;
    case NodeTypes.VNODE_CALL:
      genVNodeCall(node, ctx);
      break;
  }
}

function genFunctionBody(ast, ctx) {
  ctx.indent();
  ctx.push(`return `);
  genNode(ast.codegenNode, ctx);
  ctx.deindent();
}

export function generate(ast) {
  const ctx = createCodegenContext(ast);
  genFunction(ast, ctx);
  genFunctionBody(ast, ctx);

  ctx.push('}');
  console.log(ctx.code);
  return ctx.code;
}
