import { ref } from '@vue/reactivity';
import { h } from './h';
import { isFunction } from '@vue/shared';

/**
 * 异步组件的最小实现。
 *
 * 支持两种调用方式：
 * 1. `defineAsyncComponent(() => import('./Comp'))`
 * 2. `defineAsyncComponent({ loader, loadingComponent, errorComponent, timeout })`
 */
export function defineAsyncComponent(options: any) {
  if (isFunction(options)) {
    // 如果传入的是函数，则认为是一个异步组件的加载函数，需要包装成对象
    options = { loader: options };
  }

  // 默认占位组件：在未提供 loading/error 组件时，保持渲染结果为空占位。
  const defaultComponent = () => h('span', null, '');

  const {
    loader,
    loadingComponent = defaultComponent,
    errorComponent = defaultComponent,
    timeout = 0,
  } = options;

  return {
    setup(props, { attrs, slots }) {
      // 初始先渲染 loadingComponent；成功或失败后再切换为真实组件 / errorComponent。
      const component = ref(loadingComponent);

      function loadComponent() {
        return new Promise((resolve, reject) => {
          if (timeout && timeout > 0) {
            // 超时后直接走失败分支；当前实现不做取消，后续 loader 返回时结果会被忽略。
            setTimeout(() => {
              reject(new Error('timeout'));
            }, timeout);
          }

          // 如果请求回来了，则调用 resolve 否则调用 reject
          loader().then(resolve, reject);
        });
      }

      loadComponent().then(
        comp => {
          if (comp && comp[Symbol.toStringTag] === 'Module') {
            // 兼容 `import('./Comp')` 返回的 ESM 模块对象，真正的组件在 default 上。
            // @ts-ignore
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
        // 透传调用异步组件时传入的 props / attrs / slots，保证加载后的组件拿到完整输入。
        return h(component.value, { ...attrs, ...props }, slots);
      };
    },
  };
}
