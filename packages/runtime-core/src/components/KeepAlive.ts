export const isKeepAlive = (type: any) => type?.__isKeepAlive;

export const KeepAlive = {
  name: 'KeepAlive',
  __isKeepAlive: true,
  setup(props, { slots }) {
    return () => slots.default?.();
  },
};
