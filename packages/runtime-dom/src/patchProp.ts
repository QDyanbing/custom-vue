import { patchClass } from './modules/patchClass';
import { patchStyle } from './modules/patchStyle';

export function patchProp(el: HTMLElement, key: string, prevValue: any, nextValue: any) {
  if (key === 'class') {
    return patchClass(el, nextValue);
  }

  if (key === 'style') {
    return patchStyle(el, prevValue, nextValue);
  }
}
