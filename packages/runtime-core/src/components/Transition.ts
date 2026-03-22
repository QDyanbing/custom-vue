/**
 * `<Transition>` 最小实现：`resolveTransitionProps` 产出 beforeEnter / enter / leave，
 * `BaseTransition` 把它们挂到默认插槽返回的**单个**子 VNode 的 `vnode.transition` 上，
 * 供 `renderer` 在 `mountElement`、`unmount` 里调用（class 切换 + 可选 JS 钩子）。
 */
import { getCurrentInstance, h } from '@vue/runtime-core';

function resolveTransitionProps(props: any) {
  const {
    name = 'v',
    enterFromClass = `${name}-enter-from`,
    enterActiveClass = `${name}-enter-active`,
    enterToClass = `${name}-enter-to`,
    leaveFromClass = `${name}-leave-from`,
    leaveActiveClass = `${name}-leave-active`,
    leaveToClass = `${name}-leave-to`,
    onEnter,
    onLeave,
    onBeforeEnter,
    ...rest
  } = props;

  return {
    ...rest,
    beforeEnter(el: HTMLElement) {
      el.classList.add(enterFromClass);
      el.classList.add(enterActiveClass);
      onBeforeEnter?.(el);
    },
    enter(el: HTMLElement) {
      const done = () => {
        // 动画结束了，移除 enterActiveClass 和 enterToClass
        el.classList.remove(enterActiveClass);
        el.classList.remove(enterToClass);
      };

      requestAnimationFrame(() => {
        el.classList.remove(enterFromClass);
        el.classList.add(enterToClass);
      });

      onEnter?.(el, done);

      if (!onEnter || onEnter.length < 2) {
        el.addEventListener('transitionend', done);
      }
    },
    leave(el: HTMLElement, remove: () => void) {
      const done = () => {
        // 动画结束了，移除 leaveToClass 和 leaveActiveClass
        el.classList.remove(leaveActiveClass);
        el.classList.remove(leaveToClass);
        remove();
      };

      el.classList.add(leaveActiveClass);
      el.classList.add(leaveToClass);

      requestAnimationFrame(() => {
        el.classList.remove(leaveFromClass);
        el.classList.add(enterToClass);
      });

      onLeave?.(el, done);

      if (!onLeave || onLeave.length < 2) {
        el.addEventListener('transitionend', done);
      }
    },
  };
}

export function Transition(props: any, { slots }: any) {
  return h(BaseTransition, resolveTransitionProps(props), slots);
}

const BaseTransition: any = {
  props: ['beforeEnter', 'enter', 'leave', 'appear'],
  setup(props: any, { slots }: any) {
    const vm = getCurrentInstance();

    return () => {
      const vnode = slots.default();
      if (!vnode) return;

      if (props.appear || vm.isMounted) {
        vnode.transition = props;
      } else {
        vnode.transition = {
          leave: props.leave,
        };
      }

      return vnode;
    };
  },
};
