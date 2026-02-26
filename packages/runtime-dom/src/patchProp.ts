import { isOn } from '@vue/shared';
import { patchClass } from './modules/patchClass';
import { patchStyle } from './modules/patchStyle';
import { patchEvent } from './modules/patchEvent';

export function patchProp(el: HTMLElement, key: string, prevValue: any, nextValue: any) {
  /**
   * 处理 class 属性
   */
  if (key === 'class') {
    return patchClass(el, nextValue);
  }

  /**
   * 处理 style 属性
   */
  if (key === 'style') {
    return patchStyle(el, prevValue, nextValue);
  }

  /**
   * 处理事件
   */
  if (isOn(key)) {
    return patchEvent(el, key, prevValue, nextValue);
  }
}
