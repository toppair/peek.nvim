import Mermaid from 'https://cdn.skypack.dev/@types/mermaid?dts';
import { getInjectConfig } from './util.ts';

declare const mermaid: typeof Mermaid;

function init() {
  const peek = getInjectConfig();

  mermaid.initialize({
    startOnLoad: false,
    theme: peek?.theme === 'light' ? 'neutral' : 'dark',
  });
}

function render(id: string, definition: string, container: Element) {
  return new Promise<string | void>((resolve) => {
      mermaid.mermaidAPI.render(id, definition).then(({
        svg, bindFunctions,
      }: {svg: string; bindFunctions?: (element: Element) => void;}) => {
          container.innerHTML = svg;
          bindFunctions?.(container);
      }).catch(resolve);
  });
}

export default { init, render };
