import { isArray } from '@vue/shared';

export function normalizePropsOptions(props: any = {}) {
  /**
   * 要把数组处理成对象
   */

  if (isArray(props)) {
    // 把数组处理成对象，key为属性名；
    return props.reduce((prev, cur) => {
      prev[cur] = { type: true };
      return prev;
    }, {});
  }

  return props;
}
