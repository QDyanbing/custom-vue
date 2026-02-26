type Style = string | Record<string, string | string[]> | null;

/**
 * 更新元素的 `style` 属性（inline style）。
 *
 * @param el 目标元素
 * @param prevValue 上一次的 style 值
 * @param nextValue 这一次的 style 值
 *
 * @remarks
 * 本实现保持与当前运行时代码一致：
 * - `nextValue` 为真值时，按 key 写入 `el.style[key]`
 * - `prevValue` 为真值时，清理由 `prevValue` 存在但 `nextValue` 不存在的 key
 */
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
