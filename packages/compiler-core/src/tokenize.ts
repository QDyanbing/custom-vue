/**
 * 模板词法分析的状态枚举；与 Vue compiler-core tokenizer 的分状态命名一致。
 * `Tokenizer.parse` 的 `switch` 已接入文本、插值（`Interpolation`）、开始/结束标签名、双引号属性值等；其余枚举留待与官方行为对齐时补全。
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

function isTagStart(str: string) {
  return /[a-zA-Z]/.test(str);
}

export function isWhiteSpace(str: string) {
  return str === ' ' || str === '\t' || str === '\n' || str === '\r';
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
          // 解析文本
          this.stateText(str);
          break;
        }
        case State.BeforeTagName: {
          // 解析标签名之前
          this.stateBeforeTagName(str);
          break;
        }
        case State.InTagName: {
          // 解析标签名
          this.stateInTagName(str);
          break;
        }
        case State.BeforeAttrName: {
          // 解析属性名之前
          this.stateBeforeAttrName(str);
          break;
        }
        case State.InClosingTagName: {
          // 解析结束标签
          this.stateInClosingTagName(str);
          break;
        }
        case State.InAttrName: {
          // 解析属性名
          this.stateInAttrName(str);
          break;
        }
        case State.AfterAttrName: {
          // 解析属性值
          this.stateAfterAttrName(str);
          break;
        }
        case State.InAttrValueDq: {
          // 解析双引号属性值
          this.stateInAttrValueDq(str);
          break;
        }
        case State.Interpolation: {
          // 解析插值表达式
          this.stateInterpolation(str);
          break;
        }
      }

      this.index++;
    }

    this.cleanup();
  }

  /** 在 `{{` 与 `}}` 之间扫描；遇 `}}` 时提交整段区间（含双花括号）并交给 `onInterpolation`。 */
  private stateInterpolation(str: string) {
    if (str === '}') {
      // 可能是插值表达式结束
      if (this.buffer[this.index + 1] === '}') {
        // 确实是插值表达式结束
        this.index++;
        this.cbs.onInterpolation(this.sectionStart, this.index + 1);
        this.state = State.Text;
        this.sectionStart = this.index + 1;
      }
    }
  }

  private stateInClosingTagName(str: string) {
    if (str === '>') {
      // 结束标签解析完了
      this.cbs.onCloseTag(this.sectionStart, this.index);
      this.sectionStart = this.index + 1;
      // 继续解析文本
      this.state = State.Text;
    }
  }

  private stateBeforeAttrName(str: string) {
    if (str === '>') {
      // 开始标签解析完了
      this.cbs.onOpenTagEnd();
      this.sectionStart = this.index + 1;
      // 继续解析文本
      this.state = State.Text;
    } else if (!isWhiteSpace(str)) {
      // 开始解析属性名
      this.state = State.InAttrName;
      this.sectionStart = this.index;
    }
  }

  private stateInAttrName(str: string) {
    if (str === '=') {
      // 属性名等于号，属性名结束了
      this.cbs.onAttrName(this.sectionStart, this.index);
      // 继续解析属性值
      this.state = State.AfterAttrName;
    }
  }

  private stateAfterAttrName(str: string) {
    if (str === '"') {
      // 开始解析属性值了
      this.state = State.InAttrValueDq;
      this.sectionStart = this.index + 1;
    }
  }

  private stateInAttrValueDq(str: string) {
    if (str === '"') {
      // 双引号属性值结束了
      this.cbs.onAttrValue(this.sectionStart, this.index);
      // 继续解析文本
      this.state = State.BeforeAttrName;
      this.sectionStart = this.index;
    }
  }

  private stateInTagName(str: string) {
    if (str === '>' || isWhiteSpace(str)) {
      // 标签名结束了
      this.cbs.onOpenTagName(this.sectionStart, this.index);

      this.state = State.BeforeAttrName;
      this.sectionStart = this.index;
      this.stateBeforeAttrName(str);
    }
  }

  private stateBeforeTagName(str: string) {
    if (isTagStart(str)) {
      // 匹配到开始标签了
      this.state = State.InTagName;
      this.sectionStart = this.index;
    } else if (str === '/') {
      // 处理结束标签
      this.state = State.InClosingTagName;
      this.sectionStart = this.index + 1;
    } else {
      // 都不是则认为是普通文本
      this.state = State.Text;
    }
  }

  private stateText(str: string) {
    if (str === '<') {
      if (this.sectionStart < this.index) {
        // 解析标签前需要把之前的文本解析出来；
        this.cbs.onText(this.sectionStart, this.index);
      }
      // 切换到标签名状态
      this.state = State.BeforeTagName;
      // 移动开始位置
      this.sectionStart = this.index + 1;
      // 证明需要开始解析标签了
    } else if (str === '{') {
      // 可能是插值表达式开始

      if (this.buffer[this.index + 1] === '{') {
        // 确实是插值表达式开始
        if (this.sectionStart < this.index) {
          // 进入插值前先把前置文本交给 onText
          this.cbs.onText(this.sectionStart, this.index);
        }
        // 切换状态
        this.state = State.Interpolation;
        // 移动开始位置
        this.sectionStart = this.index;
      }
    }
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
