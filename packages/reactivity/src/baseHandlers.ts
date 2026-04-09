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
    // target = { a: 1, b: 2 }
    // 收集依赖，绑定target中的key和sub之间的依赖关系
    track(target, key);

    // receiver 用来保证访问器里面的 this 指向代理对象；
    const res = Reflect.get(target, key, receiver);

    if (isRef(res)) {
      // target = {a:ref(0)}
      // 如果target.a 是一个 ref，那么就直接把值给它，不要让它 .value
      return res.value;
    }

    if (isObject(res)) {
      // target = {a:{b:1}};处理对象的嵌套响应式问题；

      return reactive(res);
    }

    return res;
  },
  set(target, key, newValue, receiver) {
    const oldVal = target[key];

    // 为了处理数组的隐式更新length问题，我们需要获取旧的length；
    const targetIsArray = Array.isArray(target);
    const oldLength = targetIsArray ? target.length : 0;

    if (isRef(oldVal) && !isRef(newValue)) {
      // 旧值是 ref，新值不是 ref，则需要对旧值的 .value 进行赋值；
      // 旧值是 ref，新值是 ref，直接跳过即可；
      oldVal.value = newValue;

      // 这里之所以return是因为：已经在ref中完成trigger，如果不return会多次触发；
      return true;
    }

    // 先完成赋值操作
    const res = Reflect.set(target, key, newValue, receiver);

    if (hasChanged(newValue, oldVal)) {
      // 如果旧值和新值不相等，则触发依赖更新
      trigger(target, key);
    }

    const newLength = targetIsArray ? target.length : 0;

    if (targetIsArray && newLength !== oldLength && key !== 'length') {
      // 如果新长度不等于旧长度，则需要隐式更新length
      trigger(target, 'length');
    }

    return res;
  },
};
