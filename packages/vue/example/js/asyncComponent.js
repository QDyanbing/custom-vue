// import { h } from '/node_modules/vue/dist/vue.esm-browser.js';
import { h } from '../../dist/vue.esm.js';

// 这个文件用于演示 `import('./js/asyncComponent.js')` 场景下，
// defineAsyncComponent 需要从模块对象的 `default` 上取到真正组件。
export default {
  render() {
    return h('div', 'hello world');
  },
};
