import { NodeTypes } from './ast';
import { Tokenizer } from './tokenize';

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
