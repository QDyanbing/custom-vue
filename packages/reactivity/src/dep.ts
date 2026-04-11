/**
 * `reactive` 对象的按属性依赖：`track` / `trigger` 与 `targetMap` 配合，
 * 在 `Proxy` 的 get/set 路径上与 `system.link` / `propagate` 衔接。
 */
import { activeSub } from './effect';
import { link, propagate, type Link } from './system';

/**
 * 与 `reactive` 对象某一属性键对应的依赖桶（`targetMap[target][key]`）。
 * 自身维护订阅者链表，供 `trigger` 时沿链表通知。
 */
class Dep {
  // 订阅者链表的头节点
  subs: Link | undefined;
  // 订阅者链表的尾节点
  subsTail: Link | undefined;

  constructor() {}
}

/**
 * 保存 target 与 key 对应的 Dep。
 * targetMap 的结构：
 * target = { a: 1, b: 2 }
 * targetMap = {
 *   [target]: {
 *     a: Dep,
 *     b: Dep,
 *   },
 * }
 */
const targetMap = new WeakMap<object, Map<string | number | symbol, Dep>>();

/** 在 `activeSub` 存在时，为 `(target, key)` 与当前订阅者建立 `link`。 */
export const track = (target: object, key: string | number | symbol) => {
  if (!activeSub) return;
  let depsMap = targetMap.get(target);
  if (!depsMap) {
    depsMap = new Map();
    targetMap.set(target, depsMap);
  }

  let dep = depsMap.get(key);
  if (!dep) {
    dep = new Dep();
    depsMap.set(key, dep);
  }

  link(dep, activeSub);
};

/** 通知 `(target, key)` 上的订阅者；数组 `length` 等分支见方法内注释。 */
export const trigger = (target: object, key: string | number | symbol) => {
  const depsMap = targetMap.get(target);
  if (!depsMap) return;

  const targetIsArray = Array.isArray(target);

  if (targetIsArray && key === 'length') {
    // 数组 length 变化时，需要通知越界索引和 length 依赖重新执行。

    depsMap.forEach((dep, depKey) => {
      if ((depKey as unknown as number) >= target.length || depKey === 'length') {
        // 访问越界索引或 length 的 effect 都需要重新执行。
        propagate(dep.subs);
      }
    });
  } else {
    // 非「数组 + length」路径：按 key 取 dep 并向下游传播。
    const dep = depsMap.get(key);
    if (!dep) return;

    propagate(dep.subs);
  }
};
