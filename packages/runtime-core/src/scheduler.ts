const resolvedPromise = Promise.resolve();

/**
 * 在下一次微任务中执行回调。
 *
 * 约定：
 * - 回调会以 `this` 作为执行时的 this 值（由调用方通过 `bind/call/apply` 决定）
 * - 本实现只提供“延后到微任务”的语义，不做队列合并、也不处理回调缺省等分支
 */
export function nextTick(fn) {
  // 用户传入的回调函数放到微任务中执行
  resolvedPromise.then(() => fn.call(this));
}

/**
 * 将一个 job 推入微任务队列执行。
 *
 * 当前是最小实现：
 * - 不做 job 去重（同一个 job 多次入队会执行多次）
 * - 不做排序与批量 flush（每次调用都会追加一个微任务）
 *
 * 渲染器里会把组件的 update（effect.run）交给它，从而让响应式触发时的更新变成异步调度。
 */
export function queueJob(job) {
  // 把渲染函数放到微任务中执行
  resolvedPromise.then(() => {
    job();
  });
}
