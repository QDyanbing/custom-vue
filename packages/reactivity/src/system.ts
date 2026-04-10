/**
 * 可被订阅的依赖方（如 `RefImpl`、reactive 的 `Dep`、`ComputedRefImpl`）。
 * `subs` / `subsTail` 指向「依赖本节点的 effect / computed」链表。
 */
export interface Dependency {
  /** 订阅者链表头 */
  subs: Link | undefined;
  /** 订阅者链表尾，用于 O(1) 追加 */
  subsTail: Link | undefined;
}

/**
 * 订阅者：在 `run` 期间通过 `link` 挂上所读到的 `Dependency`。
 * `deps` / `depsTail` 表示「本订阅者当前追踪到的依赖」链表。
 */
export interface Sub {
  /** 依赖项链表头（本次追踪路径上的 dep 节点） */
  deps: Link | undefined;
  /** 依赖项链表尾 */
  depsTail: Link | undefined;
  /** 是否处于 `startTrack`～`endTrack` 包裹的追踪区间 */
  tracking: boolean;
  /** 传播阶段用于跳过已处理边或标记需重算（与 `propagate` 配合） */
  dirty: boolean;
}

/**
 * 双向链表边：同时挂在某个 `Dependency.subs*` 与某个 `Sub.deps*` 上。
 * `nextDep` / `prevSub` 等指针含义见 `link`、`propagate` 内注释。
 */
export interface Link {
  sub: Sub;
  /** 同一 dep 上的下一订阅者边 */
  nextSub: Link | undefined;
  /** 同一 dep 上的上一订阅者边 */
  prevSub: Link | undefined;
  dep: Dependency;
  /** 同一 sub 上的下一依赖边 */
  nextDep: Link | undefined;
}

/** 从 `clearTracking` 回收的 `Link` 节点池，降低反复分配开销 */
let linkPool: Link;

/**
 * 在 `dep`（被读到的依赖）与 `sub`（当前订阅者）之间挂一条双向边。
 * 若本轮追踪路径上已存在同 dep 的边，则只移动 `depsTail` 指针复用，不新建节点。
 */
export function link(dep: Dependency, sub: Sub) {
  const currentDep = sub.depsTail;
  const nextDep = currentDep === undefined ? sub.deps : currentDep.nextDep;
  if (nextDep && nextDep.dep === dep) {
    sub.depsTail = nextDep;
    return;
  }

  /**
   * 未命中复用分支时新建边。上游 Vue 更偏「时间换空间」的路径判断；本实现偏「空间换时间」
   *（多分配、靠 `endTrack` 收敛）。语义目标一致，不必强行对齐 upstream 写法。
   */

  let newLink: Link;
  if (linkPool) {
    newLink = linkPool;
    linkPool = linkPool.nextDep;
    newLink.nextDep = nextDep;
    newLink.dep = dep;
    newLink.sub = sub;
  } else {
    newLink = {
      sub,
      dep,
      nextDep,
      nextSub: undefined,
      prevSub: undefined,
    };
  }

  /** 挂到 dep 侧：subs 链表（谁订阅了这个 dep） */
  if (dep.subsTail) {
    dep.subsTail.nextSub = newLink;
    newLink.prevSub = dep.subsTail;
    dep.subsTail = newLink;
  } else {
    dep.subs = newLink;
    dep.subsTail = newLink;
  }

  /** 挂到 sub 侧：deps 链表（这个 sub 追踪到哪些 dep） */
  if (sub.depsTail) {
    sub.depsTail.nextDep = newLink;
    sub.depsTail = newLink;
  } else {
    sub.deps = newLink;
    sub.depsTail = newLink;
  }
}

function processComputedUpdate(sub: any) {
  if (sub.subs && sub.update()) {
    propagate(sub.subs);
  }
}

/**
 * 从某条 dep 的订阅者链头开始，向下游标记脏并调度 effect / 嵌套 computed。
 */
export function propagate(subs: Link) {
  let link = subs;
  let queuedEffect = [];
  while (link) {
    const sub = link.sub;
    if (!sub.tracking && !sub.dirty) {
      /** 与上游在「脏标记 + 队列」上可有取舍；此处用 `dirty` 避免同一轮重复入队。 */
      sub.dirty = true;
      if ('update' in sub) {
        processComputedUpdate(sub);
      } else {
        queuedEffect.push(sub);
      }
    }
    link = link.nextSub;
  }

  queuedEffect.forEach(effect => effect.notify());
}

/**
 * 开始新一轮依赖追踪：置 `tracking`，并把 `depsTail` 清空，便于与上一轮保留的 `deps` 前缀对齐复用。
 */
export function startTrack(sub: Sub) {
  sub.tracking = true;
  sub.depsTail = undefined;
}

/**
 * 结束追踪：截断本轮未再访问到的依赖尾链，并 `clearTracking` 回收边。
 */
export function endTrack(sub: Sub) {
  sub.tracking = false;
  const depsTail = sub.depsTail;
  sub.dirty = false;

  if (depsTail) {
    if (depsTail.nextDep) {
      clearTracking(depsTail.nextDep);
      depsTail.nextDep = undefined;
    }
  } else if (sub.deps) {
    clearTracking(sub.deps);
    sub.deps = undefined;
  }
}

/** 从 `link` 起沿 `nextDep` 断开 dep/sub 双侧指针，并把节点放回 `linkPool`。 */
function clearTracking(link: Link) {
  while (link) {
    const { prevSub, nextSub, nextDep, dep } = link;

    if (prevSub) {
      prevSub.nextSub = nextSub;
      link.nextSub = undefined;
    } else {
      dep.subs = nextSub;
    }

    if (nextSub) {
      nextSub.prevSub = prevSub;
      link.prevSub = undefined;
    } else {
      dep.subsTail = prevSub;
    }

    link.dep = undefined;
    link.sub = undefined;

    link.nextDep = linkPool;
    linkPool = link;

    link = nextDep;
  }
}
