import { ref } from '@vue/reactivity';
import { h } from './h';

export function defineAsyncComponent(loader) {
  return {
    setup() {
      const component = ref(() => {
        return h('span', null, '');
      });

      loader().then(comp => {
        // 组件加载完成，更新组件
        component.value = comp;
      });

      return () => {
        return h(component.value);
      };
    },
  };
}
