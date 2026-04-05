import { helperMap } from './runtime-helper';

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

export function generate(ast) {
  const ctx = createCodegenContext(ast);

  ctx.push('const count = ref(0)');
  ctx.newline();
  ctx.push('const msg = ref("Hello World")');

  console.log(ctx.code);
}
