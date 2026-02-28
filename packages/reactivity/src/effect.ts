import { startTrack, endTrack } from './system';
import type { Link, Sub } from './system';

// @TODO：这里的类型有点麻烦暂时没改
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

// 当前正在执行的 effect（用于依赖收集）
export let activeSub = null;

export function setActiveSub(sub: any) {
  activeSub = sub;
}

// effect 实现类
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

    /**
     * 先将当前的 effect 保存起来，用来处理嵌套的逻辑;
     * effect(()=>{
     *  effect(()=>{
     *    console.log('effect2');
     *  });
     *  console.log('effect1');
     * });
     *
     */
    const prevSub = activeSub;
    // 将当前的 effect 设置为活跃的 effect
    setActiveSub(this);

    // 开始追踪依赖
    startTrack(this);

    try {
      return this.fn();
    } finally {
      // 结束本轮依赖追踪
      endTrack(this);

      // 执行完成后，恢复之前的 effect，这样就可以处理嵌套的逻辑了
      setActiveSub(prevSub);
    }
  }

  /**
   * 通知更新的方法，如果依赖的数据发生了变化，会调用这个函数
   */
  notify() {
    this.scheduler();
  }

  /**
   * 默认调度逻辑：直接执行 run。
   * 若用户传入 scheduler，会以实例上的 scheduler 为准。
   */
  scheduler() {
    this.run();
  }

  stop() {
    if (this.active) {
      // 直接开始追踪依赖，不执行run直接结束追踪依赖；就会把依赖关系清理掉；
      startTrack(this);
      endTrack(this);
      this.active = false;
    }
  }
}

export const effect = (fn: Function, options?: ReactiveEffectOptions) => {
  const e = new ReactiveEffect(fn);
  Object.assign(e, options);
  e.run();
  /**
   * 绑定函数的 this
   */
  const runner = e.run.bind(e);
  /**
   * 把 effect 的实例，放到函数属性中
   */
  runner.effect = e;

  return runner;
};
