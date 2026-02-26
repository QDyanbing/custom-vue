export const nodeOps = {
  // 插入节点
  insert(el, parent, anchor) {
    parent.insertBefore(el, anchor || null);
  },
  // 创建元素
  createElement(type) {
    return document.createElement(type);
  },
  // 移除节点
  remove(el) {
    const parent = el.parentNode;
    if (parent) {
      parent.removeChild(el);
    }
  },
  // 设置节点文本
  setElementText(el, text) {
    el.textContent = text;
  },
  // 创建文本节点
  createText(text) {
    return document.createTextNode(text);
  },
  // 设置nodeValue
  setText(el, text) {
    return (el.nodeValue = text);
  },
  // 获取父节点
  parentNode(el) {
    return el.parentNode;
  },
  // 获取下一个兄弟节点
  nextSibling(el) {
    return el.nextSibling;
  },
  // 获取指定选择器的节点
  querySelector(selector) {
    return document.querySelector(selector);
  },
};
