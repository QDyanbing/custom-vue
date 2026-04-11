# scheduler.ts 说明

## 概述

`scheduler.ts` 提供**微任务调度**：`nextTick` 将回调推迟到当前宏任务之后的微任务；`queueJob` 将单次任务（如组件 `update` 中的 `effect.run`）排入微任务。本仓库为教学向简化（无 job 去重与排序），与 Vue 发行版 scheduler 不必逐行一致。

## nextTick(fn)

- 基于 `Promise.resolve().then(...)`，在微任务阶段执行 `fn`
- **返回值**：返回 `resolvedPromise.then(...)` 的 Promise，因此可以 `await nextTick()`，也可以链式 `.then()`
- 执行时使用 `fn.call(this)`，`this` 由调用方决定（例如通过 `bind` 绑定到组件实例）

## queueJob(job)

- 每次调用会向微任务队列追加一次 `job()`；当前实现**不做** job 去重或优先级排序
- 渲染器里把组件更新的 `effect.run` 交给 `queueJob`，使同一轮响应式触发合并到一次异步 flush（与同步多次改值的行为配合）

## 相关代码

- [renderer.md](./renderer.md)：`queueJob(instance.update)` 与组件更新调度
