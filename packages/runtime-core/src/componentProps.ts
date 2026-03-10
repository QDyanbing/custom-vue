import { reactive } from '@vue/reactivity';
import { isArray, hasOwn } from '@vue/shared';

export function normalizePropsOptions(props: any = {}) {
  /**
   * 要把数组处理成对象
   */
  if (isArray(props)) {
    // 把数组处理成对象，key为属性名；
    return props.reduce((prev, cur) => {
      prev[cur] = {};
      return prev;
    }, {});
  }

  return props;
}

function setFullProps(instance: any, rawProps: any, props: any, attrs: any) {
  const propsOptions = instance.propsOptions;

  if (rawProps) {
    for (const key in rawProps) {
      if (hasOwn(propsOptions, key)) {
        // 如果属性在propsOptions中，则设置到props中
        props[key] = rawProps[key];
      } else {
        // 如果属性不在propsOptions中，则设置到attrs中
        attrs[key] = rawProps[key];
      }
    }
  }
}

export function initProps(instance) {
  const { vnode } = instance;

  const rawProps = vnode.props;
  const props = {};
  const attrs = {};
  setFullProps(instance, rawProps, props, attrs);
  instance.props = reactive(props);
  instance.attrs = attrs;
}
