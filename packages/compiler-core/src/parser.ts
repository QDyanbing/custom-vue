/**
 * 将模板字符串交给 `Tokenizer` 扫描，并把回调里得到的片段组装成 AST。
 * 当前实现：纯文本 → `ROOT` 下挂若干 `TEXT` 子节点（见 `tokenize` 的 `cleanup`）。
 */
import { NodeTypes } from './ast';
import { Tokenizer } from './tokenize';

// 与词法分析共享的输入与根节点（由 parse 每次调用时重置）
let currentInput = '';
let currentRoot = null;

function getSlice(start: number, end: number) {
  return currentInput.slice(start, end);
}

function getLoc(start: number, end: number) {
  return {
    start: tokenize.getPos(start),
    end: tokenize.getPos(end),
    source: getSlice(start, end),
  };
}

const tokenize = new Tokenizer({
  onText: (start: number, end: number) => {
    const textNode = {
      content: getSlice(start, end),
      type: NodeTypes.TEXT,
      loc: getLoc(start, end),
    };

    currentRoot.children.push(textNode);
  },
  onOpenTagName: (start: number, end: number) => {
    const name = getSlice(start, end);

    console.log(name);
  },
});

function createRoot(source: string) {
  return {
    type: NodeTypes.ROOT,
    children: [],
    source,
  };
}

export function parse(input: string) {
  currentInput = input;
  const root = createRoot(input);
  currentRoot = root;

  // 开始解析
  tokenize.parse(input);

  return root;
}
