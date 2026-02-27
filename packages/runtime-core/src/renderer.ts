export function createRenderer(options) {
  console.log(options);

  const render = (vNode: any, container: Element) => {
    console.log(vNode, container);
  };

  return {
    render,
  };
}
