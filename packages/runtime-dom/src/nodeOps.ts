/**
 * DOM 平台下的宿主节点操作集合。
 *
 * @remarks
 * 这些方法会被运行时在挂载、更新、卸载过程中调用。
 * 调用方需保证节点类型正确，这里保持轻量封装。
 */
export const nodeOps = {
  /**
   * 将 `el` 插入到 `parent` 下，默认插入到末尾。
   */
  insert(el: Node, parent: Node, anchor: Node | null = null) {
    parent.insertBefore(el, anchor);
  },

  /**
   * 创建指定标签名的元素节点。
   */
  createElement(type: string) {
    return document.createElement(type);
  },

  /**
   * 从父节点中移除 `el`。
   */
  remove(el: ChildNode) {
    const parent = el.parentNode;
    if (parent) {
      parent.removeChild(el);
    }
  },

  /**
   * 设置元素的文本内容（等价于写 `textContent`）。
   */
  setElementText(el: Element, text: string) {
    el.textContent = text;
  },

  /**
   * 创建一个文本节点。
   */
  createText(text: string) {
    return document.createTextNode(text);
  },

  /**
   * 更新文本节点的内容（写入 `nodeValue`）。
   */
  setText(node: Text, text: string) {
    node.nodeValue = text;
  },

  /**
   * 获取父节点。
   */
  parentNode(node: Node) {
    return node.parentNode;
  },

  /**
   * 获取 `node` 的下一个兄弟节点。
   */
  nextSibling(node: Node) {
    return node.nextSibling;
  },

  /**
   * 在当前文档上执行选择器查询。
   *
   * @param selector CSS 选择器字符串
   */
  querySelector(selector: string) {
    return document.querySelector(selector);
  },
};
