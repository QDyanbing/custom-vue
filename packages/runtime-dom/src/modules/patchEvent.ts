function createInvoker(fn: Function) {
  const invoker = (e: Event) => {
    invoker.value(e);
  };

  invoker.value = fn;

  return invoker;
}

const veiKey = Symbol('_vei');

export function patchEvent(el: HTMLElement, key: string, prevValue: any, nextValue: any) {
  const name = key.slice(2).toLowerCase();
  const invokers = ((el as any)[veiKey] ??= {});
  const existingInvoker = invokers[key];

  if (nextValue) {
    if (existingInvoker) {
      existingInvoker.value = nextValue;
      return;
    }

    const invoker = createInvoker(nextValue);
    invokers[key] = invoker;

    el.addEventListener(name, invoker);
  } else {
    if (existingInvoker) {
      el.removeEventListener(name, existingInvoker);
      invokers[key] = undefined;
    }
  }
}
