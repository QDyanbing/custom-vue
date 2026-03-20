export const isTeleport = (type: any) => type.__isTeleport;

export const Teleport = {
  name: 'Teleport',
  // 标识这是一个 Teleport 组件
  __isTeleport: true,
  props: {
    to: {
      // 要挂载的容器
      type: String,
      required: true,
    },
    disabled: {
      // 是否禁用 Teleport，禁用后，子组件会直接挂载到当前容器中
      type: Boolean,
      default: false,
    },
  },
  process(n1, n2, container, anchor = null, parentComponent = null, internals: any = {}) {
    const {
      mountChildren,
      patchChildren,
      options: { querySelector },
    } = internals;

    if (n1 == null) {
      const { to, disabled } = n2.props;

      // 挂载 Teleport 组件
      const target = disabled ? container : querySelector(to);
      if (target) {
        // 把n2的子节点挂载到target中
        mountChildren(n2.children, target, parentComponent);
      }
    } else {
      patchChildren(n1, n2, parentComponent);
    }
  },
};
