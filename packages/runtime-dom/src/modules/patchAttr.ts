export function patchAttr(el: HTMLElement, key: string, value: any) {
  if (value === undefined || value === null) {
    el.removeAttribute(key);
  } else {
    el.setAttribute(key, value);
  }
}
