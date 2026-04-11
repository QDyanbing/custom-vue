import { startTrack, endTrack } from './system';
import type { Link, Sub } from './system';

/**
 * 调试钩子占位类型；与 Vue core 里基于 DebuggerEvent 的完整签名尚未一一对应，仅保留扩展点。
 */
export interface DebuggerOptions {
  onTrack?: (event: unknown) => void;
  onTrigger?: (event: unknown) => void;
}

export type EffectScheduler = (...args: any[]) => any;

export interface ReactiveEffectOptions extends DebuggerOptions {
  scheduler?: EffectScheduler;
  allowRecurse?: boolean;
  onStop?: () => void;
}

/** 当前正在执行的 effect 订阅者；依赖收集时只与栈顶这一层建立 `link`。 */
export let activeSub = null;

/** 由 `ReactiveEffect.run` 在嵌套调用时切换栈顶；业务代码勿随意改写。 */
export function setActiveSub(sub: any) {
  activeSub = sub;
}

/** `effect()` 返回的副作用实例，封装 `fn`、依赖链表与 `run`/`stop`。 */
export class ReactiveEffect implements Sub {
  // 表示当前 effect 是否处于激活状态。
  active: boolean = true;
  // 依赖项链表头节点：ref1 -> ref2 -> ref3
  deps: Link | undefined;
  // 依赖项链表尾节点
  depsTail: Link | undefined;
  // 是否处于依赖追踪阶段，用于避免重复传播。
  tracking: boolean = false;

  dirty: boolean = false;

  constructor(public fn: Function) {}

  run() {
    if (!this.active) {
      // 如果这个 effect 已经停止了，那么直接执行函数并返回结果；
      // 防止在 stop 之后，再次执行又重新收集依赖；
      return this.fn();
    }

    // 嵌套 effect：先保存外层 activeSub，再把当前实例设为栈顶，run 结束后再恢复。
    const prevSub = activeSub;
    setActiveSub(this);
    startTrack(this);

    try {
      return this.fn();
    } finally {
      endTrack(this);
      setActiveSub(prevSub);
    }
  }

  /**
   * 依赖变更后的入口：由 `propagate` 等路径调用，最终走到 `scheduler`（默认即再次 `run`）。
   */
  notify() {
    this.scheduler();
  }

  /**
   * 调度一次执行：默认实现为 `run()`；构造时若合并了自定义 `scheduler`，则由此处间接调用。
   */
  scheduler() {
    this.run();
  }

  stop() {
    if (this.active) {
      // 不执行 fn，仅走一轮 startTrack/endTrack，清掉多余依赖边。
      startTrack(this);
      endTrack(this);
      this.active = false;
    }
  }
}

/**
 * 注册副作用：首次 `run` 收集依赖；依赖更新时由调度路径再次执行。
 *
 * @returns `runner`：`runner()` 等价于再次执行副作用；`runner.effect` 为底层 `ReactiveEffect`（可 `stop`）。
 */
export const effect = (fn: Function, options?: ReactiveEffectOptions) => {
  const e = new ReactiveEffect(fn);
  Object.assign(e, options);
  e.run();
  const runner = e.run.bind(e);
  /** 便于外部访问 `ReactiveEffect` 实例（如 `stop`） */
  runner.effect = e;

  return runner;
};
