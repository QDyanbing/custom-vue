import { hasChanged, isObject } from '@vue/shared';
import { track, trigger } from './dep';
import { isRef } from './ref';
import { reactive } from './reactive';

/**
 * `reactive` 使用的 Proxy handler：在 `get` 中 `track`、在 `set` 中 `trigger`。
 *
 * - 嵌套对象会在首次访问时再包一层 `reactive`。
 * - 属性值为 `ref` 时在 `get` 中自动解包（与模板/选项式 API 的 ref 解包语义对齐）。
 * - 数组 `length`、ref 赋值等分支见方法内注释。
 */
export const mutableHandlers: ProxyHandler<object> = {
  get(target, key, receiver) {
    track(target, key);

    const res = Reflect.get(target, key, receiver);

    if (isRef(res)) {
      return res.value;
    }

    if (isObject(res)) {
      return reactive(res);
    }

    return res;
  },
  set(target, key, newValue, receiver) {
    const oldVal = target[key];

    const targetIsArray = Array.isArray(target);
    const oldLength = targetIsArray ? target.length : 0;

    if (isRef(oldVal) && !isRef(newValue)) {
      oldVal.value = newValue;
      // ref 赋值已在 RefImpl 内 trigger，此处返回避免再次 trigger
      return true;
    }

    const res = Reflect.set(target, key, newValue, receiver);

    if (hasChanged(newValue, oldVal)) {
      trigger(target, key);
    }

    const newLength = targetIsArray ? target.length : 0;

    if (targetIsArray && newLength !== oldLength && key !== 'length') {
      trigger(target, 'length');
    }

    return res;
  },
};
