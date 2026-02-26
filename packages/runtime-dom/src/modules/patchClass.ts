export function patchClass(el: HTMLElement, value?: string) {
  if (value) {
    el.className = value;
  } else {
    el.removeAttribute('class');
  }
}
