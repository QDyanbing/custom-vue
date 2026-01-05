import { isRef, type Ref } from './ref';
import type { ComputedRef } from './computed';
import { ReactiveEffect } from './effect';
import { isFunction, isObject } from '@vue/shared';
import { isReactive } from './reactive';

/**
 * watch 的监听源类型
 * 可以是 ref、computed ref 或返回值的函数
 */
export type WatchSource<T = any> = Ref<T, any> | ComputedRef<T> | (() => T);

/**
 * 清理函数类型
 * 用于注册清理函数，在 watch 回调执行前或停止时调用
 */
export type OnCleanup = (cleanupFn: () => void) => void;

/**
 * watchEffect 的回调函数类型
 * 接收一个 onCleanup 函数用于注册清理函数
 */
export type WatchEffect = (onCleanup: OnCleanup) => void;

/**
 * watch 的回调函数类型
 * 接收新值、旧值和清理函数注册器
 */
export type WatchCallback<V = any, OV = any> = (
  value: V,
  oldValue: OV,
  onCleanup: OnCleanup,
) => any;

/**
 * 停止 watch 的函数类型
 */
export type WatchStopHandle = () => void;

/**
 * watch 的扩展句柄接口
 * 提供暂停、恢复和停止功能
 */
export interface WatchHandle extends WatchStopHandle {
  pause: () => void;
  resume: () => void;
  stop: () => void;
}

/**
 * 监听响应式数据的变化，并在变化时执行回调函数
 * watch 的实现原理：就是依赖 effect 的 scheduler
 *
 * **使用场景：**
 * - 需要监听响应式数据的变化并执行副作用时
 * - 需要在数据变化时执行异步操作或清理操作时
 * - 需要监听深层对象的变化时
 * - 需要在组件卸载时自动停止监听时
 *
 * @param source - 要监听的数据源，可以是 ref、reactive 对象或返回值的函数
 * @param cb - 数据变化时的回调函数，接收新值、旧值和清理函数注册器
 * @param options - 配置选项
 * @param options.immediate - 是否立即执行一次回调，默认为 false
 * @param options.once - 是否只执行一次，执行后自动停止监听，默认为 false
 * @param options.deep - 是否深度监听，对于 reactive 对象默认为 true，可以是数字指定深度
 * @returns 停止监听的函数
 */
export function watch(source: any, cb?: any, options: any = {}) {
  let { immediate, once, deep } = options;

  // 如果 once 为 true，则需要包装一下回调函数，在回调函数执行后，自动调用 cleanup
  if (once) {
    let _cb = cb;
    cb = (...args) => {
      _cb?.(...args);
      stop();
    };
  }

  let getter: () => any;

  // 根据 source 的类型创建对应的 getter 函数
  if (isRef(source)) {
    // 如果是 ref，getter 返回 ref.value
    getter = () => source.value;
  } else if (isReactive(source)) {
    // 如果是 reactive 对象，getter 返回对象本身
    getter = () => source;
    // 如果 deep 没传，则默认深度为 true；如果传了，则深度为传入的值
    deep = !deep ? true : deep;
  } else if (isFunction(source)) {
    // 如果是函数，直接作为 getter
    getter = source;
  }

  // 如果需要深度监听，包装 getter 函数
  if (deep) {
    const baseGetter = getter;

    // 处理 deep 是数字的情况，如果是 true，则深度为 Infinity，如果是数字，则深度为数字
    const depth = deep === true ? Infinity : deep;

    // 包装 getter，在获取值时遍历对象的所有属性
    getter = () => traverse(baseGetter(), depth);
  }

  let oldValue: any;

  // 清理函数，用于存储用户注册的清理逻辑
  let cleanup: (() => void) | undefined;

  /**
   * 注册清理函数
   * 用户可以在回调函数中调用此函数注册清理逻辑
   */
  function onCleanup(cb?: () => void) {
    cleanup = cb;
  }

  /**
   * effect 的调度函数
   * 当依赖变化时，effect 会调用此函数而不是直接执行 getter
   */
  function job() {
    // 清理上一次的副作用，如果有就执行，执行完后，把 cleanup 设置为 null
    if (cleanup) {
      cleanup();
      cleanup = null;
    }

    // 执行 effect.run 拿到 getter 的返回值，不能直接执行 getter，因为要收集依赖
    const newValue = effect.run();

    // 执行用户传入的回调函数，把新值和旧值传给用户
    if (cb) {
      cb(newValue, oldValue, onCleanup);
    }

    // 本次的最新值就是下次的旧值
    oldValue = newValue;
  }

  // 创建 effect，使用 getter 作为依赖收集函数
  const effect = new ReactiveEffect(getter);

  // 设置 scheduler，当依赖变化时调用 job 而不是直接执行 getter
  effect.scheduler = job;

  if (immediate) {
    // 立即执行一次，因为立即执行一次，所以不需要等到依赖变化后才执行
    job();
  } else {
    // 否则先执行一次 effect.run 来收集依赖并获取初始值
    oldValue = effect.run();
  }

  /**
   * 停止监听函数
   * 调用后会停止 effect，不再监听数据变化
   */
  function stop() {
    effect.stop();
  }

  return stop;
}

/**
 * 遍历对象的所有属性，用于深度监听
 * 通过访问对象的每个属性来触发响应式系统的依赖收集
 *
 * @param value - 要遍历的值
 * @param depth - 遍历深度，0 表示不遍历，Infinity 表示无限深度
 * @param seen - 已访问过的对象集合，用于避免循环引用导致的无限递归
 * @returns 返回原值
 */
function traverse(value: any, depth: number, seen: Set<any> = new Set()) {
  // 不是对象，或者深度为 0，直接返回
  if (!isObject(value) || depth <= 0) return value;
  // 如果已经遍历过，直接返回
  if (seen.has(value)) return value;

  // 添加到 seen 中，避免重复遍历
  seen.add(value);
  // 递归遍历对象的所有属性，访问每个属性会触发响应式系统的依赖收集
  for (const key in value) {
    traverse(value[key], depth - 1, seen);
  }

  return value;
}
