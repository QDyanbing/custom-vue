export function patchEvent(el: HTMLElement, key: string, prevValue: any, nextValue: any) {
  const name = key.slice(2).toLowerCase();

  if (prevValue) {
    el.removeEventListener(name, prevValue);
  }

  el.addEventListener(name, nextValue);
}
