/**
 * 更新元素的 `class`。
 *
 * @param el 目标元素
 * @param value class 字符串；传入 `null/undefined` 会移除 `class` 特性
 */
export function patchClass(el: HTMLElement, value?: string) {
  if (value === undefined || value === null) {
    el.removeAttribute('class');
  } else {
    el.className = value;
  }
}
