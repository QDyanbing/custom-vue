function hasPropsChanged(prevProps, nextProps) {
  const nextKeys = Object.keys(nextProps);
  // 如果长度不一致，则需要更新
  if (nextKeys.length !== Object.keys(prevProps).length) {
    return true;
  }

  // 遍历新的 props
  for (const key of nextKeys) {
    if (prevProps[key] !== nextProps[key]) {
      return true;
    }
  }

  // 遍历完了，全部一致
  return false;
}

export function shouldUpdateComponent(n1, n2): boolean {
  const { props: prevProps, children: prevChildren } = n1;
  const { props: nextProps, children: nextChildren } = n2;

  if (prevChildren || nextChildren) {
    // 任意一个有插槽就需要更新
    return true;
  }

  if (!prevProps) {
    // 老的没有 props，新的有 props，则需要更新
    // 老的没有 props，新的没有 props，则不需要更新
    return !!nextProps;
  }

  if (!nextProps) {
    // 老的有 props，新的没有 props，则需要更新
    return true;
  }

  //  老的有新的也有
  return hasPropsChanged(prevProps, nextProps);
}
