import { isOn } from '@vue/shared';
import { patchClass } from './modules/patchClass';
import { patchStyle } from './modules/patchStyle';
import { patchEvent } from './modules/patchEvent';
import { patchAttr } from './modules/patchAttr';

/**
 * 更新单个元素上的属性/特性/事件等。
 *
 * @param el 目标元素
 * @param key 属性名（如 `class`、`style`、`onClick`、`id` 等）
 * @param prevValue 上一次的值
 * @param nextValue 这一次的值
 *
 * @remarks
 * 目前分支规则：
 * - `class`：使用 `patchClass`
 * - `style`：使用 `patchStyle`
 * - 事件：`isOn(key)` 为真时，交给 `patchEvent`（例如 `onClick`）
 * - 兜底：当作 attribute 处理（`patchAttr`）
 */
export function patchProp(el: HTMLElement, key: string, prevValue: any, nextValue: any) {
  if (key === 'class') {
    return patchClass(el, nextValue);
  }

  if (key === 'style') {
    return patchStyle(el, prevValue, nextValue);
  }

  if (isOn(key)) {
    return patchEvent(el, key, prevValue, nextValue);
  }

  patchAttr(el, key, nextValue);
}
