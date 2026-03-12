const resolvedPromise = Promise.resolve();

export function nextTick(fn) {
  // 用户传入的回调函数放到微任务中执行
  resolvedPromise.then(() => fn.call(this));
}

export function queueJob(job) {
  // 把渲染函数放到微任务中执行
  resolvedPromise.then(() => {
    job();
  });
}
