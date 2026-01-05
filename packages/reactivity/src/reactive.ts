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
 * 创建一个响应式对象
 * 使用 Proxy 代理对象，拦截属性的读取和设置操作，实现响应式
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
 * 创建响应式对象的内部实现函数
 * 处理对象检查、缓存查找和代理对象创建
 *
 * @param target - 要转换为响应式的对象
 * @returns 响应式代理对象，如果 target 已经是响应式则直接返回
 */
export function createReactiveObject(target: object) {
  // 如果 target 不是对象，则直接返回
  if (!isObject(target)) return target;

  // 判断 target 是不是在 reactiveSet 里，在则直接返回
  if (reactiveSet.has(target)) return target;

  // 从缓存中查找是否已经为这个 target 创建过代理对象
  const existingProxy = reactiveMap.get(target);
  if (existingProxy) return existingProxy;

  // 创建新的代理对象，使用 mutableHandlers 处理属性的读取和设置
  const proxy = new Proxy(target, mutableHandlers);

  // 保存代理对象到 reactiveSet，避免重复创建代理对象
  reactiveSet.add(proxy);
  // 缓存代理对象，建立 target 和 proxy 的映射关系，避免重复创建代理对象
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
