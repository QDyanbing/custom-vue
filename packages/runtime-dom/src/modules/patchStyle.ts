type Style = string | Record<string, string | string[]> | null;

export function patchStyle(el: HTMLElement, prevValue: Style, nextValue: Style): void {
  const style = el.style;

  if (nextValue) {
    for (const key in nextValue as any) {
      style[key] = nextValue[key];
    }
  }

  if (prevValue) {
    for (const key in prevValue as any) {
      if (!(key in (nextValue as any))) {
        style[key] = null;
      }
    }
  }
}
