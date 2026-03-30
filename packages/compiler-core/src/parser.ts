/**
 * 将模板字符串交给 `Tokenizer` 扫描，并把回调里得到的片段组装成 AST。
 * 当前实现：`ROOT` 下含 `TEXT`、`INTERPOLATION`（内层 `SIMPLE_EXPRESSION`，首尾空白在回调内裁切）、嵌套 `ELEMENT`（双引号属性）；闭合与 `loc` 由 `onCloseTag`、`setLocEnd` 与栈配合；尾部纯文本仍依赖 `tokenize` 的 `cleanup`。
 */
import { NodeTypes } from './ast';
import { Tokenizer } from './tokenize';
import { isWhiteSpace } from './tokenize';

// 与词法分析共享的输入与根节点（由 parse 每次调用时重置）
let currentInput = '';
let currentRoot = null;
// 当前正在解析的开始标签
let currentOpenTag = null;
// 当前正在解析的属性
let currentProp = null;

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
    const textNode: any = {
      content: getSlice(start, end),
      type: NodeTypes.TEXT,
      loc: getLoc(start, end),
    };

    addNode(textNode);
  },
  onOpenTagName: (start: number, end: number) => {
    const tag = getSlice(start, end);

    // 把当前正在解析的开始标签赋值给 currentOpenTag
    // 之所以放在全局变量，是因为在解析属性时需要用到
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
  onAttrName: (start: number, end: number) => {
    currentProp = {
      name: getSlice(start, end),
      loc: getLoc(start, end),
      value: undefined,
    };
  },
  onAttrValue: (start: number, end: number) => {
    const value = getSlice(start, end);
    currentProp.value = value;
    setLocEnd(currentProp.loc, end + 1);

    if (currentOpenTag) {
      if (!currentOpenTag.props) {
        currentOpenTag.props = [];
      }

      currentOpenTag.props.push(currentProp);
    }

    currentProp = null;
  },
  onInterpolation: (start: number, end: number) => {
    let innerStart = start + 2;
    let innerEnd = end - 2;
    // 跳过开头的空格
    while (isWhiteSpace(currentInput[innerStart])) {
      innerStart++;
    }
    // 跳过结尾的空格
    while (isWhiteSpace(currentInput[innerEnd - 1])) {
      innerEnd--;
    }

    addNode({
      type: NodeTypes.INTERPOLATION,
      loc: getLoc(start, end),
      content: {
        type: NodeTypes.SIMPLE_EXPRESSION,
        content: getSlice(innerStart, innerEnd),
        loc: getLoc(innerStart, innerEnd),
      },
    } as any);
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
