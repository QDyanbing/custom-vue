import { h } from '@vue/runtime-core';

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
  } = props;

  return {
    beforeEnter(el: HTMLElement) {
      el.classList.add(enterFromClass);
      el.classList.add(enterActiveClass);
      onBeforeEnter?.(el);
    },
    enter(el: HTMLElement) {
      const done = () => {
        // 动画结束了，移除 enterToClass 和 enterActiveClass
        el.classList.remove(enterToClass);
        el.classList.remove(enterActiveClass);
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
      el.classList.add(leaveFromClass);

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
  props: ['beforeEnter', 'enter', 'leave'],
  setup(props: any, { slots }: any) {
    return () => {
      const vnode = slots.default();
      if (!vnode) return;

      vnode.transition = props;

      return vnode;
    };
  },
};
