/**
 * 编译期登记的运行时 helper：以 Symbol 作为内部标识，再映射到运行时导出名。
 * 现在既有插值用的 `TO_DISPLAY_STRING`，也有文本包装用的 `CREATE_TEXT`。
 */
export const TO_DISPLAY_STRING = Symbol('toDisplayString');

// 用于后续生成 `createText(...)` 调用。
export const CREATE_TEXT = Symbol('createText');

// 元素节点 codegen 使用的 vnode 创建 helper，与 `transformElement` 中 `createVNodeCall` 的 callee 对应。
export const CREATE_VNODE = Symbol('createElementVNode');

export const helperMap = {
  [TO_DISPLAY_STRING]: 'toDisplayString',
  [CREATE_TEXT]: 'createText',
  [CREATE_VNODE]: 'createElementVNode',
};
