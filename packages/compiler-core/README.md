# compiler-core 说明

## 运行时与编译时（概念）

- **运行时**：代码在浏览器（或 Node）里实际执行的阶段。
- **编译时**：把模板字符串解析成 AST，再经 transform、codegen 得到可执行的 `render`（或其它产物）的阶段；通常在构建工具里完成。

```vue
<div id="1">{{ msg }}</div>
```

把上面这段模板当作普通字符串读入，再解析成可执行的 `render` 输出，这一过程属于**编译时**。

1. 将模板（或 `.vue` 中的模板段）作为字符串，解析为 **AST**（抽象语法树，用对象描述结构）。
2. 将 AST 经变换与代码生成，得到运行时调用的代码（如 `createElementBlock`、`createElementVNode`、`createVNode`）。

Babel、ESLint 等工具同样以 AST 为中间表示。

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

可在 [astexplorer.net](https://astexplorer.net/) 查看解析结果。编译时通常发生在构建工具或在线 playground 中。

下文摘录本仓库 `ast.ts` 中与编译相关的枚举，便于与源码对照阅读。

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
// 示意：解析后得到嵌套对象描述的树结构（非本仓库 parser 的真实输出）
const root = {
  type: 0,
  children: [
    {
      /* ... */
    },
  ],
};
```

解析嵌套标签（如 `<div><span>hello</span></div>`）时，常用栈维护当前打开的节点，具体见 `parser.ts` 与 `parser.md`。

## 当前实现（与本包源码同步）

- **词法**：`src/tokenize.ts` 中 `Tokenizer` 在 `Text`、`BeforeTagName`、`InTagName`、`BeforeAttrName`、`InClosingTagName`、`InAttrName`、`AfterAttrName`、`InAttrValueDq`、`Interpolation` 等状态间切换；产出 `onText`、`onOpenTagName`、`onOpenTagEnd`、`onCloseTag`、`onAttrName`、`onAttrValue`、`onInterpolation` 等区间回调，末尾 `cleanup` 仍处理尾部纯文本。
- **语法**：`src/parser.ts` 的 `parse` 在每次调用时 `reset` 模块状态，创建 `ROOT`，用栈嵌套子节点，将回调转为 `TEXT` / `INTERPOLATION`（内层 `SIMPLE_EXPRESSION`）/ `ELEMENT`（含双引号属性）与 `loc`（`getPos` 行列信息为简化版）；闭合元素与根节点的 `children` 均会经 `condenseWhitespace` 收敛首尾纯空白。
- **类型**：`src/ast.ts` 的 `NodeTypes` 与官方对齐；变换阶段还会用到 `COMPOUND_EXPRESSION`、`TEXT_CALL`、`VNODE_CALL`、`JS_CALL_EXPRESSION`、`JS_OBJECT_EXPRESSION`、`JS_PROPERTY` 等。
- **入口**：`src/index.ts` 导出 `parse`、`compile`。
- **变换**：`src/transform.ts` 在 `parse` 之后遍历 AST：`nodeTransforms` 依次为 `transformElement`、`transformText`、`transformExpression`；根上 `createRootCodegenNode` 决定 `codegenNode`；`src/runtime-helper.ts` 提供 Symbol 与 `helperMap`。
- **代码生成**：`src/compile.ts` 在 `transform` 后调用 `src/codegen.ts` 的 `generate`，把根 `codegenNode` 与收集的 helpers 拼成 `render` 函数字符串。
- **对照**：并列参考 `vue3-main` 中词法文件名为 `tokenizer.ts`，本仓库为 `tokenize.ts`，职责相同。

更细的模块说明见 `src` 目录下同名的 `*.md`（`ast.md`、`parser.md`、`tokenize.md`、`compile.md`、`transform.md`、`codegen.md`、`runtime-helper.md`、`index.md`），以及 `src/transforms/` 下 `transformElement.md`、`transformText.md`、`transformExpression.md`。浏览器示例见 `examples/01-demo.html`～`09-demo.html` 及同目录下对应 `*.md`。
