/**
 * 将模板字符串交给 `Tokenizer` 扫描，并把回调里得到的片段组装成 AST。
 * 当前实现：纯文本 → `ROOT` 下挂若干 `TEXT` 子节点（见 `tokenize` 的 `cleanup`）。
 */
import { NodeTypes } from './ast';
import { Tokenizer } from './tokenize';

// 与词法分析共享的输入与根节点（由 parse 每次调用时重置）
let currentInput = '';
let currentRoot = null;

// 当前正在解析的开始标签
let currentOpenTag = null;

function getSlice(start: number, end: number) {
  return currentInput.slice(start, end);
}

interface Loc {
  start: {
    line: number;
    column: number;
    offset: number;
  };
  end: {
    line: number;
    column: number;
    offset: number;
  };
  source: string;
}

function getLoc(start: number, end: number) {
  return {
    start: tokenize.getPos(start),
    end: tokenize.getPos(end),
    source: getSlice(start, end),
  };
}

const stack = [];
function addNode(node: Node) {
  // 如果栈顶有节点，则把节点添加到栈顶节点的子节点中，否则添加到根节点的子节点中
  (stack.at(-1) || currentRoot).children.push(node);
}

function setLocEnd(loc: Loc, end: number) {
  loc.source = getSlice(loc.start.offset, end);
  loc.end = tokenize.getPos(end);
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
    const tag = getSlice(start, end);

    // 把当前正在解析的开始标签赋值给 currentOpenTag
    // 只所以放在全局变量，是因为在解析属性时需要用到
    currentOpenTag = {
      type: NodeTypes.ELEMENT,
      tag,
      loc: getLoc(start - 1, end),
      children: [],
    };
  },
  onOpenTagEnd: () => {
    addNode(currentOpenTag);
    stack.push(currentOpenTag);
    currentOpenTag = null;
  },
  onCloseTag: (start: number, end: number) => {
    const tag = getSlice(start, end);
    const last = stack.pop();
    if (last.tag === tag) {
      setLocEnd(last.loc, end + 1);
    } else {
      throw new Error(`${tag} is not match ${last.tag}`);
    }
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
