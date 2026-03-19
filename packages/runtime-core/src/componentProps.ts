import { reactive } from '@vue/reactivity';
import { isArray, hasOwn, ShapeFlags } from '@vue/shared';

/**
 * 标准化组件定义上的 props 选项。
 *
 * 支持两种写法：
 * - 对象写法：`props: { msg: String }`
 * - 数组写法：`props: ['msg']`
 *
 * 这里会把数组写法转换成对象形式，方便后续统一通过 `hasOwn(propsOptions, key)` 判断
 * 某个属性是否是组件显式声明的 props。
 *
 * @param props 组件定义时传入的 props 配置
 * @returns 标准化后的 props 配置（对象形式）
 */
export function normalizePropsOptions(props: any = {}) {
  /**
   * 要把数组处理成对象
   */
  if (isArray(props)) {
    // 把数组处理成对象，key为属性名；
    return props.reduce((prev, cur) => {
      prev[cur] = {};
      return prev;
    }, {});
  }

  return props;
}

/**
 * 根据组件 props 选项，把原始 vnode.props 拆分到 props / attrs。
 *
 * 规则：
 * - 在 `instance.propsOptions` 中声明过的 key，归类到 `props`
 * - 其余 key 归类到 `attrs`
 *
 * @param instance 组件实例（需要使用其中的 propsOptions）
 * @param rawProps VNode 上的原始 props
 * @param props 本次解析得到的 props 容器对象
 * @param attrs 本次解析得到的 attrs 容器对象
 */
function setFullProps(instance: any, rawProps: any, props: any, attrs: any) {
  const { propsOptions, vnode } = instance;

  // 是否是函数组件
  const isFunctionComponent = vnode.shapeFlag & ShapeFlags.FUNCTIONAL_COMPONENT;

  // 是否声明了 props 选项（对象或数组标准化后的结果）
  const hasProps = Object.keys(propsOptions).length > 0;

  if (rawProps) {
    for (const key in rawProps) {
      if (hasOwn(propsOptions, key) || (isFunctionComponent && !hasProps)) {
        // 函数组件未声明 props 时，把传入属性都放到 props，便于直接通过第一个参数读取
        // 如果属性在propsOptions中，则设置到props中
        props[key] = rawProps[key];
      } else {
        // 如果属性不在propsOptions中，则设置到attrs中
        attrs[key] = rawProps[key];
      }
    }
  }
}

/**
 * 初始化组件实例上的 props / attrs。
 *
 * - 从 `instance.vnode.props` 读取调用方传入的属性
 * - 调用 `setFullProps` 按 `instance.propsOptions` 完成 props / attrs 拆分
 * - 使用 `reactive` 包装 props，挂到 `instance.props`
 * - 直接把 attrs 赋值给 `instance.attrs`
 *
 * 该函数会在 `setupComponent` 中被调用，确保组件的 `setup(props, { attrs })`
 * 在执行时能够拿到已经解析好的 props / attrs。
 *
 * @param instance 组件实例
 */
export function initProps(instance) {
  const { vnode } = instance;

  const rawProps = vnode.props;
  const props = {};
  const attrs = {};
  setFullProps(instance, rawProps, props, attrs);
  instance.props = reactive(props);
  instance.attrs = attrs;
}

/**
 * 更新组件实例上的 props / attrs。
 *
 * 当父组件重新渲染导致子组件接收到新的 VNode 时（`updateComponentPreRender` 中调用），
 * 本函数会：
 * 1. 用新 VNode 的 `props` 重新走一遍 `setFullProps`，把最新值写入 `instance.props` 和 `instance.attrs`
 * 2. 清理掉旧 `props`/`attrs` 中已不存在于新 VNode 的属性（删除多余的 key）
 *
 * 因为 `instance.props` 是 reactive 对象，写入/删除操作会自动触发依赖收集，
 * 从而让子组件的 render effect 在下一次 flush 时重新执行。
 *
 * @param instance 组件实例
 * @param nextVNode 新的组件 VNode（包含最新的 props）
 */
export function updateProps(instance, nextVNode) {
  const { props, attrs } = instance;
  const rawProps = nextVNode.props;

  // 这里是设置所有的
  setFullProps(instance, rawProps, props, attrs);

  for (const key in props) {
    if (!hasOwn(rawProps, key)) {
      // 如果新的没有这个属性，则删除
      delete props[key];
    }
  }

  for (const key in attrs) {
    if (!hasOwn(rawProps, key)) {
      // 如果新的没有这个属性，则删除
      delete attrs[key];
    }
  }
}
