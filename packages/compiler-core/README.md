# 编译时

## 什么是运行时？

代码在浏览器运行的时候，就是运行时

## 什么是编译时？

将模板编译成 js 的过程，就是编译时

```vue
<div id="1">{{ msg }}</div>
```

把上面这一坨当做一个字符串来解析，解析成 js 文件，这个过程叫做编译时

1. 把 .vue 文件的内容当做一个字符串，转换成 ast 语法树（ast语法树只是用来描述语法的），它是一个对象
2. 把 ast 语法树，转换成我们运行时的代码 `createElementBlock`、`createElementVNode`、`createVNode`

- babel、eslint 都是基于 ast 语法树

```js
const ast = {
  type: 1, // 对应的标记就是1
  tag: 'div',
  attrs: [
    {
      type: 3, // 属性
      name: 'id',
      content: '1',
    },
  ],
  children: [
    {
      type: 2, // 表达式
      content: 'setupState.msg',
    },
  ],
};

// 把上面的 ast 语法树转换成 我们的运行时的代码
const vnode = createElementBlock('div', { id: '1' }, ['111']);
```

https://astexplorer.net/ 可以看到 ast 语法树解析出来的结果

编译时是在构建工具里面使用的

下面的内容是源码中处理编译时的一些枚举声明，我们先拿过来

- ast.ts

```ts
export enum NodeTypes {
  // 根节点
  ROOT,
  // 元素节点
  ELEMENT,
  // 文本节点
  TEXT,
  // 注释节点
  COMMENT,
  // 简单表达式节点
  SIMPLE_EXPRESSION,
  // 插值节点，例如 {{ value }}
  INTERPOLATION,
  // 属性节点
  ATTRIBUTE,
  // 指令节点，例如 v-if、v-for 等
  DIRECTIVE,
  // 容器节点
  // 复合表达式节点，包含多个子表达式
  COMPOUND_EXPRESSION,
  // if 条件节点
  IF,
  // if 分支节点
  IF_BRANCH,
  // for 循环节点
  FOR,
  // 文本调用节点
  TEXT_CALL,
  // 代码生成相关节点
  // 虚拟节点调用
  VNODE_CALL,
  // 函数调用表达式
  JS_CALL_EXPRESSION,
  // 对象表达式
  JS_OBJECT_EXPRESSION,
  // 对象属性
  JS_PROPERTY,
  // 数组表达式
  JS_ARRAY_EXPRESSION,
  // 函数表达式
  JS_FUNCTION_EXPRESSION,
  // 条件表达式
  JS_CONDITIONAL_EXPRESSION,
  // 缓存表达式
  JS_CACHE_EXPRESSION,
}
```

- 解析器状态

```ts
export enum State {
  /** 普通文本状态，处理标签和插值表达式之外的内容 */
  Text = 1,

  /** 插值表达式相关状态 */
  InterpolationOpen, // 开始解析插值表达式 {{
  Interpolation, // 解析插值表达式内容
  InterpolationClose, // 结束解析插值表达式 }}

  /** HTML标签相关状态 */
  BeforeTagName, // 遇到<后的状态，准备解析标签名
  InTagName, // 正在解析标签名
  InSelfClosingTag, // 处理自闭合标签 />
  BeforeClosingTagName, // 处理结束标签的开始 </
  InClosingTagName, // 解析结束标签的标签名
  AfterClosingTagName, // 结束标签名后的状态

  /** 属性和指令相关状态 */
  BeforeAttrName, // 准备解析属性名
  InAttrName, // 解析普通属性名
  InDirName, // 解析指令名（v-if, v-for等）
  InDirArg, // 解析指令参数（v-bind:arg）
  InDirDynamicArg, // 解析动态指令参数（v-bind:[arg]）
  InDirModifier, // 解析指令修饰符（v-on:click.prevent）
  AfterAttrName, // 属性名后的状态
  BeforeAttrValue, // 准备解析属性值
  InAttrValueDq, // 双引号属性值 "value"
  InAttrValueSq, // 单引号属性值 'value'
  InAttrValueNq, // 无引号属性值 value

  /** 声明相关状态 */
  BeforeDeclaration, // <!开始的声明
  InDeclaration, // 解析声明内容

  /** 处理指令相关状态 */
  InProcessingInstruction, // 处理XML处理指令 <?xml ?>

  /** 注释和CDATA相关状态 */
  BeforeComment, // 准备解析注释
  CDATASequence, // 解析CDATA序列
  InSpecialComment, // 特殊注释处理
  InCommentLike, // 类注释内容处理

  /** 特殊标签处理状态 */
  BeforeSpecialS, // 处理<script>或<style>
  BeforeSpecialT, // 处理<title>或<textarea>
  SpecialStartSequence, // 特殊标签的开始序列
  InRCDATA, // 处理RCDATA内容（script/style/textarea等）

  /** 实体解析状态 */
  InEntity, // 解析HTML实体（如&amp;）

  /** SFC相关状态 */
  InSFCRootTagName, // 解析单文件组件根标签名
}
```

```js
const root = {
  type: 0,
  children: [
    {
      div,
      children: [{ span, children: [hello] }],
    },
  ],
};
```

stack = []

<div><span>hello</span></div>

## 当前实现（与本包源码同步）

- **词法**：`src/tokenize.ts` 中 `Tokenizer` + `State` 状态机已搭好枚举与类结构；主循环里目前仅处理收尾时的纯文本，通过 `cleanup` → `onText` 输出区间。
- **语法**：`src/parser.ts` 的 `parse` 创建 `ROOT`，将 `onText` 转成 `NodeTypes.TEXT` 子节点，并带上 `loc`（`getPos` 行列信息为简化版）。
- **类型**：`src/ast.ts` 的 `NodeTypes` 与官方对齐，便于后续扩展；当前实际用到 `ROOT`、`TEXT`。
- **入口**：`src/index.ts` 导出 `parse`。

更细的模块说明见 `src` 目录下同名的 `*.md`（`ast.md`、`parser.md`、`tokenize.md`、`index.md`）。浏览器示例见 `examples/01-demo.html` 与 `examples/01-demo.md`。
