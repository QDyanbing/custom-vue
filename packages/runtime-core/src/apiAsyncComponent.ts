import { ref } from '@vue/reactivity';
import { h } from './h';
import { isFunction } from '@vue/shared';

export function defineAsyncComponent(options: any) {
  if (isFunction(options)) {
    // 如果传入的是函数，则认为是一个异步组件的加载函数，需要包装成对象
    options = { loader: options };
  }

  const defaultComponent = () => h('span', null, '');

  const {
    loader,
    loadingComponent = defaultComponent,
    errorComponent = defaultComponent,
  } = options;

  return {
    setup() {
      const component = ref(loadingComponent);

      loader().then(
        comp => {
          if (comp && comp[Symbol.toStringTag] === 'Module') {
            comp = comp.default;
          }

          // 组件加载完成，更新组件
          component.value = comp;
        },
        error => {
          component.value = errorComponent;
        },
      );

      return () => {
        return h(component.value);
      };
    },
  };
}
