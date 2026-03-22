import { h } from '@vue/runtime-core';

const BaseTransition: any = {
  props: ['name', 'onEnter', 'onLeave', 'onBeforeEnter'],
  setup(props: any, { slots }: any) {
    return () => {
      return slots.default?.();
    };
  },
};

export function Transition(props: any, { slots }: any) {
  return h(BaseTransition, props, slots);
}
