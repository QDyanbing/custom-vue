export function patchClass(el: HTMLElement, value?: string) {
  if (value === undefined || value === null) {
    el.removeAttribute('class');
  } else {
    el.className = value;
  }
}
