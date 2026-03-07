/**
 * 判断值是否为非 null 的对象。
 */
export const isObject = (val: unknown): boolean => {
  return val !== null && typeof val === 'object';
};

/**
 * 判断两个值是否发生变化，使用 `Object.is` 的语义（包括对 NaN 的处理）。
 */
export const hasChanged = (value: any, oldValue: any): boolean => !Object.is(value, oldValue);

/**
 * 判断值是否为函数类型。
 */
export const isFunction = (val: unknown): val is Function => typeof val === 'function';

/**
 * 判断一个 prop key 是否是事件监听（形如 onClick / onChange）。
 */
export const isOn = (key: string): boolean => /^on[A-Z]/.test(key);

/**
 * 判断值是否为数组。
 */
export const isArray = (val: unknown): boolean => Array.isArray(val);

/**
 * 判断值是否为字符串。
 */
export const isString = (val: unknown): boolean => typeof val === 'string';

/**
 * 判断值是否为数字。
 */
export const isNumber = (val: unknown): boolean => typeof val === 'number';