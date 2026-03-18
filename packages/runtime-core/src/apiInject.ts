import { getCurrentInstance } from './component';

export const provide = (key: string, value: any) => {
  // 首次调用的时候，instance.provides 就是 parent.provides
  const instance = getCurrentInstance();
  // 父组件的 provides
  const parentProvides = instance.parent ? instance.parent?.provides : instance.appContext.provides;
  // 自己的 provides
  let provides = instance.provides;

  if (parentProvides === provides) {
    // 在此之前，我是没打算给后代组件留有遗产的，我自己的钱都花光了；
    // 但是中了彩票，这时候就有点零花钱了，要不就留给后端一点吧；
    instance.provides = Object.create(parentProvides);
    provides = instance.provides;
  }

  // 设置属性到当前组件的provides中
  provides[key] = value;
};

export const inject = (key: string, defaultValue: any) => {
  const instance = getCurrentInstance();
  // 获取父组件的provides,如果父组件没有证明是根组件
  const parentProvides = instance.parent ? instance.parent?.provides : instance.appContext.provides;

  if (parentProvides && key in parentProvides) {
    // 如果父组件有则返回父组件的值
    return parentProvides[key];
  }

  return defaultValue;
};
