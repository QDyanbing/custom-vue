import { nodeOps } from './nodeOps';
import { patchProp } from './patchProp';

const renderOptions = {
  patchProp,
  ...nodeOps,
};

export * from '@vue/runtime-core';

export { renderOptions };
