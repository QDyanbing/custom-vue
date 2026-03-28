/**
 * 模板词法分析的状态枚举；与 Vue compiler-core  tokenizer 的分状态命名一致，
 * 后续在 `switch (state)` 中逐步补全各分支，目前仅 `Text` 与 `cleanup` 参与产出 token。
 */
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

export class Tokenizer {
  // 状态机的状态
  state: State = State.Text;
  // 当前索引
  index: number = 0;
  // 当前状态切换的初始位置
  sectionStart: number = 0;
  // 用来保存当前正在解析的字符串
  buffer: string = '';

  /** `cbs` 与 Vue tokenizer 类似，例如 `onText(start, end)` 表示一段文本的字节区间。 */
  constructor(public cbs) {}

  parse(input: string) {
    this.buffer = input;

    while (this.index < this.buffer.length) {
      const str = this.buffer[this.index];

      switch (this.state) {
        case State.Text: {
          break;
        }
      }

      this.index++;
    }

    this.cleanup();
  }

  cleanup() {
    if (this.sectionStart < this.index) {
      // 还有没解析完的字符串

      if (this.state === State.Text) {
        // 普通文本
        this.cbs.onText(this.sectionStart, this.index);
      }
    }
  }

  getPos(index: number) {
    return {
      line: index + 1,
      column: 1, // 暂时不考虑多行文本
      offset: index, // 偏移量
    };
  }
}
