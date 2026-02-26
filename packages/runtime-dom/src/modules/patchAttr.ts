/**
 * 更新元素的 attribute（`setAttribute/removeAttribute`）。
 *
 * @param el 目标元素
 * @param key attribute 名称
 * @param value 新值；传入 `null/undefined` 会移除该 attribute
 */
export function patchAttr(el: HTMLElement, key: string, value: any) {
  if (value === undefined || value === null) {
    el.removeAttribute(key);
  } else {
    el.setAttribute(key, value);
  }
}
