import { getCurrentInstance } from './component';
import { ref } from '@vue/reactivity';

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
