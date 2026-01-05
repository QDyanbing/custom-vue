import { hasChanged, isObject } from '@vue/shared';
import { activeSub } from './effect';
import { link, propagate } from './system';
import type { Dependency, Link } from './system';
import { reactive } from './reactive';

declare const RefSymbol: unique symbol;

export interface Ref<T = any, S = T> {
  get value(): T;
  set value(_: S);
  [RefSymbol]: true;
}

export enum ReactiveFlags {
  IS_REF = '__v_isRef',
}

export type ToRef<T> = [T] extends [Ref] ? T : Ref<T>;

export type ToRefs<T = any> = {
  [K in keyof T]: ToRef<T[K]>;
};

// Ref 的实现类
class RefImpl implements Dependency {
  // 保存实际的值 ref(0) -> 0
  _value: any;
  // 标记为 Ref，主要用于判断是否是 Ref 对象
  [ReactiveFlags.IS_REF]: true = true;

  /**
   * 订阅者链表的头节点，理解为我们将的 head effect1 -> effect2 -> effect3
   */
  subs: Link | undefined;

  /**
   * 订阅者链表的尾节点，理解为我们讲的 tail
   */
  subsTail: Link | undefined;

  constructor(value: any) {
    // 如果 value 是对象，则转换为响应式对象；
    this._value = isObject(value) ? reactive(value) : value;
  }

  get value() {
    // 当读取 value 时，收集依赖
    trackRef(this);
    return this._value;
  }

  set value(newValue: any) {
    if (hasChanged(newValue, this._value)) {
      this._value = isObject(newValue) ? reactive(newValue) : newValue;

      // 当设置 value 时，触发更新，通知订阅者更新
      triggerRef(this);
    }
  }
}

export const ref = (value: any): RefImpl => {
  return new RefImpl(value);
};

/**
 * 判断是否是 Ref 对象
 * @param value - 要判断的值
 * @returns {boolean} - 是否是 Ref 对象
 */
export function isRef(value: any): boolean {
  return !!(value && value[ReactiveFlags.IS_REF]);
}

/**
 * 收集依赖，建立 ref 和 effect 之间的链表关系
 * @param dep - 要收集依赖的 ref 对象
 */
export function trackRef(dep: RefImpl) {
  if (activeSub) {
    link(dep, activeSub);
  }
}

/**
 * 触发 ref 关联的 effect 重新执行
 * @param dep - 要触发更新的 ref 对象
 */
export function triggerRef(dep: RefImpl) {
  if (dep.subs) {
    propagate(dep.subs);
  }
}

/**
 * ObjectRefImpl 用于创建一个指向对象属性的 ref
 * 当访问或修改 ref.value 时，实际上是在访问或修改原始对象的对应属性
 */
class ObjectRefImpl<T extends object, K extends keyof T> {
  [ReactiveFlags.IS_REF]: true = true;

  constructor(
    public _object: T,
    public _key: K,
  ) {}

  get value(): T[K] {
    return this._object[this._key];
  }

  set value(newValue: T[K]) {
    this._object[this._key] = newValue;
  }
}

/**
 * 为响应式对象的某个属性创建一个 ref
 * 创建的 ref 与源属性保持同步：修改源属性会更新 ref，反之亦然
 *
 * **使用场景：**
 * - 当你需要将响应式对象的某个属性单独提取出来作为 ref 使用时
 * - 在组合式函数中，需要返回对象的某个属性但保持响应性时
 * - 将对象的某个属性传递给需要 ref 类型的函数或组件时
 *
 * @param target - 响应式对象
 * @param key - 对象的属性名
 * @returns 指向对象属性的 ref
 */
export function toRef<T extends object, K extends keyof T>(target: T, key: K): ToRef<T[K]> {
  return new ObjectRefImpl<T, K>(target, key) as unknown as ToRef<T[K]>;
}

/**
 * 将响应式对象转换为普通对象，其中每个属性都是指向原始对象对应属性的 ref
 * 每个 ref 都是使用 toRef 创建的
 *
 * **使用场景：**
 * - 当你需要解构响应式对象但保持响应性时使用
 * - 在组合式函数中返回多个 ref，避免返回整个响应式对象
 * - 需要将响应式对象的多个属性分别传递给不同的组件或函数时
 * - 解构赋值后仍需要保持响应性，避免丢失响应式连接
 *
 * @param target - 响应式对象
 * @returns 包含 ref 的对象，每个属性都是指向原始对象对应属性的 ref
 */
export function toRefs<T extends object>(target: T): ToRefs<T> {
  const res = {} as ToRefs<T>;
  for (const key in target) {
    res[key] = new ObjectRefImpl<T, keyof T>(target, key as keyof T) as unknown as ToRef<
      T[Extract<keyof T, string>]
    >;
  }
  return res;
}

/**
 * 可能是 ref 或普通值的类型
 * 用于表示一个值可以是普通值 T，也可以是一个 Ref<T>
 */
export type MaybeRef<T = any> = T | Ref<T>;

/**
 * 如果参数是 ref，则返回 ref 的内部值，否则返回参数本身
 * 这是一个语法糖函数，等价于 `val = isRef(val) ? val.value : val`
 *
 * **使用场景：**
 * - 在函数中需要处理可能是 ref 也可能是普通值的参数时
 * - 需要统一处理 ref 和普通值，避免重复的类型判断代码
 * - 在组合式函数中，需要从 ref 中提取值进行计算时
 *
 * @param ref - 可能是 ref 或普通值
 * @returns 如果是 ref 则返回其内部值，否则返回原值
 */
export function unref<T>(ref: MaybeRef<T>): T {
  return isRef(ref) ? (ref as Ref<T>).value : (ref as T);
}

/**
 * 返回一个代理对象，该代理会浅层解包属性中的 ref
 * 访问代理对象的属性时，如果该属性是 ref，会自动返回 ref.value
 * 设置代理对象的属性时，如果原属性是 ref 且新值不是 ref，会将新值赋给 ref.value
 *
 * **使用场景：**
 * - 当你有一个包含多个 ref 的对象，希望访问时自动解包 ref 时
 * - 在模板中使用包含 ref 的对象时，避免手动访问 .value
 * - 需要将包含 ref 的对象传递给期望普通对象的函数时
 *
 * @param target - 包含 ref 属性的对象
 * @returns 代理对象，访问属性时会自动解包 ref
 */
export function proxyRefs<T extends object>(target: T): T {
  return new Proxy(target, {
    get(target, key, receiver) {
      return unref(Reflect.get(target, key, receiver));
    },
    set(target, key, newValue, receiver) {
      const oldValue = target[key];

      if (isRef(oldValue) && !isRef(newValue)) {
        oldValue.value = newValue;
        return true;
      }

      return Reflect.set(target, key, newValue, receiver);
    },
  });
}
