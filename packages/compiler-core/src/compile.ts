import { parse } from './parser';

export function compile(template: string) {
  const ast = parse(template);
  return ast;
}
