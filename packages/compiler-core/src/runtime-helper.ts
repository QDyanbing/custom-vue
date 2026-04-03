/**
 * 编译期登记的运行时 helper：`TO_DISPLAY_STRING` 为内部 Symbol，`helperMap` 映射到运行时导出名。
 */
export const TO_DISPLAY_STRING = Symbol('toDisplayString');

export const CREATE_TEXT = Symbol('createText');

export const helperMap = {
  [TO_DISPLAY_STRING]: 'toDisplayString',
  [CREATE_TEXT]: 'createText',
};
