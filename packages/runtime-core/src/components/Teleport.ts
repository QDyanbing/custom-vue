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
      options: { querySelector, insert },
    } = internals;

    const { to, disabled } = n2.props;

    // Teleport 本身不创建独立 DOM：它只是把 children 挂载到由 to/disabled 决定的目标容器里。
    if (n1 == null) {
      // 挂载 Teleport 组件
      const target = disabled ? container : querySelector(to);

      n2.target = target;

      if (target) {
        // 把n2的子节点挂载到target中
        mountChildren(n2.children, target, parentComponent);
      }
    } else {
      // 先在旧 target 上 patch children，让 child.el 尽量保持可用。
      patchChildren(n1, n2, n1.target, parentComponent);
      n2.target = n1.target;

      const prevProps = n1.props;

      if (prevProps.to !== to || prevProps.disabled !== disabled) {
        // to 发生变化，需要将子节点插入到新的目标容器中
        // disabled 发生变化，需要将子节点插入到当前容器中
        const target = disabled ? container : querySelector(to);

        // hostInsert 语义上等同于“把节点移动到新容器”；这里直接把已有 DOM 节点插入到目标中。
        for (const child of n2.children) {
          insert(child.el, target);
        }
      }
    }
  },
};
