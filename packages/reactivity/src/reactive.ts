import { isObject } from '@vue/shared';
import { mutableHandlers } from './baseHandlers';

/**
 * 保存所有使用 reactive 创建出来的响应式对象
 * 用于快速判断一个对象是否是响应式对象
 * 结构：[Proxy1, Proxy2, ...]
 */
const reactiveSet = new WeakSet<object>();

/**
 * 保存 target 和响应式对象之间的关联关系
 * 用于缓存已创建的代理对象，避免重复创建
 * 结构：{
 *   [target]: Proxy,
 * }
 */
const reactiveMap = new WeakMap<object, object>();

/**
 * 创建响应式对象。
 * 使用 Proxy 拦截对象的读取和写入操作。
 *
 * **使用场景：**
 * - 需要创建响应式对象时
 * - 需要监听对象属性的变化时
 * - 需要将普通对象转换为响应式对象时
 *
 * @param target - 要转换为响应式的对象
 * @returns 响应式代理对象
 */
export function reactive(target: object) {
  return createReactiveObject(target);
}

/**
 * 创建响应式对象的内部实现。
 * 负责对象检查、缓存命中与代理创建。
 *
 * @param target - 要转换为响应式的对象
 * @returns 响应式代理对象，如果 target 已经是响应式则直接返回
 */
export function createReactiveObject(target: object) {
  // 如果 target 不是对象，则直接返回
  if (!isObject(target)) return target;

  // 如果传入值本身已经是代理对象，直接返回。
  if (reactiveSet.has(target)) return target;

  // 查找是否已经为该 target 创建过代理。
  const existingProxy = reactiveMap.get(target);
  if (existingProxy) return existingProxy;

  // 创建新的代理对象，使用 mutableHandlers 处理属性的读取和设置
  const proxy = new Proxy(target, mutableHandlers);

  // 记录代理对象，避免重复包装。
  reactiveSet.add(proxy);
  // 建立 target -> proxy 映射，后续可直接复用。
  reactiveMap.set(target, proxy);

  // 返回代理对象
  return proxy;
}

/**
 * 判断一个对象是否是响应式对象
 * 只要在 reactiveSet 中就是响应式
 *
 * @param target - 要判断的对象
 * @returns 如果是响应式对象返回 true，否则返回 false
 */
export function isReactive(target: any) {
  return reactiveSet.has(target);
}
