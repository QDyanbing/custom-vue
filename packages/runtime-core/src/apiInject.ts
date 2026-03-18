import { getCurrentInstance } from './component';

export const provide = (key: string, value: any) => {
  const instance = getCurrentInstance();
  const { provides } = instance;
  // 设置属性到当前组件的provides中
  provides[key] = value;
};

export const inject = (key: string, defaultValue: any) => {
  const instance = getCurrentInstance();
  // 获取父组件的provides
  const parentProvides = instance.parent?.provides;

  if (parentProvides && key in parentProvides) {
    // 如果父组件有则返回父组件的值
    return parentProvides[key];
  }

  return defaultValue;
};
