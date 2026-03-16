import { getCurrentInstance } from './component';
import { ref } from '@vue/reactivity';

/**
 * 在组合式 API 中使用的模板引用工具。
 *
 * 调用方式：
 * ```ts
 * const elRef = useTemplateRef('elRef');
 * // 模板 / VNode 上写 ref: 'elRef'，elRef.value 会在挂载后指向对应 DOM
 * h('div', { ref: 'elRef' });
 * ```
 *
 * 实现思路：
 * - 通过 `getCurrentInstance()` 取得当前组件实例，从中拿到 `instance.refs`
 * - 创建一个内部的 `ref(null)`，作为真正暴露给用户的响应式引用
 * - 在 `instance.refs` 上通过 `Object.defineProperty` 定义同名属性：
 *   - getter 返回 `elRef.value`
 *   - setter 把新值写回 `elRef.value`
 *
 * 这样渲染器在处理字符串 ref（`ref: 'elRef'`）时，仍然只和 `instance.refs.elRef` 交互；
 * 对用户而言拿到的是一个普通的响应式 `ref`，可以在组合式逻辑中直接使用。
 *
 * @param key 模板中使用的字符串 ref 名称，如 `'elRef'`
 * @returns 一个 `Ref<HTMLElement | ComponentPublicInstance | null>`，在挂载后指向真实 DOM 或子组件暴露的实例
 */
export function useTemplateRef(key) {
  const vm = getCurrentInstance();
  const { refs } = vm;
  const elRef = ref(null);

  Object.defineProperty(refs, key, {
    get() {
      return elRef.value;
    },
    set(value) {
      elRef.value = value;
    },
  });
  return elRef;
}
