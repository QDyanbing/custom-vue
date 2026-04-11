/**
 * 计算属性：`ComputedRefImpl` 同时作为 `Dependency` 与 `Sub` 参与双向链表调度。
 */
import { hasChanged, isFunction } from '@vue/shared';
import { ReactiveFlags, type Ref } from './ref';
import { Dependency, endTrack, link, Link, startTrack, Sub } from './system';
import { activeSub, setActiveSub } from './effect';

export type ComputedGetter<T> = (oldValue?: T) => T;
export type ComputedSetter<T> = (newValue: T) => void;

export interface WritableComputedOptions<T, S = T> {
  get: ComputedGetter<T>;
  set: ComputedSetter<S>;
}

declare const ComputedRefSymbol: unique symbol;

interface BaseComputedRef<T, S = T> extends Ref<T, S> {
  [ComputedRefSymbol]: true;
  effect: ComputedRefImpl;
}

export interface ComputedRef<T = any> extends BaseComputedRef<T> {
  readonly value: T;
}

/**
 * 计算属性实现：同时实现 `Dependency` 与 `Sub`。
 *
 * - 执行 getter 收集依赖时，本实例作为 `Sub` 链接到所读 ref / reactive。
 * - 被外层 `effect` 读取 `.value` 时，本实例作为 `Dependency` 被订阅。
 */
class ComputedRefImpl implements Dependency, Sub {
  /** 满足 `isRef` 判别，便于与 ref 统一处理 */
  [ReactiveFlags.IS_REF] = true;
  /** 缓存的计算结果 */
  _value: any;
  /** 作为 dep：订阅者链表，值变更时通知下游 */
  subs: Link;
  subsTail: Link;
  /** 作为 sub：所依赖的上游 dep 链表 */
  deps: Link;
  depsTail: Link;

  tracking: boolean = false;
  /** 为 true 时需在读取 `value` 时重新执行 getter（`update`） */
  dirty: boolean = true;

  constructor(
    public fn: () => any,
    private setter: (value: any) => void,
  ) {}

  get value() {
    if (this.dirty) {
      // `dirty` 为真时先 `update`，用 getter 重算并更新上游依赖边。
      this.update();
    }

    // 作为 Dependency：被外层 effect / 其他 computed 读取时挂链。
    if (activeSub) {
      link(this, activeSub);
    }

    return this._value;
  }

  set value(newValue: any) {
    if (this.setter) {
      this.setter(newValue);
    } else {
      console.warn('Write operation failed: computed value is readonly');
    }
  }

  update() {
    /** 以自身为 `Sub` 执行 getter，收集上游 dep；返回值是否变化用于向下游 `propagate`。 */
    const prevSub = activeSub;

    setActiveSub(this);
    startTrack(this);

    try {
      const oldValue = this._value;
      this._value = this.fn();

      return hasChanged(this._value, oldValue);
    } finally {
      endTrack(this);
      setActiveSub(prevSub);
    }
  }
}

/**
 * 创建计算属性：入参可为 getter 函数，或 `{ get, set? }`。
 */
export function computed<T>(
  getterOrOptions: ComputedGetter<T> | WritableComputedOptions<T>,
): ComputedRefImpl {
  let getter: ComputedGetter<T>;
  let setter: ComputedSetter<T> | undefined;

  if (isFunction(getterOrOptions)) {
    getter = getterOrOptions;
  } else {
    getter = getterOrOptions.get;
    setter = getterOrOptions.set;
  }

  return new ComputedRefImpl(getter, setter);
}
